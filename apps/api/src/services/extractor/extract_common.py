"""
extract_common.py
==================
Shared deterministic logic for the extraction pipeline:

  1. segment_questions(pages)  — anchor-based question-block segmentation.
     Replaces regex page stitching: questions are reassembled across page
     boundaries BEFORE any LLM call, so the model always sees whole questions.
     Works on annotated v3 extractor HTML (data-qcand attributes) and falls
     back to regex anchors for Marker/OCR HTML. Anchor selection uses a
     longest-increasing-chain search, which rejects stray numbers (years,
     instruction lists) that used to derail stitching.

  2. diagnose_question(q, ...)  — expanded defect diagnostics: LaTeX linting,
     image reference audits, duplicate/empty option detection, dangling
     cross-page fragment checks. Returns (errors, warnings); errors should
     trigger a repair pass, warnings are recorded for review.

Used by cerebras_from_marker.py and validate_extraction.py.
"""

import re

# ── Anchor detection ──────────────────────────────────────────────────────────

DATA_QCAND_RE = re.compile(r'<p[^>]*data-qcand="(\d{1,3})"[^>]*>', re.IGNORECASE)
DATA_BOLD_RE = re.compile(r'data-b="1"')
DATA_SECTION_RE = re.compile(r'<p[^>]*data-section="([^"]+)"[^>]*>', re.IGNORECASE)
TAG_RE = re.compile(r'<[^>]+>')

# Fallback regexes for unannotated (Marker/OCR) HTML — plain-text form
FALLBACK_QCAND_PATTERNS = [
    re.compile(r'^\s*Question\s*No\.?\s*[:.\-]?\s*(\d{1,3})\b', re.IGNORECASE),
    re.compile(r'^\s*QUESTION\s+(\d{1,3})\b'),
    re.compile(r'^\s*Q\s*[\.:]?\s*(\d{1,3})\s*[\.\):]?'),
    re.compile(r'^\s*(\d{1,3})\s*[\.\)]\s'),
    re.compile(r'^\s*(\d{1,3})\s*[\.\)]$'),
]

TYPE_HINT_INTEGER_RE = re.compile(
    r'(?i)\b(numerical\s+value|integer\s+type|non[\s-]*negative\s+integer|'
    r'numerical\s+type|fill\s+in\s+the\s+blank)\b')
TYPE_HINT_MULTI_RE = re.compile(
    r'(?i)\b(one\s+or\s+more|multiple\s+correct|more\s+than\s+one)\b')
TYPE_HINT_SINGLE_RE = re.compile(
    r'(?i)\bonly\s+one\s+(option\s+)?correct\b|\bsingle\s+correct\b')

IMG_SRC_RE = re.compile(r'<img\s[^>]*src="([^"]+)"', re.IGNORECASE)


def line_plain(line_html: str) -> str:
    return TAG_RE.sub(' ', line_html).strip()


def detect_anchor_in_line(line_html: str):
    """Return (qnum, bold, annotated) or (None, False, False)."""
    m = DATA_QCAND_RE.search(line_html)
    if m:
        return int(m.group(1)), bool(DATA_BOLD_RE.search(line_html)), True
    plain = line_plain(line_html)
    for pat in FALLBACK_QCAND_PATTERNS:
        fm = pat.match(plain)
        if fm:
            try:
                num = int(fm.group(1))
            except (ValueError, IndexError):
                continue
            if 1 <= num <= 400:
                return num, False, False
    return None, False, False


def type_hint_from_text(text: str):
    if not text:
        return None
    if TYPE_HINT_INTEGER_RE.search(text):
        return "integer"
    if TYPE_HINT_MULTI_RE.search(text):
        return "mcq_multi"
    if TYPE_HINT_SINGLE_RE.search(text):
        return "mcq_single"
    return None


# ── Longest-chain anchor selection ───────────────────────────────────────────

def _build_chain(cands: list, start_idx: int):
    """Greedy monotonic chain from cands[start_idx].
    cands: [(line_idx, num, bold, annotated, quality)] in document order."""
    chain = [cands[start_idx]]
    last = cands[start_idx][1]
    for c in cands[start_idx + 1:]:
        num = c[1]
        if num == last + 1:
            chain.append(c)
            last = num
        elif last + 2 <= num <= last + 3:
            # tolerate a small gap only if the continuation is confirmed later
            if any(cc[1] == num + 1 for cc in cands if cc[0] > c[0]):
                chain.append(c)
                last = num
    return chain


def select_anchors(cands: list) -> list:
    """Pick the best monotonic anchor chain. Rejects instruction lists /
    stray numbers by preferring, in order: longest chain, highest content
    quality (anchors followed by options/blanks/images), most annotated,
    most bold, earliest start."""
    if not cands:
        return []

    # Candidate chain starts: numbers that can begin a paper (1) or any
    # candidate whose successor exists downstream (partial papers start >1).
    starts = []
    for i, c in enumerate(cands):
        if c[1] == 1 or any(cc[1] == c[1] + 1 for cc in cands[i + 1:]):
            starts.append(i)
    if not starts:
        starts = [0]

    best, best_key = None, None
    for i in starts:
        chain = _build_chain(cands, i)
        quality = sum(c[4] for c in chain)
        ann = sum(1 for c in chain if c[3])
        bold = sum(1 for c in chain if c[2])
        key = (len(chain), quality, ann, bold, -i)
        if best_key is None or key > best_key:
            best, best_key = chain, key
    return best or []


OPTION_MARKER_RE = re.compile(r'\([A-Da-d]\)|^\s*[A-D][\.\)]\s|_{3,}|<img\s')


def _candidate_quality(lines: list, idx: int, cand_line_idxs: set) -> int:
    """1 if this anchor's block content (lines until the next candidate, max 12)
    looks like a question: contains option labels, a numerical blank, or an image."""
    j = idx + 1
    limit = min(len(lines), idx + 13)
    while j < limit and j not in cand_line_idxs:
        if OPTION_MARKER_RE.search(lines[j][1]):
            return 1
        j += 1
    return 0


# ── Question-block segmentation ───────────────────────────────────────────────

def segment_questions(pages: list):
    """Split concatenated page HTML into per-question blocks.

    pages: list of {"html": str, ...} (marker_raw.json children)
    Returns (blocks, front_matter_html) where each block is:
      { "qnum": int, "html": str, "pages": [int, ...],
        "section_hint": str|None, "type_hint": str|None,
        "images": [filename, ...], "anchor_annotated": bool }
    Content between anchor N and anchor N+1 — including page boundaries —
    belongs to question N. Section-header lines update the running section
    hint and are excluded from block bodies.
    """
    lines = []          # (page_num, line_html)
    for pnum, page in enumerate(pages, 1):
        for ln in (page.get("html") or "").split("\n"):
            if ln.strip():
                lines.append((pnum, ln))

    cands = []
    for idx, (pnum, ln) in enumerate(lines):
        num, bold, annotated = detect_anchor_in_line(ln)
        if num is not None:
            cands.append([idx, num, bold, annotated])

    cand_line_idxs = {c[0] for c in cands}
    cands = [tuple(c) + (_candidate_quality(lines, c[0], cand_line_idxs),)
             for c in cands]

    anchors = select_anchors(cands)
    anchor_idx = {c[0]: c for c in anchors}
    anchor_line_set = set(anchor_idx.keys())

    blocks = []
    front_parts = []
    current = None
    section_hint = None

    for idx, (pnum, ln) in enumerate(lines):
        sec = DATA_SECTION_RE.search(ln)
        if sec:
            section_hint = sec.group(1)
            continue

        if idx in anchor_line_set:
            _, num, bold, annotated = anchor_idx[idx][:4]
            current = {
                "qnum": num,
                "lines": [ln],
                "pages": [pnum],
                "section_hint": section_hint,
                "type_hint": type_hint_from_text(line_plain(ln)),
                "anchor_annotated": annotated,
            }
            blocks.append(current)
            continue

        if current is None:
            # Unannotated section headers still update the hint in front matter
            plain = line_plain(ln)
            if re.match(r'(?i)^\s*SECTION\b', plain) and len(plain) < 90:
                section_hint = plain
            front_parts.append(ln)
            continue

        # plain-text section headers between questions
        plain = line_plain(ln)
        if re.match(r'(?i)^\s*SECTION\s*[-–—]?\s*[A-D1-4]\b', plain) and len(plain) < 90:
            section_hint = plain
            continue

        current["lines"].append(ln)
        if pnum not in current["pages"]:
            current["pages"].append(pnum)

    out = []
    for b in blocks:
        html = "\n".join(b["lines"])
        th = b["type_hint"] or type_hint_from_text(b["section_hint"] or "")
        out.append({
            "qnum": b["qnum"],
            "html": html,
            "pages": b["pages"],
            "section_hint": b["section_hint"],
            "type_hint": th,
            "images": IMG_SRC_RE.findall(html),
            "anchor_annotated": b["anchor_annotated"],
        })
    return out, "\n".join(front_parts)


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


def estimate_tokens(text: str) -> int:
    return max(1, int(len(text) / 3.4))


# ── Vector-math escalation signal ─────────────────────────────────────────────

_VECTOR_REF_RE = re.compile(r'vector_p\d+_r\d+', re.IGNORECASE)


def vector_math_signature(questions: list, min_flagged: int = 1,
                          min_vector_ratio: float = 0.20):
    """Decide whether a PyMuPDF-extracted paper should be re-run through the
    Datalab Marker (force_ocr) path.

    These papers typeset math/options as VECTOR graphics; PyMuPDF captures those
    as `vector_pX_rY.png` regions and a text-only LLM can only guess the math.
    Marker reads pixels and recovers the LaTeX. We escalate when either:
      • any question was flagged with a structural defect (empty/dup/missing
        options — the smoking gun of unreadable vector options), OR
      • a large share of questions reference vector-drawn regions.

    Returns a dict: {escalate, reasons[], flagged[], vector_questions[],
    vector_ratio, total}.  Pure figures (circuits/graphs) also count toward the
    ratio; over-escalation is cheap (~$0.10/paper) and Marker handles figures
    fine, so the threshold is deliberately forgiving."""
    total = len(questions) or 1
    flagged, vec_qs = [], []
    for q in questions:
        n = q.get("question_number")
        if q.get("_needs_review"):
            flagged.append(n)
        blob = q.get("question_text", "") or ""
        for o in q.get("options", []) or []:
            blob += " " + (o.get("text") or "")
            if o.get("image_url"):
                blob += " " + str(o["image_url"])
        for f in ("question_images", "explanation_images"):
            blob += " " + " ".join(q.get(f, []) or [])
        if _VECTOR_REF_RE.search(blob):
            vec_qs.append(n)

    vec_ratio = len(vec_qs) / total
    reasons = []
    if len(flagged) >= min_flagged:
        reasons.append(f"{len(flagged)} question(s) flagged with structural "
                       f"defects (likely unreadable vector-drawn options)")
    if vec_ratio >= min_vector_ratio:
        reasons.append(f"{len(vec_qs)}/{total} questions "
                       f"({vec_ratio:.0%}) reference vector-drawn math/figures")

    return {
        "escalate": bool(reasons),
        "reasons": reasons,
        "flagged": flagged,
        "vector_questions": vec_qs,
        "vector_ratio": round(vec_ratio, 3),
        "total": len(questions),
    }
