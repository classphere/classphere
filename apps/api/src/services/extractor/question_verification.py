#!/usr/bin/env python3
"""Check each extracted question against the text actually printed on its page.

Everything else in the pipeline checks *structure* — is there an answer, do the
options number four, is the paper 75 questions long. All of it passes happily on
a question the model partly invented, because an invented question is perfectly
well formed.

This is the only check that compares the output against the source. PyMuPDF has
already read the page exactly; the model's job was to transcribe it. So the words
in an extracted question should nearly all appear on the page it came from, and
the ones that do not are the interesting ones:

  a stem the model completed from its own knowledge when the PDF was unclear,
  an option carried over from the previous question,
  a passage summarised rather than copied.

Reported as a coverage score per question rather than a pass/fail, because
transcription is never word-identical: maths becomes LaTeX, whitespace is
normalised, and a superscript that was markup on the page is a character here.

What it deliberately does NOT do is judge a question by how much of the *page* it
covers. A page holds several questions, so that number is meaningless — the
direction that matters is words in the extraction that are absent from the page.
"""

from __future__ import annotations

import re
from typing import Any

# Below this share of its words appearing on the source page, a question is worth
# a reviewer's eye. Chosen to sit under ordinary transcription drift — real
# questions score in the high 0.9s — while catching a stem that has been
# rewritten or padded.
MATCH_THRESHOLD = 0.82

# Under this many comparable words there is not enough signal to judge. A short
# numerical stem ("Find the value of x") is mostly maths and stopwords; scoring
# it would produce noise, not findings.
MIN_WORDS_TO_JUDGE = 8

# Words carrying no evidence either way. Kept deliberately short: the aim is to
# remove grammar, not vocabulary, because vocabulary is what proves the sentence
# came off the page.
_STOPWORDS = {
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was",
    "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may",
    "new", "now", "old", "see", "two", "who", "boy", "did", "man", "men", "put",
    "say", "she", "too", "use", "that", "with", "this", "from", "they", "will",
    "would", "there", "their", "what", "which", "when", "then", "than", "them",
    "been", "have", "were", "each", "into", "some", "such", "only", "other",
    "following", "given", "figure", "shown", "value", "values", "find", "then",
}

_MATH_SPAN = re.compile(r"\$\$.*?\$\$|\$[^$]*\$", re.DOTALL)
_LATEX_CMD = re.compile(r"\\[a-zA-Z]+")
_MD_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_WORD = re.compile(r"[a-z][a-z0-9]{2,}")


def comparable_words(text: str) -> set[str]:
    """The words in a piece of text that can meaningfully be compared.

    Maths is stripped rather than compared: the model rewrites a printed formula
    into LaTeX, so `$\\frac{1}{2}$` and what PyMuPDF read off the page share no
    tokens even when the transcription is perfect. Comparing prose only keeps the
    score honest.
    """
    if not text:
        return set()
    cleaned = _MD_IMAGE.sub(" ", str(text))
    cleaned = _MATH_SPAN.sub(" ", cleaned)
    cleaned = _LATEX_CMD.sub(" ", cleaned)
    cleaned = cleaned.replace("<", " ").replace(">", " ").lower()
    return {word for word in _WORD.findall(cleaned) if word not in _STOPWORDS}


def question_words(question: dict[str, Any]) -> set[str]:
    """Every comparable word the extraction claims this question contains."""
    words = comparable_words(question.get("question_text", ""))
    for option in question.get("options") or []:
        if isinstance(option, dict):
            words |= comparable_words(option.get("text", ""))
    return words


def verify_questions(
    pages: list[dict[str, Any]],
    questions: list[dict[str, Any]],
    visible_text,
) -> dict[str, Any]:
    """Score every question against its source page, in place.

    `visible_text` is passed in rather than imported so this module stays free of
    the extractor's own dependencies and can be tested with a plain function.

    A question is compared against its own page *and the next one*, because a
    question beginning near the foot of a page legitimately continues overleaf —
    the extractor is given both images for exactly that reason, and scoring
    against one page alone would report every straddling question as invented.
    """
    page_words: dict[int, set[str]] = {}

    def words_for(index: int) -> set[str]:
        if index not in page_words:
            if 0 <= index < len(pages):
                page_words[index] = comparable_words(visible_text(str(pages[index].get("html") or "")))
            else:
                page_words[index] = set()
        return page_words[index]

    judged = 0
    flagged: list[int] = []

    for question in questions:
        # A gap placeholder has no text by definition; it is already flagged.
        if question.get("is_gap"):
            continue

        index = question.get("_page_index")
        if not isinstance(index, int):
            continue

        extracted = question_words(question)
        if len(extracted) < MIN_WORDS_TO_JUDGE:
            question["_source_match"] = None  # not enough prose to judge
            continue

        source = words_for(index) | words_for(index + 1)
        if not source:
            question["_source_match"] = None
            continue

        found = extracted & source
        score = len(found) / len(extracted)
        question["_source_match"] = round(score, 3)
        judged += 1

        if score < MATCH_THRESHOLD:
            flagged.append(question.get("question_number") or 0)
            missing = sorted(extracted - source)[:6]
            reasons = question.get("review_reasons")
            question["review_reasons"] = (reasons if isinstance(reasons, list) else []) + [
                f"Only {round(score * 100)}% of this question's wording appears on page "
                f"{index + 1} of the PDF. Check it against the source — "
                f"words not found there: {', '.join(missing)}."
            ]
            question["needs_review"] = True

    return {
        "judged": judged,
        "flagged": sorted(n for n in flagged if n),
        "threshold": MATCH_THRESHOLD,
    }
