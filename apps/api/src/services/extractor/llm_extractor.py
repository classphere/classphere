"""
llm_extractor.py
================
Converts PyMuPDF-annotated HTML question blocks into structured JSON using
an OpenRouter-hosted LLM (default: deepseek/deepseek-v4-flash).

Supports toggling reasoning/thinking ON for JEE and OFF for NEET via the
--thinking [on|off] flag.

Design:
  • Digital PDFs only — images extracted by pymupdf_extractor.py are
    referenced as ![image](filename.png) in the HTML. The LLM copies the
    reference into the correct field; it never sees image bytes.
  • Output schema is identical to cerebras_from_marker.py so normalize_json.py
    and all downstream consumers work unchanged.
  • Batches up to LLM_BATCH_CHARS chars per API call (default 40 000).

Usage:
    python llm_extractor.py <extracted_data_dir> [--model MODEL_ID] [--thinking on|off] [--pages 1-5]

Environment:
    OPENROUTER_API_KEY          required
    LLM_MODEL                   default: deepseek/deepseek-v4-flash
    LLM_BATCH_CHARS             default: 40000
    LLM_MAX_OUTPUT_TOKENS       default: 16000
    LLM_TEMPERATURE             default: 0.1
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Force UTF-8 on Windows to prevent console print crashes
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
)

# ── Configuration ─────────────────────────────────────────────────────────────

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL      = os.environ.get("LLM_MODEL",             "deepseek/deepseek-v4-flash")
BATCH_CHARS        = int(os.environ.get("LLM_BATCH_CHARS",       "7000"))
MAX_OUTPUT_TOKENS  = int(os.environ.get("LLM_MAX_OUTPUT_TOKENS", "16000"))
TEMPERATURE        = float(os.environ.get("LLM_TEMPERATURE",     "0.1"))

# ── OpenRouter client (lazy init) ─────────────────────────────────────────────

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise SystemExit(
            "\n❌  OPENROUTER_API_KEY is not set.\n"
            "    Set it in your .env file.\n"
        )
    try:
        from openai import OpenAI
    except ImportError:
        raise SystemExit(
            "\n❌  'openai' is not installed. Run:\n"
            "    pip install openai\n"
        )
    _client = OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key,
        default_headers={
            "HTTP-Referer": "https://classphere.com",
            "X-Title": "Classphere PDF Extractor",
        },
    )
    return _client


# ── Extraction prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = r"""You are an expert parser of Indian competitive exam papers (JEE Main, JEE Advanced, NEET-UG).
You receive one or more COMPLETE question blocks as HTML. Each block is one whole question —
cross-page splits have already been stitched together for you.

════════════════════════════════════════════
  INPUT ANNOTATIONS — TREAT AS GROUND TRUTH
════════════════════════════════════════════
• <sup>x</sup> — superscript → $10^{3}$, $\text{s}^{-1}$
• <sub>x</sub> — subscript → $a_1$, $H_2O$
• <frac><num>N</num><den>D</den></frac> — stacked fraction → $\frac{N}{D}$
• <p data-qcand="27">…</p> — start of question 27
• <p data-opt="B" data-q="27">…</p> — option B of question 27
• <img src="F" data-owner="option-B" data-q="27" /> — image F belongs to option B
  data-owner: "option-A/B/C/D" | "stem" | "prev" | "ambiguous"
  data-conf: "high" (respect absolutely) | "medium" (override only with strong evidence)
• <p data-section="…"> — section header

════════════════════════════════════════════
  LATEX RULES — render-ready output
════════════════════════════════════════════
• Wrap ALL math in $…$ (inline). Never leave math as plain text.
• √x → \sqrt{x}, × → \times, ≤ → \leq, ≥ → \geq, ∞ → \infty,
  → → \rightarrow, ∈ → \in, α → \alpha, π → \pi, Δ → \Delta, θ → \theta
• Units: $10^{-2}\,\text{N}$, $6\,\text{cm s}^{-1}$
• Vectors: $\vec{a}$; unit vectors: $\hat{i}$
• Chemical: $H_2SO_4$, $CO_2$ (subscripts in math mode)
• Balanced delimiters: every $ opens and closes; every { has a matching }

════════════════════════════════════════════
  QUESTION STRUCTURE RULES
════════════════════════════════════════════
• question_text = stem ONLY (before first option label)
• MCQ/MSQ/Assertion-Reason/Matching: EXACTLY 4 options ids "A","B","C","D"
• Numerical: options = [] (empty)
• Preserve structure: Markdown tables verbatim, newlines for enumerated items
• Images: embed as ![image](filename.png) at exact position
  Every <img> must appear exactly once — never drop or reuse
• Do NOT confuse diagram labels (A, B, C as terminals) with option labels

════════════════════════════════════════════
  OUTPUT — return ONLY valid JSON
════════════════════════════════════════════
{
  "questions": [
    {
      "question_number": 27,
      "question_text": "...",
      "options": [
        {"id": "A", "text": "..."},
        {"id": "B", "text": "..."},
        {"id": "C", "text": "..."},
        {"id": "D", "text": "..."}
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
• question_number: integer matching block's stated number
• options: 4 items for MCQ/MSQ/Assertion-Reason/Matching; [] for Numerical
• correct_answer: [] (no answer key); numerical_answer: null; explanation: ""
• question_type: "MCQ" | "MSQ" | "Numerical" | "Matching" | "Assertion-Reason"
• subject: "Physics" | "Chemistry" | "Mathematics" | "Biology"
• chapter: NCERT/JEE syllabus chapter; topic: short keyword
• difficulty: "Easy" | "Medium" | "Hard"
• Return one entry per requested question — no extras, none missing
"""

REPAIR_PROMPT_TEMPLATE = """You are FIXING a broken extraction of question {qnum} from a JEE/NEET paper.

DEFECTS FOUND (fix ALL of them):
{defects}

THE COMPLETE SOURCE BLOCK FOR QUESTION {qnum}:
{block_html}

IMAGES IN THIS BLOCK:
{image_manifest}

CURRENT (broken) JSON:
{broken_json}

Re-extract question {qnum} fixing every defect. Follow all annotation, LaTeX and
structure rules. Return ONLY valid JSON:
{{"questions": [ ...the single fixed question... ]}}
"""


# ── JSON cleaning ─────────────────────────────────────────────────────────────

def clean_raw_json_response(raw: str) -> str:
    if not raw:
        return "{}"
    raw = raw.strip()

    # Strip code fences
    if raw.startswith("```"):
        lines = raw.splitlines()
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()

    # Strip <think>…</think> from DeepSeek reasoning models
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    # If it's already valid JSON, done
    try:
        json.loads(raw)
        return raw
    except (json.JSONDecodeError, ValueError):
        pass

    # State-machine: fix unescaped backslashes / newlines inside strings
    VALID_ESC = {'"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'}
    result = []
    in_str = False
    i, n = 0, len(raw)
    while i < n:
        ch = raw[i]
        if not in_str:
            result.append(ch)
            if ch == '"':
                in_str = True
            i += 1
        else:
            if ch == '\\':
                nxt = raw[i + 1] if i + 1 < n else ''
                if nxt in VALID_ESC:
                    result.append(ch); result.append(nxt)
                    i += 2
                    if nxt == 'u' and i + 4 <= n:
                        result.extend(raw[i:i + 4]); i += 4
                else:
                    result.append('\\\\'); i += 1
            elif ch == '"':
                result.append(ch); in_str = False; i += 1
            elif ch == '\n':
                result.append('\\n'); i += 1
            elif ch == '\r':
                result.append('\\r'); i += 1
            else:
                result.append(ch); i += 1
    return "".join(result)


# ── API calls ─────────────────────────────────────────────────────────────────

def _call_llm(model: str, system: str, user: str, thinking: bool = True) -> str:
    """Call OpenRouter and return the message content string."""
    client = get_client()

    # Configure reasoning/thinking parameter for OpenRouter
    if thinking:
        reasoning_config = {"enabled": True, "effort": "high"}
    else:
        reasoning_config = {"enabled": False, "effort": "none", "max_tokens": 0}

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=TEMPERATURE,
        max_tokens=MAX_OUTPUT_TOKENS,
        response_format={"type": "json_object"},
        extra_body={"reasoning": reasoning_config},
    )
    content = resp.choices[0].message.content or "{}"
    return content


def extract_batch(blocks: list, model: str, thinking: bool) -> list:
    combined = "\n\n<!-- NEXT BLOCK -->\n\n".join(b["html"] for b in blocks)
    qnums    = [str(b.get("qnum", "?")) for b in blocks]
    user_msg = (
        f"Extract questions: {', '.join(qnums)}\n\n"
        f"QUESTION BLOCKS (HTML):\n{combined}"
    )
    raw     = _call_llm(model, SYSTEM_PROMPT, user_msg, thinking=thinking)
    cleaned = clean_raw_json_response(raw)
    try:
        data = json.loads(cleaned)
        qs = data.get("questions", [])
        if not qs:
            print(f"  [llm] ⚠️ Warning: Batch {qnums[0]}..{qnums[-1]} returned 0 questions.\nRaw snippet: {raw[:400]}...", file=sys.stderr)
        return qs
    except json.JSONDecodeError as exc:
        print(f"  [llm] ❌ JSON parse error in batch {qnums[0]}..{qnums[-1]}: {exc}\nRaw snippet: {raw[:400]}...", file=sys.stderr)
        return []


def repair_question(qnum: int, block_html: str, broken_q: dict,
                    defects: list, model: str, thinking: bool) -> dict | None:
    images = re.findall(r'<img[^>]+src="([^"]+)"', block_html)
    manifest = "\n".join(f"  - {img}" for img in images) or "  (none)"
    user_msg = REPAIR_PROMPT_TEMPLATE.format(
        qnum=qnum,
        defects="\n".join(f"  - {d}" for d in defects),
        block_html=block_html,
        image_manifest=manifest,
        broken_json=json.dumps({"questions": [broken_q]}, ensure_ascii=False),
    )
    raw     = _call_llm(model, SYSTEM_PROMPT, user_msg, thinking=thinking)
    cleaned = clean_raw_json_response(raw)
    try:
        qs = json.loads(cleaned).get("questions", [])
        return qs[0] if qs else None
    except json.JSONDecodeError:
        return None


# ── Batching ──────────────────────────────────────────────────────────────────

def run_extraction(blocks: list, model: str, thinking: bool) -> list:
    all_questions: list = []
    batch:  list = []
    batch_chars = 0

    def flush():
        nonlocal batch, batch_chars
        if not batch:
            return
        qnums = [b.get("qnum", "?") for b in batch]
        print(f"[llm_extractor] {model} (thinking={'ON' if thinking else 'OFF'}) — batch {qnums[0]}…{qnums[-1]} "
              f"({len(batch)} blocks, ~{batch_chars} chars)")
        qs = extract_batch(batch, model, thinking)
        print(f"  → {len(qs)} questions")
        all_questions.extend(qs)
        batch.clear()
        batch_chars = 0  # type: ignore[assignment]

    for block in blocks:
        chars = len(block.get("html", ""))
        if batch and batch_chars + chars > BATCH_CHARS:
            flush()
        batch.append(block)
        batch_chars += chars
    flush()
    return all_questions


def repair_pass(questions: list, blocks: list, model: str, thinking: bool) -> list:
    block_map = {b.get("qnum"): b for b in blocks}
    result = []
    for q in questions:
        defects = diagnose_question(q)
        if not defects:
            result.append(q); continue
        qnum = q.get("question_number")
        print(f"  [llm] Q{qnum} — {len(defects)} defect(s), repairing…")
        block     = block_map.get(qnum)
        block_html = block["html"] if block else ""
        fixed = repair_question(qnum, block_html, q, defects, model, thinking)
        result.append(fixed if fixed else q)
    return result


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_page_set(pages_str: str | None) -> set | None:
    if not pages_str:
        return None
    ps: set = set()
    for part in pages_str.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            ps.update(range(int(a), int(b) + 1))
        else:
            ps.add(int(part))
    return ps


def main():
    parser = argparse.ArgumentParser(description="OpenRouter LLM question extractor")
    parser.add_argument("dir", help="extracted_data dir from pymupdf_extractor.py")
    parser.add_argument(
        "--model", default=None,
        help=f"OpenRouter model ID (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--thinking", choices=["on", "off"], default="on",
        help="Toggle reasoning/thinking ON for JEE and OFF for NEET (default: on)",
    )
    parser.add_argument("--pages", default=None, help='Page range e.g. "1-5,8"')
    args = parser.parse_args()

    model    = args.model or DEFAULT_MODEL
    thinking = (args.thinking == "on")
    work_dir = Path(args.dir)
    raw_json = work_dir / "marker_raw.json"
    out_path = work_dir / "all_extracted_data.json"

    if not raw_json.exists():
        print(f"[llm_extractor] ❌  marker_raw.json not found in {work_dir}", file=sys.stderr)
        sys.exit(1)

    raw_data    = json.loads(raw_json.read_text(encoding="utf-8"))
    pages       = raw_data.get("json", {}).get("children", [])
    page_filter = parse_page_set(args.pages)
    blocks, _   = segment_questions(pages)
    if page_filter:
        blocks = [b for b in blocks if set(b.get("pages", [])) & page_filter]

    print(f"[llm_extractor] model={model}  thinking={args.thinking.upper()}  blocks={len(blocks)}"
          + (f"  pages={args.pages}" if args.pages else ""))

    if not blocks:
        out_path.write_text(
            json.dumps({"questions": []}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print("[llm_extractor] No blocks — wrote empty result.")
        return

    questions = run_extraction(blocks, model, thinking)
    print(f"[llm_extractor] Primary extraction: {len(questions)} questions")

    questions = repair_pass(questions, blocks, model, thinking)

    out_path.write_text(
        json.dumps({"questions": questions}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[llm_extractor] ✅  {len(questions)} questions → {out_path.name}")


if __name__ == "__main__":
    main()
