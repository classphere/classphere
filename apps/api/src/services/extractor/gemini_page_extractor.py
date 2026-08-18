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
import ast
import json
import re
import os
import random
import sys
import uuid
import time
from pathlib import Path
from typing import Any

import question_reconciler as reconciler
import question_verification as verification

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
# Switched from gemini-2.5-flash after a side-by-side run on a real 180-question
# NEET paper: completeness tied (180/180 both), and the one question checked
# against the actual printed page — not against PyMuPDF's raw text, which this
# paper barely has any of — went to 3.1-flash-lite. 2.5-flash had swapped two
# answer options (B and D) relative to what was printed; 3.1-flash-lite matched
# the source exactly. Materially cheaper too: $0.25/$1.50 per M tokens vs
# $0.30/$2.50. GEMINI_MODEL still overrides this if a rollback is ever needed.
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "google/gemini-3.1-flash-lite")
DEFAULT_WORKERS = max(1, min(8, int(os.environ.get("GEMINI_PAGE_WORKERS", "4"))))
DEFAULT_BATCH_SIZE = max(1, int(os.environ.get("GEMINI_PAGE_BATCH_SIZE", str(DEFAULT_WORKERS))))
MAX_PAGE_OUTPUT_TOKENS = int(os.environ.get("GEMINI_PAGE_MAX_OUTPUT_TOKENS", "16000"))
PAGE_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_PAGE_TIMEOUT_SECONDS", "120"))
CONTEXT_CHARS = int(os.environ.get("GEMINI_PAGE_CONTINUITY_CHARS", "2500"))
# A page whose first pass missed anchored questions is re-asked with those
# numbers named explicitly. Bounded so a pathological page cannot loop forever.
MAX_RECONCILE_ROUNDS = int(os.environ.get("GEMINI_RECONCILE_ROUNDS", "3"))

SYSTEM_PROMPT = r"""You extract questions from one page of a digital Indian competitive-exam paper (JEE Main, JEE Advanced, or NEET-UG).
The attached image is the rendered source page. The supplied PyMuPDF HTML is
the authoritative reading order and contains geometry annotations. Native
image filenames are authoritative media assets; keep a filename exactly as
given when the figure belongs to a question or option.

A second image may follow: the next page, supplied only so a question that
begins on this page can be finished from it. Options routinely run past the
page break, and an option is often a picture rather than text — read those off
the second image rather than leaving them blank.

Return ONLY JSON: {"questions": [...]}. Extract ONLY questions whose numbered
anchor begins on THIS PAGE; do not duplicate a question that began on the
previous page. A small next-page text window may be supplied solely to complete
the final question on this page.

For each question return:
  question_number (integer), question_text (Markdown with $...$ LaTeX),
  section (the section heading printed above this question, verbatim, e.g.
    "SECTION A" or "SECTION B - Numerical Value"; "" if the page prints none),
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
• Copy the section heading into every question that falls under it, including
  questions on later pages where the heading was printed once and not repeated.
  The supplied HTML annotates detected headings with data-section — trust that
  over your own reading of the image. Return "" only when the paper genuinely
  prints no sections; do not invent "SECTION A" for an unsectioned paper.
• Two-column layouts: read left column top-to-bottom, then right column.
• Never invent text, choices, answers, or diagrams.
• ALL mathematics must be LaTeX between $...$ delimiters. The supplied PyMuPDF
  HTML sometimes carries MathML (<math>, <mfrac>, <msup>, <mfenced> ...) copied
  out of the PDF's text layer. NEVER pass that through. Rewrite it as LaTeX:
  <mfrac><mn>1</mn><mn>2</mn></mfrac> becomes $\frac{1}{2}$. Nothing downstream
  renders MathML, so a question containing it displays as raw markup to the
  student. The same goes for any other HTML tag — question_text is Markdown.

════════════════════════════════════════════
  IMAGE RULES
════════════════════════════════════════════
• If a diagram belongs to the stem, place ![image](filename) in question_text.
• If a diagram belongs to an option, put the filename in that option's
  image_url and NOT in its text. Never put the same figure in both — an option
  carries its figure in image_url, and its text carries only the words printed
  beside that figure, or "" when there are none.
• An option you can see in either image must never be returned with empty text
  and no image_url. A choice question must come back with every option it has —
  if the stem shows four and you can read only two, extract all four from the
  page images and set needs_review: true rather than returning empty ones.
• Preserve matching tables and lists as Markdown; preserve meaningful newlines.
• Numerical/Integer-type questions must have options: [].
• Do not solve the question. correct_answer must stay [].

════════════════════════════════════════════
  CLASSIFICATION (best-effort, do not skip questions for this)
════════════════════════════════════════════
• subject: "Physics" | "Chemistry" | "Mathematics" | "Botany" | "Zoology"
  For NEET biology, choose Botany for plant topics and Zoology for animal or
  human topics — NEET is examined as two separate sections, and "Biology"
  cannot be assigned to either afterwards. Use "Biology" only if genuinely
  undecidable from the question.
• chapter: NCERT/JEE/NEET canonical chapter name (e.g. "Electrostatics", "Kinematics")
• topic: specific sub-topic within that chapter (e.g. "Capacitance", "Projectile Motion")
• difficulty: "Easy" | "Medium" | "Hard"
• If unsure about chapter/topic, make your best guess — do NOT skip the question.
"""


_TAG_RE = re.compile(r"<[^>]+>")
_STYLE_RE = re.compile(r"<style[^>]*>.*?</style>", re.S | re.I)


def visible_text(html: str) -> str:
    """The words on a page, with the markup that carries them removed.

    The continuity windows used to be raw slices of PyMuPDF HTML, which is
    mostly not words: a stylesheet, per-span font attributes, and — on any page
    carrying figures — base64 image payloads inline in the markup. On a real
    paper the first visible character of one page sat 48,000 characters into
    its HTML, so a 2,500-character window over that page handed the model an
    empty string while looking like it had supplied context.

    That window exists so a question whose options run past a page break can
    still be completed, which is exactly what fails on figure-heavy pages —
    the pages where a question is most likely to be split in the first place.
    Slicing text rather than markup makes the window carry what it claims to.
    """
    if not html:
        return ""
    return _TAG_RE.sub(" ", _STYLE_RE.sub(" ", html)).replace("&nbsp;", " ").strip()


def context_head(page: dict[str, Any]) -> str:
    """Opening words of the next page — enough to finish this page's last question."""
    text = re.sub(r"[ \t]+", " ", visible_text(str(page.get("html") or "")))
    return text[:CONTEXT_CHARS]


def context_tail(page: dict[str, Any]) -> str:
    """Closing words of the previous page, so a continuation is recognised as one."""
    text = re.sub(r"[ \t]+", " ", visible_text(str(page.get("html") or "")))
    return text[-CONTEXT_CHARS:]


def page_prompt(page_number: int, page_html: str, images: dict[str, Any],
                previous_tail: str, next_head: str,
                focus_numbers: list[int] | None = None,
                next_images: dict[str, Any] | None = None,
                has_next_image: bool = False) -> str:
    manifest = json.dumps(images, ensure_ascii=False, separators=(",", ":"))
    # A question that begins on this page can carry an option whose figure sits
    # past the break. The page's own manifest cannot name that file, so the
    # option arrives with its text and no figure. Every page writes into one
    # image directory, so a filename from the next page resolves downstream
    # exactly like one from this page.
    next_manifest = json.dumps(next_images or {}, ensure_ascii=False, separators=(",", ":"))
    focus_block = ""
    if focus_numbers:
        wanted = ", ".join(str(number) for number in focus_numbers)
        focus_block = f"""
════════════════════════════════════════════
  RECOVERY PASS — MISSING QUESTIONS
════════════════════════════════════════════
A previous pass over THIS PAGE did not return these question numbers, and the
page text appears to contain their numbered anchors: {wanted}

Look for each one and extract it if it is a real question. If it is unreadable
but real, return it with needs_review: true and a review_reason.

IMPORTANT — do not invent a question to fill a slot. A number in this list may
be a false match on non-question text such as a cover page, an instruction list
("Section 2: Multiple Correct Type"), or a marking scheme ("3. Marking Scheme").
If the number does not begin an actual exam question on this page, simply omit
it. Returning fewer questions is correct; fabricating one is not.

You may return other questions from this page too; duplicates are discarded safely.
"""
    two_page_note = "" if not has_next_image else f"""
YOU HAVE TWO IMAGES. The first is page {page_number}, the page you are
extracting. The second is page {page_number + 1}, supplied ONLY so a question
that begins on page {page_number} can be completed from it.

A question's options frequently run past the page break, and in this paper an
option is often a picture -- a structural formula, a circuit, a graph -- rather
than text. When that happens, read the options off the second image and give
each one the filename from the next-page manifest whose geometry matches where
it sits on that page. An option you can see must never be returned empty.

Still return only questions whose numbered anchor begins on page {page_number}.
"""
    return f"""THIS PAGE: {page_number}
{focus_block}{two_page_note}
NATIVE IMAGE MANIFEST (filename -> PDF geometry):
{manifest}

PYMUPDF HTML FOR THIS PAGE:
{page_html}

PREVIOUS-PAGE TAIL (context only; do not extract questions starting there):
{previous_tail or '(none)'}

NEXT-PAGE HEAD (use only to complete a question that starts on this page):
{next_head or '(none)'}

NEXT-PAGE IMAGE MANIFEST (filename -> PDF geometry):
{next_manifest}
Use a filename from this manifest only when a question that BEGINS on this page
has an option or figure that continues onto the next page. Do not extract the
next page's own questions.
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

# Keys the model wrote as Python would: {'questions': ...} or {questions: ...}.
# Anchored to a brace or comma so an apostrophe inside prose is never touched.
_SINGLE_QUOTED_KEY = re.compile(r"([{,]\s*)'([^'\\]{1,64})'(\s*:)")
_UNQUOTED_KEY = re.compile(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]{0,63})(\s*:)")


def parse_json(raw: str) -> dict[str, Any]:
    """Parse the model's reply, tolerating the ways it writes not-quite-JSON.

    response_format=json_object asks for strict JSON and the provider does not
    always deliver it. Observed on a real 23-page run: four pages came back
    with Python-style quoting, page 12 twice, costing three full model calls
    and about 100 seconds of a 240-second extraction. A page that exhausts all
    three attempts loses its questions outright.

    Repair is tried in order of how much it assumes. json.loads first, then
    ast.literal_eval -- which reads a Python dict literal, and evaluates only
    literals, so it cannot run anything the model wrote -- and only then a
    regex that quotes bare keys.
    """
    cleaned = clean_raw_json_response(raw)

    value: Any
    try:
        value = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        try:
            # Handles {'questions': [...]}, True/False/None, the whole
            # Python-literal dialect, without touching apostrophes in prose.
            value = ast.literal_eval(cleaned)
        except (ValueError, SyntaxError, MemoryError, RecursionError):
            repaired = _UNQUOTED_KEY.sub(r'\1"\2"\3', _SINGLE_QUOTED_KEY.sub(r'\1"\2"\3', cleaned))
            value = json.loads(repaired)

    if not isinstance(value, dict) or not isinstance(value.get("questions"), list):
        raise ValueError("Gemini returned JSON without a questions array")
    return value


def _loads_either(fragment: str) -> Any:
    """One recovered object, in whichever dialect the model wrote it."""
    try:
        return json.loads(fragment)
    except (json.JSONDecodeError, ValueError):
        try:
            return ast.literal_eval(fragment)
        except (ValueError, SyntaxError, MemoryError, RecursionError):
            return None


def salvage_questions(raw: str) -> list[dict[str, Any]]:
    """Recover whole question objects from a truncated JSON response.

    When the model hits the output-token cap mid-array the trailing object is
    incomplete and the document will not parse. Every *complete* object before
    that point is still valid data, and discarding the whole page because its
    last question was cut off is the difference between losing one question and
    losing twenty. Objects recovered here are still reconciled against the page
    anchors, so anything genuinely lost is re-asked rather than assumed present.
    """
    # Either quote style, or none. This looked only for the double-quoted form,
    # so a page whose reply used Python quoting salvaged nothing and the whole
    # page was retried instead of recovered.
    start = -1
    for spelling in ('"questions"', "'questions'", "questions"):
        start = raw.find(spelling)
        if start != -1:
            break
    if start == -1:
        return []
    open_bracket = raw.find("[", start)
    if open_bracket == -1:
        return []

    recovered: list[dict[str, Any]] = []
    depth = 0
    object_start: int | None = None
    # Whichever quote opened the current string, so a brace inside a
    # single-quoted value does not shift the depth count and split an object in
    # the wrong place.
    quote: str | None = None
    escaped = False
    for position in range(open_bracket + 1, len(raw)):
        char = raw[position]
        if quote is not None:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in ('"', "'"):
            quote = char
        elif char == "{":
            if depth == 0:
                object_start = position
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0 and object_start is not None:
                value = _loads_either(raw[object_start:position + 1])
                if isinstance(value, dict):
                    recovered.append(value)
                object_start = None
    return recovered


def coerce_question_number(question: dict[str, Any]) -> bool:
    """Normalise question_number to an int in place; True if usable.

    Previously anything that was not already an int was dropped silently, which
    quietly deleted every question labelled "Q.21", "21(a)" or similar. Nothing
    is discarded here: an unparseable label is preserved verbatim and flagged
    for review instead of vanishing from the paper.
    """
    raw_value = question.get("question_number")
    if isinstance(raw_value, bool):
        raw_value = None
    if isinstance(raw_value, int):
        return True
    if isinstance(raw_value, float) and float(raw_value).is_integer():
        question["question_number"] = int(raw_value)
        return True

    text = str(raw_value or "").strip()
    digits = re.search(r"\d{1,3}", text)
    if digits:
        question["question_number"] = int(digits.group(0))
        if text != digits.group(0):
            question["question_number_raw"] = text
        return True

    question["question_number"] = 0
    question["question_number_raw"] = text
    question["needs_review"] = True
    reasons = question.get("review_reasons")
    question["review_reasons"] = (reasons if isinstance(reasons, list) else []) + [
        f"Unrecognised question number label: {text or '(empty)'}"
    ]
    return False


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


def extract_page(index: int, pages: list[dict[str, Any]], work_dir: Path, model: str,
                 focus_numbers: list[int] | None = None) -> tuple[int, list[dict[str, Any]], bool]:
    """Extract one page. Returns (index, questions, truncated).

    ``truncated`` reports that the model hit the output-token cap, which means
    this page may be missing questions even if everything it *did* return parsed
    cleanly. The caller reconciles that against the page's anchors.
    """
    page = pages[index]
    page_number = index + 1
    image_rel = page.get("page_image") or f"page_images/page_{page_number:04d}.png"
    image_path = work_dir / image_rel
    if not image_path.exists():
        raise FileNotFoundError(f"Rendered page image missing: {image_path}")

    image_data_url = "data:image/png;base64," + base64.b64encode(image_path.read_bytes()).decode("ascii")

    # The next page, rendered, when there is one.
    #
    # A question whose options run past the page break has them printed on the
    # following page, and in a JEE paper those options are very often pictures:
    # structural formulae, circuit diagrams, graphs. The model was given that
    # page's text and its image *filenames*, but never the page itself, so it
    # could not see which filename was option B. On a real paper that left 6 of
    # 51 choice questions with fewer than two options -- one with none at all,
    # and one with four empty shells -- because naming an option it cannot see
    # is not something it can do from a filename.
    next_image_data_url: str | None = None
    if index + 1 < len(pages):
        next_rel = pages[index + 1].get("page_image") or f"page_images/page_{index + 2:04d}.png"
        next_path = work_dir / next_rel
        if next_path.exists():
            next_image_data_url = "data:image/png;base64," + base64.b64encode(next_path.read_bytes()).decode("ascii")

    page_html = str(page.get("html") or "")
    previous_tail = context_tail(pages[index - 1]) if index > 0 else ""
    next_head = context_head(pages[index + 1]) if index + 1 < len(pages) else ""
    next_images = pages[index + 1].get("images") or {} if index + 1 < len(pages) else {}
    prompt = page_prompt(page_number, page_html, page.get("images") or {},
                         previous_tail, next_head, focus_numbers, next_images,
                         has_next_image=next_image_data_url is not None)
    label = f"page {page_number}/{len(pages)}" + (f" [recovery of {focus_numbers}]" if focus_numbers else "")

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
                        # Second image is the following page, so a question that
                        # starts on this one can be completed from what is
                        # actually printed there rather than from filenames.
                        *([{"type": "image_url", "image_url": {"url": next_image_data_url}}]
                          if next_image_data_url else []),
                    ]},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=MAX_PAGE_OUTPUT_TOKENS,
            )
            choice = response.choices[0]
            content = choice.message.content or ""
            truncated = getattr(choice, "finish_reason", None) == "length"

            try:
                raw_questions = parse_json(content)["questions"]
            except (json.JSONDecodeError, ValueError):
                # Truncated output cannot parse as a document, but the complete
                # objects inside it are still real questions worth keeping.
                raw_questions = salvage_questions(content)
                if not raw_questions:
                    raise
                truncated = True
                print(f"[geminiPage] {label}: response was cut off; salvaged "
                      f"{len(raw_questions)} complete question(s)", file=sys.stderr)

            questions: list[dict[str, Any]] = []
            for question in raw_questions:
                if not isinstance(question, dict):
                    continue
                question.setdefault("needs_review", False)
                question.setdefault("review_reasons", [])
                coerce_question_number(question)
                question["_pages"] = [page_number]
                question["_page_index"] = index
                question["extractor_version"] = "gemini-page-v1"
                questions.append(question)

            suffix = " (TRUNCATED)" if truncated else ""
            print(f"[geminiPage] {label} complete: {len(questions)} question(s) "
                  f"in {time.monotonic() - started:.1f}s{suffix}")
            return index, questions, truncated
        except Exception as error:
            last_error = error
            # A malformed/unterminated JSON response is the single most common
            # failure here and is *worth* retrying: the model is sampled, so the
            # same page usually returns valid JSON on a second attempt. Treating
            # it as fatal (the previous behaviour) burned the whole batch on one
            # bad response. FileNotFoundError and friends remain non-retryable.
            retryable = (
                isinstance(error, ValueError)  # includes json.JSONDecodeError
                or any(code in str(error) for code in ("429", "408", "500", "502", "503", "504", "timeout"))
            )
            print(f"[geminiPage] {label} attempt {attempt}/3 failed: {error}", file=sys.stderr)
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


def run_parallel(pages: list[dict[str, Any]], page_indexes: list[int], work_dir: Path, model: str,
                 workers: int, batch_size: int,
                 focus: dict[int, list[int]] | None = None) -> tuple[list[dict[str, Any]], set[int], set[int]]:
    """Extract the given pages in bounded parallel batches.

    Returns (questions, truncated_pages, failed_pages). A page that exhausts its
    retries is recorded rather than raised: killing all 19 pages because one
    returned bad JSON throws away good work and forces the whole job to be
    re-run. The reconciliation pass re-asks failed pages targetedly instead, and
    the caller decides whether the surviving result is good enough to keep.

    ``focus`` turns this into a recovery pass: each listed page is re-asked with
    its missing question numbers named explicitly.
    """
    collected: list[tuple[int, list[dict[str, Any]]]] = []
    truncated_pages: set[int] = set()
    failed_pages: set[int] = set()
    for batch_start in range(0, len(page_indexes), batch_size):
        indexes = page_indexes[batch_start:batch_start + batch_size]
        page_labels = ",".join(str(index + 1) for index in indexes)
        print(f"[geminiPage] batch {batch_start // batch_size + 1}: pages {page_labels}, workers={min(workers, len(indexes))}")
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(workers, len(indexes))) as executor:
            futures = {
                executor.submit(extract_page, index, pages, work_dir, model,
                                (focus or {}).get(index)): index
                for index in indexes
            }
            for future in concurrent.futures.as_completed(futures):
                index = futures[future]
                try:
                    result_index, page_questions, truncated = future.result()
                    collected.append((result_index, page_questions))
                    if truncated:
                        truncated_pages.add(result_index)
                except Exception as error:
                    failed_pages.add(index)
                    print(f"[geminiPage] page {index + 1} exhausted retries: {error}", file=sys.stderr)

    questions: list[dict[str, Any]] = []
    for _index, page_questions in sorted(collected, key=lambda item: item[0]):
        questions.extend(page_questions)
    return questions, truncated_pages, failed_pages


def merge_recovered(existing: list[dict[str, Any]], recovered: list[dict[str, Any]]) -> int:
    """Add recovered questions that the first pass genuinely missed.

    Identity is (page index, question number) — a recovery pass is allowed to
    return questions it already got right, and those must not become duplicates.
    Existing questions are never overwritten: a first-pass result is preferred
    over a re-ask of the same slot.
    """
    known = {
        (question.get("_page_index"), question.get("question_number"))
        for question in existing
    }
    added = 0
    for question in recovered:
        key = (question.get("_page_index"), question.get("question_number"))
        if key in known:
            continue
        known.add(key)
        existing.append(question)
        added += 1
    return added


def reconcile(pages: list[dict[str, Any]], page_indexes: list[int], questions: list[dict[str, Any]],
              truncated_pages: set[int], failed_pages: set[int], work_dir: Path, model: str,
              workers: int, batch_size: int) -> dict[str, Any]:
    """Re-ask pages that are missing anchored questions, then report completeness.

    The PDF's own numbered anchors say which questions exist; this closes the
    gap between that and what the model returned, instead of trusting a single
    pass to have seen everything.
    """
    anchor_map = reconciler.build_anchor_map(pages, page_indexes)
    anchor_map, dropped = reconciler.prune_false_anchors(anchor_map, page_indexes)
    if dropped:
        print(f"[geminiPage] ignored {len(dropped)} anchor(s) that look like cover-page/instruction "
              f"text, not questions: {[(p + 1, n) for p, n in dropped]}")
    report = reconciler.completeness_report(anchor_map, questions, truncated_pages, failed_pages)
    if not anchor_map or not any(anchor_map.values()):
        print("[geminiPage] no question anchors detected; skipping reconciliation")
        return report

    print(f"[geminiPage] pass 1: {report['anchors_matched']}/{report['expected_total']} anchored "
          f"questions matched (completeness {report['completeness']:.1%})")

    for round_number in range(1, MAX_RECONCILE_ROUNDS + 1):
        missing = reconciler.missing_by_page(anchor_map, questions, truncated_pages, failed_pages)
        if not missing:
            break
        target_indexes = sorted(missing)
        summary = ", ".join(f"p{index + 1}:{missing[index] or 'whole page'}" for index in target_indexes)
        print(f"[geminiPage] reconcile round {round_number}: re-asking {len(target_indexes)} page(s) — {summary}")

        recovered, still_truncated, still_failed = run_parallel(
            pages, target_indexes, work_dir, model, workers, batch_size, focus=missing
        )

        added = merge_recovered(questions, recovered)
        truncated_pages = (truncated_pages - set(target_indexes)) | still_truncated
        failed_pages = (failed_pages - set(target_indexes)) | still_failed
        print(f"[geminiPage] reconcile round {round_number}: recovered {added} question(s)")
        if not added and not still_failed:
            break

    questions.sort(key=lambda q: (q.get("_page_index", 0), q.get("question_number", 0)))
    final = reconciler.completeness_report(anchor_map, questions, truncated_pages, failed_pages)
    runs = reconciler.assign_runs(anchor_map, page_indexes)
    page_runs = reconciler.build_page_runs(runs, page_indexes)
    max_anchor = max((number for numbers in anchor_map.values() for number in numbers), default=0)
    for question in questions:
        index = question.get("_page_index")
        number = question.get("question_number")
        if isinstance(index, int) and isinstance(number, int):
            # Consumed by normalize_json.py so per-section numbering restarts are
            # never collapsed into a single question by deduplication.
            question["_run"] = reconciler.run_for(runs, index, number, page_runs)
            # True when the PDF text itself has this question's numbered anchor on
            # this page. Used by normalize_json to pick the right copy when the
            # same number is returned from two pages.
            question["_anchored"] = (index, number) in runs
            # A number beyond every anchor the PDF advertises is usually the model
            # continuing the sequence past the end of the paper. Flag rather than
            # drop — a wrong flag costs a reviewer a glance, a wrong drop loses a
            # real question silently.
            if max_anchor and number > max_anchor:
                question["needs_review"] = True
                reasons = question.get("review_reasons")
                question["review_reasons"] = (reasons if isinstance(reasons, list) else []) + [
                    f"Question number {number} is beyond the last number detected in the PDF ({max_anchor})"
                ]
    # Every anchor the PDF advertises that no page returned becomes an empty
    # slot in the output, rather than simply being absent.
    #
    # Without this the paper silently renumbers itself: a 75-question paper
    # that extracts 73 files everything after the first gap one number early,
    # so Chemistry starts at 24 instead of 26 and a reviewer comparing against
    # the PDF sees 73 questions that all look correctly numbered. A placeholder
    # keeps the numbering honest and gives the reviewer somewhere to type the
    # question in.
    placeholders = _gap_placeholders(anchor_map, questions, truncated_pages, failed_pages)
    if placeholders:
        # Assign _run to gap placeholders so they share the same dedup key as
        # a real question with the same number. Without this, normalize_json's
        # dedup key (run, qnum) sees the gap placeholder (no _run → falls back
        # to _page_index=10) and the real question (_run=0) as different keys,
        # and both survive into the final output.
        for ph in placeholders:
            idx = ph.get("_page_index")
            num = ph.get("question_number")
            if isinstance(idx, int) and isinstance(num, int):
                ph["_run"] = reconciler.run_for(runs, idx, num, page_runs)
        questions.extend(placeholders)
        questions.sort(key=lambda q: (q.get("_page_index", 0), q.get("question_number", 0)))
        print(f"[geminiPage] inserted {len(placeholders)} placeholder(s) for questions "
              f"the extraction did not return", file=sys.stderr)

    print(f"[geminiPage] final: {final['anchors_matched']}/{final['expected_total']} anchored "
          f"questions matched (completeness {final['completeness']:.1%})")
    if final["missing_by_page"]:
        print(f"[geminiPage] STILL MISSING after reconciliation: {final['missing_by_page']}", file=sys.stderr)
    return final


def _gap_placeholders(
    anchor_map: dict,
    questions: list,
    truncated_pages: set | None,
    failed_pages: set | None,
) -> list:
    """One empty question per anchor the extraction never returned.

    Marked is_gap so the upload accepts the empty text, and needs_review so the
    editor surfaces it. Publication already refuses a paper containing empty
    question_text, so a placeholder cannot reach a student.
    """
    missing = reconciler.missing_by_page(anchor_map, questions, truncated_pages, failed_pages)
    out: list = []
    for page_index, numbers in sorted(missing.items()):
        for number in numbers:
            out.append({
                "id": str(uuid.uuid4()),
                "question_number": number,
                "question_text": "",
                "options": [],
                "correct_answer": [],
                "explanation": "",
                "is_gap": True,
                "needs_review": True,
                "review_reasons": [
                    f"Question {number} was detected on page {page_index + 1} of the PDF "
                    f"but not extracted. Open this slot and enter it from the source."
                ],
                "_page_index": page_index,
                "_pages": [page_index + 1],
            })
    return out


def verify_question_numbers(
    pages: list[dict[str, Any]],
    page_indexes: list[int],
    questions: list[dict[str, Any]],
    work_dir: Path,
    model: str,
    workers: int,
    batch_size: int,
) -> list[dict[str, Any]]:
    """Full-document scan: ask Gemini to list every question number it sees.

    After page-by-page extraction + reconciliation, a question can still be
    missing if BOTH PyMuPDF's anchor regex and the per-page Gemini call missed
    it. A full-document view often makes numbering gaps obvious because the
    model sees the whole sequence rather than one page at a time.

    Returns any newly recovered questions.
    """
    # Exclude gap placeholders — they occupy the number but carry no content.
    # If reconciliation only produced a placeholder for Q35, we still want to
    # try recovering the real question.
    extracted_numbers = {q.get("question_number") for q in questions
                         if isinstance(q.get("question_number"), int)
                         and not q.get("is_gap")}
    if not extracted_numbers:
        return []

    max_extracted = max(extracted_numbers)
    # Build the expected set: 1..max, or use anchor numbers if available
    expected_all = set(range(1, max_extracted + 1))
    missing_from_sequence = sorted(expected_all - extracted_numbers)

    if not missing_from_sequence:
        print(f"[geminiPage] verify: sequence 1..{max_extracted} is complete — no gaps")
        return []

    print(f"[geminiPage] verify: {len(missing_from_sequence)} gap(s) in 1..{max_extracted}: "
          f"{missing_from_sequence}")

    # Ask Gemini to scan pages and confirm which missing numbers are real questions.
    # Render pages that likely contain the missing questions — estimate page from
    # the position in the sequence.
    questions_per_page = max_extracted / max(1, len(page_indexes))
    candidate_pages: set[int] = set()
    for num in missing_from_sequence:
        estimated_page_index = min(int(num / questions_per_page), len(page_indexes) - 1)
        # Check the estimated page and its neighbors
        for offset in range(-1, 2):
            idx = estimated_page_index + offset
            if 0 <= idx < len(page_indexes):
                candidate_pages.add(page_indexes[idx])

    if not candidate_pages:
        return []

    # Re-ask those pages with the missing numbers as focus
    focus: dict[int, list[int]] = {}
    for page_idx in sorted(candidate_pages):
        focus[page_idx] = missing_from_sequence  # ask for all missing on each candidate page

    print(f"[geminiPage] verify: re-asking {len(candidate_pages)} page(s) for missing questions "
          f"{missing_from_sequence}")

    recovered, _, _ = run_parallel(
        pages, sorted(candidate_pages), work_dir, model, workers, batch_size, focus=focus
    )

    added = merge_recovered(questions, recovered)
    if added:
        # Remove gap placeholders for question numbers we just recovered as real
        # questions. A gap placeholder (empty text, is_gap=True) must not survive
        # alongside the real question with full content.
        recovered_numbers = {q.get("question_number") for q in recovered
                             if isinstance(q.get("question_number"), int)
                             and not q.get("is_gap")}
        before_len = len(questions)
        questions[:] = [q for q in questions
                        if not (q.get("is_gap") and q.get("question_number") in recovered_numbers)]
        removed_gaps = before_len - len(questions)
        if removed_gaps:
            print(f"[geminiPage] verify: removed {removed_gaps} gap placeholder(s) replaced by real questions")
        print(f"[geminiPage] verify: recovered {added} question(s) from full-document scan")
    else:
        print(f"[geminiPage] verify: no new questions recovered — gaps are genuine misses or non-questions")
    return recovered


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
    questions, truncated_pages, failed_pages = run_parallel(
        pages, page_indexes, work_dir, args.model, workers, batch_size)
    completeness = reconcile(pages, page_indexes, questions, truncated_pages, failed_pages,
                             work_dir, args.model, workers, batch_size)

    # Sequence-gap recovery: if the extracted numbers have holes (e.g. 1-34, 38-75
    # with 35-37 missing), re-ask the likely pages one more time. This catches
    # questions that both PyMuPDF anchors and per-page Gemini missed.
    verify_question_numbers(pages, page_indexes, questions, work_dir, args.model, workers, batch_size)
    # Re-sort after potential recoveries
    questions.sort(key=lambda q: (q.get("_page_index", 0), q.get("question_number", 0)))

    # Reconciliation answers "did we get every question". This answers "is each
    # question what the page actually says" — the only check that compares the
    # output against the source rather than against a schema.
    verified = verification.verify_questions(pages, questions, visible_text)
    if verified["flagged"]:
        print(f"[geminiPage] {len(verified['flagged'])} of {verified['judged']} question(s) diverge from the "
              f"page text below {verified['threshold']:.0%} coverage: {verified['flagged']}", file=sys.stderr)
    else:
        print(f"[geminiPage] text verification: all {verified['judged']} judged question(s) match their source page")
    completeness["verification"] = verified

    # Only a total wipeout is fatal. A partially-failed run still produces a
    # reviewable draft, and the completeness block records exactly what is
    # missing — far more useful than discarding 18 good pages because 1 failed.
    if not questions:
        failed_labels = ", ".join(str(index + 1) for index in sorted(failed_pages))
        raise RuntimeError(
            "Gemini extraction produced no questions"
            + (f"; every attempted page failed ({failed_labels})" if failed_pages else "")
        )
    if completeness.get("failed_pages"):
        print(f"[geminiPage] WARNING: pages {completeness['failed_pages']} could not be extracted "
              f"after retries; their questions are absent from this draft", file=sys.stderr)

    output_path.write_text(
        json.dumps({"questions": questions, "completeness": completeness}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[geminiPage] complete: {len(questions)} question(s) written to {output_path.name}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"[geminiPage] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
