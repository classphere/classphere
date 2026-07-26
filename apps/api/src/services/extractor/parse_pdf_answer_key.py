"""
parse_pdf_answer_key.py  (v3 — broad-regex, format-agnostic, LLM-fallback)
==========================================================================
Parses an answer-key / solutions PDF into:
  {
    "answers":   { "1": ["4"], "2": ["3"], ... },    # RAW answers (no conversion)
    "solutions": { "1": "solution text...", ... }     # worked solutions (if present)
  }

DESIGN PHILOSOPHY: the answer key itself must be extracted deterministically
(offline regex). An LLM can hallucinate a wrong answer — that's worse than
missing one. So:

  1. Primary path = broad regex covering every coaching format:
     - Aakash:    1. (4)    27) (2)    145.(3)
     - Allen:     1. A      2. C       3. (B)
     - Resonance: Q.1->(C)  1->B       27. (d)
     - Lowercase: 1. (a)    2. b
     - MSQ:       1. (1,4)  2. (B,D)   3. A,C
     - Numerical: 1. 42     2. -3.5    3. 0.25
     - Tables:    multi-column layouts where qnum and answer are on the same line
     - Arrow:     1->4      2->C       3->(2)

  2. Answers are output RAW — no 1->A conversion here. The controller does the
     conversion because only it knows the question type (MCQ vs numerical).
     - MCQ with 4 options:  "4" -> "D",  "1" -> "A"
     - Numerical:           "42" stays "42"
     This prevents the catastrophic case where "4" was a numerical answer but
     got converted to "D" (which doesn't exist on a numerical question).

  3. LLM fallback ONLY when regex finds < 10 answers (a non-standard or garbled
     key the regex couldn't parse). The LLM prompt is conservative: extract
     ONLY what's explicitly written, never guess. Regex answers always take
     priority over LLM answers.

  4. Solutions: if the PDF has worked solutions (>=5 "Answer :"/"Solution:"
     markers), extract them via LLM. Solutions are explanatory text — LLM
     hallucination there is far less dangerous than a wrong answer letter.

Usage:
    python parse_pdf_answer_key.py <pdf_path> <output_json_path>
"""

import os
import re
import sys
import json
import fitz
from pathlib import Path

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
    print("Usage: python parse_pdf_answer_key.py <pdf_path> <output_json_path> [max_question_number]")
    sys.exit(1)

PDF_PATH = Path(sys.argv[1]).resolve()
OUTPUT_JSON = Path(sys.argv[2]).resolve()
# Optional upper bound supplied by the upload controller from the extracted
# paper. It prevents solution equations such as "T' = 300 (4)^{1/2}" from
# becoming a fictitious answer-key entry Q300→4. Standalone default stays 400.
EXPECTED_MAX_QNUM = int(sys.argv[3]) if len(sys.argv) >= 4 else 400

# ── Read ALL pages ────────────────────────────────────────────────────────────
doc = fitz.open(str(PDF_PATH))
total_pages = len(doc)

all_text = []
for idx in range(total_pages):
    page_text = doc[idx].get_text()
    all_text.append(f"\n--- PAGE {idx + 1} ---\n{page_text}")

combined_text = "\n".join(all_text)
print(f"[parse_pdf_answer_key] Read all {total_pages} pages ({len(combined_text)} chars)")

# ── Broad regex answer extraction ─────────────────────────────────────────────
# Each pattern captures (question_number, raw_answer_token). The controller
# decides whether the token is an option index (1-4) to convert to A-D, or a
# numerical answer to keep as-is.

# Pattern A: "1. (4)" / "27) (2)" / "145.(3)" / "Q3 (1)"
PAT_PAREN = re.compile(
    r'(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[.)\-:]?\s*'
    r'\(\s*'
    r'([1-4A-Da-d](?:\s*[,/]\s*[1-4A-Da-d])*)'
    r'\s*\)',
    re.IGNORECASE
)

# Pattern B: "1. A" / "2. C" / "27) B" / "Q.3 d"
PAT_LETTER = re.compile(
    r'(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[.)\-:]\s*'
    r'([A-Da-d](?:\s*[,/]\s*[A-Da-d])*)'
    r'(?!\s*\d)',
    re.IGNORECASE
)

# Pattern C: "1. 42" / "2. -3.5" / "27) 0.25"
PAT_NUMERICAL = re.compile(
    r'(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[.)\-:]\s*'
    r'(-?\d+(?:\.\d+)?)'
    r'(?!\s*\d)',
)

# Pattern D: "1->4" / "2->C" / "3->(2)"
PAT_ARROW = re.compile(
    r'(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:->|→)\s*'
    r'\(?\s*([1-4A-Da-d](?:\s*[,/]\s*[1-4A-Da-d])*)'
    r'\s*\)?',
    re.IGNORECASE
)

# Pattern E: "1->42" / "2->-3.5"
PAT_ARROW_NUM = re.compile(
    r'(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:->|→)\s*'
    r'(-?\d+(?:\.\d+)?)',
)

# Pattern F: "1 4" / "2 3" — whitespace-separated, whole-line match only.
# Used only when other patterns found few answers and the page looks like a
# compact answer table (many short "N X" lines).
PAT_SPACE = re.compile(
    r'^(\d{1,3})\s+([1-4A-Da-d])\s*$',
    re.IGNORECASE | re.MULTILINE
)

ALL_PATTERNS = [
    ("paren", PAT_PAREN),
    ("letter", PAT_LETTER),
    ("arrow", PAT_ARROW),
    ("arrow_num", PAT_ARROW_NUM),
    ("numerical", PAT_NUMERICAL),
]

MAX_QNUM = EXPECTED_MAX_QNUM


def extract_answers_regex(text: str) -> dict:
    answers: dict[str, list] = {}

    def try_add(qnum: str, raw: str):
        qnum_int = int(qnum)
        if qnum_int < 1 or qnum_int > MAX_QNUM:
            return
        if qnum == raw:
            return
        parts = re.split(r'[,/]', raw)
        parts = [p.strip().upper() for p in parts if p.strip()]
        if not parts:
            return
        if qnum not in answers:
            answers[qnum] = parts

    for _, pat in ALL_PATTERNS:
        for m in pat.finditer(text):
            try_add(m.group(1), m.group(2))

    if len(answers) < 10:
        space_matches = PAT_SPACE.findall(text)
        if len(space_matches) >= 5:
            for qnum, raw in space_matches:
                try_add(qnum, raw)

    return answers


answers = extract_answers_regex(combined_text)
print(f"[parse_pdf_answer_key] Regex extracted {len(answers)} answers")

# ── LLM fallback (only if regex found < 10) ───────────────────────────────────
if len(answers) < 10 and total_pages >= 1:
    print(f"[parse_pdf_answer_key] Regex found only {len(answers)} — trying LLM fallback")
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                default_headers={
                    "HTTP-Referer": "https://classphere.com",
                    "X-Title": "Classphere PDF Extractor",
                },
            )

            LLM_ANSWER_PROMPT = """You are a careful answer-key extractor for Indian competitive exams (JEE/NEET).
Below is text extracted from an answer-key PDF. Extract ONLY the answer
mappings that are EXPLICITLY written in the text. Do NOT guess, infer, or
fill in answers that aren't there.

The format varies by coaching:
- Some use option numbers: "1. (4)" -> answer is "4"
- Some use letters: "1. A" -> answer is "A"
- Some use lowercase: "1. (b)" -> answer is "B"
- Some use mixed: MCQs as letters, numericals as raw numbers
- MSQ: "1. (1,4)" -> answers are "1" and "4"

Output a JSON object: keys = question numbers as strings, values = list of
raw answer tokens as strings (NO conversion — keep "4" as "4", "A" as "A").
The downstream system will convert numbers to letters where appropriate.

Example output:
{"1": ["4"], "2": ["3"], "3": ["A"], "4": ["B", "D"], "5": ["42"], "6": ["-3.5"]}

If you cannot find any answer key in the text, return: {}
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

            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model=os.environ.get("LLM_MODEL", "deepseek/deepseek-v4-flash"),
                        messages=[
                            {"role": "system", "content": LLM_ANSWER_PROMPT},
                            {"role": "user", "content": combined_text[:50000]},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.0,
                        max_tokens=4000,
                        extra_body={"reasoning": {"enabled": False, "effort": "none", "max_tokens": 0}},
                    )
                    raw_output = resp.choices[0].message.content
                    cleaned = clean_json(raw_output)
                    llm_answers = json.loads(cleaned)
                    for qnum, ans_list in llm_answers.items():
                        if qnum not in answers and isinstance(ans_list, list):
                            answers[qnum] = [str(a) for a in ans_list]
                    print(f"[parse_pdf_answer_key] LLM fallback: {len(answers)} total answers")
                    break
                except Exception as e:
                    print(f"[parse_pdf_answer_key] LLM fallback attempt {attempt + 1} failed: {e}")
        except ImportError:
            print("[parse_pdf_answer_key] openai package not installed — skipping LLM fallback")
else:
    if len(answers) >= 10:
        print(f"[parse_pdf_answer_key] Regex found {len(answers)} answers — no LLM fallback needed")

# ── Solution extraction (LLM, only if solutions exist) ────────────────────────
solution_markers = len(re.findall(r'(?i)\bAnswer\s*[:\-]|Solution\s*[:\-]|Sol\.\s', combined_text))
has_solutions = solution_markers >= 5

solutions: dict[str, str] = {}

if has_solutions:
    print(f"[parse_pdf_answer_key] Detected {solution_markers} solution markers — extracting solutions via LLM")

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

    if not api_key:
        print("[parse_pdf_answer_key] No OPENROUTER_API_KEY — skipping solution extraction")
    else:
        try:
            from openai import OpenAI
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                default_headers={
                    "HTTP-Referer": "https://classphere.com",
                    "X-Title": "Classphere PDF Extractor",
                },
            )

            SOLUTION_PROMPT = """You are a solution extractor for competitive exam papers (JEE/NEET).
Below is text from an answer key + solutions PDF. For each question number,
extract the WORKED SOLUTION text (the steps/explanation after the answer).
Skip the answer letter itself — only extract the solution steps.

Return JSON: keys = question numbers (strings), values = solution text (string,
math as LaTeX in $...$).

Example: {"1": "Using $t = \\\\frac{A}{a}\\\\sqrt{\\\\frac{2H}{g}}$...", "2": "From lens formula..."}

If a question has no solution, omit it. Return ONLY valid JSON. No markdown."""

            def clean_json_sol(raw):
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

            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model=os.environ.get("LLM_MODEL", "deepseek/deepseek-v4-flash"),
                        messages=[
                            {"role": "system", "content": SOLUTION_PROMPT},
                            {"role": "user", "content": combined_text[:50000]},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.1,
                        max_tokens=8000,
                        extra_body={"reasoning": {"enabled": False, "effort": "none", "max_tokens": 0}},
                    )
                    raw_output = resp.choices[0].message.content
                    cleaned = clean_json_sol(raw_output)
                    solutions = json.loads(cleaned)
                    print(f"[parse_pdf_answer_key] LLM extracted {len(solutions)} solutions")
                    break
                except Exception as e:
                    print(f"[parse_pdf_answer_key] Solution extraction attempt {attempt + 1} failed: {e}")
        except ImportError:
            print("[parse_pdf_answer_key] openai package not installed — skipping solutions")
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
