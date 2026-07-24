#!/usr/bin/env python3
"""Validate external golden PDFs and optional extraction JSON without temp files."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))

from document_profile import profile_pdf


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def expand_ranges(ranges: Iterable[List[int]]) -> Set[int]:
    pages: Set[int] = set()
    for start, end in ranges:
        pages.update(range(int(start), int(end) + 1))
    return pages


def question_list(value: Any) -> List[Dict[str, Any]]:
    if isinstance(value, dict):
        value = value.get("questions", [])
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def validate_extraction(document: Dict[str, Any], extraction_path: Path) -> List[str]:
    errors: List[str] = []
    data = json.loads(extraction_path.read_text(encoding="utf-8"))
    questions = question_list(data)
    expected = int(document["expected_question_count"])
    if len(questions) != expected:
        errors.append(f"expected {expected} questions, found {len(questions)}")
    numbers = [int(item.get("question_number", 0)) for item in questions]
    if numbers != list(range(1, expected + 1)):
        errors.append("question numbers are not the exact continuous 1..N sequence")

    forbidden_pages = expand_ranges(document.get("page_roles", {}).get("answer_key", []))
    forbidden_pages |= expand_ranges(document.get("page_roles", {}).get("solutions", []))
    for item in questions:
        metadata = item.get("extraction_metadata") or {}
        pages = set(metadata.get("source_pages") or item.get("source_reference", {}).get("source_pages") or [])
        if pages and pages <= forbidden_pages:
            errors.append(f"Q{item.get('question_number')} originates only from an answer-key/solution page")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus-dir", required=True, type=Path)
    parser.add_argument("--manifest", type=Path, default=HERE / "golden" / "corpus.manifest.json")
    parser.add_argument("--extractions-dir", type=Path)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    failures: List[str] = []

    for document in manifest["documents"]:
        label = document["id"]
        pdf = args.corpus_dir / document["filename"]
        if not pdf.is_file():
            failures.append(f"{label}: missing PDF {pdf}")
            continue
        actual_hash = sha256(pdf)
        if actual_hash != document["sha256"]:
            failures.append(f"{label}: SHA-256 mismatch")
            continue

        profile = profile_pdf(str(pdf))
        if profile["page_count"] != document["pages"]:
            failures.append(f"{label}: expected {document['pages']} pages, found {profile['page_count']}")
        if profile["document_kind"] != document["expected_document_kind"]:
            failures.append(f"{label}: expected {document['expected_document_kind']} profile, found {profile['document_kind']}")

        answer_expected = expand_ranges(document.get("page_roles", {}).get("answer_key", []))
        solutions_expected = expand_ranges(document.get("page_roles", {}).get("solutions", []))
        # Raster pages intentionally defer semantic role detection to OCR. At
        # the routing layer, sending the expected page to OCR is sufficient.
        routed_roles = set(profile["ocr_pages"])
        missing_answer = answer_expected - (set(profile["answer_key_pages"]) | routed_roles)
        missing_solutions = solutions_expected - (set(profile["solution_pages"]) | routed_roles)
        if missing_answer:
            failures.append(f"{label}: answer-key page(s) not classified: {sorted(missing_answer)}")
        if missing_solutions:
            failures.append(f"{label}: solution page(s) not classified: {sorted(missing_solutions)}")

        if args.extractions_dir:
            extraction = args.extractions_dir / f"{label}.json"
            if not extraction.is_file():
                failures.append(f"{label}: missing extraction JSON {extraction}")
            else:
                failures.extend(f"{label}: {error}" for error in validate_extraction(document, extraction))

        print(f"PASS profile {label}: {profile['document_kind']}, {profile['page_count']} pages")

    if failures:
        for failure in failures:
            print(f"FAIL {failure}", file=sys.stderr)
        return 1
    print(f"PASS golden corpus: {len(manifest['documents'])} documents")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
