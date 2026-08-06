"""
question_diagnostics.py
=======================
Deterministic defect checks on an extracted question, run by normalize_json.py
after the model has returned and the platform schema has been applied.

  lint_latex(text)       — unbalanced delimiters, unknown macros, pipeline tags
                           that leaked into a math span, bare unicode maths.
  diagnose_question(q)   — the whole question: LaTeX, image references that
                           point at files which do not exist, duplicate or
                           empty options, and fragments left dangling by a page
                           break. Returns (errors, warnings); errors mean the
                           question needs repair, warnings are recorded for the
                           reviewer.

This file was extract_common.py, which carried ~1,000 further lines: an
anchor-selection and question-segmentation engine, and a signal recommending
escalation to Datalab Marker.

Both belonged to the previous architecture. Marker produced HTML, segment_questions()
split it into per-question blocks deterministically, and each block was sent to a
text-only LLM that never saw the page — so every structural fact had to be recovered
in code first. Gemini receives the rendered page image and finds the questions
itself; the anchors PyMuPDF annotates are now used by question_reconciler.py to
*verify* the model returned everything, not to *segment* the input for it. The
escalation signal pointed at Marker, which no longer exists in the pipeline.
"""

import re

# ── LaTeX linting ─────────────────────────────────────────────────────────────

KNOWN_LATEX_COMMANDS = {
    "frac", "dfrac", "tfrac", "sqrt", "vec", "hat", "bar", "dot", "ddot",
    "overline", "underline", "overrightarrow", "widehat", "tilde",
    "sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan",
    "sinh", "cosh", "tanh", "log", "ln", "exp", "lim", "sum", "prod", "int",
    "oint", "iint", "partial", "nabla", "infty", "pm", "mp", "times", "div",
    "cdot", "cdots", "ldots", "dots", "vdots", "ddots", "leq", "geq", "neq",
    "approx", "equiv", "sim", "simeq", "propto", "ll", "gg", "subset",
    "supset", "subseteq", "supseteq", "in", "notin", "cup", "cap", "emptyset",
    "varnothing", "forall", "exists", "neg", "land", "lor", "implies",
    "iff", "rightarrow", "leftarrow", "leftrightarrow", "Rightarrow",
    "Leftarrow", "Leftrightarrow", "to", "mapsto", "uparrow", "downarrow",
    "rightleftharpoons", "xrightarrow", "xleftarrow", "longrightarrow",
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta",
    "eta", "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi",
    "pi", "rho", "sigma", "tau", "upsilon", "phi", "varphi", "chi", "psi",
    "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma",
    "Upsilon", "Phi", "Psi", "Omega", "ell", "hbar", "text", "textrm",
    "mathrm", "mathbf", "mathit", "mathcal", "mathbb", "mathsf", "operatorname",
    "left", "right", "big", "Big", "bigg", "Bigg", "begin", "end",
    "quad", "qquad", ",", ";", ":", "!", " ", "\\", "{", "}", "%", "&", "#",
    "_", "^", "|", "langle", "rangle", "lfloor", "rfloor", "lceil", "rceil",
    "binom", "choose", "pmod", "bmod", "mod", "gcd", "min", "max", "arg",
    "deg", "det", "dim", "ker", "sup", "inf", "triangle", "angle", "perp",
    "parallel", "cong", "therefore", "because", "circ", "bullet", "star",
    "ast", "oplus", "ominus", "otimes", "odot", "dagger", "prime",
    "underbrace", "overbrace", "stackrel", "overset", "underset", "not",
    "displaystyle", "textstyle", "scriptstyle", "mathop", "limits",
    "nolimits", "Ω", "degree", "AA", "mathring", "systeme", "cancel",
    "vmatrix", "pmatrix", "bmatrix", "matrix", "aligned", "array", "cases",
}

MATH_SEG_RE = re.compile(r'\$\$(.+?)\$\$|\$(.+?)\$', re.DOTALL)
LATEX_CMD_RE = re.compile(r'\\([a-zA-Z]+)')
PIPELINE_TAG_RE = re.compile(r'</?(?:sup|sub|frac|num|den)>|data-(?:qcand|opt|owner|section)=')
UNICODE_MATH_RE = re.compile(r'[√∫∑∏≤≥≠±∞→↔∈∉⊂⊃∪∩∀∃α-ωΑ-Ω]')


def lint_latex(text: str, field: str = "text"):
    """Returns (errors, warnings) — human-readable strings."""
    errors, warnings = [], []
    if not text:
        return errors, warnings

    # Leftover pipeline tags — LLM must convert them to LaTeX
    if PIPELINE_TAG_RE.search(text):
        errors.append(f"{field}: unconverted pipeline tags (<sup>/<frac>/data-*) present")

    # Unbalanced $ delimiters
    stripped = text.replace("\\$", "")
    if stripped.count("$") % 2 != 0:
        errors.append(f"{field}: unbalanced $ math delimiters")

    # Garbled backslash runs
    if re.search(r'\\{3,}', text.replace("\\\\", "")):
        errors.append(f"{field}: garbled LaTeX (3+ consecutive backslashes)")

    # Per math segment checks
    for m in MATH_SEG_RE.finditer(text):
        seg = m.group(1) or m.group(2) or ""
        if seg.count("{") != seg.count("}"):
            errors.append(f"{field}: unbalanced braces in ${seg[:40]}...$")
        n_left = len(re.findall(r'\\left\b', seg))
        n_right = len(re.findall(r'\\right\b', seg))
        if n_left != n_right:
            errors.append(f"{field}: unmatched \\left/\\right in ${seg[:40]}...$")
        for cmd in LATEX_CMD_RE.findall(seg):
            if cmd not in KNOWN_LATEX_COMMANDS:
                warnings.append(f"{field}: unknown LaTeX command \\{cmd}")

    # LaTeX commands outside math mode
    outside = MATH_SEG_RE.sub(" ", text)
    outside_cmds = [c for c in LATEX_CMD_RE.findall(outside)
                    if c in KNOWN_LATEX_COMMANDS and c not in ("text",)]
    if outside_cmds:
        warnings.append(f"{field}: LaTeX commands outside $..$ delimiters: {outside_cmds[:4]}")

    # Raw unicode math symbols that should be LaTeX
    uni = UNICODE_MATH_RE.findall(MATH_SEG_RE.sub(" ", text))
    if uni:
        warnings.append(f"{field}: raw unicode math symbols outside math mode: {uni[:6]}")

    return errors, warnings


# ── Question diagnostics ──────────────────────────────────────────────────────

HALLUCINATION_MARKERS = [
    "CIPHER", "WATERMARK", "SAMPLE PAPER", "ALL RIGHTS RESERVED",
    "DO NOT COPY", "CONFIDENTIAL", "lorem ipsum",
]

MD_IMG_RE = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')
DANGLING_START_RE = re.compile(
    r'^\s*(?:is\s+equal\s+to\b|then\s+the\b|,|\)|is\s+equal|equals\b|'
    r'respectively\b|of\s+the\s+above\b)', re.IGNORECASE)
DANGLING_END_RE = re.compile(r'(?:=|\bof\b|\bthe\b|\bis\b|,|\bwhere\b|\band\b)\s*$', re.IGNORECASE)


def _referenced_images(q: dict) -> list:
    refs = []
    refs += MD_IMG_RE.findall(q.get("question_text", "") or "")
    for o in q.get("options", []) or []:
        refs += MD_IMG_RE.findall(o.get("text", "") or "")
        iu = o.get("image_url")
        if iu:
            refs.append(iu)
    refs += MD_IMG_RE.findall(q.get("explanation", "") or "")
    for f in ("question_images", "explanation_images"):
        for v in q.get(f, []) or []:
            refs.append(v)
    # normalize: strip paths / data URLs
    out = []
    for r in refs:
        if r.startswith("data:"):
            continue
        out.append(r.replace("\\", "/").split("/")[-1])
    return out


def diagnose_question(q: dict, available_images: set = None,
                      expected_images: list = None):
    """Expanded diagnostics. Returns (errors, warnings) lists of strings."""
    errors, warnings = [], []
    qtype = (q.get("question_type") or "MCQ").strip()
    options = q.get("options", []) or []
    qt = q.get("question_text", "") or ""

    # 1. Option-count / type coherence
    if qtype.lower() in ("mcq", "msq", "assertion-reason", "matching",
                         "mcq_single", "mcq_multi"):
        if len(options) < 4:
            missing = [x for x in "ABCD" if x not in {o.get("id") for o in options}]
            errors.append(f"only {len(options)} options (expected 4), missing {missing}")
        elif len(options) > 4:
            errors.append(f"{len(options)} options (expected exactly 4)")

        empty = []
        for o in options:
            o_text = (o.get("text") or "").strip()
            o_img = (o.get("image_url") or "").strip() if o.get("image_url") else ""
            if not o_text and not o_img:
                empty.append(o.get("id", "?"))
        if empty:
            errors.append(f"options {empty} are empty (no text and no image)")

        # Duplicate options
        seen = {}
        for o in options:
            key = re.sub(r'\s+', ' ', (o.get("text") or "").strip().lower())
            if key and key in seen:
                errors.append(f"options {seen[key]} and {o.get('id')} have identical text")
            elif key:
                seen[key] = o.get("id")

        bad_ids = [o.get("id") for o in options if o.get("id") not in ("A", "B", "C", "D")]
        if bad_ids:
            errors.append(f"non-standard option ids: {bad_ids}")

    elif qtype.lower() in ("numerical", "integer"):
        if options:
            errors.append(f"numerical question has {len(options)} options (must be [])")

    # 2. Stem sanity
    qt_clean = MD_IMG_RE.sub('', qt).strip()
    if not qt_clean and not MD_IMG_RE.search(qt):
        errors.append("question_text is empty")
    elif len(qt_clean) < 12 and not MD_IMG_RE.search(qt):
        warnings.append(f"question_text very short: '{qt_clean}'")

    if DANGLING_START_RE.match(qt_clean):
        warnings.append(f"stem starts like a continuation fragment: '{qt_clean[:50]}'")
    if qt_clean and DANGLING_END_RE.search(qt_clean) and qtype.lower() not in ("numerical", "integer"):
        warnings.append(f"stem ends mid-sentence: '...{qt_clean[-40:]}'")

    # 3. Option-label leakage into stem
    tail = qt_clean[-90:]
    if re.search(r'\([A-D]\)\s*[^\s]{0,30}\s*\([B-D]\)', tail):
        errors.append(f"option labels leaked into question_text tail: '...{tail[-60:]}'")

    # 4. Hallucination markers
    for field_name, value in [("question_text", qt)] + \
            [(f"option {o.get('id')}", o.get("text", "") or "") for o in options]:
        for marker in HALLUCINATION_MARKERS:
            if marker.lower() in value.lower():
                errors.append(f"{field_name} contains marker '{marker}'")

    # 5. LaTeX lint on all text fields
    e, w = lint_latex(qt, "question_text")
    errors += e
    warnings += w
    for o in options:
        e, w = lint_latex(o.get("text", "") or "", f"option {o.get('id')}")
        errors += e
        warnings += w
    e, w = lint_latex(q.get("explanation", "") or "", "explanation")
    errors += e
    warnings += w

    # 6. Image audits
    refs = _referenced_images(q)
    if available_images is not None:
        for r in refs:
            if r not in available_images:
                errors.append(f"referenced image does not exist: {r}")
    dupes = {r for r in refs if refs.count(r) > 1}
    if dupes:
        warnings.append(f"image referenced multiple times within question: {sorted(dupes)}")
    if expected_images is not None:
        missing = [f for f in expected_images if f not in refs]
        if missing:
            errors.append(f"images in this question's source block are unreferenced: {missing}")

    return errors, warnings
