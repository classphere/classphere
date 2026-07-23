"""
parse_pdf_answer_key.py  (v2 — full-document, regex-first, solution-aware)
==========================================================================
Parses an answer-key / solutions PDF into:
  {
    "answers":   { "1": ["A"], "2": ["C"], ... },   # option letters
    "solutions": { "1": "solution text...", ... }    # worked solutions (if present)
  }

v2 fixes vs v1:
  1. Reads ALL pages, not just the last 3. Aakash/Allen answer keys put the
     answer table on page 1 and solutions after — v1 missed the table entirely.
  2. Regex-first answer extraction (deterministic, no LLM needed for the key):
     matches "1. (4)", "27) (2)", "Q3  (1)" etc. across multi-column layouts.
     Converts (1)->A, (2)->B, (3)->C, (4)->D so it matches platform option ids.
     MSQ like "(1,4)" -> ["A","D"]. Numerical answers ("42", "-3.5") kept as-is.
  3. Solution extraction via Cerebras LLM: if the PDF contains worked solutions
     ("Answer : (4)" followed by steps), extract them per question into the
     solutions map. Skipped if no solution text is found (pure answer-key PDF).

Usage:
    python parse_pdf_answer_key.py <pdf_path> <output_json_path>
"""

import os
import re
import sys
import json
import fitz
from pathlib import Path

# Force stdout/stderr to use UTF-8 encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Setup ─────────────────────────────────────────────────────────────────────
if len(sys.argv) < 3:
    print("Usage: python parse_pdf_answer_key.py <pdf_path> <output_json_path>")
    sys.exit(1)

PDF_PATH = Path(sys.argv[1]).resolve()
OUTPUT_JSON = Path(sys.argv[2]).resolve()

# ── Read ALL pages ────────────────────────────────────────────────────────────
doc = fitz.open(str(PDF_PATH))
total_pages = len(doc)

all_text = []
for idx in range(total_pages):
    page_text = doc[idx].get_text()
    all_text.append(f"\n--- PAGE {idx + 1} ---\n{page_text}")

combined_text = "\n".join(all_text)
print(f"[parse_pdf_answer_key] Read all {total_pages} pages ({len(combined_text)} chars)")

# ── Regex-first answer extraction ─────────────────────────────────────────────
# Matches patterns like:
#   1. (4)     27) (2)     Q3 (1)     145.(3)
#   1. 42      27) -3.5    (numerical)
#   1. (1,4)   (multiple correct / MSQ)
ANSWER_RE = re.compile(
    r'(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[.)]\s*'   # question number + delimiter
    r'\(?\s*'                                          # optional opening paren
    r'((?:-?\d+(?:\.\d+)?)'                            # numerical answer
    r'|(?:[1-4](?:\s*[,/]\s*[1-4])*)'                  # option number(s) 1-4
    r'|(?:[A-D](?:\s*[,/]\s*[A-D])*)'                  # or letter(s) A-D
    r')'
    r'\s*\)?',                                         # optional closing paren
    re.IGNORECASE
)

NUM_TO_LETTER = {"1": "A", "2": "B", "3": "C", "4": "D"}


def normalize_answer(raw: str) -> list:
    """Convert a raw answer token to a list of option letters or a numeric string."""
    raw = raw.strip()
    # MSQ: "1,4" or "1/4" or "A,C"
    if re.match(r'^([1-4A-Da-d])(\s*[,/]\s*([1-4A-Da-d]))+$', raw):
        parts = re.split(r'[,/]', raw)
        letters = []
        for p in parts:
            p = p.strip().upper()
            if p in NUM_TO_LETTER:
                letters.append(NUM_TO_LETTER[p])
            elif p in "ABCD":
                letters.append(p)
        return letters if letters else [raw]
    # Single option number
    if raw in NUM_TO_LETTER:
        return [NUM_TO_LETTER[raw]]
    # Single letter
    if raw.upper() in "ABCD":
        return [raw.upper()]
    # Numerical answer — keep as string
    if re.match(r'^-?\d+(?:\.\d+)?$', raw):
        return [raw]
    return [raw]


answers: dict[str, list] = {}
for m in ANSWER_RE.finditer(combined_text):
    qnum = m.group(1)
    raw_ans = m.group(2)
    # Skip false positives: question numbers > 400, or answer that's just the qnum
    qnum_int = int(qnum)
    if qnum_int < 1 or qnum_int > 400:
        continue
    if qnum == raw_ans:
        continue
    normalized = normalize_answer(raw_ans)
    if normalized:
        # Don't overwrite an existing answer (first match wins — answer tables
        # come before solutions in the PDF, and the table is authoritative)
        if qnum not in answers:
            answers[qnum] = normalized

print(f"[parse_pdf_answer_key] Regex extracted {len(answers)} answers")

# ── Solution extraction (LLM, only if solutions exist) ────────────────────────
# Detect if this PDF has worked solutions (not just a bare answer table).
# Heuristic: "Answer :" or "Solution:" or "Sol." appears multiple times.
solution_markers = len(re.findall(r'(?i)\bAnswer\s*[:\-]|Solution\s*[:\-]|Sol\.\s', combined_text))
has_solutions = solution_markers >= 5

solutions: dict[str, str] = {}

if has_solutions:
    print(f"[parse_pdf_answer_key] Detected {solution_markers} solution markers — extracting solutions via LLM")

    # Load Cerebras keys (lazy)
    KEYS_FILE = Path(__file__).parent / "api_keys.txt"
    api_keys = []
    if KEYS_FILE.exists():
        api_keys = [k.strip() for k in KEYS_FILE.read_text().splitlines()
                    if k.strip() and not k.startswith("#")]
    if not api_keys and os.environ.get("CEREBRAS_API_KEY"):
        api_keys.append(os.environ["CEREBRAS_API_KEY"])

    if not api_keys:
        print("[parse_pdf_answer_key] No Cerebras keys — skipping solution extraction")
    else:
        try:
            from cerebras.cloud.sdk import Cerebras
            clients = [Cerebras(api_key=k) for k in api_keys]
            client_idx = [0]

            def get_client():
                c = clients[client_idx[0] % len(clients)]
                client_idx[0] += 1
                return c

            SOLUTION_PROMPT = """You are a solution extractor for competitive exam papers (JEE/NEET).
Below is the text from an answer key + solutions PDF. For each question number,
extract the WORKED SOLUTION text (the steps/explanation after "Answer : (X)").
Skip the answer letter itself — only extract the solution steps.

Return a JSON object where keys are question numbers (as strings) and values
are the solution text (as a single string, preserving math as LaTeX in $...$).

Example output:
{
  "1": "Using $t = \\\\frac{A}{a}\\\\sqrt{\\\\frac{2H}{g}}$, we get $t \\\\propto \\\\sqrt{H}$...",
  "2": "From the lens formula $\\\\frac{1}{v} - \\\\frac{1}{u} = \\\\frac{1}{f}$..."
}

If a question has no solution text, omit it from the output.
Return ONLY valid JSON. No markdown, no code fences."""

            def clean_json(raw):
                if not raw:
                    return "{}"
                raw = str(raw).strip()
                if raw.startswith("```"):
                    lines = raw.splitlines()
                    if lines and lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    raw = "\n".join(lines).strip()
                return raw

            # Send the full text (may need to chunk for very large PDFs)
            max_chars = 50000
            text_to_send = combined_text[:max_chars]
            if len(combined_text) > max_chars:
                print(f"  (truncating solutions text from {len(combined_text)} to {max_chars} chars)")

            for attempt in range(3):
                try:
                    client = get_client()
                    resp = client.chat.completions.create(
                        model="gpt-oss-120b",
                        messages=[
                            {"role": "system", "content": SOLUTION_PROMPT},
                            {"role": "user", "content": text_to_send},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.1,
                        max_tokens=8000,
                    )
                    raw_output = resp.choices[0].message.content
                    cleaned = clean_json(raw_output)
                    solutions = json.loads(cleaned)
                    print(f"[parse_pdf_answer_key] LLM extracted {len(solutions)} solutions")
                    break
                except Exception as e:
                    print(f"[parse_pdf_answer_key] Solution extraction attempt {attempt + 1} failed: {e}")
        except ImportError:
            print("[parse_pdf_answer_key] cerebras-cloud-sdk not installed — skipping solutions")
else:
    print("[parse_pdf_answer_key] No solution markers found — pure answer key, skipping LLM")

# ── Output ────────────────────────────────────────────────────────────────────
result = {
    "answers": answers,
    "solutions": solutions,
}

OUTPUT_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"[parse_pdf_answer_key] Output written to {OUTPUT_JSON}")
print(f"  Answers:   {len(answers)} entries")
print(f"  Solutions: {len(solutions)} entries")
