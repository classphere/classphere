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

from mathml_to_latex import convert_mathml

# Force stdout/stderr to use UTF-8 encoding on Windows to prevent console print crashes
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

try:
    from question_diagnostics import diagnose_question
except ImportError:
    diagnose_question = None

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
    # Before anything else. MathML that survives to _balance_dollars would have
    # its angle brackets counted as prose and its content mangled; converting
    # first means the rest of this function sees ordinary $...$ maths.
    text, _ = convert_mathml(text)
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


def strip_inline_images(text: str) -> str:
    """Drop ![...](...) markdown once the references are held in an array.

    Runs only after question_images / explanation_images have been populated
    from the same text, so nothing is lost — the figures move rather than
    disappear. pdfExtractor.service.ts embeds base64 from those arrays.
    """
    if not text:
        return text or ""
    stripped = MD_IMG_RE.sub("", text)
    return re.sub(r"\n{3,}", "\n\n", stripped).strip()


def clean_dead_images(text: str, available: set, dropped: list = None) -> str:
    """Remove ![image](f) references whose file is not present on disk, so the
    frontend never renders an 'Image unavailable' placeholder. If `available`
    is None (no images dir given) the text is returned unchanged.

    Every dropped filename is appended to `dropped` when one is given. Removing
    the reference is right — a broken image is worse than none — but doing it
    silently left a question that had lost its diagram looking complete, which
    is the one state a reviewer cannot detect by reading it."""
    if available is None or not text:
        return text

    def repl(m):
        fname = m.group(1).replace("\\", "/").split("/")[-1]
        if fname.startswith("data:") or fname in available:
            return m.group(0)
        if dropped is not None:
            dropped.append(fname)
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
    """Fill correct_answer / numerical_answer / explanation and cross-correct types.

    Accepts both key shapes. parse_pdf_answer_key.py returns
    {"answers": {...}, "solutions": {...}}; older files were a flat
    {qnum: answer} map. This indexed the outer dict directly, so a current
    parser file matched nothing at all -- every lookup found the literal keys
    "answers" and "solutions" instead of question numbers, and the whole key
    was silently discarded.
    """
    answers = key.get("answers") if isinstance(key.get("answers"), dict) else key
    solutions = key.get("solutions") if isinstance(key.get("solutions"), dict) else {}

    filled = type_fixes = mismatches = solutions_filled = 0
    for q in questions:
        qnum = str(q.get("question_number"))

        # The paper's own worked solution, where it prints one. Kept separate
        # from the answer branch below: a paper can carry solutions for
        # questions whose answers were already read off the question page.
        solution = solutions.get(qnum)
        if isinstance(solution, str) and solution.strip() and not str(q.get("explanation") or "").strip():
            q["explanation"] = solution.strip()
            solutions_filled += 1

        if qnum not in answers:
            continue
        ans = answers[qnum]
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
                            "conflicts": mismatches,
                            "solutions_filled": solutions_filled}
    print(f"  Answer key: filled {filled}, solutions {solutions_filled}, "
          f"type fixes {type_fixes}, conflicts {mismatches}")


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


def _extracted_subjects_are_reliable(questions: list) -> tuple[bool, dict[str, str]]:
    """Check if the LLM-extracted subject labels are consistent enough to trust.

    Returns (reliable, subject_by_qnum) where subject_by_qnum maps question
    numbers to their extracted subject. We trust the extraction when:
      - >= 80% of questions have a non-empty, recognized subject
      - Subjects form contiguous blocks (no interleaving like P,C,P,C,B,B)
        — a coaching paper always groups subjects in sections

    This lets us adapt to any coaching's subject ORDER (Chemistry first,
    Physics last, etc.) instead of hardcoding NTA's official layout.
    """
    recognized = {"Physics", "Chemistry", "Mathematics", "Biology", "Botany", "Zoology"}
    labeled = 0
    subj_by_qnum = {}
    for q in questions:
        s = (q.get("subject") or "").strip()
        if s in recognized:
            labeled += 1
            subj_by_qnum[q.get("question_number", 0)] = s

    total = len(questions)
    if total == 0 or labeled / total < 0.80:
        return False, {}

    # Check contiguity: subjects should form blocks, not interleave.
    # Sort by qnum, get the sequence of subjects, count how many times
    # the subject CHANGES. A 3-subject paper should have ~2 changes.
    sorted_qnums = sorted(subj_by_qnum.keys())
    subjects_seq = [subj_by_qnum[q] for q in sorted_qnums]
    changes = sum(1 for i in range(1, len(subjects_seq))
                  if subjects_seq[i] != subjects_seq[i - 1])
    # Allow some noise (a few mislabeled questions) but not constant switching.
    # A 180-question NEET paper with 3 subjects: ~2 changes is ideal, up to ~10
    # is tolerable (some questions near section boundaries get mislabeled).
    max_changes = max(6, total // 15)
    if changes > max_changes:
        return False, {}

    return True, subj_by_qnum


def enforce_subjects(questions: list, kind: str, dominant, report: dict):
    num_qs = len(questions)

    if kind == "single":
        print(f"  Single-subject paper detected ({dominant}) — not forcing 3-subject layout")
        for q in questions:
            q["subject"] = dominant
        report["subject_layout"] = f"single:{dominant}"
        return

    # ── Adaptive: trust the extracted subjects when they're reliable ──────
    # The LLM extracts subject per question from section headers (data-section
    # annotations). When those labels are consistent (>= 80% labeled, contiguous
    # blocks), trust them — this adapts to any coaching's subject order
    # (Chemistry first, Physics last, Botany/Zoology split, etc.).
    # Fall back to hardcoded NTA ranges only when the extraction failed.
    reliable, subj_by_qnum = _extracted_subjects_are_reliable(questions)

    if reliable:
        # Normalize Botany/Zoology → Biology (NEET-style sub-sections)
        applied = 0
        for q in questions:
            qnum = q.get("question_number", 0)
            extracted = subj_by_qnum.get(qnum)
            if extracted:
                normalized = SUBJECT_MAP.get(extracted.lower(), extracted)
                if normalized in ("Physics", "Chemistry", "Mathematics", "Biology"):
                    q["subject"] = normalized
                    applied += 1
        # Report the detected subject order for transparency
        order = []
        seen = set()
        for qnum in sorted(subj_by_qnum.keys()):
            s = SUBJECT_MAP.get(subj_by_qnum[qnum].lower(), subj_by_qnum[qnum])
            if s not in seen:
                order.append(s)
                seen.add(s)
        print(f"  Adaptive subject layout (from extraction): {' → '.join(order)} — trusted {applied}/{num_qs} labels")
        report["subject_layout"] = f"adaptive:{','.join(order)}"
        return

    # ── Fallback: hardcoded NTA ranges (extraction was unreliable) ────────
    if kind == "neet":
        # NTA NEET official pattern (fallback only):
        #   Physics  Q1–45, Chemistry Q46–90, Biology Q91–180
        print("  NEET paper detected. Extracted subjects unreliable — falling back to NTA ranges: 1-45 Physics, 46-90 Chemistry, 91+ Biology")
        for q in questions:
            qnum = q.get("question_number", 0)
            if 1 <= qnum <= 45:
                q["subject"] = "Physics"
            elif 46 <= qnum <= 90:
                q["subject"] = "Chemistry"
            elif qnum >= 91:
                q["subject"] = "Biology"
        report["subject_layout"] = "neet:fallback"
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
    """Emit doc §4 schema fields.

    Figures are moved out of question_text and explanation into
    question_images / explanation_images rather than left inline as
    ![image](f) markdown. pdfExtractor.service.ts used to read that markdown to
    embed base64 from it; it now embeds straight from these arrays, so keeping
    a copy in the text would only store every figure twice and leave the
    renderer de-duplicating by string comparison.

    Options are unchanged: one figure per option, held in options[].image_url,
    which is the right shape there.

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

        # Figures this question referred to that were never extracted. The model
        # names a file it can see in the page image; if PyMuPDF produced no such
        # asset the reference cannot resolve, and the question silently loses a
        # diagram it needs. Collected here and carried to the reviewer below.
        missing = []

        qt = clean_dead_images(q.get("question_text", "") or "", available, missing)
        q["question_images"] = [f for f in MD_IMG_RE.findall(qt) if resolvable(f)]
        q["question_text"] = strip_inline_images(qt)

        exp = clean_dead_images(q.get("explanation", "") or "", available, missing)
        q["explanation_images"] = [f for f in MD_IMG_RE.findall(exp) if resolvable(f)]
        q["explanation"] = strip_inline_images(exp)

        for opt in q.get("options", []) or []:
            text = clean_dead_images(opt.get("text", "") or "", available, missing)
            inline = [f for f in MD_IMG_RE.findall(text) if resolvable(f)]
            existing = opt.get("image_url")
            if existing and not resolvable(existing):
                missing.append(str(existing).replace("\\", "/").split("/")[-1])
                existing = None

            # Every figure this option carries, in reading order, counted once.
            figures = list(inline)
            if existing and existing not in figures:
                figures.append(existing)

            if len(figures) == 1:
                # The ordinary case: one picture, and text that is either a
                # caption or nothing. It belongs in image_url, and must come out
                # of the text — left in both, it was stored twice, uploaded
                # twice, and became two different URLs for one picture, which
                # the renderer could not recognise as duplicates.
                opt["image_url"] = figures[0]
                opt["text"] = strip_inline_images(text)
            elif len(figures) > 1:
                # An option can be several figures with labels between them —
                # "X: <structure> Y: <structure> Z: <structure>" is one option of
                # one question, not three. image_url holds a single url and
                # cannot express that, so the figures stay inline in the text
                # where their order and their labels survive. Moving one out
                # here would silently drop the rest.
                if existing and existing not in inline:
                    text = f"{text}\n\n![image]({existing})"
                opt["text"] = text
                opt["image_url"] = None
            else:
                opt["text"] = text
                opt["image_url"] = None

        if not legacy_types:
            q["question_type"] = PLATFORM_TYPE.get(q.get("question_type", "MCQ"),
                                                   "mcq_single")

        # How much of this question's wording was found on its source page.
        # Carried in source_reference because that field survives to the database
        # and the paper validator reads it — the score is only useful if it
        # reaches the person reviewing the paper.
        match = q.get("_source_match")
        if match is not None or missing:
            reference = q.get("source_reference")
            merged = {**(reference if isinstance(reference, dict) else {})}
            if match is not None:
                merged["text_match"] = match
            if missing:
                # Deduplicated: the same figure can be referenced from the stem
                # and from an option, and one absent file is one problem.
                merged["missing_figures"] = sorted(set(missing))
            q["source_reference"] = merged

        if missing:
            q["_needs_review"] = True

        q.setdefault("topic", "")
        q.setdefault("source", "")
        q.setdefault("year", None)
        q.setdefault("tags", [])
        q.setdefault("explanation", "")
        q.setdefault("correct_answer", [])


def validate(questions: list, report: dict, images_dir: Path = None):
    # A choice question missing its options, or carrying options with neither
    # text nor a figure, is the signature of a page break between the stem and
    # what follows it. Flagged here so it reaches the reviewer as a named defect
    # rather than as a question that merely looks finished until someone opens
    # it. On one real paper this was 6 of 51 questions.
    incomplete = 0
    for q in questions:
        qtype = str(q.get("question_type") or "").upper()
        if qtype in ("MCQ", "MSQ", "MATCHING", "ASSERTION-REASON"):
            options = q.get("options") or []
            blank = [o for o in options
                     if not str(o.get("text") or "").strip() and not str(o.get("image_url") or "").strip()]
            problem = None
            if len(options) < 2:
                problem = f"only {len(options)} option(s) extracted for a choice question"
            elif blank:
                problem = f"{len(blank)} of {len(options)} options are empty"
            if problem:
                q["_needs_review"] = True
                q["_defects"] = q.get("_defects", []) + [
                    f"{problem} — check whether they continue on the next page"]
                incomplete += 1
    report["incomplete_option_sets"] = incomplete
    if incomplete:
        print(f"  Incomplete option sets: {incomplete} question(s) flagged for review")

    nums = [q.get("question_number", 0) for q in questions]
    max_num = max(nums) if nums else 0

    # Gaps are computed per numbering run. Across a per-section paper the
    # combined number set looks contiguous even when a whole section is missing,
    # so a single min..max sweep would report "no gaps" on a broken extraction.
    by_run: dict = {}
    for q in questions:
        run = q.get("_run", q.get("_page_index", 0))
        by_run.setdefault(run, set()).add(q.get("question_number", 0))
    gaps = []
    for run in sorted(by_run):
        present_in_run = {n for n in by_run[run] if n}
        if not present_in_run:
            continue
        gaps.extend(
            n for n in range(min(present_in_run), max(present_in_run) + 1)
            if n not in present_in_run
        )

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
    args = ap.parse_args()

    input_path = Path(args.json_file)
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data.get("questions", data) if isinstance(data, dict) else data
    # Written by gemini_page_extractor's reconciliation pass. Carried through to
    # the output so the orchestrator can tell a complete extraction from a
    # partial one instead of treating any non-empty result as success.
    completeness = data.get("completeness") if isinstance(data, dict) else None
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

    # ── Deduplicate ───────────────────────────────────────────────────────────
    # Identity is (numbering run, question number), never the number alone.
    # Papers whose numbering restarts per section — JEE Advanced sections, NEET
    # Section A/B, most coaching papers — legitimately contain several question
    # 1s, and keying on the bare number deletes every section after the first.
    # `_run` is assigned by question_reconciler via gemini_page_extractor; when
    # it is absent (older payloads) the page index keeps sections apart rather
    # than collapsing them.
    seen_keys: dict[tuple, int] = {}
    deduped: list = []
    for q in questions:
        qnum = q.get("question_number", 0)
        run = q.get("_run")
        if run is None:
            run = q.get("_page_index", 0)
        # A question whose number could not be parsed is always kept: those all
        # share the placeholder 0 and are not duplicates of one another.
        key = (run, qnum) if qnum else ("unparsed", id(q))
        if key in seen_keys:
            # Prefer the copy whose page actually carries this question's numbered
            # anchor in the PDF text. Without this, a false positive extracted from
            # an earlier page (cover-page instruction text, a running header) would
            # win purely by sorting first and shadow the real question.
            existing_index = seen_keys[key]
            if q.get("_anchored") and not deduped[existing_index].get("_anchored"):
                print(f"  [dedup] Q{qnum} in run {run}: replacing unanchored copy with the anchored one")
                deduped[existing_index] = q
            else:
                print(f"  [dedup] Dropping duplicate Q{qnum} in run {run} (already seen at index {existing_index})")
        else:
            seen_keys[key] = len(deduped)
            deduped.append(q)
    if len(deduped) < len(questions):
        removed = len(questions) - len(deduped)
        print(f"  [dedup] Removed {removed} duplicate question(s). {len(deduped)} unique questions remain.")
    questions[:] = deduped

    # Sort by run first so per-section papers stay in document order instead of
    # interleaving every section's question 1, 2, 3 together.
    questions.sort(key=lambda q: (
        q.get("_run", q.get("_page_index", 0)),
        q.get("question_number", 0),
    ))

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

    output_data = {"questions": questions}
    if completeness is not None:
        # Normalisation can drop questions (dedup); recount so the surfaced
        # figure describes what actually survived to the platform schema.
        completeness = {**completeness, "normalized_total": len(questions)}
        output_data["completeness"] = completeness
        report["completeness"] = completeness
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
