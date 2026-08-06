"""Read a paper's marking scheme off its own instructions page.

A JEE Advanced paper states its marking in a fixed vocabulary — "Full Marks:
+4", "Partial Marks: +3", "Negative Marks: -2", "Zero Marks: 0" — under a
section heading naming the question type. document_profile.py already tags that
page with role "instructions"; nothing read it, so the marks were retyped by
hand from the PDF.

Deliberately regex, not a model. A model asked to read a marking scheme will
answer confidently whether or not it understood, and the result decides how
students are scored — the kind of wrongness that shows up months later in a
disputed result. A pattern either matches the paper's phrasing or does not, and
what it cannot read it reports as unread.

The output is a *proposal*. It is shown pre-filled beside the source text so
whoever uploads the paper confirms or corrects it. That turns typing four
numbers out of a PDF into checking four numbers against it, without moving the
decision away from a person.
"""

from __future__ import annotations

import re
from typing import Any

# "Full Marks : +4", "Full Marks +4 If ONLY..."
_FULL = re.compile(r"full\s+marks?\s*[:\-]?\s*([+\-−]?\s*\d+)", re.I)
_PARTIAL = re.compile(r"partial\s+marks?\s*[:\-]?\s*([+\-−]?\s*\d+)", re.I)
_ZERO = re.compile(r"zero\s+marks?\s*[:\-]?\s*([+\-−]?\s*\d+)", re.I)
_NEGATIVE = re.compile(r"negative\s+marks?\s*[:\-]?\s*([+\-−]?\s*\d+)", re.I)

# Section headings naming the question type. Ordered longest-first so
# "one or more correct" is not swallowed by "correct option".
_TYPE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    # Written against how the papers actually read, not how the rule sounds
    # when described. An Advanced paper says "ONE OR MORE THAN ONE of these
    # four options is (are) correct answer(s)", with words between the phrase
    # and "correct" that a tight pattern misses entirely.
    #
    # Multi first: "ONE OR MORE THAN ONE" contains "ONE", so a single-correct
    # pattern checked first would claim the multiple-correct section.
    ("mcq_multi", re.compile(r"one\s+or\s+more(?:\s+than\s+one)?", re.I)),
    ("mcq_multi", re.compile(r"multiple\s+correct|MSQ", re.I)),
    ("integer", re.compile(
        r"non[\-\s]?negative\s+integer|numerical\s+value|integer\s+(?:value|answer|type)"
        r"|answer\s+to\s+each\s+question\s+is\s+a", re.I)),
    ("matching", re.compile(
        r"match(?:ing)?\s+the\s+(?:list|following|column)|matrix\s+match|LIST[\-\s]?I", re.I)),
    ("assertion_reason", re.compile(r"assertion\s*[\-–&/]?\s*reason|statement\s*[\-–]\s*1", re.I)),
    ("mcq_single", re.compile(
        r"only\s+one\s+(?:of\s+these\s+)?[\w\s]{0,30}?(?:option|answer|choice)"
        r"|single\s+correct|SCQ", re.I)),
]


def _to_int(raw: str | None) -> int | None:
    if not raw:
        return None
    cleaned = raw.replace("−", "-").replace(" ", "")
    try:
        return int(cleaned)
    except ValueError:
        return None


def _split_sections(text: str) -> list[str]:
    """Chunk the page wherever a new question-type heading appears.

    Each section of an Advanced paper carries its own marks, so the marks have
    to be read next to the heading they belong to rather than page-wide.
    """
    positions: list[int] = []
    for _, pattern in _TYPE_PATTERNS:
        positions.extend(match.start() for match in pattern.finditer(text))
    if not positions:
        return [text]
    bounds = sorted(set([0, *positions, len(text)]))
    return [text[start:end] for start, end in zip(bounds, bounds[1:]) if end > start]


def _question_type(section: str) -> str | None:
    for question_type, pattern in _TYPE_PATTERNS:
        if pattern.search(section):
            return question_type
    return None


def parse_marking_scheme(text: str) -> dict[str, Any]:
    """Marks per question type, plus the text each reading came from.

    Returns {"scheme": {...}, "evidence": {...}, "unread": [...]} — evidence so
    a reviewer can see what was matched, unread so a section the patterns did
    not recognise is visible rather than silently absent.
    """
    scheme: dict[str, dict[str, Any]] = {}
    evidence: dict[str, str] = {}
    unread: list[str] = []

    for section in _split_sections(text or ""):
        question_type = _question_type(section)
        full = _to_int(_FULL.search(section).group(1) if _FULL.search(section) else None)
        negative = _to_int(_NEGATIVE.search(section).group(1) if _NEGATIVE.search(section) else None)
        zero = _to_int(_ZERO.search(section).group(1) if _ZERO.search(section) else None)
        partial = _to_int(_PARTIAL.search(section).group(1) if _PARTIAL.search(section) else None)

        if question_type is None:
            if full is not None or negative is not None:
                unread.append(_condense(section))
            continue
        if full is None:
            continue

        entry: dict[str, Any] = {
            "correct": full,
            # A section stating no negative marks carries none — numerical
            # questions in particular. Absent is not the same as zero, so it is
            # only defaulted when the page says "Zero Marks".
            "incorrect": negative if negative is not None else (0 if zero is not None else 0),
            "unattempted": 0,
        }
        if question_type == "mcq_multi" and partial is not None:
            entry["partial"] = "per_correct_option"

        scheme[question_type] = entry
        evidence[question_type] = _condense(section)

    return {"scheme": scheme, "evidence": evidence, "unread": unread}


def _condense(section: str, limit: int = 260) -> str:
    collapsed = re.sub(r"\s+", " ", section).strip()
    return collapsed[:limit] + ("…" if len(collapsed) > limit else "")
