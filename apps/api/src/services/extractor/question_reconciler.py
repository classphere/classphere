#!/usr/bin/env python3
"""Deterministic reconciliation between PDF question anchors and LLM extraction.

`pymupdf_extractor.py` annotates every detected question-number anchor in the
page HTML as ``data-qcand="N"`` and section headers as ``data-section="..."``.
Those anchors come from regex over the real PDF text, entirely independent of
the LLM, which makes them a usable ground truth for the only question that
actually matters: *did the model return every question that is on this page?*

Nothing here calls a model. It answers three things:

  1. Which question numbers does the PDF itself claim are on each page?
  2. Where does numbering restart (per-section papers such as JEE Advanced or
     NEET Section A/B), so a restart is never mistaken for a duplicate?
  3. Which numbers did the extraction miss, per page, so they can be re-asked?
"""

from __future__ import annotations

import re
from typing import Any

ANCHOR_RE = re.compile(r'data-qcand="(\d{1,3})"')
SECTION_RE = re.compile(r'data-section="([^"]*)"')

# A numbering run is a maximal stretch of non-decreasing question numbers. A
# genuine section restart drops back near 1; a single stray anchor inside a run
# (OCR noise, a wrapped exponent) drops back only slightly. Requiring the new
# value to be small keeps real restarts while ignoring that noise.
RESTART_MAX_START = 3

# A numbering run shorter than this, whose numbers all reappear in the dominant
# run, is treated as anchor-shaped noise (cover-page instructions) rather than a
# real section. Genuine sections in JEE/NEET papers are comfortably longer.
MIN_REAL_RUN_LEN = 3


def page_anchors(page_html: str) -> list[int]:
    """Question-number anchors on one page, in document reading order.

    Consecutive repeats collapse: a single question whose anchor is annotated on
    more than one fragment must not look like two questions.
    """
    numbers: list[int] = []
    for match in ANCHOR_RE.finditer(page_html or ""):
        value = int(match.group(1))
        if not numbers or numbers[-1] != value:
            numbers.append(value)
    return numbers


def page_sections(page_html: str) -> list[str]:
    """Section headers detected on one page, in reading order."""
    return [m.group(1) for m in SECTION_RE.finditer(page_html or "")]


def build_anchor_map(pages: list[dict[str, Any]], page_indexes: list[int]) -> dict[int, list[int]]:
    """page_index -> question numbers the PDF text claims start on that page."""
    return {index: page_anchors(str(pages[index].get("html") or "")) for index in page_indexes}


def assign_runs(anchor_map: dict[int, list[int]], page_indexes: list[int]) -> dict[tuple[int, int], int]:
    """Map (page_index, question_number) -> run id.

    Walking pages in order, a drop back to a low number starts a new run. This
    is what makes per-section numbering safe: Physics Q1 and Chemistry Q1 land
    in different runs and are therefore never collapsed into one question.
    """
    runs: dict[tuple[int, int], int] = {}
    current_run = 0
    last_number: int | None = None
    for index in page_indexes:
        for number in anchor_map.get(index, []):
            if last_number is not None and number < last_number and number <= RESTART_MAX_START:
                current_run += 1
            runs[(index, number)] = current_run
            last_number = number
    return runs


def build_page_runs(runs: dict[tuple[int, int], int], page_indexes: list[int]) -> dict[int, int]:
    """page_index -> the run that page belongs to.

    A page with no anchors at all (a continuation page carrying only a diagram,
    say) inherits the run of the nearest preceding page that has one. Defaulting
    such pages to run 0 put their questions in a different run from the same
    question found on the neighbouring page, so deduplication missed the pair.
    """
    page_runs: dict[int, int] = {}
    for index in page_indexes:
        anchors_here = [run for (idx, _num), run in runs.items() if idx == index]
        if anchors_here:
            page_runs[index] = max(set(anchors_here), key=anchors_here.count)
    last_seen = 0
    resolved: dict[int, int] = {}
    for index in page_indexes:
        last_seen = page_runs.get(index, last_seen)
        resolved[index] = last_seen
    return resolved


def run_for(runs: dict[tuple[int, int], int], page_index: int, number: int,
            page_runs: dict[int, int] | None = None) -> int:
    """Run id for an extracted question, tolerating anchors the regex missed."""
    exact = runs.get((page_index, number))
    if exact is not None:
        return exact
    # The LLM found a question the anchor regex did not. Inherit the run of the
    # nearest anchor on the same page so it still dedups against the right
    # section rather than silently colliding with another section's numbering.
    same_page = [(num, run) for (idx, num), run in runs.items() if idx == page_index]
    if same_page:
        return min(same_page, key=lambda item: abs(item[0] - number))[1]
    if page_runs is not None:
        return page_runs.get(page_index, 0)
    return 0


def prune_false_anchors(
    anchor_map: dict[int, list[int]],
    page_indexes: list[int],
) -> tuple[dict[int, list[int]], list[tuple[int, int]]]:
    """Drop anchor-shaped text that is not actually a question.

    Cover pages and instruction blocks ("Section 2: Multiple Correct Type",
    "3. Marking Scheme") match the question-number regex and appear as a tiny
    numbering run whose numbers all reappear in the real question sequence.
    Left in place they make a complete extraction look incomplete, and the
    recovery pass then pressures the model into inventing a question to fill a
    slot that never existed.

    Only runs that are both short *and* wholly covered by the dominant run are
    removed, so a genuine short section is never discarded.
    """
    runs = assign_runs(anchor_map, page_indexes)
    members: dict[int, list[tuple[int, int]]] = {}
    for (index, number), run in runs.items():
        members.setdefault(run, []).append((index, number))
    if len(members) < 2:
        return anchor_map, []

    dominant = max(members, key=lambda run: len(members[run]))
    dominant_numbers = {number for _index, number in members[dominant]}

    dropped: list[tuple[int, int]] = []
    for run, entries in members.items():
        if run == dominant or len(entries) >= MIN_REAL_RUN_LEN:
            continue
        if all(number in dominant_numbers for _index, number in entries):
            dropped.extend(entries)

    if not dropped:
        return anchor_map, []
    drop_set = set(dropped)
    pruned = {
        index: [number for number in numbers if (index, number) not in drop_set]
        for index, numbers in anchor_map.items()
    }
    return pruned, sorted(dropped)


def extracted_by_page(questions: list[dict[str, Any]]) -> dict[int, set[int]]:
    """page_index -> question numbers the extraction actually returned."""
    found: dict[int, set[int]] = {}
    for question in questions:
        index = question.get("_page_index")
        number = question.get("question_number")
        if isinstance(index, int) and isinstance(number, int):
            found.setdefault(index, set()).add(number)
    return found


def missing_by_page(
    anchor_map: dict[int, list[int]],
    questions: list[dict[str, Any]],
    truncated_pages: set[int] | None = None,
    failed_pages: set[int] | None = None,
) -> dict[int, list[int]]:
    """page_index -> anchored question numbers that the extraction did not return.

    Truncated and failed pages are always reported, even when every anchor was
    matched, because such a page may also have lost questions the anchor regex
    never detected. An entry with an empty list means "re-ask this whole page".
    """
    found = extracted_by_page(questions)
    missing: dict[int, list[int]] = {}
    for index, anchors in anchor_map.items():
        got = found.get(index, set())
        gap = sorted({number for number in anchors if number not in got})
        if gap:
            missing[index] = gap
    for index in (truncated_pages or set()) | (failed_pages or set()):
        missing.setdefault(index, [])
    return missing


def completeness_report(
    anchor_map: dict[int, list[int]],
    questions: list[dict[str, Any]],
    truncated_pages: set[int] | None = None,
    failed_pages: set[int] | None = None,
) -> dict[str, Any]:
    """Machine-readable answer to 'is this extraction complete?'.

    ``expected_total`` counts distinct (page, number) anchors rather than
    distinct numbers, so a per-section paper that legitimately repeats number 1
    is not scored as if those were the same question.
    """
    expected_pairs = {(index, number) for index, numbers in anchor_map.items() for number in numbers}
    expected_total = len(expected_pairs)
    missing = missing_by_page(anchor_map, questions, truncated_pages, failed_pages)
    missing_total = sum(len(numbers) for numbers in missing.values())
    matched = max(0, expected_total - missing_total)
    return {
        "expected_total": expected_total,
        "extracted_total": len(questions),
        "anchors_matched": matched,
        "missing_total": missing_total,
        "missing_by_page": {str(index + 1): numbers for index, numbers in sorted(missing.items()) if numbers},
        "truncated_pages": sorted((index + 1) for index in (truncated_pages or set())),
        # Pages that exhausted their retries entirely — their questions are
        # absent for a different reason than a model omission, and the operator
        # needs to see that distinction.
        "failed_pages": sorted((index + 1) for index in (failed_pages or set())),
        # 1.0 only when every anchor the PDF itself advertises was returned.
        "completeness": round(matched / expected_total, 4) if expected_total else 1.0,
    }
