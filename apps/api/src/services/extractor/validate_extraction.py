"""
validate_extraction.py
=======================
Standalone deterministic QA gate for extracted question JSON.
Run it on all_extracted_data.json (before or after normalize_json.py) to get
a pass/fail report without any LLM calls.

Checks per question (via extract_common.diagnose_question):
  - option count / type coherence, empty & duplicate options, bad option ids
  - LaTeX lint: unbalanced $/braces, leftover pipeline tags, garbled escapes
  - image audits: referenced files exist, duplicates
  - dangling cross-page fragments, hallucination markers
Paper-level checks:
  - question-number continuity (gaps, duplicates)
  - expected question count (--expect N)
  - every extracted image on disk is referenced by exactly one question (--images-dir)

Exit code: 0 = clean, 1 = errors found.

Usage:
    python validate_extraction.py <json_file> [--images-dir dir] [--expect 75]
        [--report out.json]
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from extract_common import diagnose_question, _referenced_images


def main():
    ap = argparse.ArgumentParser(description="Validate extracted question JSON")
    ap.add_argument("json_file")
    ap.add_argument("--images-dir", default=None)
    ap.add_argument("--expect", type=int, default=None,
                    help="Expected number of questions")
    ap.add_argument("--report", default=None)
    args = ap.parse_args()

    data = json.loads(Path(args.json_file).read_text(encoding="utf-8"))
    questions = data.get("questions", data) if isinstance(data, dict) else data

    available = None
    images_dir = Path(args.images_dir) if args.images_dir else None
    if images_dir and images_dir.exists():
        available = {p.name for p in images_dir.iterdir() if p.is_file()}

    total_errors, total_warnings = 0, 0
    per_q = {}

    for q in questions:
        errs, warns = diagnose_question(q, available_images=available)
        n = q.get("question_number")
        if errs or warns:
            per_q[n] = {"errors": errs, "warnings": warns}
        total_errors += len(errs)
        total_warnings += len(warns)
        if errs:
            print(f"Q{n}: {len(errs)} ERROR(S)")
            for e in errs:
                print(f"   E: {e}")
        for w in warns:
            print(f"Q{n}:   w: {w}")

    # Paper-level checks
    nums = [q.get("question_number", 0) for q in questions]
    paper_issues = []
    dupes = [n for n, c in Counter(nums).items() if c > 1]
    if dupes:
        paper_issues.append(f"duplicate question numbers: {sorted(dupes)}")
    if nums:
        gaps = [i for i in range(min(nums), max(nums) + 1) if i not in set(nums)]
        if gaps:
            paper_issues.append(f"missing question numbers: {gaps}")
    if args.expect is not None and len(questions) != args.expect:
        paper_issues.append(f"expected {args.expect} questions, found {len(questions)}")

    if available is not None:
        ref_count = Counter()
        for q in questions:
            for r in set(_referenced_images(q)):
                ref_count[r] += 1
        unreferenced = sorted(available - set(ref_count))
        if unreferenced:
            paper_issues.append(f"extracted images never referenced: {unreferenced}")
        multi = sorted(r for r, c in ref_count.items() if c > 1)
        if multi:
            paper_issues.append(f"images referenced by multiple questions: {multi}")

    for issue in paper_issues:
        print(f"PAPER: E: {issue}")
        total_errors += 1

    flagged = [q.get("question_number") for q in questions if q.get("_needs_review")]

    print(f"\n{'='*50}")
    print(f"  Questions        : {len(questions)}")
    print(f"  Errors           : {total_errors}")
    print(f"  Warnings         : {total_warnings}")
    print(f"  Flagged (_needs_review): {flagged if flagged else 'None'}")
    print(f"  Verdict          : {'CLEAN' if total_errors == 0 else 'ERRORS FOUND'}")
    print(f"{'='*50}")

    if args.report:
        Path(args.report).write_text(json.dumps({
            "total": len(questions),
            "errors": total_errors,
            "warnings": total_warnings,
            "flagged": flagged,
            "paper_issues": paper_issues,
            "per_question": {str(k): v for k, v in per_q.items()},
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Report written to {args.report}")

    sys.exit(1 if total_errors else 0)


if __name__ == "__main__":
    main()
