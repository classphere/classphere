"""
pymupdf_extractor.py  (v3 — geometry-aware)
============================================
Replaces the Datalab Marker pipeline entirely for DIGITAL PDFs.

v3 upgrades (accuracy overhaul):
  1. Superscript/subscript detection from span font flags + size + baseline
     geometry — emitted as <sup>/<sub> tags so the LLM never guesses exponents.
  2. Stacked-fraction detection: numerator/denominator text stacked around a
     drawn fraction-bar line is merged into <frac><num>..</num><den>..</den></frac>.
  3. Vector-diagram capture: drawing primitives are clustered into regions and
     rendered as cropped images (previously invisible). Short text labels inside
     a diagram are absorbed into the rendered image instead of leaking as text.
  4. Boilerplate image filtering: logos/headers repeated across pages are dropped.
  5. Geometric image ownership: every image is assigned to a question stem or a
     specific option using column + reading-order position, emitted as
     data-q / data-owner / data-conf attributes and physically placed after its
     owner's label paragraph.
  6. Question-number candidates (data-qcand), option labels (data-opt) and
     section headers (data-section) are annotated for deterministic downstream
     segmentation.
  7. Fixed: the old garbage-glyph regex mangled ALL-CAPS words (PHYSICS, SECTION)
     into bracket markers. Now only true glyph-name artifacts are converted.

Output stays 100% compatible with marker_raw.json consumers.

Usage:
    python pymupdf_extractor.py <pdf_path> [<output_dir>]
"""

import sys
import json
import re
import html as html_lib
import unicodedata

# Force stdout/stderr to use UTF-8 encoding on Windows to prevent console print crashes
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import fitz  # PyMuPDF
from pathlib import Path


# ── Unicode / font artifact fixes ────────────────────────────────────────────

# Private-use-area characters that appear due to Symbol/Wingdings font encoding
# in NTA/JEE PDFs. Map them to the correct Unicode equivalent.
BAD_GLYPH_MAP = {
    "\uf061": "α", "\uf062": "β", "\uf067": "γ", "\uf064": "δ",
    "\uf065": "ε", "\uf068": "η", "\uf071": "θ", "\uf06c": "λ",
    "\uf06d": "μ", "\uf070": "π", "\uf072": "ρ", "\uf073": "σ",
    "\uf074": "τ", "\uf066": "φ", "\uf077": "ω", "\uf04f": "Ω",
    "\uf0b4": "×", "\uf0b8": "÷", "\uf0b1": "±", "\uf0a3": "≤",
    "\uf0b3": "≥", "\uf0b9": "≠", "\uf0ac": "∞", "\uf0d1": "√",
    "\uf0dc": "∑", "\uf0d2": "∫", "\uf0de": "→", "\uf0ab": "↔",
    "\uf020": " ",
    "\u00ae": "→",  # right-arrow sometimes mis-mapped to (R)
}

# Glyph NAMES that leak into text when a font has no Unicode mapping.
# Only converted when they appear as isolated ALL-CAPS tokens (see fix_text) —
# this is what fixes the old bug where PHYSICS became [PHYSICS].
GLYPH_NAME_MAP = {
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ",
    "epsilon": "ε", "zeta": "ζ", "eta": "η", "theta": "θ",
    "iota": "ι", "kappa": "κ", "lambda": "λ", "mu": "μ",
    "nu": "ν", "xi": "ξ", "pi": "π", "rho": "ρ",
    "sigma": "σ", "tau": "τ", "phi": "φ", "chi": "χ",
    "psi": "ψ", "omega": "ω",
    "infinity": "∞", "integral": "∫", "summation": "∑", "product": "∏",
    "sqrt": "√", "radical": "√", "partial": "∂", "nabla": "∇",
    "times": "×", "divide": "÷", "plusminus": "±",
    "leq": "≤", "geq": "≥", "neq": "≠", "approx": "≈",
    "rightarrow": "→", "leftarrow": "←", "leftrightarrow": "↔",
    "uparrow": "↑", "downarrow": "↓",
    "cdot": "·", "circ": "∘", "bullet": "•",
    "element": "∈", "notelement": "∉", "propersubset": "⊂", "propersuperset": "⊃",
    "union": "∪", "intersection": "∩", "emptyset": "∅",
    "universal": "∀", "existential": "∃",
    "perpendicular": "⊥", "parallel": "∥", "angle": "∠",
    "therefore": "∴", "because": "∵",
    "degree": "°", "prime": "′", "doubleprime": "″",
    "planckover2pi": "ℏ", "angstrom": "Å",
}

# ALL-CAPS token that is a glyph name (e.g. "ALPHA", "THETA") — safe to convert.
_CAPS_TOKEN = re.compile(r'\b([A-Z]{4,})\b')
_UNI_TOKEN = re.compile(r'\buni([0-9A-Fa-f]{4})\b')

# Legacy ASCII-mapped Hindi/Devanagari fonts (KrutiDev, DevLys, Chanakya, …).
# Coaching papers are often bilingual: English in one column, a Hindi
# translation (in one of these fonts) in the other. The Hindi column is a
# duplicate of the English question and must be dropped, or its garbled ASCII
# ("nzO;eku", "CykWd") leaks into the stem.
HINDI_FONT_RE = re.compile(
    r'(?i)krutidev|kruti\s*dev|devlys|chanakya|shusha|shivaji|kundli|walkman|'
    r'yogesh|aksharyogini|priya|richa|krishna|aakash|dev\s*nagari|devnagari|'
    r'agra|sanskrit99|shree\s*dev|mangal')

# Watermark / branding lines to drop entirely (configurable).
WATERMARK_PATTERNS = [
    re.compile(r'(?i)^\s*by\s*:?\s*c\s*i\s*p\s*h\s*[eξ]\s*r\s*$'),
    re.compile(r'(?i)c\s*i\s*p\s*h\s*[eξ]\s*r'),
    re.compile(r'(?i)^\s*downloaded\s+from\b'),
    re.compile(r'(?i)^\s*www\.[a-z0-9.-]+\s*$'),
    # Coaching document-code watermarks repeated across the page. These often
    # sit on the exact same y-coordinate as a question anchor and get merged
    # into it ("CC-006115.Select...CC-006"), hiding the anchor. Drop the
    # standalone watermark BEFORE any row/column merge.
    re.compile(r'(?i)^\s*[A-Z]{1,6}[-_/]\d{2,6}\s*$'),
]

# Unicode superscript / subscript character runs → converted to tags
SUP_CHARS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ"
SUB_CHARS = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎"
SUP_TRANS = str.maketrans(SUP_CHARS, "0123456789+-=()n")
SUB_TRANS = str.maketrans(SUB_CHARS, "0123456789+-=()")
_SUPSUB_SPLIT = re.compile(f'([{re.escape(SUP_CHARS)}]+|[{re.escape(SUB_CHARS)}]+)')


def fix_text(text: str) -> str:
    """Clean font-encoding artifacts WITHOUT mangling legitimate ALL-CAPS words."""
    if not text:
        return text

    # 1. Private-use-area / mis-mapped characters
    text = "".join(BAD_GLYPH_MAP.get(ch, ch) for ch in text)

    # 2. uniXXXX artifacts → the actual Unicode character
    text = _UNI_TOKEN.sub(lambda m: chr(int(m.group(1), 16)), text)

    # 3. ALL-CAPS glyph-name tokens (ALPHA → α). Anything else is left alone —
    #    PHYSICS, SECTION, COLUMN etc. are real words, not glyph garbage.
    def _caps(m):
        w = m.group(1)
        return GLYPH_NAME_MAP.get(w.lower(), w)
    text = _CAPS_TOKEN.sub(_caps, text)

    # 4. Normalize unicode (NFC), drop zero-width & non-breaking artifacts
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\xa0", " ").replace("​", "")

    # 5. Collapse runs of spaces (newlines preserved)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text


def is_watermark_line(plain: str) -> bool:
    p = plain.strip()
    if not p:
        return False
    for pat in WATERMARK_PATTERNS:
        if pat.search(p):
            return True
    return False


# ── Run model ─────────────────────────────────────────────────────────────────
# A text element carries "runs": list of {"t": "text"|"sup"|"sub", "s": str}
# or {"t": "frac", "num": [runs], "den": [runs]}.

def runs_from_plain(s: str, style: str = "text") -> list:
    """Split a plain string into runs, converting unicode sup/sub chars to tags."""
    out = []
    for part in _SUPSUB_SPLIT.split(s):
        if not part:
            continue
        if part[0] in SUP_CHARS:
            out.append({"t": "sup", "s": part.translate(SUP_TRANS)})
        elif part[0] in SUB_CHARS:
            out.append({"t": "sub", "s": part.translate(SUB_TRANS)})
        else:
            out.append({"t": style, "s": part})
    return out


def runs_plain(runs: list) -> str:
    """Plain-text view of runs (for regex checks)."""
    parts = []
    for r in runs:
        if r["t"] == "frac":
            parts.append(f"({runs_plain(r['num'])})/({runs_plain(r['den'])})")
        else:
            parts.append(r["s"])
    return "".join(parts)


def runs_to_html(runs: list) -> str:
    parts = []
    for r in runs:
        if r["t"] == "frac":
            parts.append(f"<frac><num>{runs_to_html(r['num'])}</num>"
                         f"<den>{runs_to_html(r['den'])}</den></frac>")
        else:
            esc = html_lib.escape(r["s"], quote=False)
            if r["t"] == "sup":
                parts.append(f"<sup>{esc}</sup>")
            elif r["t"] == "sub":
                parts.append(f"<sub>{esc}</sub>")
            else:
                parts.append(esc)
    return "".join(parts)


def merge_adjacent_runs(runs: list) -> list:
    out = []
    for r in runs:
        if out and r["t"] != "frac" and out[-1]["t"] == r["t"]:
            out[-1]["s"] += r["s"]
        else:
            out.append(dict(r) if r["t"] != "frac" else r)
    return out


# ── Detection regexes for structural annotation ───────────────────────────────

QCAND_PATTERNS = [
    re.compile(r'^\s*Question\s*No\.?\s*[:.\-]?\s*(\d{1,3})\b(.*)$', re.IGNORECASE),
    re.compile(r'^\s*QUESTION\s+(\d{1,3})\b(.*)$'),
    re.compile(r'^\s*Q\s*[\.:]?\s*(\d{1,3})\s*[\.\):]?(.*)$'),
    # Standard numbered stem: "3. Two liquids..." / "3) Two liquids..."
    re.compile(r'^\s*(\d{1,3})\s*[\.\)]\s+(.*)$'),
    # Compact coaching layout: "108.Identify..." / "136.Select..." (no
    # whitespace after the period). Require an uppercase letter immediately
    # after the period so decimals like "3.14" are never treated as anchors.
    re.compile(r'^\s*(\d{1,3})\.(?=[A-Z])(.*)$'),
    re.compile(r'^\s*(\d{1,3})\s*[\.\)]$'),
]

OPT_LABEL_RE = re.compile(r'^\s*\(?([A-Da-d])[\.\)]\s*(.*)$')

SECTION_SUBJECTS = ("PHYSICS", "CHEMISTRY", "MATHEMATICS", "MATHS", "BIOLOGY",
                    "BOTANY", "ZOOLOGY")
SECTION_RE = re.compile(
    r'(?i)\bSECTION\s*[-–—]?\s*([A-D1-4])\b|'
    r'\b(Numerical\s+Value|Integer\s+Type|Single\s+Correct|One\s+or\s+More|'
    r'Multiple\s+Correct|Only\s+One\s+Option\s+Correct)\b'
)


def detect_qcand(plain: str):
    """Return (qnum, style_idx) if this line looks like a question start."""
    p = plain.strip()
    for idx, pat in enumerate(QCAND_PATTERNS):
        m = pat.match(p)
        if m:
            try:
                num = int(m.group(1))
            except (ValueError, IndexError):
                continue
            if 1 <= num <= 400:
                return num, idx
    return None, None


def detect_section(plain: str):
    p = plain.strip()
    up = p.upper()
    for subj in SECTION_SUBJECTS:
        if re.match(rf'^{subj}\b', up) and len(p) < 60:
            return p
    if SECTION_RE.search(p) and len(p) < 90:
        return p
    return None


# ── PDF type detection (unchanged behavior; string grepped by TS service) ────

def is_digital_pdf(doc: fitz.Document, min_char_avg: int = 200, min_text_page_ratio: float = 0.75) -> bool:
    """Returns True if the PDF has a real text layer."""
    total = len(doc)
    pages_with_text = 0
    total_chars = 0
    for i in range(total):
        text = doc[i].get_text().strip()
        total_chars += len(text)
        if len(text) > 50:
            pages_with_text += 1
    avg = total_chars / total if total else 0
    return pages_with_text >= total * min_text_page_ratio and avg >= min_char_avg


# ── Element helpers ───────────────────────────────────────────────────────────

def el_center_y(el):
    b = el["bbox"]
    return (b[1] + b[3]) / 2.0


def el_height(el):
    b = el["bbox"]
    return b[3] - b[1]


def x_overlap(b1, b2):
    return max(0.0, min(b1[2], b2[2]) - max(b1[0], b2[0]))


def same_visual_line(el, member, overlap_threshold=0.20):
    """True if el and member sit on the same visual line.

    Member-wise test (NOT against a growing cluster union — that chains every
    tightly-spaced paragraph into one cluster). Includes an x-overlap veto:
    two fragments occupying the same horizontal range are different rows even
    if their boxes touch vertically (tall fraction boxes, inflated line boxes).
    """
    y0, y1 = el["bbox"][1], el["bbox"][3]
    m0, m1 = member["bbox"][1], member["bbox"][3]
    h = max(y1 - y0, 0.1)
    mh = max(m1 - m0, 0.1)

    ov = min(y1, m1) - max(y0, m0)
    if ov <= 0:
        return min(h, mh) < 3.0 and abs(max(y0, m0) - min(y1, m1)) < 1.0
    if not (ov / h >= overlap_threshold or ov / mh >= overlap_threshold):
        return False

    # x-overlap veto: same column-range fragments are stacked rows.
    # Applied only between substantial elements — tiny floats (superscripts)
    # can be horizontally contained inside a long line's bbox legitimately.
    xov = x_overlap(el["bbox"], member["bbox"])
    w = max(el["bbox"][2] - el["bbox"][0], 0.1)
    mw = max(member["bbox"][2] - member["bbox"][0], 0.1)
    if min(w, mw) > 12.0 and xov / min(w, mw) > 0.40:
        return False
    return True


def sort_elements_overlap(elements, overlap_threshold=0.20):
    """Sort elements into visual reading order: group into lines by vertical
    overlap (member-wise), sort each line left-to-right."""
    if not elements:
        return []

    elements_sorted = sorted(elements, key=el_center_y)
    lines, current_line = [], []

    for el in elements_sorted:
        if not current_line:
            current_line.append(el)
            continue

        same = any(same_visual_line(el, m, overlap_threshold) for m in current_line)

        if same:
            current_line.append(el)
        else:
            current_line.sort(key=lambda e: e["bbox"][0])
            lines.extend(current_line)
            current_line = [el]

    if current_line:
        current_line.sort(key=lambda e: e["bbox"][0])
        lines.extend(current_line)
    return lines


# ── Text extraction with span-level sup/sub tagging ──────────────────────────

TINY_TOKEN_RE = re.compile(r'^[0-9+\-±=xyznabc*°′″]{1,4}$')


def extract_text_elements(page) -> list:
    """Extract text as span-level segment elements.

    Baseline-shifted spans (superscripts/subscripts as flagged by MuPDF or
    detected geometrically) are emitted as separate 'float' elements with tight
    bboxes. This is critical: MuPDF often merges an option label and a fraction
    numerator into one tall line — splitting at span level keeps geometry honest
    so fraction matching and visual-line grouping work correctly.
    """
    page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES)
    elements = []

    for b_idx, block in enumerate(page_dict.get("blocks", [])):
        if block.get("type") != 0:
            continue
        for l_idx, line in enumerate(block.get("lines", [])):
            line_h = line["bbox"][3] - line["bbox"][1]
            if line_h > 50:
                continue

            spans = line.get("spans", [])
            if not spans:
                continue

            row_key = (b_idx, l_idx)

            # Dominant font size = size of the span with the most characters
            dominant = max(spans, key=lambda s: len(s.get("text", "")))
            dom_size = dominant.get("size", 10.0) or 10.0
            dom_origin_y = dominant.get("origin", (0, line["bbox"][3]))[1]
            dom_font = dominant.get("font", "")
            dom_bold = bool(re.search(r'(?i)bold|black|heavy', dom_font)) or \
                bool(dominant.get("flags", 0) & 16)
            # Line uses a legacy Hindi font if ANY span does (math/numbers in a
            # Hindi line stay in Times, so check every span).
            line_hindi = any(HINDI_FONT_RE.search(s.get("font", "")) for s in spans)

            def flush_segment(seg_spans):
                if not seg_spans:
                    return
                runs = []
                prev_x1 = None
                for sp in seg_spans:
                    s_text = fix_text(sp.get("text", ""))
                    if not s_text:
                        continue
                    if prev_x1 is not None and sp["bbox"][0] - prev_x1 > 1.2 and \
                       runs and not runs[-1]["s"].endswith(" ") and not s_text.startswith(" "):
                        runs.append({"t": "text", "s": " "})
                    runs.extend(runs_from_plain(s_text, "text"))
                    prev_x1 = sp["bbox"][2]
                runs = merge_adjacent_runs(runs)
                plain = runs_plain(runs)
                if not plain.strip() or is_watermark_line(plain):
                    return
                bbox = [min(s["bbox"][0] for s in seg_spans),
                        min(s["bbox"][1] for s in seg_spans),
                        max(s["bbox"][2] for s in seg_spans),
                        max(s["bbox"][3] for s in seg_spans)]
                elements.append({
                    "kind": "text", "bbox": bbox, "runs": runs,
                    "size": dom_size, "bold": dom_bold, "row": row_key,
                    "hindi": line_hindi,
                })

            segment = []
            for span in spans:
                s_text = fix_text(span.get("text", ""))
                if not s_text.strip():
                    # whitespace-only spans just extend the current segment
                    if s_text and segment:
                        segment.append(span)
                    continue
                s_size = span.get("size", dom_size) or dom_size
                s_oy = span.get("origin", (0, dom_origin_y))[1]
                flags = span.get("flags", 0)

                style = None
                dy = dom_origin_y - s_oy  # positive → raised above baseline
                if flags & 1 or (s_size < 0.82 * dom_size and abs(dy) > 0.12 * dom_size):
                    if dy > 0.05 * dom_size:
                        style = "sup"
                    elif dy < -0.05 * dom_size:
                        style = "sub"
                    elif flags & 1:
                        style = "sup"

                if style is None:
                    segment.append(span)
                else:
                    flush_segment(segment)
                    segment = []
                    runs = merge_adjacent_runs(runs_from_plain(s_text, style))
                    plain = runs_plain(runs)
                    if not plain.strip() or is_watermark_line(plain):
                        continue

                    # Attach short numeric sup/sub spans directly to the base
                    # element on the same source row. MuPDF often emits t₁/₂ as
                    # base "t" plus tiny standalone spans "1" and "2". If left
                    # standalone, "1." can be misclassified as question Q1
                    # inside Q84. Geometric attachment preserves the math and
                    # prevents false question anchors.
                    attached = False
                    if (re.fullmatch(r'[0-9+\-]{1,4}', plain) and elements and
                            elements[-1].get("row") == row_key):
                        prev = elements[-1]
                        gap = span["bbox"][0] - prev["bbox"][2]
                        if -5.0 <= gap <= 4.0:
                            prev["runs"].extend(runs)
                            prev["runs"] = merge_adjacent_runs(prev["runs"])
                            prev["bbox"] = [
                                min(prev["bbox"][0], span["bbox"][0]),
                                min(prev["bbox"][1], span["bbox"][1]),
                                max(prev["bbox"][2], span["bbox"][2]),
                                max(prev["bbox"][3], span["bbox"][3]),
                            ]
                            attached = True
                    if not attached:
                        elements.append({
                            "kind": "text", "bbox": list(span["bbox"]),
                            "runs": runs, "size": s_size, "bold": False,
                            "float": style, "row": row_key,
                            "hindi": bool(HINDI_FONT_RE.search(span.get("font", ""))),
                        })
            flush_segment(segment)
    return elements


# Max x-gap (points) between two fragments on the same visual row that are still
# considered ONE broken line. A genuine 2-column gutter is wider than this, so
# column separation is preserved; inline-math splits (a few px) are rejoined.
ROW_MERGE_GAP = 26.0


def reassemble_rows(elements: list) -> list:
    """Rejoin text fragments that belong to the same visual line.

    Grouped by visual row (y-overlap), then within a row consecutive fragments
    are merged ONLY when their x-gap is small (a line broken by inline
    math/fractions). Fragments separated by a wide gap (a real column gutter)
    stay as separate elements, so genuine 2-column pages are preserved.

    This is the root fix for dense single-column pages that inline stacked
    fractions had split into left/right halves — those halves were being
    misread as two columns and scrambled. Non-text elements pass through."""
    text_els = [e for e in elements if e.get("kind") == "text"]
    passthrough = [e for e in elements if e.get("kind") != "text"]
    if not text_els:
        return elements

    # 1. Group into visual rows by y-overlap (member-wise over y-sorted list).
    text_els.sort(key=el_center_y)
    rows = []
    cur = []
    for el in text_els:
        if cur and any(_y_same_row(el, m) for m in cur):
            cur.append(el)
        else:
            if cur:
                rows.append(cur)
            cur = [el]
    if cur:
        rows.append(cur)

    # 2. Within each row, merge only contiguous (small-gap) fragments.
    out = []
    for row in rows:
        row.sort(key=lambda s: s["bbox"][0])
        group = [row[0]]
        for nxt in row[1:]:
            gap = nxt["bbox"][0] - group[-1]["bbox"][2]
            if gap < ROW_MERGE_GAP:
                group.append(nxt)
            else:
                out.append(_merge_fragment_group(group))
                group = [nxt]
        out.append(_merge_fragment_group(group))
    return out + passthrough


def _y_same_row(a, b, thresh=0.45):
    ay0, ay1 = a["bbox"][1], a["bbox"][3]
    by0, by1 = b["bbox"][1], b["bbox"][3]
    ov = min(ay1, by1) - max(ay0, by0)
    if ov <= 0:
        # allow tiny raised/lowered floats to still attach to their baseline row
        return abs(el_center_y(a) - el_center_y(b)) <= 4.0
    return ov / max(min(ay1 - ay0, by1 - by0), 0.1) >= thresh


def _merge_fragment_group(segs):
    if len(segs) == 1:
        s = dict(segs[0])
        s.pop("float", None)
        s.pop("row", None)
        return s
    segs.sort(key=lambda s: s["bbox"][0])
    runs = []
    prev_x1 = None
    for s in segs:
        if prev_x1 is not None:
            gap = s["bbox"][0] - prev_x1
            last = runs[-1] if runs else None
            last_s = last.get("s", "") if last and last["t"] != "frac" else " "
            if gap > 1.2 and last is not None and not last_s.endswith(" "):
                runs.append({"t": "text", "s": " "})
        runs.extend(s["runs"])
        prev_x1 = s["bbox"][2]
    runs = merge_adjacent_runs(runs)
    bbox = [min(s["bbox"][0] for s in segs), min(s["bbox"][1] for s in segs),
            max(s["bbox"][2] for s in segs), max(s["bbox"][3] for s in segs)]
    return {
        "kind": "text", "bbox": bbox, "runs": runs,
        "size": max(s.get("size", 0) for s in segs),
        "bold": any(s.get("bold") for s in segs),
    }


# ── Drawing analysis: fraction bars + diagram regions ─────────────────────────

def collect_drawing_items(page):
    """Flatten page drawings into primitive items with bboxes.
    Returns (bar_candidates, diagram_items)."""
    page_w, page_h = page.rect.width, page.rect.height
    bars, diagram = [], []

    try:
        drawings = page.get_drawings()
    except Exception:
        return [], []

    for d in drawings:
        for item in d.get("items", []):
            kind = item[0]
            if kind == "l":
                p1, p2 = item[1], item[2]
                bbox = [min(p1.x, p2.x), min(p1.y, p2.y), max(p1.x, p2.x), max(p1.y, p2.y)]
            elif kind == "re":
                r = item[1]
                bbox = [r.x0, r.y0, r.x1, r.y1]
            elif kind == "qu":
                q = item[1]
                xs = [q.ul.x, q.ur.x, q.ll.x, q.lr.x]
                ys = [q.ul.y, q.ur.y, q.ll.y, q.lr.y]
                bbox = [min(xs), min(ys), max(xs), max(ys)]
            elif kind == "c":
                pts = [p for p in item[1:] if hasattr(p, "x")]
                if not pts:
                    continue
                xs = [p.x for p in pts]
                ys = [p.y for p in pts]
                bbox = [min(xs), min(ys), max(xs), max(ys)]
            else:
                continue

            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]

            # Page furniture: long rules / column divider / header-footer bands
            if h < 2.0 and w > 0.60 * page_w:
                continue
            if w < 2.0 and h > 0.50 * page_h:
                continue
            if (bbox[1] < 75 or bbox[3] > page_h - 50) and w > 0.30 * page_w:
                continue

            # Thin short horizontal → possible fraction bar (also kept as diagram
            # item; the fraction matcher will consume it if num+den text exists)
            if h <= 1.8 and 3.0 <= w <= 130.0:
                bars.append(bbox)
            else:
                diagram.append(bbox)
    return bars, diagram


def match_fractions(elements: list, bars: list):
    """Merge numerator/denominator text elements stacked around a bar into a
    single <frac> element. Consumes matched elements; unmatched bars are
    returned for diagram clustering."""
    text_els = [e for e in elements if e["kind"] == "text"]
    consumed = set()
    frac_elements = []
    leftover_bars = []

    # Process bars top-to-bottom so stacked fractions consume their own parts
    # before a lower bar can steal them.
    bars = sorted(bars, key=lambda b: (b[1] + b[3]) / 2.0)

    for bar in bars:
        bar_y = (bar[1] + bar[3]) / 2.0
        bar_w = bar[2] - bar[0]

        def find_part(above: bool):
            best, best_d = None, 1e9
            for el in text_els:
                if id(el) in consumed:
                    continue
                b = el["bbox"]
                w = b[2] - b[0]
                if w > bar_w + 30:
                    continue
                ox = x_overlap(b, bar)
                if ox < 0.5 * min(w, bar_w) or ox <= 0:
                    continue
                if above:
                    d = bar_y - b[3]          # gap between text bottom and bar
                    ok = -1.5 <= d <= 14.0
                else:
                    d = b[1] - bar_y          # gap between bar and text top
                    ok = -1.5 <= d <= 14.0
                if ok and abs(d) < best_d:
                    best, best_d = el, abs(d)
            return best

        num_el = find_part(above=True)
        den_el = find_part(above=False)
        if num_el is None or den_el is None or num_el is den_el:
            leftover_bars.append(bar)
            continue

        # Guards: fraction parts must be actual math, never document structure.
        # A page-section box can look exactly like a fraction geometrically:
        #   PHYSICS
        #   ───────  (box border)
        #   3.       (right-column question number)
        # The old matcher consumed PHYSICS as numerator and Q3 as denominator,
        # producing <frac><num>PHYSICS</num><den>3.</den></frac> inside Q1 and
        # permanently deleting the Q3 anchor. Reject any candidate part that is
        # a section header or a question-number anchor before consuming it.
        num_plain = runs_plain(num_el["runs"]).strip()
        den_plain = runs_plain(den_el["runs"]).strip()
        num_q, _ = detect_qcand(num_plain)
        den_q, _ = detect_qcand(den_plain)
        if (detect_section(num_plain) or detect_section(den_plain) or
                num_q is not None or den_q is not None):
            leftover_bars.append(bar)
            continue

        # Parts must also be short-ish (a fraction, not a paragraph).
        if len(num_plain) > 60 or len(den_plain) > 60:
            leftover_bars.append(bar)
            continue

        consumed.add(id(num_el))
        consumed.add(id(den_el))
        bbox = [
            min(num_el["bbox"][0], den_el["bbox"][0], bar[0]),
            min(num_el["bbox"][1], bar[1]),
            max(num_el["bbox"][2], den_el["bbox"][2], bar[2]),
            max(den_el["bbox"][3], bar[3]),
        ]

        def _part_runs(el):
            # If the whole part element was float-classified, its raised/lowered
            # styling is positional noise (the numerator IS raised) — flatten it.
            # A normal segment keeps its runs (inner sups like x<sup>2</sup> stay).
            if el.get("float") in ("sup", "sub"):
                out = []
                for r in el["runs"]:
                    if r["t"] == "frac":
                        out.append(r)
                    else:
                        out.append({"t": "text", "s": r["s"]})
                return merge_adjacent_runs(out)
            return el["runs"]

        frac_el = {
            "kind": "text",
            "bbox": bbox,
            "runs": [{"t": "frac", "num": _part_runs(num_el),
                      "den": _part_runs(den_el)}],
            "size": num_el.get("size", 9.0),
            "bold": False,
        }
        # Keep the fraction on the numerator's source row so reassemble_rows
        # merges it back inline with the option/stem text on that row.
        if num_el.get("row") is not None:
            frac_el["row"] = num_el["row"]
        frac_elements.append(frac_el)

    remaining = [e for e in elements if id(e) not in consumed]
    remaining.extend(frac_elements)
    return remaining, leftover_bars


# A vector region is a real figure only if the REAL text sitting inside it is at
# most a few short labels. Math typeset as vector outlines (common in NTA/JEE
# PDFs) puts full equations on top of real text lines — those must stay as text
# (the LLM converts them to LaTeX), never be rendered into an image.
MAX_REGION_TEXT_ALNUM = 16       # total alnum chars of text inside a kept figure
LABEL_MAX_ALNUM = 6              # a text line this short counts as a diagram label


def _alnum_len(s: str) -> int:
    return sum(1 for ch in s if ch.isalnum())


def region_text_profile(bbox, text_elements):
    """Return (total_alnum, prose_line_count, inside_elements) for text whose
    center falls inside bbox. prose = a line with more than LABEL_MAX_ALNUM
    alnum chars (i.e. real content, not a short label)."""
    total_alnum = 0
    prose_lines = 0
    inside = []
    for el in text_elements:
        if el["kind"] != "text":
            continue
        b = el["bbox"]
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        if bbox[0] - 2 <= cx <= bbox[2] + 2 and bbox[1] - 2 <= cy <= bbox[3] + 2:
            a = _alnum_len(runs_plain(el["runs"]))
            total_alnum += a
            if a > LABEL_MAX_ALNUM:
                prose_lines += 1
            inside.append(el)
    return total_alnum, prose_lines, inside


def cluster_diagram_regions(items: list, text_elements: list, page, gap: float = 14.0) -> list:
    """Union-find clustering of drawing items into diagram regions.
    Returns a list of {"bbox": [...], "label_elements": [text els to absorb]}.
    Regions that overlap substantial real text are rejected (kept as text)."""
    if not items:
        return []

    parent = list(range(len(items)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    def near(b1, b2):
        return not (b1[2] + gap < b2[0] or b2[2] + gap < b1[0] or
                    b1[3] + gap < b2[1] or b2[3] + gap < b1[1])

    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if near(items[i], items[j]):
                union(i, j)

    groups = {}
    for i, b in enumerate(items):
        groups.setdefault(find(i), []).append(b)

    regions = []
    for boxes in groups.values():
        bbox = [min(b[0] for b in boxes), min(b[1] for b in boxes),
                max(b[2] for b in boxes), max(b[3] for b in boxes)]
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        area = w * h
        if area < 700 or w < 15 or h < 12:
            continue          # too small to be a meaningful diagram
        if len(boxes) < 2 and area < 2500:
            continue          # single small primitive → decoration

        # Discriminate genuine line-art from math-typeset-as-vector.
        total_alnum, prose_lines, inside = region_text_profile(bbox, text_elements)
        if total_alnum > MAX_REGION_TEXT_ALNUM or prose_lines >= 2:
            # Equation / sentence drawn as vector outlines — keep it as TEXT.
            continue

        # Genuine figure: only the short labels inside get absorbed into the render.
        labels = [el for el in inside if _alnum_len(runs_plain(el["runs"])) <= LABEL_MAX_ALNUM
                  and detect_qcand(runs_plain(el["runs"]))[0] is None]
        regions.append({"bbox": bbox, "label_elements": labels})
    return regions


# ── Raster images ─────────────────────────────────────────────────────────────

def prescan_boilerplate_xrefs(doc) -> set:
    """xrefs that repeat across many pages (logos/headers) → boilerplate."""
    from collections import defaultdict
    pages_by_xref = defaultdict(set)
    rect_by_xref = {}
    for i in range(len(doc)):
        try:
            for img in doc[i].get_images(full=True):
                xref = img[0]
                pages_by_xref[xref].add(i)
                if xref not in rect_by_xref:
                    rects = doc[i].get_image_rects(xref)
                    if rects:
                        rect_by_xref[xref] = rects[0]
        except Exception:
            continue

    n = max(len(doc), 1)
    boiler = set()
    for xref, pages in pages_by_xref.items():
        if len(pages) >= 2 and len(pages) / n >= 0.6:
            r = rect_by_xref.get(xref)
            small = r is not None and (r.width * r.height) < 20000
            in_band = r is not None and (r.y0 < 80 or r.y1 > doc[0].rect.height - 55)
            if small or in_band:
                boiler.add(xref)
    return boiler


def rect_intersects(b1, b2, pad=2.0):
    return not (b1[2] + pad < b2[0] or b2[2] + pad < b1[0] or
                b1[3] + pad < b2[1] or b2[3] + pad < b1[1])


def _bbox_cx(b):
    return (b[0] + b[2]) / 2.0


def detect_translation_side(text_elements: list, page_w: float):
    """If a page is bilingual (a legacy-Hindi-font column duplicating the English
    one), return the side ('left'|'right') that holds the Hindi translation, else
    None. Decided by where the Hindi-font lines cluster."""
    mid = page_w / 2
    hindi = [e for e in text_elements if e.get("hindi")]
    if len(hindi) < 3:
        return None
    right = sum(1 for e in hindi if _bbox_cx(e["bbox"]) > mid)
    left = len(hindi) - right
    # require a clear one-sided cluster (>=70%) to avoid false positives
    if right >= max(3, 0.7 * len(hindi)):
        return "right"
    if left >= max(3, 0.7 * len(hindi)):
        return "left"
    return None


def on_side(bbox, side: str, page_w: float) -> bool:
    """True if bbox sits in the given half AND isn't a full-width (shared)
    element like a header/section band."""
    if bbox[2] - bbox[0] > 0.60 * page_w:
        return False
    cx = _bbox_cx(bbox)
    return cx > page_w / 2 if side == "right" else cx < page_w / 2


# ── Page extraction ───────────────────────────────────────────────────────────

def extract_page(doc: fitz.Document, page_idx: int, img_dir: Path, boiler_xrefs: set) -> dict:
    page = doc[page_idx]
    page_w = page.rect.width
    mid_x = page_w / 2

    # 1. Text elements with sup/sub runs
    elements = extract_text_elements(page)

    # 1b. Bilingual papers: drop the Hindi translation column (text now, its
    #     duplicate images/diagrams below). Keeps the complete English column.
    hindi_side = detect_translation_side(elements, page_w)
    if hindi_side:
        elements = [e for e in elements if not on_side(e["bbox"], hindi_side, page_w)]

    # 2. Drawings → fraction bars + diagram primitives
    bars, diagram_items = collect_drawing_items(page)
    if hindi_side:
        diagram_items = [b for b in diagram_items if not on_side(b, hindi_side, page_w)]

    # 3. Fraction merging (consumes matched bars' num/den text)
    elements, leftover_bars = match_fractions(elements, bars)
    diagram_items.extend(b for b in leftover_bars
                         if (b[2] - b[0]) >= 8 or (b[3] - b[1]) >= 8)

    # 3b. Column detection + row reassembly.
    #
    # CRITICAL ORDERING: detect 2-column layout BEFORE reassemble_rows. If we
    # reassemble first, fragments from the left and right columns on the same
    # visual row get merged into one full-width element (because the column
    # gutter on Aakash/Allen PDFs can be very narrow or even overlap at the
    # midline). Those merged elements then look "full-width" and the 2-column
    # detector returns false — falling back to single-column reading order,
    # which interleaves left/right line-by-line. That's the question-mixup bug.
    #
    # Fix: check if the page is 2-column NOW (from the raw element x-positions).
    # If it is, run reassemble_rows ONLY within each column (left fragments
    # merge with left, right with right, never across the midline). If it's
    # single-column, reassemble normally (merge across the full width).
    text_els_for_detect = [e for e in elements if e.get("kind") == "text"
                           and (e["bbox"][2] - e["bbox"][0]) < page_w * 0.65]
    left_count = sum(1 for e in text_els_for_detect if (e["bbox"][0] + e["bbox"][2]) / 2 < mid_x)
    right_count = sum(1 for e in text_els_for_detect if (e["bbox"][0] + e["bbox"][2]) / 2 >= mid_x)
    page_is_2col = left_count >= 3 and right_count >= 3

    if page_is_2col:
        # Split elements into left/right/full, reassemble each column separately.
        left_els = [e for e in elements if e.get("kind") == "text"
                    and (e["bbox"][0] + e["bbox"][2]) / 2 < mid_x]
        right_els = [e for e in elements if e.get("kind") == "text"
                     and (e["bbox"][0] + e["bbox"][2]) / 2 >= mid_x]
        non_text = [e for e in elements if e.get("kind") != "text"]
        # Full-width text elements (headers, section bands) go through normally.
        full_text = [e for e in elements if e.get("kind") == "text"
                     and (e["bbox"][2] - e["bbox"][0]) >= page_w * 0.65]
        left_reassembled = reassemble_rows(left_els)
        right_reassembled = reassemble_rows(right_els)
        full_reassembled = reassemble_rows(full_text)
        elements = left_reassembled + right_reassembled + full_reassembled + non_text
    else:
        elements = reassemble_rows(elements)

    # 4. Raster images (skip boilerplate + tiny)
    raster = []
    for img in page.get_images(full=True):
        xref = img[0]
        if xref in boiler_xrefs:
            continue
        try:
            for rect in page.get_image_rects(xref):
                if rect.width > 20 and rect.height > 20:
                    area = rect.width * rect.height
                    if area > 0.85 * page.rect.width * page.rect.height:
                        continue  # full-page background
                    rb = [rect.x0, rect.y0, rect.x1, rect.y1]
                    if hindi_side and on_side(rb, hindi_side, page_w):
                        continue  # duplicate image in the Hindi translation column
                    raster.append((xref, rect))
        except Exception:
            pass

    # 5. Diagram regions from remaining drawing primitives.
    #    Each region is {"bbox": [...], "label_elements": [...]}; regions that
    #    overlap substantial real text were already rejected (kept as text).
    regions = cluster_diagram_regions(diagram_items, elements, page)
    region_boxes = [r["bbox"] for r in regions]

    # Absorb raster images that sit inside a region (rendered together)
    absorbed_rasters = set()
    for ri, region in enumerate(regions):
        for xref, rect in raster:
            rb = [rect.x0, rect.y0, rect.x1, rect.y1]
            if rect_intersects(region["bbox"], rb):
                region["bbox"] = [min(region["bbox"][0], rb[0]), min(region["bbox"][1], rb[1]),
                                  max(region["bbox"][2], rb[2]), max(region["bbox"][3], rb[3])]
                region_boxes[ri] = region["bbox"]
                absorbed_rasters.add(xref)

    # Remove ONLY the genuine short labels that belong to a kept figure — they
    # render into the cropped image. Real prose/equations are never removed.
    absorb_ids = set()
    for region in regions:
        for el in region["label_elements"]:
            absorb_ids.add(id(el))
    elements = [el for el in elements if id(el) not in absorb_ids]

    # 6. Materialize images (diagram renders + standalone rasters)
    images_dict = {}
    image_elements = []

    for ri, region in enumerate(regions):
        rbbox = region["bbox"]
        fname = f"vector_p{page_idx+1}_r{ri+1}.png"
        fpath = img_dir / fname
        clip = fitz.Rect(max(0, rbbox[0] - 4), max(0, rbbox[1] - 4),
                         min(page.rect.width, rbbox[2] + 4),
                         min(page.rect.height, rbbox[3] + 4))
        if not fpath.exists():
            try:
                pix = page.get_pixmap(clip=clip, dpi=200)
                pix.save(str(fpath))
            except Exception:
                continue
        images_dict[fname] = {"rect": list(clip), "kind": "vector_region"}
        image_elements.append({"kind": "image", "bbox": list(clip), "fname": fname})

    for xref, rect in raster:
        if xref in absorbed_rasters:
            continue
        try:
            img_info = doc.extract_image(xref)
            if img_info and img_info.get("image"):
                fname = f"native_p{page_idx+1}_x{xref}.{img_info['ext']}"
                fpath = img_dir / fname
                if not fpath.exists():
                    fpath.write_bytes(img_info["image"])
            else:
                raise Exception("No image bytes")
        except Exception:
            fname = f"native_p{page_idx+1}_x{xref}.png"
            fpath = img_dir / fname
            if not fpath.exists():
                pix = page.get_pixmap(clip=fitz.Rect(rect), dpi=200)
                pix.save(str(fpath))
        images_dict[fname] = {"xref": xref, "rect": list(rect)}
        image_elements.append({"kind": "image", "bbox": [rect.x0, rect.y0, rect.x1, rect.y1],
                               "fname": fname})

    elements = elements + image_elements

    # 7. Column classification (same rules as v2)
    classified = []
    for el in elements:
        x0, _, x1, _ = el["bbox"]
        width = x1 - x0
        # Subject / section labels (PHYSICS, CHEMISTRY, ZOOLOGY, SECTION-B)
        # are semantic full-width bands even when their text bbox is narrow and
        # centered over the divider. Classifying CHEMISTRY as "left" caused the
        # lower Chemistry questions Q46-47 to be read before upper-right Physics
        # questions Q43-45. Always promote recognized section text to full.
        plain_for_section = (runs_plain(el.get("runs", [])).strip()
                             if el.get("kind") == "text" else "")
        if plain_for_section and detect_section(plain_for_section):
            el["col"] = "full"
        elif width > page_w * 0.75 or (x0 < mid_x - 80 and x1 > mid_x + 80):
            el["col"] = "full"
        elif (x0 + x1) / 2 < mid_x:
            el["col"] = "left"
        else:
            el["col"] = "right"
        classified.append(el)

    total_text = sum(1 for e in classified if e["kind"] == "text")
    crossing_text = sum(1 for e in classified if e["kind"] == "text"
                        and e["bbox"][0] < mid_x - 40 and e["bbox"][2] > mid_x + 40)

    # Preserve the geometry decision made BEFORE row reassembly. Recomputing
    # from reassembled elements can flip a true 2-column page to single-column
    # when full-width instructions/headers inflate crossing_text. That exact
    # flip caused page 1 to be sorted horizontally again (Q1, Q3, Q1-cont,
    # Q3-cont) even though the raw geometry had already proved it was 2-column.
    is_2_col = page_is_2col
    if not is_2_col and total_text > 0:
        # Secondary fallback for pages where the early detector was inconclusive.
        ratio = crossing_text / total_text
        classified_left = sum(1 for e in classified if e["col"] == "left" and e["kind"] == "text")
        classified_right = sum(1 for e in classified if e["col"] == "right" and e["kind"] == "text")
        if ratio < 0.12 and classified_left >= 3 and classified_right >= 3:
            is_2_col = True

    if is_2_col:
        full_els = [e for e in classified if e["col"] == "full"]
        left_els = [e for e in classified if e["col"] == "left"]
        right_els = [e for e in classified if e["col"] == "right"]

        full_sorted = sort_elements_overlap(full_els)
        left_sorted = sort_elements_overlap(left_els)
        right_sorted = sort_elements_overlap(right_els)

        # True two-column reading order is absolute: page/section headers first,
        # then the ENTIRE left column top→bottom, then the ENTIRE right column
        # top→bottom. Never use arbitrary full-width graphics/watermarks as
        # mid-page "bands" — doing so produced Q6,Q7,Q9,Q10,Q8,... because a
        # full-width watermark split the columns halfway down the page.
        first_col_y = min(
            [e["bbox"][1] for e in left_sorted + right_sorted],
            default=1e9,
        )
        last_col_y = max(
            [e["bbox"][3] for e in left_sorted + right_sorted],
            default=-1,
        )
        full_before = [e for e in full_sorted if e["bbox"][3] <= first_col_y]
        full_after = [e for e in full_sorted if e["bbox"][1] >= last_col_y]
        # Full-width elements inside the question area are typically watermarks,
        # divider art or large page furniture. They must not affect reading order.
        # Textual section headers are the only safe mid-page full elements, and
        # they define READING-ORDER BANDS. Example page 6:
        #   left Q40-42 → right Q43-45 → CHEMISTRY header → left Q46-47 → right Q48-49
        # Example page 15:
        #   left Q129-130 → right Q131-135 → ZOOLOGY header → left Q136 → right Q137
        full_mid_sections = [e for e in full_sorted
                             if first_col_y < e["bbox"][1] < last_col_y
                             and e.get("kind") == "text"
                             and detect_section(runs_plain(e.get("runs", [])).strip())]
        combined = list(full_before)
        left_idx = right_idx = 0
        last_band_y = -1.0
        for section_el in full_mid_sections:
            section_y = section_el["bbox"][1]
            while left_idx < len(left_sorted) and left_sorted[left_idx]["bbox"][1] < section_y:
                combined.append(left_sorted[left_idx]); left_idx += 1
            while right_idx < len(right_sorted) and right_sorted[right_idx]["bbox"][1] < section_y:
                combined.append(right_sorted[right_idx]); right_idx += 1
            combined.append(section_el)
            last_band_y = section_y
        combined.extend(left_sorted[left_idx:])
        combined.extend(right_sorted[right_idx:])
        combined.extend(full_after)
    else:
        combined = sort_elements_overlap(classified)

    # 8. Visual-line join + cross-element sup/sub attachment
    joined = []
    i = 0
    while i < len(combined):
        el = combined[i]
        if el["kind"] != "text":
            joined.append(el)
            i += 1
            continue

        group = [el]
        j = i + 1
        while j < len(combined) and combined[j]["kind"] == "text":
            cand = combined[j]
            # Same visual row AND horizontally contiguous. The contiguity guard
            # stops this loop from bridging a column gutter (a same-y left-column
            # and right-column element must NOT be joined). Row reassembly has
            # already merged genuinely-broken lines, so this stays conservative.
            grp_x0 = min(m["bbox"][0] for m in group)
            grp_x1 = max(m["bbox"][2] for m in group)
            gap = min(abs(cand["bbox"][0] - grp_x1), abs(grp_x0 - cand["bbox"][2]))
            if any(same_visual_line(cand, m) for m in group) and gap < ROW_MERGE_GAP:
                group.append(cand)
                j += 1
            else:
                break

        group.sort(key=lambda e: e["bbox"][0])
        base = None
        merged_runs = []
        prev_x1 = None
        for k, g in enumerate(group):
            plain = runs_plain(g["runs"]).strip()

            # Pre-classified floating sup/sub span → attach with its style, no space
            if g.get("float") in ("sup", "sub") and merged_runs:
                merged_runs.extend(runs_from_plain(plain, g["float"]))
                prev_x1 = g["bbox"][2]
                continue

            # Separate-block tiny raised/lowered token (e.g. exponent printed as
            # its own text object) → attach as sup/sub to the preceding base text
            if base is not None and TINY_TOKEN_RE.match(plain) and \
               g.get("size", 99) <= 0.80 * base.get("size", 0):
                dy = el_center_y(base) - el_center_y(g)   # positive → g is raised
                style = "sup" if dy > 0.08 * el_height(base) else \
                        ("sub" if dy < -0.08 * el_height(base) else "text")
                if style != "text":
                    merged_runs.extend(runs_from_plain(plain, style))
                    prev_x1 = g["bbox"][2]
                    continue

            if merged_runs:
                gap = g["bbox"][0] - prev_x1 if prev_x1 is not None else 99.0
                last_s = merged_runs[-1].get("s", "") if merged_runs[-1]["t"] != "frac" else ""
                if gap > 1.2 and not last_s.endswith(" "):
                    merged_runs.append({"t": "text", "s": " "})
            merged_runs.extend(g["runs"])
            prev_x1 = g["bbox"][2]
            if g.get("size", 0) >= (base.get("size", 0) if base else 0):
                base = g

        bbox = [min(g["bbox"][0] for g in group), min(g["bbox"][1] for g in group),
                max(g["bbox"][2] for g in group), max(g["bbox"][3] for g in group)]
        joined.append({
            "kind": "text",
            "bbox": bbox,
            "runs": merge_adjacent_runs(merged_runs),
            "size": max(g.get("size", 0) for g in group),
            "bold": any(g.get("bold") for g in group),
            "col": group[0].get("col", "full"),
        })
        i = j

    # 9. Structural annotation + geometric image ownership
    current_q = None
    current_opt = None
    q_state = {}   # qnum → {"opts_seen": [...], "opts_with_content": set,
                   #          "stem_imgs": [el], "opt_imgs": {opt: [el]}}

    for el in joined:
        if el["kind"] == "text":
            plain = runs_plain(el["runs"]).strip()
            qn, style_idx = detect_qcand(plain)
            # A tiny standalone token like "1." can be a line-wrapped exponent
            # (e.g. the final 1 in s^{-1}), not a new question. If we already
            # have a much larger current question number on this page, reject a
            # backwards tiny candidate unless it carries real stem text. This
            # prevents a false Q1 anchor inside Q84 without blocking a genuine
            # section restart such as "1. A full question stem...".
            if (qn is not None and current_q is not None and qn <= current_q and
                    len(plain) <= 5 and not el.get("bold")):
                qn, style_idx = None, None
            section = detect_section(plain)
            if section and qn is None:
                el["section"] = section
                continue
            if qn is not None:
                el["qcand"] = qn
                el["qstyle"] = style_idx
                current_q = qn
                current_opt = None
                q_state.setdefault(qn, {"opts_seen": [], "opts_with_content": set(),
                                        "stem_imgs": [], "opt_imgs": {}})
                continue
            m = OPT_LABEL_RE.match(plain)
            if m and current_q is not None:
                label = m.group(1).upper()
                rest = m.group(2).strip()
                st = q_state[current_q]
                if label in "ABCD" and label not in st["opts_seen"]:
                    # Only treat as an option label in plausible order (A first or next letter)
                    expected = "ABCD"[len(st["opts_seen"])] if len(st["opts_seen"]) < 4 else None
                    if label == expected or (not st["opts_seen"] and label == "A"):
                        el["opt"] = label
                        el["optq"] = current_q
                        current_opt = label
                        st["opts_seen"].append(label)
                        if rest:
                            st["opts_with_content"].add(label)
                        continue
        else:  # image
            if current_q is None:
                el["owner_q"] = None       # page-top continuation → previous block
                el["owner"] = "prev"
                continue
            st = q_state[current_q]
            el["owner_q"] = current_q
            if current_opt is not None:
                el["owner"] = f"option-{current_opt}"
                st["opt_imgs"].setdefault(current_opt, []).append(el)
            else:
                el["owner"] = "stem"
                st["stem_imgs"].append(el)

    # Post-process ownership per question (deterministic CASE 3a/3b/3c + RULE 5)
    for qn, st in q_state.items():
        empty_opts = [o for o in st["opts_seen"]
                      if o not in st["opts_with_content"] and o not in st["opt_imgs"]]
        # Options that own >1 image contribute extras to the redistribution pool
        pool = []
        for o in list(st["opt_imgs"].keys()):
            imgs = st["opt_imgs"][o]
            if len(imgs) > 1:
                pool.extend(imgs[1:])
                st["opt_imgs"][o] = imgs[:1]
        pre_imgs = st["stem_imgs"]

        if empty_opts:
            candidates = list(pool)
            take_from_stem = []
            if not candidates and pre_imgs:
                if len(pre_imgs) == len(empty_opts):
                    take_from_stem = pre_imgs[:]
                elif len(pre_imgs) == len(empty_opts) + 1:
                    take_from_stem = pre_imgs[1:]
            candidates = take_from_stem + candidates
            if len(candidates) == len(empty_opts):
                for o, img_el in zip(empty_opts, candidates):
                    img_el["owner"] = f"option-{o}"
                    img_el["owner_conf"] = "medium"
                    if img_el in st["stem_imgs"]:
                        st["stem_imgs"].remove(img_el)
                    st["opt_imgs"].setdefault(o, []).append(img_el)
            else:
                for img_el in pre_imgs + pool:
                    if img_el.get("owner") == "stem" and len(st["opts_seen"]) >= 2:
                        img_el["owner"] = "ambiguous"
        else:
            for img_el in pool:
                img_el["owner"] = "ambiguous"

    # 10. Emit HTML — images re-positioned directly after their owner label
    html_parts = []
    deferred = {}   # (q, opt) → [img html]

    def img_html(el):
        q = el.get("owner_q")
        owner = el.get("owner", "stem")
        conf = el.get("owner_conf", "high")
        attrs = f' data-owner="{owner}" data-conf="{conf}"'
        if q is not None:
            attrs += f' data-q="{q}"'
        return f'<img src="{el["fname"]}"{attrs} />'

    # Index: which option labels exist per question, for deferral
    for el in joined:
        if el["kind"] == "image":
            owner = el.get("owner", "")
            if owner.startswith("option-"):
                key = (el.get("owner_q"), owner.split("-", 1)[1])
                deferred.setdefault(key, []).append(img_html(el))

    for el in joined:
        if el["kind"] == "image":
            owner = el.get("owner", "")
            if owner.startswith("option-"):
                continue  # emitted right after its label paragraph
            html_parts.append(img_html(el))
            continue

        content = runs_to_html(el["runs"])
        attrs = ""
        if "qcand" in el:
            attrs += f' data-qcand="{el["qcand"]}"'
            if el.get("bold"):
                attrs += ' data-b="1"'
        if "section" in el:
            attrs += f' data-section="{html_lib.escape(el["section"], quote=True)}"'
        if "opt" in el:
            attrs += f' data-opt="{el["opt"]}" data-q="{el["optq"]}"'
        html_parts.append(f"<p{attrs}>{content}</p>")

        if "opt" in el:
            for ih in deferred.pop((el.get("optq"), el["opt"]), []):
                html_parts.append(ih)

    # Any deferred images whose label never got emitted (edge) — append at end
    for imgs in deferred.values():
        html_parts.extend(imgs)

    final_html = "\n".join(html_parts)

    return {
        "page": page_idx + 1,
        "html": final_html,
        "images": images_dict,
        "children": [{"images": images_dict}],
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    if len(sys.argv) < 2:
        print("Usage: python pymupdf_extractor.py <pdf_path> [<output_dir>]")
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).resolve()
    if len(sys.argv) >= 3:
        out_dir = Path(sys.argv[2]).resolve()
    else:
        out_dir = pdf_path.parent / "extracted_data"

    out_dir.mkdir(parents=True, exist_ok=True)
    img_dir = out_dir / "marker_images"
    img_dir.mkdir(parents=True, exist_ok=True)

    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(str(pdf_path))

    print(f"Detecting PDF type ({len(doc)} pages)...")
    if not is_digital_pdf(doc):
        print("\n[ERROR] Scanned PDF detected (no text layer found).")
        print("Please upload a DIGITAL PDF (with selectable text) for high-quality extraction.")
        print("Scanned documents are not supported.")
        return

    print("[DIGITAL PDF] Text layer confirmed. Extracting with PyMuPDF (v3 geometry-aware)...")

    boiler = prescan_boilerplate_xrefs(doc)
    if boiler:
        print(f"  Boilerplate images filtered (logos/headers): {len(boiler)} xref(s)")

    all_pages = []
    all_images = {}
    total_images = 0

    for i in range(len(doc)):
        print(f"  Page {i+1}/{len(doc)}...", end=" ", flush=True)
        page_data = extract_page(doc, i, img_dir, boiler)
        all_pages.append({
            "html": page_data["html"],
            "images": page_data["images"],
            "children": page_data["children"],
        })
        all_images.update(page_data["images"])
        imgs_on_page = len(page_data["images"])
        total_images += imgs_on_page
        print(f"{len(page_data['html'])} chars | {imgs_on_page} images")

    raw_out = {
        "json": {"children": all_pages},
        "images": all_images,
        "metadata": {
            "source": "pymupdf_extractor_v3",
            "pdf_type": "digital",
            "total_pages": len(doc),
            "total_native_images": total_images,
            "annotated": True,
        }
    }

    raw_path = out_dir / "marker_raw.json"
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw_out, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"Pages processed    : {len(doc)}")
    print(f"Native images saved: {total_images}  ->  {img_dir}")
    print(f"Raw JSON saved     : {raw_path}")
    print(f"{'='*50}")
    print(f"\nNext step: run cerebras_from_marker.py {out_dir}")


if __name__ == "__main__":
    run()
