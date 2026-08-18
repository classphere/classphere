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

# ── LLM fallback ──────────────────────────────────────────────────────────────
# Trigger when regex found too few answers — either in absolute terms (< 10)
# or relative to the paper's expected size (< 50% coverage). An 80-question
# paper where regex matched 10 answers (12.5%) should not skip the LLM just
# because 10 >= 10.
regex_coverage = len(answers) / MAX_QNUM if MAX_QNUM > 0 else 1.0
needs_llm = len(answers) < 10 or (MAX_QNUM >= 20 and regex_coverage < 0.5)
page_images: list[str] = []  # rendered PNG data URLs, shared between answer + solution extraction
if needs_llm and total_pages >= 1:
    print(f"[parse_pdf_answer_key] Regex found only {len(answers)} ({regex_coverage:.0%} coverage) — trying Gemini vision fallback")
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

    if api_key:
        try:
            import base64
            from openai import OpenAI
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                timeout=120,
                max_retries=0,
                default_headers={
                    "HTTP-Referer": "https://classphere.com",
                    "X-Title": "Classphere Answer Key Extractor",
                },
            )

            GEMINI_ANSWER_PROMPT = """You are a careful answer-key extractor for Indian competitive exams (JEE Main, JEE Advanced, NEET-UG).

The attached image(s) are pages from an answer-key or solutions PDF. Extract ONLY the answer mappings that are EXPLICITLY written — do NOT guess, infer, or solve any question.

The format varies by coaching institute:
- Option numbers in parentheses: "1. (4)" → answer is "4"
- Letters: "1. A" or "1. (B)" → answer is "A" or "B"
- Lowercase: "1. (b)" → answer is "B" (uppercase it)
- Arrow notation: "1→4" or "Q1→C"
- Tabular grids with Q.No and Answer columns
- MSQ (multiple correct): "1. (1,4)" → answers are ["1", "4"]
- Numerical: "1. 42" or "1. -3.5" → answer is "42" or "-3.5"

Output a JSON object: keys = question numbers as strings, values = list of raw answer tokens as strings.
Keep numbers as numbers ("4" stays "4"), keep letters as uppercase letters ("a" → "A").
The downstream system handles the 1→A conversion — do NOT convert here.

Example: {"1": ["4"], "2": ["3"], "3": ["A"], "4": ["B", "D"], "5": ["42"]}

If you cannot find any answer key in these pages, return: {}
Return ONLY valid JSON. No markdown, no code fences, no explanation."""

            # Render PDF pages to PNG for Gemini vision
            DPI = 150  # Good balance of quality vs size
            page_images = []
            for page_idx in range(total_pages):
                pix = doc[page_idx].get_pixmap(dpi=DPI)
                png_bytes = pix.tobytes("png")
                b64 = base64.b64encode(png_bytes).decode("ascii")
                page_images.append(f"data:image/png;base64,{b64}")
            print(f"[parse_pdf_answer_key] Rendered {len(page_images)} page(s) as PNG for Gemini")

            # Send all pages in one call (answer key PDFs are typically 1-5 pages)
            gemini_model = os.environ.get("GEMINI_MODEL", "google/gemini-3.1-flash-lite")
            content_parts: list[dict] = [{"type": "text", "text": f"This answer key PDF has {total_pages} page(s). Extract all answer mappings from every page."}]
            for img_url in page_images:
                content_parts.append({"type": "image_url", "image_url": {"url": img_url}})

            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model=gemini_model,
                        messages=[
                            {"role": "system", "content": GEMINI_ANSWER_PROMPT},
                            {"role": "user", "content": content_parts},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.0,
                        max_tokens=8000,
                    )
                    raw_output = resp.choices[0].message.content or "{}"
                    # Strip markdown fences if present
                    raw_output = raw_output.strip()
                    if raw_output.startswith("```"):
                        lines = raw_output.splitlines()
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].strip() == "```":
                            lines = lines[:-1]
                        raw_output = "\n".join(lines).strip()

                    llm_answers = json.loads(raw_output)
                    llm_count = 0
                    for qnum, ans_list in llm_answers.items():
                        qnum_int = int(qnum) if qnum.isdigit() else -1
                        if qnum_int < 1 or qnum_int > MAX_QNUM:
                            continue
                        if qnum not in answers and isinstance(ans_list, list):
                            answers[qnum] = [str(a).upper() if len(str(a)) == 1 and str(a).isalpha() else str(a) for a in ans_list]
                            llm_count += 1
                    print(f"[parse_pdf_answer_key] Gemini vision added {llm_count} new answers (total: {len(answers)})")
                    break
                except Exception as e:
                    print(f"[parse_pdf_answer_key] Gemini vision attempt {attempt + 1} failed: {e}")
        except ImportError:
            print("[parse_pdf_answer_key] openai package not installed — skipping Gemini fallback")
    else:
        print("[parse_pdf_answer_key] No OPENROUTER_API_KEY — skipping Gemini fallback")
else:
    if not needs_llm:
        print(f"[parse_pdf_answer_key] Regex found {len(answers)} answers ({regex_coverage:.0%} coverage) — no LLM fallback needed")

# ── Solution extraction (LLM, only if solutions exist) ────────────────────────
solution_markers = len(re.findall(r'(?i)\bAnswer\s*[:\-]|Solution\s*[:\-]|Sol\.\s', combined_text))
has_solutions = solution_markers >= 5

solutions: dict[str, str] = {}

if has_solutions:
    print(f"[parse_pdf_answer_key] Detected {solution_markers} solution markers — extracting solutions via Gemini vision")

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

    if not api_key:
        print("[parse_pdf_answer_key] No OPENROUTER_API_KEY — skipping solution extraction")
    else:
        try:
            import base64
            from openai import OpenAI
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                timeout=120,
                max_retries=0,
                default_headers={
                    "HTTP-Referer": "https://classphere.com",
                    "X-Title": "Classphere Solution Extractor",
                },
            )

            SOLUTION_PROMPT = """You are a solution extractor for Indian competitive exam papers (JEE/NEET).
The attached image(s) are pages from an answer key + solutions PDF. For each
question number, extract the WORKED SOLUTION — the steps, derivation, or
explanation shown after the answer. Skip the answer letter/number itself.

Return JSON: keys = question numbers (strings), values = solution text (string).
Write all math as LaTeX between $...$ delimiters. Preserve the logical steps.

Example: {"1": "Using $v = u + at$, we get $v = 0 + 10(2) = 20$ m/s", "2": "From lens formula $\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f}$..."}

If a question has no worked solution (just an answer letter), omit it.
Return ONLY valid JSON. No markdown, no code fences."""

            # Render pages if not already done
            if not page_images:
                DPI = 150
                page_images = []
                for page_idx in range(total_pages):
                    pix = doc[page_idx].get_pixmap(dpi=DPI)
                    png_bytes = pix.tobytes("png")
                    b64 = base64.b64encode(png_bytes).decode("ascii")
                    page_images.append(f"data:image/png;base64,{b64}")

            gemini_model = os.environ.get("GEMINI_MODEL", "google/gemini-3.1-flash-lite")
            content_parts: list[dict] = [{"type": "text", "text": f"This solutions PDF has {total_pages} page(s). Extract worked solutions for every question."}]
            for img_url in page_images:
                content_parts.append({"type": "image_url", "image_url": {"url": img_url}})

            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model=gemini_model,
                        messages=[
                            {"role": "system", "content": SOLUTION_PROMPT},
                            {"role": "user", "content": content_parts},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.1,
                        max_tokens=16000,
                    )
                    raw_output = resp.choices[0].message.content or "{}"
                    raw_output = raw_output.strip()
                    if raw_output.startswith("```"):
                        lines = raw_output.splitlines()
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].strip() == "```":
                            lines = lines[:-1]
                        raw_output = "\n".join(lines).strip()
                    solutions = json.loads(raw_output)
                    print(f"[parse_pdf_answer_key] Gemini vision extracted {len(solutions)} solutions")
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
