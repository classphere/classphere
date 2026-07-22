"""
normalize_json.py  (v2 — hint-aware, answer-key cross-checked)
===============================================================
Post-processing normalization for extracted question papers.

v2 upgrades (accuracy overhaul):
  1. Safer NEET detection: requires >=160 questions or >=10 biology-classified
     questions (v1 flipped a whole JEE paper if ONE question was mislabeled).
  2. Single-subject guard: a paper dominated by one subject is no longer
     force-split into a Physics/Chemistry/Maths layout.
  3. Section-hint-driven types: _type_hint / _section_hint recorded from real
     section headers by the extraction stage are authoritative and applied
     BEFORE structural range locks.
  4. Answer-key cross-checking (--answer-key key.json): fills correct_answer,
     sets numerical_answer, and corrects question_type from the answer shape
     (numeric answer → integer; letters → MCQ/MSQ).
  5. Platform schema output (default): uuid ids, question_images /
     explanation_images arrays, options[].image_url, and platform type names
     mcq_single / mcq_multi / integer. Use --legacy-types to keep
     MCQ/MSQ/Numerical for older consumers.
  6. Machine-readable QA report (--report path or <input>.report.json).

Usage:
    python normalize_json.py <json_file> [--answer-key key.json]
        [--images-dir dir] [--legacy-types] [--report report.json]
"""

import argparse
import json
import re
import sys
import uuid
from collections import Counter
from pathlib import Path

# Force stdout/stderr to use UTF-8 encoding on Windows to prevent console print crashes
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

try:
    from extract_common import (diagnose_question, KNOWN_LATEX_COMMANDS,
                                 vector_math_signature)
except ImportError:
    diagnose_question = None
    KNOWN_LATEX_COMMANDS = set()
    vector_math_signature = None

SUBJECT_MAP = {
    "physics": "Physics",
    "chemistry": "Chemistry",
    "mathematics": "Mathematics",
    "maths": "Mathematics",
    "math": "Mathematics",
    "biology": "Biology",
    "botany": "Biology",
    "zoology": "Biology",
    "electronics": "Physics",
    "unknown": "",
    "": "",
}

TYPE_MAP = {
    "mcq": "MCQ", "multiple_choice": "MCQ", "multiple choice": "MCQ",
    "single correct": "MCQ", "single_correct": "MCQ", "scq": "MCQ",
    "mcq_single": "MCQ",
    "msq": "MSQ", "multiple select": "MSQ", "multiple_select": "MSQ",
    "multi correct": "MSQ", "multi_correct": "MSQ", "multiple correct": "MSQ",
    "mcq_multi": "MSQ",
    "numerical": "Numerical", "numerical type": "Numerical",
    "numerical_type": "Numerical", "integer": "Numerical",
    "integer type": "Numerical", "numeric": "Numerical",
    "matching": "Matching", "match the following": "Matching",
    "matrix match": "Matching",
    "assertion-reason": "Assertion-Reason", "assertion reason": "Assertion-Reason",
    "assertion_reason": "Assertion-Reason",
    "": "MCQ",
}

# Internal → platform type names (doc §4 schema)
PLATFORM_TYPE = {
    "MCQ": "mcq_single",
    "MSQ": "mcq_multi",
    "Numerical": "integer",
    "Matching": "mcq_single",
    "Assertion-Reason": "mcq_single",
}

MD_IMG_RE = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')

# ── LaTeX well-formedness (deterministic last line of defense) ────────────────

# A math span already in $...$ or $$...$$ — protected from re-wrapping.
_MATH_SPAN_RE = re.compile(r'\$\$.*?\$\$|\$[^$]*\$', re.DOTALL)
# A bare LaTeX macro plus any brace-group arguments (one level of nesting).
_BARE_MACRO_RE = re.compile(r'\\[a-zA-Z]+(?:\s*\{(?:[^{}]|\{[^{}]*\})*\})*')
# Bare relational/arrow unicode that should be math (rendered literally otherwise
# only in some fonts, but wrapping is safe and consistent).
_BARE_UNICODE_MATH = "→←↔⇌⇒⇐≤≥≠≈∈∉∝∞±∓×÷⋅√∑∏∫"
_BARE_UNICODE_RE = re.compile(f'[{re.escape(_BARE_UNICODE_MATH)}]')


# A double-escaped newline leaks as a literal "\n" (backslash+n). We must NOT
# touch real LaTeX macros that start with n (\nu, \neq, \nabla, ...), \r
# (\rightarrow, \rho), \t (\times, \theta), \f (\frac), \v (\vec). So we only
# rewrite a "\n…" token when it is NOT a known LaTeX command.
_BACKSLASH_N_RE = re.compile(r'\\(n[a-zA-Z]*)')


def _fix_literal_newlines(text: str) -> str:
    """Rewrite a double-escaped literal "\\n" to a REAL newline, but NEVER
    corrupt a real LaTeX macro. A "\\n" is a newline escape only when it is
    followed by a non-letter, a digit, or an UPPERCASE letter (i.e. a new
    sentence/token) — cases that cannot be a lowercase macro like \\nu, \\ne,
    \\neq, \\nabla, \\natural. The frontend (marked, breaks:true) renders a real
    newline as <br>, so we preserve structure instead of flattening to a space."""
    # \n directly before a non-letter or end (e.g. "\n(1)", "\n ", "\n2")
    text = re.sub(r'\\n(?![A-Za-z])', '\n', text)
    # \n before an uppercase word ("\nList", "\nCompound") — a sentence start,
    # never a (lowercase) LaTeX macro.
    text = re.sub(r'\\n(?=[A-Z])', '\n', text)
    return text
# Degenerate / empty math spans that render as stray symbols or empty parens.
_EMPTY_MATH_RE = re.compile(
    r'\$\s*\$'                                  # $ $
    r'|\$\s*\\,\s*\$'                           # $\,$
    r'|\$\s*\\bigl\(\s*\\,?\s*\\bigr\)\s*\$'    # $\bigl(\,\bigr)$
    r'|\$\s*\\left\(\s*\\right\)\s*\$'          # $\left(\right)$
    r'|\$\s*\(\s*\)\s*\$'                       # $()$
    r'|\$\s*\\\(\s*\\\)\s*\$'                   # $\(\)$
)


_TABLE_SEP_RE = re.compile(r'^\s*\|?[\s:|]*-{3,}[\s:|-]*\|?\s*$')


def _row_key(line: str) -> str:
    return re.sub(r'\s+', '', line)


def merge_markdown_tables(text: str) -> str:
    """Merge consecutive markdown tables that share the same header into one.

    Marker/OCR frequently splits ONE logical table (a 'Match the columns'
    layout, or a table broken across a page boundary) into several tables, each
    repeating the '| Column I | Column II |' header. Rendered, that's broken
    header-soup. Here we drop the repeated header+separator so the body rows
    join a single table."""
    if "|" not in text or "---" not in text:
        return text
    lines = text.split("\n")
    out, cur_header = [], None
    i = 0
    while i < len(lines):
        ln = lines[i]
        is_header = (ln.strip().startswith("|") and i + 1 < len(lines)
                     and _TABLE_SEP_RE.match(lines[i + 1]))
        if is_header:
            if cur_header is not None and _row_key(ln) == _row_key(cur_header):
                # same table continuing → skip duplicate header+separator and
                # any blank lines we buffered between the two fragments
                while out and out[-1].strip() == "":
                    out.pop()
                i += 2
                continue
            cur_header = ln
            out.append(lines[i]); out.append(lines[i + 1]); i += 2
            continue
        if ln.strip().startswith("|") or ln.strip() == "":
            out.append(ln); i += 1; continue     # table body row or blank
        cur_header = None                         # real prose → table ended
        out.append(ln); i += 1
    return "\n".join(out)


def _balance_dollars(text: str) -> str:
    """If a string has an odd number of unescaped $, drop the last unescaped one
    so the remainder still parses as valid inline math (prevents a runaway
    math span that swallows the rest of the option/stem)."""
    idxs = [i for i, ch in enumerate(text)
            if ch == '$' and (i == 0 or text[i - 1] != '\\')]
    if len(idxs) % 2 == 0:
        return text
    j = idxs[-1]
    return text[:j] + text[j + 1:]


def sanitize_text(text: str) -> str:
    """Deterministic rendering hygiene applied before LaTeX wrapping:
      • literal \\n / \\t / \\r escape sequences → space (fixes the red '\\n'
        artifact from double-escaped strings)
      • real newlines PRESERVED (frontend renders \n as <br>; supports GFM tables/lists)
      • degenerate empty math spans removed (e.g. an emptied-out binomial)
      • whitespace collapsed; unbalanced $ repaired."""
    if not text:
        return text
    text = _fix_literal_newlines(text)
    text = text.replace('\r\n', '\n').replace('\r', '\n').replace('\t', ' ')
    text = _EMPTY_MATH_RE.sub(' ', text)
    text = merge_markdown_tables(text)
    text = re.sub(r'[  ]{2,}', ' ', text)             # collapse spaces, NOT newlines
    text = re.sub(r'[ \t]*\n[ \t]*', '\n', text)        # trim spaces around breaks
    text = re.sub(r'\n{3,}', '\n\n', text)              # at most one blank line
    text = text.strip()
    text = _balance_dollars(text)
    return text


def wrap_bare_latex(text: str) -> str:
    """Wrap LaTeX macros / math symbols that the LLM left OUTSIDE $...$ so they
    render instead of showing as literal text (e.g. a bare \\rightarrow).

    Existing $...$ spans are preserved untouched; only the plain-text gaps
    between them are scanned. Idempotent."""
    if not text or ("\\" not in text and not _BARE_UNICODE_RE.search(text)):
        return text

    def wrap_segment(seg: str) -> str:
        if not seg:
            return seg
        seg = _BARE_MACRO_RE.sub(lambda m: f"${m.group(0)}$", seg)
        seg = _BARE_UNICODE_RE.sub(lambda m: f"${m.group(0)}$", seg)
        return seg

    out, last = [], 0
    for m in _MATH_SPAN_RE.finditer(text):
        out.append(wrap_segment(text[last:m.start()]))
        out.append(m.group(0))          # keep existing math span verbatim
        last = m.end()
    out.append(wrap_segment(text[last:]))
    # Adjacent inline spans ("$f_v$ $\rightarrow$") render fine as-is; we do NOT
    # collapse them, to avoid ever touching $$ display-math delimiters.
    return "".join(out)


def clean_dead_images(text: str, available: set) -> str:
    """Remove ![image](f) references whose file is not present on disk, so the
    frontend never renders an 'Image unavailable' placeholder. If `available`
    is None (no images dir given) the text is returned unchanged."""
    if available is None or not text:
        return text

    def repl(m):
        fname = m.group(1).replace("\\", "/").split("/")[-1]
        if fname.startswith("data:") or fname in available:
            return m.group(0)
        return ""   # drop dead reference
    return re.sub(r'!\[[^\]]*\]\(([^)]+)\)', repl, text).strip()


def normalize_type(raw: str, options: list, question_text: str = "") -> str:
    key = (raw or "").strip().lower()
    normalized = TYPE_MAP.get(key)
    if normalized:
        ar_keywords = ["assertion", "reason (r)", "statement-1", "statement-2",
                       "statement 1", "statement 2"]
        if normalized == "MCQ" and any(kw in question_text.lower() for kw in ar_keywords):
            return "Assertion-Reason"
        return normalized
    if not options:
        return "Numerical"
    return "MCQ"


def apply_answer_key(questions: list, key: dict, report: dict):
    """Fill correct_answer / numerical_answer and cross-correct types."""
    filled = type_fixes = mismatches = 0
    for q in questions:
        qnum = str(q.get("question_number"))
        if qnum not in key:
            continue
        ans = key[qnum]
        if isinstance(ans, str):
            ans = [ans]
        ans = [str(a).strip() for a in ans if str(a).strip()]
        if not ans:
            continue

        q["correct_answer"] = ans
        filled += 1

        letters = [a for a in ans if re.fullmatch(r'[A-Da-d]', a)]
        numerics = [a for a in ans if re.fullmatch(r'-?\d+(\.\d+)?', a)]

        if numerics and not letters:
            q["numerical_answer"] = numerics[0]
            if q.get("question_type") != "Numerical":
                if q.get("options"):
                    # options present but numeric answer — real conflict, flag it
                    q["_needs_review"] = True
                    q["_defects"] = q.get("_defects", []) + [
                        f"answer key says numeric ({numerics[0]}) but question has options"]
                    mismatches += 1
                else:
                    q["question_type"] = "Numerical"
                    type_fixes += 1
        elif letters:
            q["correct_answer"] = [a.upper() for a in letters]
            if q.get("question_type") == "Numerical":
                q["question_type"] = "MSQ" if len(letters) > 1 else "MCQ"
                type_fixes += 1
                if not q.get("options"):
                    q["_needs_review"] = True
                    q["_defects"] = q.get("_defects", []) + [
                        "answer key says option-letter but no options extracted"]
                    mismatches += 1
            elif len(letters) > 1 and q.get("question_type") == "MCQ":
                q["question_type"] = "MSQ"
                type_fixes += 1

    report["answer_key"] = {"filled": filled, "type_fixes": type_fixes,
                            "conflicts": mismatches}
    print(f"  Answer key: filled {filled}, type fixes {type_fixes}, conflicts {mismatches}")


def detect_paper_kind(questions: list):
    """Returns ('neet'|'jee'|'single', dominant_subject_or_None)."""
    num_qs = len(questions)
    subj_counts = Counter(
        SUBJECT_MAP.get((q.get("subject") or "").strip().lower(),
                        (q.get("subject") or "").strip())
        for q in questions)
    subj_counts.pop("", None)
    bio = subj_counts.get("Biology", 0)

    if num_qs >= 160 or bio >= 10:
        return "neet", None

    if subj_counts:
        top_subj, top_n = subj_counts.most_common(1)[0]
        labeled = sum(subj_counts.values())
        if labeled >= max(5, num_qs // 2) and top_n / labeled >= 0.80:
            others = labeled - top_n
            if others <= max(2, labeled // 10):
                return "single", top_subj
    return "jee", None


def enforce_subjects(questions: list, kind: str, dominant, report: dict):
    num_qs = len(questions)

    if kind == "single":
        print(f"  Single-subject paper detected ({dominant}) — not forcing 3-subject layout")
        for q in questions:
            q["subject"] = dominant
        report["subject_layout"] = f"single:{dominant}"
        return

    if kind == "neet":
        # NTA NEET 2024-2026 official pattern:
        #   Physics  Q1–45  (45 questions)
        #   Chemistry Q46–90 (45 questions)
        #   Biology  Q91–180 (90 questions, includes Botany + Zoology)
        print("  NEET paper detected. Enforcing ranges: 1-45 Physics, 46-90 Chemistry, 91+ Biology")
        for q in questions:
            qnum = q.get("question_number", 0)
            if 1 <= qnum <= 45:
                q["subject"] = "Physics"
            elif 46 <= qnum <= 90:
                q["subject"] = "Chemistry"
            elif qnum >= 91:
                q["subject"] = "Biology"
        report["subject_layout"] = "neet"
        return

    # JEE: 3 equal sections, order detected by majority vote per section
    section_size = 30 if num_qs > 80 else 25
    print(f"  JEE paper detected. Section size: {section_size}")

    ranges = [
        (1, section_size),
        (section_size + 1, section_size * 2),
        (section_size * 2 + 1, max(num_qs, section_size * 3 + 10)),
    ]

    detected_order = []
    valid_subjects = ["Mathematics", "Physics", "Chemistry"]
    for start, end in ranges:
        section_qs = [q for q in questions if start <= q.get("question_number", 0) <= end]
        sub_counts = Counter(q.get("subject", "") for q in section_qs
                             if q.get("subject") in valid_subjects)
        detected_order.append(sub_counts.most_common(1)[0][0] if sub_counts else "Mathematics")

    if len(set(detected_order)) != 3:
        seen, resolved = set(), []
        for s in detected_order:
            if s in valid_subjects and s not in seen:
                resolved.append(s)
                seen.add(s)
        for s in valid_subjects:
            if s not in seen:
                resolved.append(s)
        detected_order = resolved

    print(f"  Enforcing detected subject layout: {detected_order}")
    report["subject_layout"] = "jee:" + ",".join(detected_order)
    for q in questions:
        qnum = q.get("question_number", 0)
        for idx, (start, end) in enumerate(ranges):
            if start <= qnum <= end:
                q["subject"] = detected_order[idx]


def apply_type_hints(questions: list, report: dict):
    """Section headers captured from the paper are authoritative for types."""
    fixes = 0
    for q in questions:
        hint = q.get("_type_hint")
        if not hint:
            continue
        qtype = q.get("question_type")
        if hint == "integer" and qtype != "Numerical":
            q["question_type"] = "Numerical"
            if q.get("options"):
                q["_warnings"] = q.get("_warnings", []) + [
                    f"cleared {len(q['options'])} options: section header says numerical"]
                q["options"] = []
            fixes += 1
        elif hint == "mcq_multi" and qtype not in ("MSQ",):
            q["question_type"] = "MSQ"
            fixes += 1
        elif hint == "mcq_single" and qtype in ("Numerical",):
            q["question_type"] = "MCQ"
            if not q.get("options"):
                q["_needs_review"] = True
                q["_defects"] = q.get("_defects", []) + [
                    "section says MCQ but no options extracted"]
            fixes += 1
    if fixes:
        print(f"  Applied section-header type hints to {fixes} question(s).")
    report["hint_type_fixes"] = fixes


def apply_structural_lock(questions: list, kind: str, report: dict):
    """JEE Main fixed MCQ/Numerical ranges (fallback where no hint exists)."""
    num_qs = len(questions)
    if kind != "jee" or not (60 <= num_qs <= 95):
        report["structural_lock"] = "not applied"
        return

    max_qnum = max((q.get("question_number", 0) for q in questions), default=0)
    if max_qnum <= 75:
        integer_ranges = [(21, 25), (46, 50), (71, 75)]
        mcq_ranges = [(1, 20), (26, 45), (51, 70)]
    else:
        integer_ranges = [(21, 30), (51, 60), (81, 90)]
        mcq_ranges = [(1, 20), (31, 50), (61, 80)]

    def in_ranges(n, rr):
        return any(lo <= n <= hi for lo, hi in rr)

    type_fixes = 0
    for q in questions:
        if q.get("_type_hint"):
            continue  # authoritative hint already applied
        qnum = q.get("question_number", 0)
        qtype = q.get("question_type", "MCQ")
        opts = q.get("options", [])

        if in_ranges(qnum, integer_ranges):
            if qtype != "Numerical":
                q["question_type"] = "Numerical"
                q["options"] = []
                type_fixes += 1
            elif opts:
                q["options"] = []
                type_fixes += 1
        elif in_ranges(qnum, mcq_ranges):
            if qtype == "Numerical":
                q["question_type"] = "MCQ"
                if not opts:
                    q["_needs_review"] = True
                    q["_defects"] = q.get("_defects", []) + [
                        f"Q{qnum} in MCQ range but extracted as Numerical with no options"]
                type_fixes += 1

    if type_fixes:
        print(f"  Applied JEE Main structural type lock to {type_fixes} question(s).")
    report["structural_lock"] = f"jee ranges, {type_fixes} fixes"


def to_platform_schema(questions: list, legacy_types: bool, available: set = None):
    """Emit doc §4 schema fields. Keeps ![image](f) markdown in text fields
    (pdfExtractor.service.ts embeds base64 from it) while also populating
    question_images / explanation_images / options[].image_url.

    When `available` (set of existing image filenames) is provided, image
    references whose file is missing are removed so the frontend never shows
    an 'Image unavailable' placeholder."""
    def resolvable(fname):
        if available is None:
            return True
        base = (fname or "").replace("\\", "/").split("/")[-1]
        return base.startswith("data:") or base in available

    for q in questions:
        q.setdefault("id", str(uuid.uuid4()))

        qt = clean_dead_images(q.get("question_text", "") or "", available)
        q["question_text"] = qt
        q["question_images"] = [f for f in MD_IMG_RE.findall(qt) if resolvable(f)]

        exp = clean_dead_images(q.get("explanation", "") or "", available)
        q["explanation"] = exp
        q["explanation_images"] = [f for f in MD_IMG_RE.findall(exp) if resolvable(f)]

        for opt in q.get("options", []) or []:
            text = clean_dead_images(opt.get("text", "") or "", available)
            opt["text"] = text
            imgs = [f for f in MD_IMG_RE.findall(text) if resolvable(f)]
            existing = opt.get("image_url")
            if existing and not resolvable(existing):
                existing = None
            opt["image_url"] = imgs[0] if imgs else (existing or None)

        if not legacy_types:
            q["question_type"] = PLATFORM_TYPE.get(q.get("question_type", "MCQ"),
                                                   "mcq_single")

        q.setdefault("topic", "")
        q.setdefault("source", "")
        q.setdefault("year", None)
        q.setdefault("tags", [])
        q.setdefault("explanation", "")
        q.setdefault("correct_answer", [])


def validate(questions: list, report: dict, images_dir: Path = None):
    nums = [q.get("question_number", 0) for q in questions]
    max_num = max(nums) if nums else 0
    present = set(nums)
    gaps = [i for i in range(min(nums) if nums else 1, max_num + 1) if i not in present]

    empty_answers = [q["question_number"] for q in questions
                     if not q.get("correct_answer")]
    empty_text = [q["question_number"] for q in questions
                  if not (q.get("question_text") or "").strip()]
    flagged = [q["question_number"] for q in questions if q.get("_needs_review")]

    available = None
    if images_dir and images_dir.exists():
        available = {p.name for p in images_dir.iterdir() if p.is_file()}

    lint_errors = {}
    if diagnose_question is not None:
        for q in questions:
            errs, _ = diagnose_question(q, available_images=available)
            if errs:
                lint_errors[q.get("question_number")] = errs

    subjects = Counter(q.get("subject", "") for q in questions)
    types = Counter(q.get("question_type", "") for q in questions)

    print(f"\n{'='*50}")
    print(f"  Total questions : {len(questions)}")
    print(f"  Q number range  : {min(nums) if nums else 0}..{max_num}")
    print(f"  Gaps            : {gaps if gaps else 'None'}")
    print(f"  Empty answers   : {len(empty_answers)}")
    print(f"  Empty text      : {empty_text if empty_text else 'None'}")
    print(f"  Needs review    : {flagged if flagged else 'None'}")
    print(f"  Residual defects: {sorted(lint_errors) if lint_errors else 'None'}")
    print(f"\n  Subject breakdown : {dict(subjects)}")
    print(f"  Type breakdown    : {dict(types)}")
    print(f"{'='*50}\n")

    report.update({
        "total": len(questions),
        "gaps": gaps,
        "empty_answers": len(empty_answers),
        "empty_text": empty_text,
        "needs_review": flagged,
        "residual_defects": {str(k): v for k, v in lint_errors.items()},
        "subjects": dict(subjects),
        "types": dict(types),
    })


def main():
    ap = argparse.ArgumentParser(description="Normalize extracted question JSON")
    ap.add_argument("json_file")
    ap.add_argument("--answer-key", default=None,
                    help="JSON dict {qnum: [answers]} from parse_pdf_answer_key.py")
    ap.add_argument("--images-dir", default=None,
                    help="marker_images dir for image existence validation")
    ap.add_argument("--legacy-types", action="store_true",
                    help="Keep MCQ/MSQ/Numerical instead of mcq_single/mcq_multi/integer")
    ap.add_argument("--report", default=None, help="Write QA report JSON here")
    ap.add_argument("--source", default="pymupdf",
                    help="Extractor source ('pymupdf' or 'marker'). A 'marker' "
                         "result is never recommended for escalation.")
    args = ap.parse_args()

    input_path = Path(args.json_file)
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data.get("questions", data) if isinstance(data, dict) else data
    print(f"Loaded {len(questions)} questions. Normalizing...")

    report = {}

    # ── First pass: field cleanup ────────────────────────────────────────────
    for q in questions:
        raw_subj = (q.get("subject") or "").strip().lower()
        q["subject"] = SUBJECT_MAP.get(raw_subj, (q.get("subject") or "").strip())

        q["question_type"] = normalize_type(
            q.get("question_type", ""), q.get("options", []),
            q.get("question_text", "") or "")

        ca = q.get("correct_answer", [])
        if isinstance(ca, str):
            q["correct_answer"] = [ca] if ca.strip() else []
        elif ca is None:
            q["correct_answer"] = []

        for field in ("question_text", "explanation"):
            if isinstance(q.get(field), str):
                q[field] = wrap_bare_latex(sanitize_text(q[field]))

        opts = q.get("options") or []
        for opt in opts:
            if isinstance(opt.get("text"), str):
                opt["text"] = wrap_bare_latex(sanitize_text(opt["text"]))
            if isinstance(opt.get("id"), str):
                opt["id"] = opt["id"].strip().upper()
        order = {"A": 0, "B": 1, "C": 2, "D": 3}
        q["options"] = sorted(opts, key=lambda o: order.get(o.get("id", ""), 99))

    questions.sort(key=lambda q: q.get("question_number", 0))

    # ── Subject + type enforcement ───────────────────────────────────────────
    kind, dominant = detect_paper_kind(questions)
    enforce_subjects(questions, kind, dominant, report)
    apply_type_hints(questions, report)

    if kind == "neet":
        neet_fixes = 0
        for q in questions:
            if q.get("_type_hint"):
                continue
            if q.get("question_type") != "MCQ":
                q["question_type"] = "MCQ"
                neet_fixes += 1
        if neet_fixes:
            print(f"  NEET: forced MCQ type on {neet_fixes} question(s).")
    else:
        apply_structural_lock(questions, kind, report)

    # ── Answer key ────────────────────────────────────────────────────────────
    if args.answer_key:
        key_path = Path(args.answer_key)
        if key_path.exists():
            key = json.loads(key_path.read_text(encoding="utf-8"))
            if isinstance(key, dict) and key:
                apply_answer_key(questions, key, report)
            else:
                print("  Answer key file empty — skipped")
        else:
            print(f"  Answer key file not found: {key_path} — skipped")

    # ── Platform schema ───────────────────────────────────────────────────────
    avail = None
    if args.images_dir and Path(args.images_dir).exists():
        avail = {p.name for p in Path(args.images_dir).iterdir() if p.is_file()}
    to_platform_schema(questions, legacy_types=args.legacy_types, available=avail)

    # ── Validate + save ───────────────────────────────────────────────────────
    validate(questions, report,
             images_dir=Path(args.images_dir) if args.images_dir else None)

    # ── Vector-math escalation recommendation (PyMuPDF source only) ────────────
    if vector_math_signature is not None and args.source.lower() != "marker":
        sig = vector_math_signature(questions)
        report["escalation"] = sig
        verdict = "yes" if sig["escalate"] else "no"
        print(f"  Marker escalation recommended: {verdict}"
              + (f"  ({'; '.join(sig['reasons'])})" if sig["reasons"] else ""))
        # Machine-readable line for the orchestrator (pdfExtractor.service.ts)
        print(f"ESCALATION_RECOMMENDED={verdict}")
    else:
        report["escalation"] = {"escalate": False, "reasons": [],
                                "source": args.source}
        print("ESCALATION_RECOMMENDED=no")

    output_data = {"questions": questions}
    with open(input_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    print(f"Normalized JSON saved to {input_path}")

    report_path = Path(args.report) if args.report else \
        input_path.with_suffix(".report.json")
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False),
                           encoding="utf-8")
    print(f"QA report saved to {report_path}")


if __name__ == "__main__":
    main()
