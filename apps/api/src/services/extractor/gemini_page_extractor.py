#!/usr/bin/env python3
"""Extract exam questions page-by-page with Gemini 2.5 Flash via OpenRouter.

Input is produced by pymupdf_extractor.py for *digital* PDFs only:
  - rendered full-page PNGs for Gemini visual understanding,
  - geometry-aware text/HTML for deterministic reading order,
  - native embedded/vector images for final student-facing media.

Pages are processed in bounded parallel batches.  A page owns questions whose
number anchor starts on that page; short adjacent-page text is supplied as
continuity context so a question split at the page boundary can still be read.
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import json
import re
import os
import random
import sys
import time
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

OPENROUTER_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "google/gemini-2.5-flash")
DEFAULT_WORKERS = max(1, min(8, int(os.environ.get("GEMINI_PAGE_WORKERS", "4"))))
DEFAULT_BATCH_SIZE = max(1, int(os.environ.get("GEMINI_PAGE_BATCH_SIZE", str(DEFAULT_WORKERS))))
MAX_PAGE_OUTPUT_TOKENS = int(os.environ.get("GEMINI_PAGE_MAX_OUTPUT_TOKENS", "12000"))
PAGE_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_PAGE_TIMEOUT_SECONDS", "120"))
CONTEXT_CHARS = int(os.environ.get("GEMINI_PAGE_CONTINUITY_CHARS", "2500"))

SYSTEM_PROMPT = r"""You extract questions from one page of a digital Indian competitive-exam paper (JEE Main, JEE Advanced, or NEET-UG).
The attached image is the rendered source page. The supplied PyMuPDF HTML is
the authoritative reading order and contains geometry annotations. Native
image filenames are authoritative media assets; keep a filename exactly as
given when the figure belongs to a question or option.

Return ONLY JSON: {"questions": [...]}. Extract ONLY questions whose numbered
anchor begins on THIS PAGE; do not duplicate a question that began on the
previous page. A small next-page text window may be supplied solely to complete
the final question on this page.

For each question return:
  question_number (integer), question_text (Markdown with $...$ LaTeX),
  options (array of {id: A|B|C|D, text, image_url}), correct_answer ([]),
  question_type (MCQ|MSQ|Numerical|Matching|Assertion-Reason), subject,
  chapter, topic, difficulty (Easy|Medium|Hard), explanation (""),
  needs_review (boolean), review_reasons (array of strings).

════════════════════════════════════════════
  EXTRACTION RULES — READ CAREFULLY
════════════════════════════════════════════
• Extract EVERY question whose number appears on this page. Do NOT skip questions.
• A question = a numbered stem (1, 2, 3 … or Q.1, Q.2 …) followed by content.
• DO NOT extract as questions: pure section headers, "Directions:", "Passage:" text,
  or answer-key tables. These are NOT numbered questions.
• If a passage precedes numbered questions, include the passage text inside
  each question's question_text so the question is self-contained.
• NEVER skip a question because it seems incomplete — extract what is visible
  and set needs_review: true with a reason.
• Two-column layouts: read left column top-to-bottom, then right column.
• Never invent text, choices, answers, or diagrams.

════════════════════════════════════════════
  IMAGE RULES
════════════════════════════════════════════
• If a diagram belongs to the stem, place ![image](filename) in question_text.
  If it belongs to an option, place it in that option text or image_url.
• Preserve matching tables and lists as Markdown; preserve meaningful newlines.
• Numerical/Integer-type questions must have options: [].
• Do not solve the question. correct_answer must stay [].

════════════════════════════════════════════
  CLASSIFICATION (best-effort, do not skip questions for this)
════════════════════════════════════════════
• subject: "Physics" | "Chemistry" | "Mathematics" | "Biology"
• chapter: NCERT/JEE/NEET canonical chapter name (e.g. "Electrostatics", "Kinematics")
• topic: specific sub-topic within that chapter (e.g. "Capacitance", "Projectile Motion")
• difficulty: "Easy" | "Medium" | "Hard"
• If unsure about chapter/topic, make your best guess — do NOT skip the question.
"""


def page_prompt(page_number: int, page_html: str, images: dict[str, Any],
                previous_tail: str, next_head: str) -> str:
    manifest = json.dumps(images, ensure_ascii=False, separators=(",", ":"))
    return f"""THIS PAGE: {page_number}

NATIVE IMAGE MANIFEST (filename -> PDF geometry):
{manifest}

PYMUPDF HTML FOR THIS PAGE:
{page_html}

PREVIOUS-PAGE TAIL (context only; do not extract questions starting there):
{previous_tail or '(none)'}

NEXT-PAGE HEAD (use only to complete a question that starts on this page):
{next_head or '(none)'}
"""


def clean_raw_json_response(raw: str) -> str:
    if not raw:
        return "{}"
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    try:
        json.loads(raw)
        return raw
    except (json.JSONDecodeError, ValueError):
        pass
    VALID_ESC = {'"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'}
    result = []
    in_str = False
    i, n = 0, len(raw)
    while i < n:
        ch = raw[i]
        if not in_str:
            result.append(ch)
            if ch == '"':
                in_str = True
            i += 1
        else:
            if ch == '\\':
                nxt = raw[i + 1] if i + 1 < n else ''
                if nxt in VALID_ESC:
                    result.append(ch); result.append(nxt)
                    i += 2
                    if nxt == 'u' and i + 4 <= n:
                        result.extend(raw[i:i + 4]); i += 4
                else:
                    result.append('\\\\'); i += 1
            elif ch == '"':
                result.append(ch); in_str = False; i += 1
            elif ch == '\n':
                result.append('\\n'); i += 1
            elif ch == '\r':
                result.append('\\r'); i += 1
            else:
                result.append(ch); i += 1
    return "".join(result)

def parse_json(raw: str) -> dict[str, Any]:
    cleaned = clean_raw_json_response(raw)
    value = json.loads(cleaned)
    if not isinstance(value, dict) or not isinstance(value.get("questions"), list):
        raise ValueError("Gemini returned JSON without a questions array")
    return value


def openrouter_client():
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is required for Gemini PDF extraction")
    from openai import OpenAI
    return OpenAI(
        base_url=OPENROUTER_URL,
        api_key=key,
        timeout=PAGE_TIMEOUT_SECONDS,
        max_retries=0,
        default_headers={
            "HTTP-Referer": "https://classphere.com",
            "X-Title": "Classphere Gemini PDF Extractor",
        },
    )


def extract_page(index: int, pages: list[dict[str, Any]], work_dir: Path, model: str) -> tuple[int, list[dict[str, Any]]]:
    page = pages[index]
    page_number = index + 1
    image_rel = page.get("page_image") or f"page_images/page_{page_number:04d}.png"
    image_path = work_dir / image_rel
    if not image_path.exists():
        raise FileNotFoundError(f"Rendered page image missing: {image_path}")

    image_data_url = "data:image/png;base64," + base64.b64encode(image_path.read_bytes()).decode("ascii")
    page_html = str(page.get("html") or "")
    previous_tail = str(pages[index - 1].get("html") or "")[-CONTEXT_CHARS:] if index > 0 else ""
    next_head = str(pages[index + 1].get("html") or "")[:CONTEXT_CHARS] if index + 1 < len(pages) else ""
    prompt = page_prompt(page_number, page_html, page.get("images") or {}, previous_tail, next_head)

    client = openrouter_client()
    last_error: Exception | None = None
    for attempt in range(1, 4):
        started = time.monotonic()
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_data_url}},
                    ]},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=MAX_PAGE_OUTPUT_TOKENS,
            )
            parsed = parse_json(response.choices[0].message.content or "")
            questions: list[dict[str, Any]] = []
            for question in parsed["questions"]:
                if not isinstance(question, dict) or not isinstance(question.get("question_number"), int):
                    continue
                question["_pages"] = [page_number]
                question["_page_index"] = index
                question["extractor_version"] = "gemini-page-v1"
                question.setdefault("needs_review", False)
                question.setdefault("review_reasons", [])
                questions.append(question)
            print(f"[geminiPage] page {page_number}/{len(pages)} complete: {len(questions)} question(s) in {time.monotonic() - started:.1f}s")
            return index, questions
        except Exception as error:
            last_error = error
            retryable = any(code in str(error) for code in ("429", "408", "500", "502", "503", "504", "timeout"))
            print(f"[geminiPage] page {page_number} attempt {attempt}/3 failed: {error}", file=sys.stderr)
            if attempt == 3 or not retryable:
                break
            time.sleep((2 ** (attempt - 1)) + random.random())
    raise RuntimeError(f"Gemini failed for page {page_number}: {last_error}")


def parse_page_indexes(value: str | None, total_pages: int) -> list[int]:
    if not value:
        return list(range(total_pages))
    indexes: set[int] = set()
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            if "-" in part:
                start_text, end_text = part.split("-", 1)
                start, end = int(start_text), int(end_text)
                if start > end:
                    raise ValueError
                indexes.update(range(start - 1, end))
            else:
                indexes.add(int(part) - 1)
        except ValueError as error:
            raise ValueError(f"Invalid page range segment: {part!r}") from error
    invalid = sorted(index + 1 for index in indexes if index < 0 or index >= total_pages)
    if invalid:
        raise ValueError(f"Page range contains pages outside 1-{total_pages}: {invalid}")
    if not indexes:
        raise ValueError("Page range selected no pages")
    return sorted(indexes)


def run_parallel(pages: list[dict[str, Any]], page_indexes: list[int], work_dir: Path, model: str, workers: int, batch_size: int) -> list[dict[str, Any]]:
    collected: list[tuple[int, list[dict[str, Any]]]] = []
    for batch_start in range(0, len(page_indexes), batch_size):
        indexes = page_indexes[batch_start:batch_start + batch_size]
        page_labels = ",".join(str(index + 1) for index in indexes)
        print(f"[geminiPage] batch {batch_start // batch_size + 1}: pages {page_labels}, workers={min(workers, len(indexes))}")
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(workers, len(indexes))) as executor:
            futures = {executor.submit(extract_page, index, pages, work_dir, model): index for index in indexes}
            failures: list[str] = []
            for future in concurrent.futures.as_completed(futures):
                index = futures[future]
                try:
                    collected.append(future.result())
                except Exception as error:
                    failures.append(f"page {index + 1}: {error}")
            if failures:
                raise RuntimeError("Gemini page batch failed; no partial test was created. " + " | ".join(failures))

    questions: list[dict[str, Any]] = []
    for _index, page_questions in sorted(collected, key=lambda item: item[0]):
        questions.extend(page_questions)
    return questions


def main() -> int:
    parser = argparse.ArgumentParser(description="Parallel Gemini page extractor via OpenRouter")
    parser.add_argument("dir", help="extracted_data directory from pymupdf_extractor.py")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenRouter Gemini model ID")
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS, help="Maximum concurrent page calls")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE, help="Pages submitted per bounded batch")
    parser.add_argument("--pages", help="Optional 1-based page range, e.g. 1-5,8")
    args = parser.parse_args()

    work_dir = Path(args.dir)
    raw_path = work_dir / "marker_raw.json"
    output_path = work_dir / "all_extracted_data.json"
    if not raw_path.exists():
        raise FileNotFoundError(f"marker_raw.json not found in {work_dir}")
    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    pages = raw.get("json", {}).get("children", [])
    if not pages:
        output_path.write_text(json.dumps({"questions": []}, indent=2), encoding="utf-8")
        print("[geminiPage] No pages found; wrote empty result.")
        return 0

    workers = max(1, min(8, args.workers))
    batch_size = max(1, args.batch_size)
    page_indexes = parse_page_indexes(args.pages, len(pages))
    print(f"[geminiPage] model={args.model}; selected_pages={len(page_indexes)}/{len(pages)}; workers={workers}; batch_size={batch_size}")
    questions = run_parallel(pages, page_indexes, work_dir, args.model, workers, batch_size)
    output_path.write_text(json.dumps({"questions": questions}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[geminiPage] complete: {len(questions)} question(s) written to {output_path.name}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"[geminiPage] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
