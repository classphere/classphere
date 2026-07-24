#!/usr/bin/env python3
"""Deterministic, side-effect-free PDF profile for extraction routing.

The profiler reads a PDF and prints one JSON object to stdout. It never creates
working directories or writes extracted assets. The existing extractor remains
the source of content; this module only supplies page/document routing signals.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import fitz  # PyMuPDF

ROLE_PATTERNS = {
    "answer_key": re.compile(r"\b(?:answer\s*keys?|answer\s*sheet|key\s*answers?)\b", re.I),
    "solutions": re.compile(r"(?im)^\s*(?:solutions?|\d+\s*[.)]\s*explain\s+question\s*:|worked\s+solutions?)\s*"),
    "instructions": re.compile(r"\b(?:general\s+instructions?|instructions?\s+for\s+candidates?|marking\s+scheme)\b", re.I),
    "questions": re.compile(r"(?:^|\n)\s*(?:q(?:uestion)?\s*[.: -]?)?\d{1,3}\s*[.)]\s+", re.I),
}


def _rect(value: Sequence[float]) -> Tuple[float, float, float, float]:
    return float(value[0]), float(value[1]), float(value[2]), float(value[3])


def _area(rect: Sequence[float]) -> float:
    x0, y0, x1, y1 = _rect(rect)
    return max(0.0, x1 - x0) * max(0.0, y1 - y0)


def _image_coverage(page: fitz.Page) -> float:
    page_area = max(1.0, page.rect.width * page.rect.height)
    rectangles: List[Tuple[float, float, float, float]] = []
    try:
        for item in page.get_image_info(xrefs=True):
            candidate = item.get("bbox")
            if candidate and len(candidate) == 4:
                rectangles.append(_rect(candidate))
    except Exception:
        pass
    # Bounding boxes can overlap (masks and tiles), so this is deliberately a
    # capped approximation used only for routing, never for fidelity scoring.
    return min(1.0, sum(_area(item) for item in rectangles) / page_area)


def _text_blocks(page: fitz.Page) -> List[Tuple[float, float, float, float, str]]:
    blocks = []
    try:
        for item in page.get_text("blocks", sort=False):
            if len(item) < 5:
                continue
            value = str(item[4] or "").strip()
            if value:
                blocks.append((float(item[0]), float(item[1]), float(item[2]), float(item[3]), value))
    except Exception:
        return []
    return blocks


def _raster_gutter_columns(page: fitz.Page) -> int:
    """Estimate one/two columns from a low-resolution page raster.

    A stable pale gutter near the middle, with ink on both sides, is strong
    evidence of two-column scan layout. This is intentionally conservative.
    """
    try:
        pix = page.get_pixmap(matrix=fitz.Matrix(0.45, 0.45), colorspace=fitz.csGRAY, alpha=False)
        width, height = pix.width, pix.height
        if width < 80 or height < 100:
            return 1
        samples = pix.samples
        stride = pix.stride
        y0, y1 = int(height * 0.12), int(height * 0.92)

        def ink_ratio(x_start: int, x_end: int) -> float:
            dark = total = 0
            for y in range(y0, y1, 2):
                row = y * stride
                for x in range(max(0, x_start), min(width, x_end), 2):
                    total += 1
                    if samples[row + x] < 210:
                        dark += 1
            return dark / max(1, total)

        middle = width // 2
        gutter_half = max(3, int(width * 0.018))
        gutter = ink_ratio(middle - gutter_half, middle + gutter_half)
        left = ink_ratio(int(width * 0.08), int(width * 0.44))
        right = ink_ratio(int(width * 0.56), int(width * 0.92))
        return 2 if left > 0.018 and right > 0.018 and gutter < min(left, right) * 0.55 else 1
    except Exception:
        return 1


def _digital_columns(page: fitz.Page, blocks: Sequence[Tuple[float, float, float, float, str]]) -> int:
    width = max(1.0, page.rect.width)
    useful = [item for item in blocks if len(item[4]) >= 8 and (item[2] - item[0]) < width * 0.72]
    if len(useful) < 6:
        return 1
    left = sum(1 for x0, _y0, x1, _y1, _text in useful if (x0 + x1) / 2 < width * 0.47)
    right = sum(1 for x0, _y0, x1, _y1, _text in useful if (x0 + x1) / 2 > width * 0.53)
    crossing = sum(1 for x0, _y0, x1, _y1, _text in useful if x0 < width * 0.42 and x1 > width * 0.58)
    return 2 if left >= 3 and right >= 3 and crossing <= max(2, len(useful) // 5) else 1


def _role(text: str) -> Tuple[str, List[str]]:
    matches = [name for name, pattern in ROLE_PATTERNS.items() if pattern.search(text)]
    if "answer_key" in matches:
        return "answer_key", matches
    if "solutions" in matches:
        return "solutions", matches
    if "questions" in matches:
        return "questions", matches
    if "instructions" in matches:
        return "instructions", matches
    return "unknown", matches


def _page_profile(page: fitz.Page, page_number: int) -> Dict[str, Any]:
    blocks = _text_blocks(page)
    plain_text = "\n".join(item[4] for item in blocks)
    text_chars = len(re.sub(r"\s+", "", plain_text))
    images = page.get_images(full=True)
    drawings = page.get_drawings()
    coverage = _image_coverage(page)

    if text_chars < 80 and (coverage >= 0.60 or len(images) > 0 or len(drawings) > 0):
        content_kind = "scanned"
    elif text_chars >= 250 and coverage < 0.75:
        content_kind = "digital"
    else:
        content_kind = "hybrid"

    columns = _digital_columns(page, blocks) if text_chars >= 80 else _raster_gutter_columns(page)
    role, role_signals = _role(plain_text)
    reasons: List[str] = []
    if content_kind == "scanned":
        reasons.append("no_reliable_text_layer")
    if columns == 2:
        reasons.append("two_column_reading_order")
    if len(drawings) >= 30:
        reasons.append("vector_dense_page")
    if role == "unknown" and text_chars < 80:
        reasons.append("page_role_requires_ocr")

    return {
        "page": page_number,
        "content_kind": content_kind,
        "likely_columns": columns,
        "role": role,
        "role_signals": role_signals,
        "text_characters": text_chars,
        "text_blocks": len(blocks),
        "embedded_images": len(images),
        "image_coverage": round(coverage, 4),
        "vector_drawings": len(drawings),
        "width": round(page.rect.width, 2),
        "height": round(page.rect.height, 2),
        "requires_ocr": content_kind == "scanned",
        "escalation_reasons": reasons,
    }


def profile_document(document: fitz.Document) -> Dict[str, Any]:
    if document.needs_pass:
        raise ValueError("Encrypted PDFs are not supported")
    pages = [_page_profile(document[index], index + 1) for index in range(document.page_count)]

    # A full-page scan uses one stable layout template. If enough raster pages
    # expose a central gutter, carry that signal to other scanned pages where a
    # diagram or watermark locally obscures the gutter.
    scanned_pages = [page for page in pages if page["content_kind"] == "scanned"]
    scanned_two_column = [page for page in scanned_pages if page["likely_columns"] == 2]
    if scanned_pages and len(scanned_two_column) / len(scanned_pages) >= 0.35:
        for page in scanned_pages:
            page["likely_columns"] = 2
            if "two_column_reading_order" not in page["escalation_reasons"]:
                page["escalation_reasons"].append("two_column_reading_order")

    # Page-role headers are often printed once and followed by continuation
    # pages. Propagate only across low-information/unknown pages and never across
    # a newly detected question, solution, or answer-key boundary.
    for index, page in enumerate(pages):
        if page["role"] == "answer_key":
            for candidate in pages[index + 1:index + 3]:
                if candidate["role"] != "unknown" or candidate["text_characters"] >= 800:
                    break
                candidate["role"] = "answer_key"
                candidate["role_signals"].append("answer_key_continuation")
        if page["role"] == "solutions":
            for candidate in pages[index + 1:]:
                if candidate["role"] in {"questions", "answer_key", "instructions"}:
                    break
                if candidate["role"] == "unknown":
                    candidate["role"] = "solutions"
                    candidate["role_signals"].append("solution_continuation")

    kinds = Counter(page["content_kind"] for page in pages)
    total_pages = max(1, len(pages))
    if kinds["scanned"] / total_pages >= 0.80:
        document_kind = "scanned"
    elif kinds["digital"] / total_pages >= 0.80 and kinds["scanned"] == 0:
        document_kind = "digital"
    else:
        document_kind = "hybrid"

    reasons = sorted({reason for page in pages for reason in page["escalation_reasons"]})
    return {
        "profile_version": 1,
        "document_kind": document_kind,
        "page_count": len(pages),
        "page_kind_counts": dict(kinds),
        "two_column_pages": [page["page"] for page in pages if page["likely_columns"] == 2],
        "answer_key_pages": [page["page"] for page in pages if page["role"] == "answer_key"],
        "solution_pages": [page["page"] for page in pages if page["role"] == "solutions"],
        "ocr_pages": [page["page"] for page in pages if page["requires_ocr"]],
        "escalation_reasons": reasons,
        "pages": pages,
    }


def profile_pdf(pdf_path: str) -> Dict[str, Any]:
    path = Path(pdf_path)
    if not path.is_file():
        raise FileNotFoundError(f"PDF not found: {path}")
    document = fitz.open(path)
    try:
        return profile_document(document)
    finally:
        document.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Print deterministic PDF extraction profile JSON")
    parser.add_argument("pdf")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()
    try:
        result = profile_pdf(args.pdf)
        print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc), "profile_version": 1}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
