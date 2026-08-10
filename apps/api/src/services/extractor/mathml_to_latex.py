"""
mathml_to_latex.py — rewrite presentation MathML as LaTeX.

Some publishers' PDFs carry MathML in their text layer. PyMuPDF hands that HTML
to the extractor as the authoritative reading order, and the model — asked for
"Markdown with $...$ LaTeX" but shown MathML — sometimes copies it through
verbatim. Nothing downstream renders it: the storage format is Markdown with
$...$ inline and $$...$$ display math, the editor tokenises on dollar signs, and
MarkdownRenderer does the same. So a question that arrives as MathML reaches the
student as a wall of raw tags.

The prompt now forbids it. This is the second line: a deterministic rewrite so a
paper is not lost to a model that ignored the instruction, and so papers already
extracted can be repaired without re-running them through the LLM.

Presentation MathML only. Content MathML (<apply>, <ci>, <cn>) does not appear in
exam PDFs and is left alone rather than half-converted.
"""

from __future__ import annotations

import re
from xml.etree import ElementTree

# Any <math> element, with or without a namespace prefix, non-greedy so two
# formulas in one line stay two formulas.
MATH_RE = re.compile(r"<(?:\w+:)?math\b[^>]*>.*?</(?:\w+:)?math>", re.DOTALL | re.IGNORECASE)

# Operators whose LaTeX spelling differs from the literal character.
_OPERATORS = {
    "−": "-", "×": r"\times", "÷": r"\div", "±": r"\pm",
    "≤": r"\leq", "≥": r"\geq", "≠": r"\neq", "≈": r"\approx",
    "∞": r"\infty", "→": r"\rightarrow", "⇌": r"\rightleftharpoons",
    "≅": r"\cong", "∝": r"\propto", "∑": r"\sum", "∫": r"\int",
    "∂": r"\partial", "∇": r"\nabla", "⋅": r"\cdot", "′": "'",
}

# Greek and other identifiers that need a macro rather than the bare character.
_IDENTIFIERS = {
    "α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "δ": r"\delta",
    "ε": r"\epsilon", "θ": r"\theta", "λ": r"\lambda", "μ": r"\mu",
    "ν": r"\nu", "π": r"\pi", "ρ": r"\rho", "σ": r"\sigma",
    "τ": r"\tau", "φ": r"\phi", "ω": r"\omega",
    "Δ": r"\Delta", "Ω": r"\Omega", "Σ": r"\Sigma", "Φ": r"\Phi",
}

# LaTeX's own specials, when they appear as literal text inside MathML.
_ESCAPES = {"&": r"\&", "%": r"\%", "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}"}


def _tag(element) -> str:
    """Local tag name, with any XML namespace stripped."""
    return element.tag.rsplit("}", 1)[-1].lower()


def _text(value: str | None, mapping: dict) -> str:
    raw = (value or "").strip()
    if raw in mapping:
        return mapping[raw]
    return "".join(_ESCAPES.get(char, char) for char in raw)


def _children(element) -> list:
    return [child for child in element if isinstance(child.tag, str)]


# A trailing macro name runs into whatever follows it: \alpha x must not become
# \alphax, and \pi 2 must not become \pi2. Only letters and digits can be
# swallowed, and only by a macro that ends in a letter.
_TRAILING_MACRO = re.compile(r"\\[a-zA-Z]+$")


def _join(elements) -> str:
    """Concatenate rendered children, inserting a space only where LaTeX needs one."""
    out = ""
    for element in elements:
        part = _render(element)
        if not part:
            continue
        if out and part[0].isalnum() and _TRAILING_MACRO.search(out):
            out += " "
        out += part
    return out


def _group(element) -> str:
    """
    Render one child as a braced LaTeX group.

    Always braced. `\\frac12` is legal and renders, but the moment a numerator
    is two digits it silently means something else, and there is no cost to
    being explicit.
    """
    return "{" + _render(element) + "}"


def _render(element) -> str:
    tag = _tag(element)
    kids = _children(element)

    if tag in ("math", "mrow", "mstyle", "semantics", "mpadded", "mphantom"):
        return _join(kids)

    if tag == "mi":
        return _text(element.text, _IDENTIFIERS)
    if tag == "mn":
        return _text(element.text, {})
    if tag == "mo":
        return _text(element.text, _OPERATORS)
    if tag == "mtext":
        body = _text(element.text, {})
        return r"\text{" + body + "}" if body else ""

    if tag == "mfrac" and len(kids) == 2:
        return r"\frac" + _group(kids[0]) + _group(kids[1])
    if tag == "msqrt":
        return r"\sqrt{" + _join(kids) + "}"
    if tag == "mroot" and len(kids) == 2:
        return r"\sqrt[" + _render(kids[1]) + "]" + _group(kids[0])
    if tag == "msup" and len(kids) == 2:
        return _group(kids[0]) + "^" + _group(kids[1])
    if tag == "msub" and len(kids) == 2:
        return _group(kids[0]) + "_" + _group(kids[1])
    if tag == "msubsup" and len(kids) == 3:
        return _group(kids[0]) + "_" + _group(kids[1]) + "^" + _group(kids[2])
    if tag == "munder" and len(kids) == 2:
        return r"\underset" + _group(kids[1]) + _group(kids[0])
    if tag == "mover" and len(kids) == 2:
        return r"\overset" + _group(kids[1]) + _group(kids[0])
    if tag == "munderover" and len(kids) == 3:
        return _group(kids[0]) + "_" + _group(kids[1]) + "^" + _group(kids[2])

    if tag == "mfenced":
        # Deprecated but very common in PDF-embedded MathML, and the whole
        # reason a bracketed fraction survives as readable LaTeX.
        opener = element.get("open", "(")
        closer = element.get("close", ")")
        separator = element.get("separators", ",").strip() or ","
        inner = separator.join(_render(child) for child in kids)
        return r"\left" + (opener or ".") + inner + r"\right" + (closer or ".")

    if tag in ("mtable", "mtr", "mtd"):
        if tag == "mtd":
            return _join(kids)
        if tag == "mtr":
            return " & ".join(_render(child) for child in kids)
        rows = " \\\\ ".join(_render(child) for child in kids)
        return r"\begin{matrix}" + rows + r"\end{matrix}"

    return _join(kids)


def mathml_fragment_to_latex(fragment: str) -> str | None:
    """One <math>...</math> as LaTeX, or None if it will not parse."""
    try:
        # ElementTree rejects undeclared prefixes, which PDF-embedded MathML
        # uses freely. Stripping them is lossless here: presentation MathML
        # tag names do not collide across namespaces.
        cleaned = re.sub(r"<(/?)(?:\w+:)", r"<\1", fragment)
        cleaned = re.sub(r'\s(?:xmlns|xlink):\w+="[^"]*"', "", cleaned)
        cleaned = re.sub(r'\sxmlns="[^"]*"', "", cleaned)
        root = ElementTree.fromstring(cleaned)
    except ElementTree.ParseError:
        return None

    latex = _render(root).strip()
    return latex or None


def convert_mathml(text: str) -> tuple[str, int]:
    """
    Replace every MathML fragment in `text` with inline LaTeX.

    Returns the rewritten text and how many fragments were converted, so the
    caller can report it — a paper that needed this is worth a reviewer's
    attention even once repaired, because the model ignored an explicit rule.

    A fragment that will not parse is left exactly as it was. Raw MathML is bad,
    but half-converted maths is worse: it looks correct and is not.
    """
    # Cheap reject before the regex. Both spellings matter: PDF-embedded MathML
    # is as often <m:math> as <math>.
    lowered = (text or "").lower()
    if not text or ("<math" not in lowered and ":math" not in lowered):
        return text, 0

    converted = 0

    def replace(match: re.Match) -> str:
        nonlocal converted
        latex = mathml_fragment_to_latex(match.group(0))
        if latex is None:
            return match.group(0)
        converted += 1
        return f"${latex}$"

    return MATH_RE.sub(replace, text), converted
