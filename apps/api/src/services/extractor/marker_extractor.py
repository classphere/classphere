"""
marker_extractor.py  (v2 — force_ocr + pipeline adapter)
=========================================================
Datalab Marker extractor. Two roles:

  1. Scanned-PDF fallback (original) — when PyMuPDF finds no text layer.
  2. Vector-math ESCALATION (new) — when a digital paper renders its math /
     options as vector graphics that a text-only LLM can't read. Run with
     force_ocr=true so Marker recognises the math from pixels and emits LaTeX.

Marker returns a block tree whose page HTML wraps math in <math>…</math> and
figures in <img>. `adapt_marker_html()` converts that into the SAME annotated-
ish line format the rest of the pipeline (segment_questions →
cerebras_from_marker → normalize_json) already consumes:
  • <math>X</math>            → $X$
  • block tags               → newlines (so questions segment into lines)
  • <img …>                  → kept verbatim (src + descriptive alt text)
  • HTML entities            → unescaped

Output: <out_dir>/marker_raw.json  (pipeline format: {"json":{"children":[…]}})
        <out_dir>/marker_images/    (downloaded figures)

No DATALAB_API_KEY → exits with code 2 and a clear message, so the orchestrator
can treat Marker as an optional no-op.

Usage:
    python marker_extractor.py <pdf_path> [--api-key KEY] [--out DIR]
        [--force-ocr true|false] [--no-llm]
"""

import argparse
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

MARKER_SUBMIT_URL = "https://www.datalab.to/api/v1/marker"
POLL_INTERVAL_S = 5
MAX_WAIT_S = 600

# Exit codes: 0 ok · 1 hard error · 2 no key (optional no-op)
EXIT_OK, EXIT_ERROR, EXIT_NO_KEY = 0, 1, 2


def get_api_key(args_key):
    key = (args_key or os.environ.get("DATALAB_API_KEY", "")).strip()
    return key


def _request_with_retry(method, url, *, retries=4, backoff=4, **kwargs):
    """HTTP with retry on transient errors (502/503/504/429 and network blips)."""
    last = None
    for attempt in range(retries):
        try:
            resp = requests.request(method, url, **kwargs)
            if resp.status_code in (429, 500, 502, 503, 504):
                last = requests.exceptions.HTTPError(
                    f"{resp.status_code} transient", response=resp)
                wait = backoff * (attempt + 1)
                print(f"  transient {resp.status_code} — retry {attempt+1}/{retries} in {wait}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            last = e
            wait = backoff * (attempt + 1)
            print(f"  network error ({type(e).__name__}) — retry {attempt+1}/{retries} in {wait}s")
            time.sleep(wait)
    raise last if last else RuntimeError("request failed")


def submit_pdf(pdf_path, api_key, force_ocr=True, use_llm=True, webhook_url=None):
    print(f"Submitting to Marker (force_ocr={force_ocr}, use_llm={use_llm}, webhook={bool(webhook_url)}): {pdf_path}")
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()
    form_data = {
        "output_format": "json",
        "extract_images": "true",
        "use_llm": "true" if use_llm else "false",
        "force_ocr": "true" if force_ocr else "false",
        "paginate_output": "false",
    }
    if webhook_url:
        form_data["webhook_url"] = webhook_url
    resp = _request_with_retry(
        "POST", MARKER_SUBMIT_URL,
        headers={"X-API-Key": api_key},
        files={"file": (Path(pdf_path).name, file_bytes, "application/pdf")},
        data=form_data,
        timeout=90,
    )
    data = resp.json()
    if not data.get("success"):
        print(f"ERROR: Marker rejected submission: {data}")
        sys.exit(EXIT_ERROR)
    print(f"Submitted. Request ID: {data['request_id']}")
    return data


def poll_until_done(check_url, api_key):
    elapsed = 0
    while elapsed < MAX_WAIT_S:
        time.sleep(POLL_INTERVAL_S)
        elapsed += POLL_INTERVAL_S
        data = _request_with_retry("GET", check_url,
                                   headers={"X-API-Key": api_key}, timeout=30).json()
        status = data.get("status", "unknown")
        if elapsed % 15 == 0 or status == "complete":
            print(f"  [{elapsed:3d}s] {status}")
        if status == "complete":
            return data
        if status in ("error", "failed"):
            print(f"ERROR: Marker conversion failed: {json.dumps(data)[:400]}")
            sys.exit(EXIT_ERROR)
    print("ERROR: Timed out waiting for Marker.")
    sys.exit(EXIT_ERROR)


def fetch_completed(check_url, api_key):
    """Fetch a Marker result once after a verified completion webhook.
    The webhook is only a notification; full results still come from the
    request_check_url. Never loops/polls here."""
    data = _request_with_retry("GET", check_url,
                               headers={"X-API-Key": api_key}, timeout=60).json()
    status = data.get("status", "unknown")
    if status != "complete":
        raise RuntimeError(f"Marker result is not complete (status={status})")
    return data


def download_images(images, images_dir, api_key):
    images_dir.mkdir(parents=True, exist_ok=True)
    saved = 0
    for name, val in (images or {}).items():
        out = images_dir / name
        try:
            if str(val).startswith("http"):
                r = requests.get(val, headers={"X-API-Key": api_key}, timeout=30)
                r.raise_for_status()
                out.write_bytes(r.content)
            else:
                out.write_bytes(base64.b64decode(val))
            saved += 1
        except Exception as e:
            print(f"  WARN: could not save image {name}: {e}")
    return saved


# ── Marker HTML → pipeline line format ────────────────────────────────────────

_MATH_TAG_RE = re.compile(r'<math[^>]*>(.*?)</math>', re.DOTALL | re.IGNORECASE)
_BLOCK_CLOSE_RE = re.compile(r'</(?:p|li|h[1-6]|div)\s*>|<br\s*/?>', re.IGNORECASE)
_BLOCK_OPEN_RE = re.compile(r'<(?:p|li|h[1-6])[^>]*>', re.IGNORECASE)
_NON_IMG_TAG_RE = re.compile(r'<(?!img\b)[^>]+>', re.IGNORECASE)
_TABLE_RE = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)
_ROW_RE = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
_CELL_RE = re.compile(r'<t[hd][^>]*>(.*?)</t[hd]>', re.DOTALL | re.IGNORECASE)


def _clean_cell(cell: str) -> str:
    """A single table cell → inline markdown: keep <img>, drop other tags,
    collapse whitespace, and escape pipes so they don't break the table."""
    cell = _NON_IMG_TAG_RE.sub(" ", cell)
    cell = re.sub(r"\s+", " ", cell).strip()
    return cell.replace("|", r"\|")


def _table_to_markdown(html: str) -> str:
    """Convert each <table> to a GFM markdown table (| … | with a --- header
    separator). The frontend (marked, gfm:true) renders these as real tables —
    the right home for 'Match the columns' / Column I–II questions."""
    def conv(m):
        rows = []
        for r in _ROW_RE.findall(m.group(1)):
            cells = [_clean_cell(c) for c in _CELL_RE.findall(r)]
            if cells:
                rows.append(cells)
        if not rows:
            return " "
        # Marker often splits one logical table (e.g. a 'Match the columns'
        # layout) into several <table> blocks — merged into one <table> upstream,
        # they leave the header row repeated in the body. Drop those duplicates.
        header = rows[0]
        rows = [rows[0]] + [r for r in rows[1:] if r != header]
        # GFM requires every row to have the same column count as the separator.
        # Marker sometimes uses colspan (fewer header cells than body cells), so
        # pad all rows to the widest row.
        ncol = max(len(r) for r in rows)
        def fmt(cells):
            cells = cells + [""] * (ncol - len(cells))
            return "| " + " | ".join(cells) + " |"
        sep = "| " + " | ".join(["---"] * ncol) + " |"
        md = [fmt(rows[0]), sep] + [fmt(r) for r in rows[1:]]
        # isolate with blank lines so marked parses it as a table
        return "\n\n" + "\n".join(md) + "\n\n"
    return _TABLE_RE.sub(conv, html)


_DEVANAGARI_RE = re.compile(r'[ऀ-ॿ]')
_IMG_DESC_OPEN_RE = re.compile(r'<div\s+class="img-(?:description|alt)"', re.IGNORECASE)
_DIV_TAG_RE = re.compile(r'<(/?)div\b[^>]*>', re.IGNORECASE)
_IMG_ALT_RE = re.compile(r'(<img\b[^>]*?)\s+alt="[^"]*"', re.IGNORECASE)
_PRE_CODE_RE = re.compile(r'<(pre|code)\b[^>]*>.*?</\1>', re.IGNORECASE | re.DOTALL)


def _strip_marker_annotations(html: str) -> str:
    """Remove Marker use_llm figure annotations that are NOT question content:
    the visible <div class="img-description"> block (a prose description and/or
    a Mermaid `graph LR …` of the figure, repeated from the img alt), any
    <pre>/<code> blocks, and the alt="" attribute on <img> (the frontend renders
    images by src, so the alt only leaks into the stem)."""
    # remove balanced <div class="img-description">…</div> blocks
    out, i = [], 0
    while True:
        m = _IMG_DESC_OPEN_RE.search(html, i)
        if not m:
            out.append(html[i:])
            break
        out.append(html[i:m.start()])
        depth, j = 0, len(html)
        for tm in _DIV_TAG_RE.finditer(html, m.start()):
            depth += -1 if tm.group(1) else 1
            if depth == 0:
                j = tm.end()
                break
        i = j
    html = "".join(out)
    html = _PRE_CODE_RE.sub(" ", html)      # mermaid/code fences
    html = _IMG_ALT_RE.sub(r"\1", html)     # drop img alt (keep src)
    return html


def adapt_marker_html(html: str) -> str:
    """Convert a Marker page's block HTML into the line/markdown format
    segment_questions + the frontend expect: $…$ math, GFM tables, <img> kept,
    block boundaries as newlines."""
    if not html:
        return ""
    # strip Marker use_llm figure descriptions / mermaid / img alt first
    html = _strip_marker_annotations(html)
    # <math>latex</math> → $latex$  (Marker already emits LaTeX inside)
    html = _MATH_TAG_RE.sub(lambda m: f"${m.group(1).strip()}$", html)
    # common HTML entities
    html = (html.replace("&amp;", "&").replace("&lt;", "<")
                .replace("&gt;", ">").replace("&nbsp;", " ").replace("&#39;", "'")
                .replace("&quot;", '"'))
    # Merge tables that Marker split apart (adjacent </table><table> with only
    # whitespace between) into one, so a matching layout becomes ONE table.
    html = re.sub(r'</table>\s*<table[^>]*>', '', html, flags=re.IGNORECASE)
    # tables → GFM markdown FIRST (before generic tag stripping linearizes them)
    html = _table_to_markdown(html)
    # remaining block boundaries → newlines
    html = _BLOCK_CLOSE_RE.sub("\n", html)
    html = _BLOCK_OPEN_RE.sub("\n", html)
    # drop every remaining tag EXCEPT <img …>
    html = _NON_IMG_TAG_RE.sub(" ", html)
    html = re.sub(r"[ \t]{2,}", " ", html)
    # keep markdown-table rows intact; collapse only 3+ blank lines; and drop
    # any line containing Devanagari — the second layer for bilingual papers
    # where Marker merged the English+Hindi columns into one full-width block
    # (block-position drop can't split those; a Hindi line is unambiguous).
    lines = [ln.rstrip() for ln in html.split("\n")]
    out, blanks = [], 0
    for ln in lines:
        if _DEVANAGARI_RE.search(ln):
            continue
        if ln.strip():
            out.append(ln.strip()); blanks = 0
        else:
            blanks += 1
            if blanks <= 1 and out:
                out.append("")
    return "\n".join(out).strip()


def _leaf_blocks(block):
    """Yield leaf blocks (with bbox + html, no children) from a Marker block tree."""
    kids = block.get("children") or []
    if not kids:
        if block.get("html") and block.get("bbox"):
            yield block
        return
    for k in kids:
        yield from _leaf_blocks(k)


def _page_html_dropping_translation(pg: dict):
    """If a Marker page is bilingual (a Devanagari translation column beside the
    English one), rebuild the page HTML from only the NON-Hindi-side leaf blocks.
    Returns None when the page isn't bilingual (caller uses pg['html'] as-is).

    Marker force_ocr renders the legacy-Hindi column into real Devanagari and
    lays the page out as English-column blocks then Hindi-column blocks; the
    Hindi option/diagram blocks are Latin-only but sit on the Hindi side, so we
    drop by bbox position (like the PyMuPDF path), not by script alone."""
    bbox = pg.get("bbox") or [0, 0, 0, 0]
    pw = bbox[2] or 0
    if pw <= 0:
        return None
    blocks = list(_leaf_blocks(pg))
    if not blocks:
        return None
    dev = [b for b in blocks if _DEVANAGARI_RE.search(b.get("html", ""))]
    if len(dev) < 2:
        return None
    mid = pw / 2
    right = sum(1 for b in dev if (b["bbox"][0] + b["bbox"][2]) / 2 > mid)
    left = len(dev) - right
    if right >= max(2, 0.7 * len(dev)):
        side = "right"
    elif left >= max(2, 0.7 * len(dev)):
        side = "left"
    else:
        return None

    def on_hindi_side(b):
        bb = b["bbox"]
        if bb[2] - bb[0] > 0.60 * pw:      # full-width shared block → keep
            return False
        cx = (bb[0] + bb[2]) / 2
        return cx > mid if side == "right" else cx < mid

    kept = [b for b in blocks if not on_hindi_side(b)]
    return "\n".join(b.get("html", "") for b in kept)


def build_pipeline_raw(result: dict, out_dir: Path, api_key: str) -> dict:
    """Download images and write marker_raw.json in the pipeline format."""
    images_dir = out_dir / "marker_images"
    n_img = download_images(result.get("images", {}), images_dir, api_key)

    pages = []
    bilingual_pages = 0
    for pg in result.get("json", {}).get("children", []) or []:
        stripped = _page_html_dropping_translation(pg)
        if stripped is not None:
            bilingual_pages += 1
        page_html = stripped if stripped is not None else pg.get("html", "")
        adapted = adapt_marker_html(page_html)
        img_names = {s: True for s in re.findall(r'src="([^"]+)"', adapted)}
        pages.append({
            "html": adapted,
            "images": img_names,
            "children": [{"images": img_names}],
        })
    if bilingual_pages:
        print(f"  Bilingual layout: dropped Hindi translation column on {bilingual_pages} page(s)")

    raw = {
        "json": {"children": pages},
        "images": result.get("images", {}),
        "metadata": {
            "source": "marker",
            "annotated": False,
            "force_ocr": True,
            "page_count": result.get("page_count"),
            "total_cost_cents": result.get("total_cost"),
        },
    }
    raw_path = out_dir / "marker_raw.json"
    raw_path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
    print(f"marker_raw.json written: {len(pages)} pages, {n_img} images "
          f"(cost {result.get('total_cost')} cents, {result.get('runtime', 0):.1f}s)")
    return raw


def run():
    ap = argparse.ArgumentParser(description="Datalab Marker extractor")
    ap.add_argument("pdf_path", nargs="?", help="PDF path (not needed with --fetch-url)")
    ap.add_argument("--api-key", default=None)
    ap.add_argument("--out", default=None, help="Output dir")
    ap.add_argument("--force-ocr", default="true", choices=["true", "false"])
    ap.add_argument("--no-llm", action="store_true")
    ap.add_argument("--webhook-url", default=None,
                    help="Per-request Datalab completion callback")
    ap.add_argument("--submit-only", action="store_true",
                    help="Submit with webhook and exit without polling")
    ap.add_argument("--request-json", default=None,
                    help="Write request_id/check_url JSON here in submit-only mode")
    ap.add_argument("--fetch-url", default=None,
                    help="Fetch one completed result from request_check_url")
    args = ap.parse_args()

    api_key = get_api_key(args.api_key)
    if not api_key:
        print("Marker skipped: no DATALAB_API_KEY set (optional stage).")
        sys.exit(EXIT_NO_KEY)

    if args.fetch_url:
        if not args.out:
            ap.error("--out is required with --fetch-url")
        out_dir = Path(args.out).resolve()
        out_dir.mkdir(parents=True, exist_ok=True)
        result = fetch_completed(args.fetch_url, api_key)
        build_pipeline_raw(result, out_dir, api_key)
        print(f"\nNext step: run cerebras_from_marker.py {out_dir}")
        sys.exit(EXIT_OK)

    if not args.pdf_path:
        ap.error("pdf_path is required unless --fetch-url is used")
    pdf_path = Path(args.pdf_path).resolve()
    out_dir = Path(args.out).resolve() if args.out else pdf_path.parent / "extracted_data"
    out_dir.mkdir(parents=True, exist_ok=True)

    submit = submit_pdf(pdf_path, api_key,
                        force_ocr=(args.force_ocr == "true"),
                        use_llm=not args.no_llm,
                        webhook_url=args.webhook_url)
    if args.submit_only:
        request_meta = {
            "request_id": submit["request_id"],
            "request_check_url": submit["request_check_url"],
        }
        if args.request_json:
            Path(args.request_json).write_text(
                json.dumps(request_meta, ensure_ascii=False), encoding="utf-8")
        print("MARKER_REQUEST=" + json.dumps(request_meta))
        sys.exit(EXIT_OK)

    # Legacy/local fallback: synchronous polling. Production supplies a webhook
    # URL and uses --submit-only, so worker slots are never held here.
    print("Polling for results (legacy fallback)...")
    result = poll_until_done(submit["request_check_url"], api_key)
    build_pipeline_raw(result, out_dir, api_key)
    print(f"\nNext step: run cerebras_from_marker.py {out_dir}")
    sys.exit(EXIT_OK)


if __name__ == "__main__":
    run()
