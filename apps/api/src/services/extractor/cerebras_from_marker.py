"""
cerebras_from_marker.py  (v2 — block-based extraction)
=======================================================
Converts extractor HTML (PyMuPDF v3 annotated, or Datalab Marker) into
structured question JSON via Cerebras gpt-oss-120b.

v2 upgrades (accuracy overhaul):
  1. Question-block segmentation (extract_common.segment_questions) replaces
     regex page stitching — the LLM always receives WHOLE questions, already
     reassembled across page boundaries. No more cross-page guessing.
  2. The prompt treats extractor annotations (<sup>/<sub>/<frac>, data-owner
     image ownership, data-section hints) as ground truth.
  3. Token-aware batching with truncation-aware retries (finish_reason ==
     "length" splits the batch; a lone block escalates max_tokens once).
  4. Expanded diagnostics (LaTeX lint, image audits, dangling fragments) via
     extract_common.diagnose_question; error-level defects trigger repair.
  5. Repair uses the FULL question block (both pages of a split question),
     not a truncated single page.
  6. Gap-driven recovery: missing question numbers are re-extracted from
     their own block, or split out of the preceding block.
  7. Optional --consensus mode: second extraction pass, field-level diff,
     disagreements routed to repair/review.

Output schema is unchanged for downstream consumers (normalize_json.py,
pdfExtractor.service.ts). Underscore-prefixed metadata fields are added.

Usage:
    python cerebras_from_marker.py <extracted_data_dir> [--pages 1-5]
        [--consensus] [--no-repair] [--batch-chars 7000]
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Force stdout/stderr to use UTF-8 encoding on Windows to prevent console print crashes
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from extract_common import (
    segment_questions,
    diagnose_question,
    estimate_tokens,
)

MODEL = "gpt-oss-120b"

# ── API key / client management (lazy — module stays importable) ─────────────

_clients = None
_client_idx = 0


def _load_clients():
    global _clients
    if _clients is not None:
        return _clients
    from cerebras.cloud.sdk import Cerebras
    keys_file = Path(__file__).parent / "api_keys.txt"
    api_keys = []
    if keys_file.exists():
        api_keys = [k.strip() for k in keys_file.read_text().splitlines()
                    if k.strip() and not k.startswith("#")]
    if not api_keys and os.environ.get("CEREBRAS_API_KEY"):
        api_keys.append(os.environ["CEREBRAS_API_KEY"])
    if not api_keys:
        raise SystemExit("No Cerebras API keys found (api_keys.txt or CEREBRAS_API_KEY).")
    _clients = [Cerebras(api_key=k) for k in api_keys]
    return _clients


def get_client():
    global _client_idx
    clients = _load_clients()
    if not clients:
        raise Exception("ALL API KEYS EXHAUSTED.")
    c = clients[_client_idx % len(clients)]
    _client_idx += 1
    return c


def remove_exhausted_key(client_to_remove):
    clients = _load_clients()
    if client_to_remove in clients:
        clients.remove(client_to_remove)
        print(f"    Removed exhausted key. {len(clients)} keys remaining.")


# ── Extraction prompt ─────────────────────────────────────────────────────────

EXTRACT_PROMPT = r"""You are an expert parser of Indian competitive exam papers (JEE Main, JEE Advanced, NEET-UG).
You receive one or more COMPLETE question blocks as HTML. Each block is one whole question —
cross-page splits have already been stitched together for you.

════════════════════════════════════════════
  INPUT ANNOTATIONS — TREAT AS GROUND TRUTH
════════════════════════════════════════════
The HTML may carry machine-verified annotations from geometric PDF analysis:

• <sup>x</sup> — superscript. Convert to LaTeX: 10<sup>3</sup> → $10^{3}$, s<sup>-1</sup> → $\text{s}^{-1}$
• <sub>x</sub> — subscript. Convert: a<sub>1</sub> → $a_1$, H<sub>2</sub>O → $H_2O$
• <frac><num>N</num><den>D</den></frac> — a stacked fraction. Convert to $\frac{N}{D}$.
  Example: <frac><num>-3</num><den>2</den></frac> → $-\frac{3}{2}$
  (√5 inside a numerator: <frac><num>√5</num><den>12</den></frac> → $\frac{\sqrt{5}}{12}$)
• <p data-qcand="27">…</p> — the start of question 27 (the header line).
• <p data-opt="B" data-q="27">…</p> — the line that starts option B of question 27.
• <img src="F" data-owner="option-B" data-q="27" /> — image F IS option B's content.
  data-owner values:
    "option-A/B/C/D" → the image belongs to THAT option. NEVER reassign it.
    "stem"           → the image belongs in question_text.
    "prev"           → the image appeared at a page top; it belongs to THIS question
                       (the block it appears in), usually a trailing option's image.
    "ambiguous"      → geometry could not decide; use the judgment rules below.
  data-conf="high|medium" is the geometric confidence. Respect "high" absolutely;
  override "medium" only with strong contextual evidence.
• <p data-section="…"> — a section header (subject or question-type section).

If the HTML has NO annotations (OCR source), fall back to the reconstruction rules below.

════════════════════════════════════════════
  LATEX RULES — output must be render-ready
════════════════════════════════════════════
• Wrap ALL mathematics in $...$ (inline). Never leave math as plain text or HTML tags.
• Convert unicode math to LaTeX commands inside math mode:
  √x → \sqrt{x}, × → \times, ≤ → \leq, ≥ → \geq, ≠ → \neq, ∞ → \infty,
  → → \rightarrow, ∈ → \in, α → \alpha, π → \pi, Δ → \Delta, θ → \theta, μ → \mu
• Units: $10^{-2}\,\text{N}$, $6\,\text{cm s}^{-1}$, $\text{N m}^2\text{C}^{-1}$
• Vectors: →a or a with arrow → $\vec{a}$;  ^i → $\hat{i}$
• loge → \ln;  log → \log;  differentials: xdy − ydx → $x\,dy - y\,dx$
• Chemical formulas: $H_2SO_4$, $CO_2$ (subscripts in math mode), or plain H2SO4 —
  but be CONSISTENT within one paper. Prefer the math-mode form.
• Balanced delimiters ALWAYS: every $ opens and closes; every { has a matching }.
• Do NOT invent \left. without \right. — use them in pairs or not at all.

FALLBACK plain-text math reconstruction (ONLY for unannotated OCR text):
• "x2" → $x^2$ when context is a power; "ex2" → $e^{x^2}$; "a1, a2" → $a_1, a_2$
• "(20)20" → $(20)^{20}$; "10-2 N" → $10^{-2}\,\text{N}$; "ms-2" → $\text{m s}^{-2}$
• Adjacent number pairs as options like "−3 2" → $-\frac{3}{2}$
• Stacked rows forming a 3×3 array with an "=" → \begin{vmatrix}...\end{vmatrix}
• NEVER drop a lone digit near a unit — it is a lost exponent. Reconstruct it.

════════════════════════════════════════════
  QUESTION STRUCTURE RULES
════════════════════════════════════════════
• question_text = the stem ONLY: everything after the question header and before
  the first option label. Never include option text in the stem.
• MCQ/MSQ/Assertion-Reason/Matching: EXACTLY 4 options with ids "A","B","C","D".
• Numerical/Integer: options MUST be [] (empty). Type hints are provided per block
  (from section headers like "SECTION-B (Numerical Value Type)") — trust them.
• Assertion-Reason: stem contains "Assertion (A):" and "Reason (R):" — the (A)/(R)
  there are NOT option labels. Options are the four standard meta-choices.
• Matching (Column I / List I): put both columns in question_text; options describe
  the matchings.
• PRESERVE STRUCTURE — do NOT flatten it into a run-on paragraph:
  - If the block contains a Markdown table (lines with "|" pipes and a "---"
    separator row) — e.g. a "Match the columns" / Column I–Column II layout —
    COPY it verbatim into question_text as a Markdown table. Keep the pipes,
    the "---" row, the newlines, and any $…$ math or ![image](…) inside cells.
    Never reorder cells or turn the table into prose.
  - Keep meaningful newlines: enumerated statements ("A. …", "(i) …", "1. …")
    and each column/list item stay on their OWN line (use "\n"). The renderer
    shows newlines as line breaks and Markdown tables as real tables.
• Images: embed as Markdown at the exact position: ![image](filename.png)
  - An option whose content is an image: text = "![image](filename.png)"
    (optionally preceded by that option's text if it has both).
  - Every <img> in a block MUST be referenced exactly once in your output for
    that question (stem or one option). Never drop an image, never reuse one twice.
• Do NOT confuse circuit/diagram labels (A, B, C, y as terminals) with option labels.
  Option labels come from data-opt annotations or explicit "(A)" line starts.

════════════════════════════════════════════
  OUTPUT — return ONLY valid JSON
════════════════════════════════════════════
{
  "questions": [
    {
      "question_number": 27,
      "question_text": "A metal plate of area $10^{3}\,\text{cm}^2$ ...",
      "options": [
        {"id": "A", "text": "0.1 poise"},
        {"id": "B", "text": "0.5 poise"},
        {"id": "C", "text": "0.7 poise"},
        {"id": "D", "text": "0.9 poise"}
      ],
      "correct_answer": [],
      "numerical_answer": null,
      "question_type": "MCQ",
      "subject": "Physics",
      "chapter": "Fluid Mechanics",
      "topic": "viscosity",
      "difficulty": "Medium",
      "explanation": ""
    }
  ]
}

FIELD RULES:
• question_number: integer — MUST match the block's stated question number.
• options: 4 items for MCQ/MSQ/Assertion-Reason/Matching; [] for Numerical.
• correct_answer: [] (the paper has no key); numerical_answer: null; explanation: "".
• question_type: "MCQ" | "MSQ" | "Numerical" | "Matching" | "Assertion-Reason"
• subject: "Physics" | "Chemistry" | "Mathematics" | "Biology"
• chapter: standard NCERT/JEE syllabus chapter; topic: short keyword.
• difficulty: "Easy" | "Medium" | "Hard".
• Return one entry for EVERY question number requested — no extras, none missing.
"""

REPAIR_PROMPT_TEMPLATE = """You are FIXING a broken extraction of question {qnum} from a JEE/NEET paper.

DEFECTS FOUND (fix ALL of them):
{defects}

{hints}THE COMPLETE SOURCE BLOCK FOR QUESTION {qnum} (already stitched across pages):
{block_html}

IMAGES AVAILABLE IN THIS BLOCK (with verified ownership):
{image_manifest}

CURRENT (broken) JSON:
{broken_json}

Re-extract question {qnum} from the source block, fixing every defect listed.
Follow all annotation, LaTeX and structure rules. Return ONLY valid JSON:
{{"questions": [ ...the single fixed question... ]}}
"""


# ── JSON cleaning (proven v1 state machine, kept as-is) ───────────────────────

def clean_raw_json_response(raw) -> str:
    """
    Sanitize and repair malformed JSON returned by LLMs.
    Uses a proper state-machine to fix unescaped backslashes and literal
    newlines ONLY inside JSON string values, without touching structural JSON.
    Also handles code-fence stripping.
    """
    if not raw:
        return "{}"
    raw = str(raw).strip()

    if raw.startswith("```"):
        lines = raw.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()

    try:
        json.loads(raw)
        return raw
    except (json.JSONDecodeError, ValueError):
        pass

    VALID_JSON_ESCAPES = {'"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'}
    result = []
    in_string = False
    i = 0
    n = len(raw)

    while i < n:
        ch = raw[i]

        if not in_string:
            result.append(ch)
            if ch == '"':
                in_string = True
            i += 1
        else:
            if ch == '\\':
                nxt = raw[i + 1] if i + 1 < n else ''
                if nxt in VALID_JSON_ESCAPES:
                    result.append(ch)
                    result.append(nxt)
                    i += 2
                    if nxt == 'u' and i + 4 <= n:
                        result.extend(raw[i:i + 4])
                        i += 4
                else:
                    result.append('\\\\')
                    i += 1
            elif ch == '"':
                result.append(ch)
                in_string = False
                i += 1
            elif ch == '\n':
                result.append('\\n')
                i += 1
            elif ch == '\r':
                result.append('\\r')
                i += 1
            elif ch == '\t':
                result.append('\\t')
                i += 1
            elif ord(ch) < 0x20:
                result.append(f'\\u{ord(ch):04x}')
                i += 1
            else:
                result.append(ch)
                i += 1

    return "".join(result)


def _fallback_extract_questions(raw_text: str) -> list:
    """Last-resort regex extraction of individual question objects."""
    questions = []
    for m in re.finditer(r'\{\s*"question_number"\s*:', raw_text):
        start = m.start()
        depth = 0
        end = start
        in_str = False
        esc = False
        for j, ch in enumerate(raw_text[start:], start=start):
            if esc:
                esc = False
                continue
            if ch == '\\' and in_str:
                esc = True
                continue
            if ch == '"' and not esc:
                in_str = not in_str
            if not in_str:
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        end = j + 1
                        break
        if end > start:
            candidate = raw_text[start:end]
            try:
                cleaned = clean_raw_json_response(candidate)
                obj = json.loads(cleaned)
                if obj.get("question_number"):
                    questions.append(obj)
            except Exception:
                pass
    return questions


# ── LLM call wrapper ──────────────────────────────────────────────────────────

def call_llm(user_prompt: str, max_tokens: int = 16000, temperature: float = 0.1,
             retries: int = 3):
    """Returns (questions_list_or_None, finish_reason, raw_text)."""
    last_raw = None
    finish_reason = None
    for attempt in range(retries):
        try:
            client = get_client()
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": EXTRACT_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=temperature,
                max_tokens=max_tokens,
            )
            raw = resp.choices[0].message.content
            finish_reason = getattr(resp.choices[0], "finish_reason", None)
            last_raw = raw
            if finish_reason == "length":
                return None, "length", raw
            parsed = json.loads(clean_raw_json_response(raw))
            return parsed.get("questions", []), finish_reason, raw
        except Exception as e:
            err_msg = str(e)
            print(f"    LLM attempt {attempt+1} failed: {err_msg[:160]}")
            if "payment_required" in err_msg or "402" in err_msg or "429" in err_msg:
                try:
                    remove_exhausted_key(client)
                except Exception:
                    pass
    if last_raw:
        fb = _fallback_extract_questions(str(last_raw))
        if fb:
            print(f"    Fallback regex recovered {len(fb)} question(s)")
            return fb, finish_reason, last_raw
    return None, finish_reason, last_raw


# ── Block batching ────────────────────────────────────────────────────────────

def block_prompt_section(block: dict) -> str:
    manifest = []
    for fname in block["images"]:
        m = re.search(
            rf'<img[^>]*src="{re.escape(fname)}"[^>]*data-owner="([^"]+)"', block["html"])
        owner = m.group(1) if m else "unknown"
        manifest.append(f"{fname} (owner: {owner})")
    parts = [f"=== QUESTION {block['qnum']} (source pages: {','.join(map(str, block['pages']))}) ==="]
    if block.get("section_hint"):
        parts.append(f"SECTION: {block['section_hint']}")
    if block.get("type_hint"):
        parts.append(f"TYPE HINT: {block['type_hint']}"
                     f"  (integer → options MUST be []; mcq_* → exactly 4 options)")
    if manifest:
        parts.append("IMAGES: " + "; ".join(manifest))
    parts.append(block["html"])
    return "\n".join(parts)


def make_batches(blocks: list, batch_chars: int = 7000, max_blocks: int = 5):
    batches, cur, cur_chars = [], [], 0
    for b in blocks:
        b_len = len(b["html"])
        if cur and (cur_chars + b_len > batch_chars or len(cur) >= max_blocks):
            batches.append(cur)
            cur, cur_chars = [], 0
        cur.append(b)
        cur_chars += b_len
    if cur:
        batches.append(cur)
    return batches


def extract_batch(batch: list, temperature: float = 0.1, max_tokens: int = 16000,
                  depth: int = 0) -> dict:
    """Extract a batch of blocks. Returns {qnum: question}."""
    nums = [b["qnum"] for b in batch]
    user = (
        f"Extract EXACTLY these question numbers: {nums}.\n"
        f"Return one questions[] entry per number.\n\n"
        + "\n\n".join(block_prompt_section(b) for b in batch)
    )
    questions, finish, raw = call_llm(user, max_tokens=max_tokens, temperature=temperature)

    if questions is None and finish == "length":
        if len(batch) > 1:
            mid = len(batch) // 2
            print(f"    Output truncated — splitting batch {nums}")
            out = extract_batch(batch[:mid], temperature, max_tokens, depth + 1)
            out.update(extract_batch(batch[mid:], temperature, max_tokens, depth + 1))
            return out
        if max_tokens < 24000:
            print(f"    Output truncated on single block Q{nums[0]} — escalating max_tokens")
            return extract_batch(batch, temperature, 24000, depth + 1)
        print(f"    Q{nums[0]}: output truncated even at max tokens")
        return {}

    out = {}
    for q in questions or []:
        if isinstance(q, dict) and isinstance(q.get("question_number"), int):
            out[q["question_number"]] = q

    # Any requested number missing → retry it alone (once)
    missing = [n for n in nums if n not in out]
    if missing and depth < 2:
        for n in missing:
            blk = next(b for b in batch if b["qnum"] == n)
            print(f"    Q{n} missing from batch response — retrying solo")
            solo = extract_batch([blk], temperature, max_tokens, depth + 2)
            out.update(solo)
    return out


# ── Repair ────────────────────────────────────────────────────────────────────

def repair_question(q: dict, block: dict, defects: list):
    manifest = []
    for fname in block["images"]:
        m = re.search(
            rf'<img[^>]*src="{re.escape(fname)}"[^>]*data-owner="([^"]+)"', block["html"])
        owner = m.group(1) if m else "unknown"
        manifest.append(f"  - {fname} (owner: {owner})")

    hints = ""
    if block.get("section_hint"):
        hints += f"SECTION (authoritative): {block['section_hint']}\n"
    if block.get("type_hint"):
        hints += (f"TYPE (authoritative): {block['type_hint']} "
                  f"(integer → options MUST be []; mcq_* → exactly 4 options)\n")
    if hints:
        hints += "\n"

    prompt = REPAIR_PROMPT_TEMPLATE.format(
        qnum=q.get("question_number"),
        defects="\n".join(f"  - {d}" for d in defects),
        hints=hints,
        block_html=block["html"][:9000],
        image_manifest="\n".join(manifest) if manifest else "  (none)",
        broken_json=json.dumps(q, indent=2, ensure_ascii=False)[:3000],
    )
    questions, _, _ = call_llm(prompt, max_tokens=6000, temperature=0.05, retries=2)
    if not questions:
        return None
    for fq in questions:
        if isinstance(fq, dict) and fq.get("question_number") == q.get("question_number"):
            return fq
    if questions and isinstance(questions[0], dict):
        questions[0]["question_number"] = q.get("question_number")
        return questions[0]
    return None


# ── Unified diagnosis (structural checks + block-hint cross-checks) ──────────

def full_diagnose(q: dict, block: dict, available_images: set):
    """diagnose_question + section/type-hint cross-checks. Returns (errors, warnings)."""
    expected_imgs = block["images"] if block else None
    errors, warnings = diagnose_question(
        q, available_images=available_images or None, expected_images=expected_imgs)

    hint = (block or {}).get("type_hint")
    qtype = (q.get("question_type") or "").strip().lower()
    if hint == "integer" and (qtype not in ("numerical", "integer") or q.get("options")):
        errors.append(
            f"section says Numerical/Integer but extracted as {q.get('question_type')} "
            f"with {len(q.get('options') or [])} options")
    elif hint in ("mcq_single", "mcq_multi") and qtype in ("numerical", "integer"):
        errors.append(f"section says MCQ but extracted as {q.get('question_type')}")
    return errors, warnings


# ── Consensus comparison ──────────────────────────────────────────────────────

def _norm_field(v) -> str:
    return re.sub(r'\s+', ' ', str(v or '')).strip().lower()


def diff_questions(q1: dict, q2: dict) -> list:
    diffs = []
    if _norm_field(q1.get("question_text")) != _norm_field(q2.get("question_text")):
        diffs.append("question_text differs between consensus passes")
    o1 = {o.get("id"): _norm_field(o.get("text")) for o in q1.get("options", []) or []}
    o2 = {o.get("id"): _norm_field(o.get("text")) for o in q2.get("options", []) or []}
    for k in sorted(set(o1) | set(o2)):
        if o1.get(k) != o2.get(k):
            diffs.append(f"option {k} differs between consensus passes")
    if _norm_field(q1.get("question_type")) != _norm_field(q2.get("question_type")):
        diffs.append("question_type differs between consensus passes")
    return diffs


# ── Main ──────────────────────────────────────────────────────────────────────

def parse_pages_arg(pages_arg: str):
    if not pages_arg:
        return None
    out = set()
    for part in pages_arg.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            out.update(range(int(a), int(b) + 1))
        elif part:
            out.add(int(part))
    return out


def run(base_dir: Path, pages_filter=None, consensus=False, do_repair=True,
        batch_chars=7000):
    marker_raw = base_dir / "marker_raw.json"
    images_dir = base_dir / "marker_images"
    output_json = base_dir / "all_extracted_data.json"

    print("Loading raw extraction JSON...")
    with open(marker_raw, encoding="utf-8") as f:
        data = json.load(f)

    pages = data.get("json", {}).get("children", [])
    annotated = bool(data.get("metadata", {}).get("annotated"))
    print(f"Found {len(pages)} pages (annotated={annotated})")

    blocks, front_matter = segment_questions(pages)
    print(f"Segmented into {len(blocks)} question blocks "
          f"(numbers {blocks[0]['qnum']}..{blocks[-1]['qnum']})" if blocks else "No blocks found!")
    if not blocks:
        output_json.write_text(json.dumps({"questions": []}, indent=2), encoding="utf-8")
        return

    if pages_filter:
        blocks = [b for b in blocks if set(b["pages"]) & pages_filter]
        print(f"--pages filter: {len(blocks)} blocks remain")

    available_images = set()
    if images_dir.exists():
        available_images = {p.name for p in images_dir.iterdir() if p.is_file()}

    block_by_num = {b["qnum"]: b for b in blocks}
    questions_map = {}

    # ── Main extraction over batches ──────────────────────────────────────────
    batches = make_batches(blocks, batch_chars=batch_chars)
    print(f"\nExtracting {len(blocks)} blocks in {len(batches)} batches...")
    for bi, batch in enumerate(batches, 1):
        nums = [b["qnum"] for b in batch]
        est = sum(estimate_tokens(b["html"]) for b in batch)
        print(f"\n--- Batch {bi}/{len(batches)}: Q{nums[0]}..Q{nums[-1]} (~{est} tok) ---")
        got = extract_batch(batch)
        print(f"  Extracted {len(got)}/{len(batch)} questions")
        questions_map.update(got)

        sorted_qs = sorted(questions_map.values(), key=lambda x: x.get("question_number", 0))
        output_json.write_text(
            json.dumps({"questions": sorted_qs}, indent=2, ensure_ascii=False),
            encoding="utf-8")

    # ── Gap-driven recovery ───────────────────────────────────────────────────
    want = {b["qnum"] for b in blocks}
    missing = sorted(want - set(questions_map.keys()))
    if missing:
        print(f"\nGAP RECOVERY — missing questions: {missing}")
        for n in missing:
            got = extract_batch([block_by_num[n]])
            if n in got:
                questions_map[n] = got[n]
                print(f"  Recovered Q{n}")
            else:
                print(f"  Q{n} STILL missing — flagged")

    # Segmentation gaps: numbers between min..max with no block at all →
    # the anchor was missed; the question text lives inside the previous block.
    all_nums = sorted(b["qnum"] for b in blocks)
    seg_missing = [n for n in range(all_nums[0], all_nums[-1] + 1)
                   if n not in block_by_num]
    for n in seg_missing:
        prev = max((b for b in blocks if b["qnum"] < n), key=lambda b: b["qnum"], default=None)
        if not prev:
            continue
        print(f"  Q{n} had no anchor — asking model to split it out of Q{prev['qnum']}'s block")
        user = (
            f"The following block is labeled question {prev['qnum']} but may CONTAIN TWO "
            f"questions: {prev['qnum']} and {n}. Split them and return BOTH as separate "
            f"entries in questions[].\n\n" + block_prompt_section(prev)
        )
        questions, _, _ = call_llm(user, max_tokens=16000)
        for q in questions or []:
            if isinstance(q, dict) and q.get("question_number") in (prev["qnum"], n):
                questions_map[q["question_number"]] = q
                if q["question_number"] == n:
                    block_by_num[n] = prev  # repair context

    # ── Consensus pass (optional) ─────────────────────────────────────────────
    consensus_flags = {}
    if consensus:
        print("\nCONSENSUS PASS — re-extracting all blocks at temperature 0.3...")
        second = {}
        for batch in make_batches(blocks, batch_chars=batch_chars):
            second.update(extract_batch(batch, temperature=0.3))
        for n, q1 in questions_map.items():
            q2 = second.get(n)
            if not q2:
                continue
            diffs = diff_questions(q1, q2)
            if diffs:
                consensus_flags[n] = diffs
        print(f"  Consensus disagreements: {len(consensus_flags)} question(s)")

    # ── Diagnose + repair ─────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("DIAGNOSTIC PASS")
    review_count = 0
    for n in sorted(questions_map.keys()):
        q = questions_map[n]
        block = block_by_num.get(n)
        errors, warnings = full_diagnose(q, block, available_images)
        errors += consensus_flags.get(n, [])

        if errors and do_repair and block is not None:
            print(f"  Q{n}: {len(errors)} error(s) → repair")
            for d in errors:
                print(f"      - {d}")
            fixed = repair_question(q, block, errors)
            if fixed:
                new_errors, new_warnings = full_diagnose(fixed, block, available_images)
                if len(new_errors) < len(errors):
                    print(f"      repaired ({len(errors)} → {len(new_errors)} errors)")
                    questions_map[n] = q = fixed
                    errors, warnings = new_errors, new_warnings
                else:
                    print("      repair did not improve — keeping original")

        if errors:
            q["_needs_review"] = True
            q["_defects"] = errors
            review_count += 1
        if warnings:
            q["_warnings"] = warnings

        if block is not None:
            q["_pages"] = block["pages"]
            if block.get("section_hint"):
                q["_section_hint"] = block["section_hint"]
            if block.get("type_hint"):
                q["_type_hint"] = block["type_hint"]

    # ── Final save ────────────────────────────────────────────────────────────
    sorted_qs = sorted(questions_map.values(), key=lambda x: x.get("question_number", 0))
    output_json.write_text(
        json.dumps({"questions": sorted_qs}, indent=2, ensure_ascii=False),
        encoding="utf-8")

    print("\n" + "=" * 50)
    print(f"DONE. Total questions extracted: {len(questions_map)} "
          f"(expected {len(blocks)})")
    if review_count:
        print(f"  {review_count} question(s) flagged for manual review")
    print(f"Output: {output_json}")
    print("=" * 50)


def main():
    ap = argparse.ArgumentParser(description="Cerebras block-based question extraction")
    ap.add_argument("base_dir", help="Directory containing marker_raw.json")
    ap.add_argument("--pages", default=None, help="Page filter, e.g. '1-5' or '2,4'")
    ap.add_argument("--consensus", action="store_true",
                    help="Second extraction pass; disagreements flagged/repaired")
    ap.add_argument("--no-repair", action="store_true", help="Skip the repair pass")
    ap.add_argument("--batch-chars", type=int, default=7000,
                    help="Max HTML chars per LLM batch")
    args = ap.parse_args()

    run(Path(args.base_dir).resolve(),
        pages_filter=parse_pages_arg(args.pages),
        consensus=args.consensus,
        do_repair=not args.no_repair,
        batch_chars=args.batch_chars)


if __name__ == "__main__":
    main()
