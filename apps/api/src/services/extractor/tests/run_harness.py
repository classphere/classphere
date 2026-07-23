"""
run_harness.py
===============
Regression harness for the deterministic layers of the extraction pipeline.
No LLM calls — tests the PyMuPDF extractor, question segmentation, and the
QA validator against synthetic PDFs with known ground truth.

Usage:
    python tests/run_harness.py            # run everything
    python tests/run_harness.py extractor  # extractor checks only
    python tests/run_harness.py segment    # segmentation checks only
"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
DATA = HERE / "data"

sys.path.insert(0, str(ROOT))

PASS = 0
FAIL = 0
FAILURES = []


def check(name, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS {name}")
    else:
        FAIL += 1
        FAILURES.append(name)
        print(f"  FAIL {name}")


def ensure_pdfs():
    if not (DATA / "test_qno_style.pdf").exists():
        subprocess.run([sys.executable, str(HERE / "make_test_pdfs.py"), str(DATA)], check=True)


def run_extractor(pdf: Path, out: Path):
    if out.exists():
        shutil.rmtree(out)
    r = subprocess.run([sys.executable, str(ROOT / "pymupdf_extractor.py"), str(pdf), str(out)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        raise RuntimeError(f"extractor failed on {pdf.name}")
    return json.loads((out / "marker_raw.json").read_text(encoding="utf-8"))


def extractor_checks(style: str, raw: dict, out_dir: Path):
    pages = raw["json"]["children"]
    h1, h2 = pages[0]["html"], pages[1]["html"]
    both = h1 + "\n" + h2

    print(f"\n[extractor:{style}]")
    check("Q1 sup 10^3 cm^2", "10<sup>3</sup> cm<sup>2</sup>" in h1)
    check("Q1 sup 10^-2", "10<sup>-2</sup>" in h1)
    check("Q1 sup s^-1", "s<sup>-1</sup>" in h1)
    check("Q2 frac -3/2", "<frac><num>-3</num><den>2</den></frac>" in h1)
    check("Q2 frac -7/3", "<frac><num>-7</num><den>3</den></frac>" in h1)
    check("Q2 frac ?/12", "<den>12</den>" in h1)
    check("Q2 sub a_1", "a<sub>1</sub>" in h1)
    check("Q3 vector diagram captured", "vector_p1_r1.png" in h1)
    check("Q3 no leaked labels", "<p>A B</p>" not in h1 and "<p>y</p>" not in h1)
    check("Q4 all option images owned",
          all(f'data-owner="option-{o}"' in h1 for o in "ABCD"))
    check("Q5 sup 10^6 inline", "10<sup>6</sup>" in h1)
    check("PHYSICS not mangled", "[PHYSICS]" not in both and "PHYSICS" in h1)
    check("SECTION not mangled", "[SECTION]" not in both)
    check("section header annotated", 'data-section="SECTION-B' in h2)
    check("boilerplate logo filtered", "x5." not in both)
    check("watermark filtered", "C I P H" not in both)
    check("P2 frac 22/7", "<frac><num>22</num><den>7</den></frac>" in h2)
    check("P2 option sups r^3", "r<sup>3</sup>" in h2)
    check("P2 H2SO4 subscripts", "H<sub>2</sub>SO<sub>4</sub>" in h2)
    check("all 8 anchors found",
          all(f'data-qcand="{n}"' in both for n in range(1, 9)))
    # every referenced image exists on disk
    imgs = re.findall(r'src="([^"]+)"', both)
    check("all referenced images exist",
          all((out_dir / "marker_images" / f).exists() for f in imgs))
    # option images are physically placed right after their label paragraph
    q4 = both[both.find('data-qcand="4"'):both.find('data-qcand="5"')]
    order_ok = True
    pos = 0
    for o in "ABCD":
        lp = q4.find(f'data-opt="{o}"')
        ip = q4.find(f'data-owner="option-{o}"')
        if not (0 <= pos <= lp < ip):
            order_ok = False
            break
        pos = ip
    check("Q4 label→image emission order", order_ok)


def segmentation_checks(style: str, raw: dict):
    try:
        from extract_common import segment_questions
    except ImportError:
        print(f"\n[segment:{style}] extract_common not built yet — skipped")
        return
    pages = raw["json"]["children"]
    blocks, front = segment_questions(pages)
    print(f"\n[segment:{style}]")
    check("8 question blocks", len(blocks) == 8)
    check("block numbers 1..8", [b["qnum"] for b in blocks] == list(range(1, 9)))
    q5 = next((b for b in blocks if b["qnum"] == 5), None)
    check("Q5 spans pages 1-2", q5 is not None and q5["pages"] == [1, 2])
    check("Q5 contains its cross-page options",
          q5 is not None and "6Kpq" in q5["html"] and "Kpq/r<sup>2</sup>" in q5["html"])
    q6 = next((b for b in blocks if b["qnum"] == 6), None)
    check("Q6 (assertion-reason) has NO numerical hint",
          q6 is not None and "Assertion" in q6["html"] and
          (q6.get("type_hint") or "") != "integer")
    q7 = next((b for b in blocks if b["qnum"] == 7), None)
    check("Q7 carries numerical section hint",
          q7 is not None and q7.get("type_hint") == "integer")
    q8 = next((b for b in blocks if b["qnum"] == 8), None)
    check("Q8 carries numerical section hint",
          q8 is not None and q8.get("type_hint") == "integer")
    q3 = next((b for b in blocks if b["qnum"] == 3), None)
    check("Q3 block contains its diagram",
          q3 is not None and "vector_p1_r1.png" in q3["html"])
    check("Assertion text only in Q6 block",
          all("Assertion" not in b["html"] for b in blocks if b["qnum"] != 6))


def postprocess_checks():
    """LaTeX-wrapping + dead-image cleaning (JSON post-processing, no PDF)."""
    try:
        from normalize_json import wrap_bare_latex, clean_dead_images, sanitize_text
    except ImportError:
        print("\n[postprocess] normalize_json helpers unavailable — skipped")
        return
    import re as _re
    print("\n[postprocess]")

    def no_bare_macro(s):
        outside = _re.sub(r'\$\$.*?\$\$|\$[^$]*\$', ' ', s)
        return not _re.search(r'\\[a-zA-Z]+', outside)

    r = wrap_bare_latex(r"$f_v$ \rightarrow Visible light")
    check("bare \\rightarrow gets wrapped", no_bare_macro(r) and r"$\rightarrow$" in r)
    check("existing $..$ untouched / idempotent",
          wrap_bare_latex(r) == r)
    check("display math $$..$$ preserved",
          wrap_bare_latex(r"$$x=\alpha$$ y") == r"$$x=\alpha$$ y")
    check("plain text untouched", wrap_bare_latex("no math here") == "no math here")
    check("bare unicode arrow wrapped", "$→$" in wrap_bare_latex("25 → 30"))
    check("dead image reference removed",
          "gone.png" not in clean_dead_images("a ![image](gone.png) b", {"ok.png"}))
    check("live image reference kept",
          "keep.png" in clean_dead_images("![image](keep.png)", {"keep.png"}))
    check("no-images-dir leaves text unchanged",
          clean_dead_images("x ![image](y.png)", None) == "x ![image](y.png)")

    # sanitize_text: literal escapes, empty math, unbalanced $
    check("literal \\n before digit/paren stripped",
          "\\n" not in sanitize_text(r"are\n(1) DNP\n(2) X"))
    check("literal \\n before uppercase word → real newline (renders <br>)",
          sanitize_text(r"formation\nCompound") == "formation\nCompound")
    check("real newlines preserved (not flattened)",
          sanitize_text("stem line one\nlist item i\nlist item ii") ==
          "stem line one\nlist item i\nlist item ii")
    check("markdown table preserved through sanitize",
          "| --- |" in sanitize_text("| A | B |\n| --- | --- |\n| 1 | 2 |"))

    # bilingual coaching papers: Hindi translation column stripped
    try:
        from pymupdf_extractor import detect_translation_side, on_side, HINDI_FONT_RE
        check("legacy Hindi font recognised", bool(HINDI_FONT_RE.search("KrutiDev010")))
        els = ([{"bbox": [40, y, 280, y + 12], "hindi": False} for y in (100, 130, 160)] +
               [{"bbox": [320, y, 550, y + 12], "hindi": True} for y in (100, 130, 160)])
        side = detect_translation_side(els, 595.0)
        check("bilingual right (Hindi) side detected", side == "right")
        check("on_side drops right-half, keeps left-half",
              on_side([320, 100, 550, 112], "right", 595.0) and
              not on_side([40, 100, 280, 112], "right", 595.0))
        check("no false-positive on monolingual page",
              detect_translation_side([{"bbox": [40, 100, 280, 112], "hindi": False}], 595.0) is None)
    except ImportError:
        pass
    try:
        from marker_extractor import adapt_marker_html
        biling = ('<p>1. English question here</p><p>(A) x</p>'
                  '<p>1. यह हिंदी अनुवाद है द्रव्यमान</p><p>(A) x</p>')
        out = adapt_marker_html(biling)
        check("marker adapter drops Devanagari lines",
              "English question" in out and "हिंदी" not in out)
    except ImportError:
        pass
    # normalizer: 3-subject split adapts to count; all-MCQ skips integer lock
    try:
        import normalize_json as _nj
        qs = [{"question_number": n, "subject": ("Physics" if n <= 20 else "Chemistry" if n <= 40 else "Mathematics"),
               "question_type": "MCQ", "options": [{"id": c, "text": "o"} for c in "ABCD"]} for n in range(1, 61)]
        rep = {}
        _nj.enforce_subjects(qs, "jee", None, rep)
        from collections import Counter as _C
        counts = _C(q["subject"] for q in qs)
        check("60-Q paper splits 20/20/20", counts["Physics"] == 20 and counts["Chemistry"] == 20 and counts["Mathematics"] == 20)
        qs2 = [{"question_number": n, "question_type": "MCQ", "options": [{"id": c, "text": "o"} for c in "ABCD"]} for n in range(1, 61)]
        rep2 = {}
        _nj.apply_structural_lock(qs2, "jee", rep2)
        check("all-MCQ paper skips JEE integer lock",
              sum(1 for q in qs2 if q["question_type"] == "Numerical") == 0)
    except ImportError:
        pass

    # merge_markdown_tables: split/repeated-header tables → one table
    try:
        from normalize_json import merge_markdown_tables
        split = ("| Col I | Col II |\n| --- | --- |\n| i | a |\n"
                 "| Col I | Col II |\n| --- | --- |\n| ii | b |\n| iii | c |")
        merged = merge_markdown_tables(split)
        check("split tables merged (single header)",
              merged.count("| Col I | Col II |") == 1 and merged.count("| --- | --- |") == 1)
        check("merged table keeps all body rows",
              all(r in merged for r in ("| i | a |", "| ii | b |", "| iii | c |")))
        # a genuinely different second table must NOT be merged
        two = ("| A | B |\n| --- | --- |\n| 1 | 2 |\n\n"
               "| X | Y |\n| --- | --- |\n| 9 | 8 |")
        check("different-header tables NOT merged",
              merge_markdown_tables(two).count("| --- | --- |") == 2)
    except ImportError:
        pass
    check("real macro \\neq preserved",
          r"\neq" in sanitize_text(r"$T_1 \neq T_2$"))
    check("real macros \\nu \\nabla \\ne \\ni preserved",
          all(f"\\{m}" in sanitize_text(f"$\\{m}$ z")
              for m in ("nu", "nabla", "ne", "ni", "natural")))
    check("\\rightarrow \\times \\frac \\vec preserved (n/r/t/f/v heads)",
          all(f"\\{m}" in sanitize_text(f"$\\{m}$ z")
              for m in ("rightarrow", "times", "frac", "vec", "theta", "forall")))
    check("empty math span $ $ removed", "$ $" not in sanitize_text("a $ $ b"))
    check("degenerate binomial removed",
          "bigl" not in sanitize_text(r"x = -$\bigl(\,\bigr)$ y"))
    check("odd unbalanced $ repaired",
          sanitize_text("FeSO_4$(aq)").count("$") % 2 == 0)
    check("sanitize idempotent",
          sanitize_text(sanitize_text(r"a\n(1) $\nu$ $\ne$")) ==
          sanitize_text(r"a\n(1) $\nu$ $\ne$"))

    # vector-math escalation signal
    try:
        from extract_common import vector_math_signature
        vec_q = {"question_number": 1, "question_text": "see ![image](vector_p1_r2.png)",
                 "options": [{"id": c, "text": "x"} for c in "ABCD"]}
        clean_q = {"question_number": 2, "question_text": "plain $x^2$",
                   "options": [{"id": c, "text": "x"} for c in "ABCD"]}
        flagged_q = {"question_number": 3, "question_text": "q", "_needs_review": True,
                     "options": [{"id": c, "text": "x"} for c in "ABCD"]}
        check("escalate when flagged present",
              vector_math_signature([clean_q, flagged_q])["escalate"] is True)
        check("escalate when vector ratio high",
              vector_math_signature([vec_q, dict(vec_q, question_number=4)])["escalate"] is True)
        check("no escalate on clean paper",
              vector_math_signature([clean_q, dict(clean_q, question_number=5)])["escalate"] is False)
    except ImportError:
        pass

    # marker adapter: <table> → GFM markdown table (matching questions)
    try:
        from marker_extractor import adapt_marker_html, _table_to_markdown
        tbl = ('<table><tr><th>List-I</th><th>List-II</th></tr>'
               '<tr><td>(a)</td><td>$X$</td><td>(i)</td><td>5 BM</td></tr></table>')
        mt = _table_to_markdown(tbl)
        check("marker table → GFM markdown (has separator row)", "| --- |" in mt)
        check("marker table pads ragged rows to equal columns",
              all(line.count("|") == mt.strip().splitlines()[0].count("|")
                  for line in mt.strip().splitlines()))
        check("marker adapter keeps <math> as $…$ and <img> in cells",
              "$X$" in adapt_marker_html(tbl))
        # use_llm figure descriptions / mermaid / img alt must be stripped
        desc = ('<p>The circuit is equivalent to</p>'
                '<img alt="Logic circuit diagram with inputs A and B connected to NOT gate" src="c_img.jpg"/>'
                '<div class="img-description" style="border:1px solid"><div class="img-alt">'
                'Logic circuit diagram with inputs A and B connected to NOT gate</div>'
                '<pre><code>graph LR\nA((A)) --- NOT1[NOT]</code></pre></div>'
                '<p>(A) AND gate</p>')
        adapted = adapt_marker_html(desc)
        check("marker img-description block stripped",
              "img-alt" not in adapted and "Logic circuit diagram with" not in adapted)
        check("marker mermaid graph stripped", "graph LR" not in adapted and "NOT1" not in adapted)
        check("marker img alt dropped but src kept",
              'alt=' not in adapted and 'src="c_img.jpg"' in adapted)
        check("real question text + image + option survive",
              "The circuit is equivalent to" in adapted and "(A) AND gate" in adapted)
    except ImportError:
        pass

    # merge: prefer PyMuPDF native images over Marker's re-rendered crops
    try:
        from merge_extractions import prefer_native_images
        mq = {"question_number": 64, "question_text": "Compound X is",
              "options": [{"id": "A", "text": "![image](hashA_img.jpg)", "image_url": "hashA_img.jpg"},
                          {"id": "B", "text": "![image](hashB_img.jpg)", "image_url": "hashB_img.jpg"}]}
        pq = {"question_number": 64, "question_text": "Compound X is",
              "options": [{"id": "A", "text": "![image](native_p20_x1.png)", "image_url": "native_p20_x1.png"},
                          {"id": "B", "text": "![image](native_p20_x2.png)", "image_url": "native_p20_x2.png"}]}
        out = prefer_native_images(mq, pq)
        check("native image swapped into option A",
              "native_p20_x1.png" in out["options"][0]["text"])
        check("native image swapped into option B image_url",
              out["options"][1]["image_url"] == "native_p20_x2.png")
        # vector_ (drawn math) images must NOT be swapped in — Marker's LaTeX wins there
        mq2 = {"question_number": 3, "question_text": "$\\frac{1}{x}$ value",
               "options": [{"id": "A", "text": "30"}]}
        pq2 = {"question_number": 3, "question_text": "garbled ![image](vector_p1_r2.png)",
               "options": [{"id": "A", "text": "30"}]}
        out2 = prefer_native_images(dict(mq2), pq2)
        check("vector_ crop NOT pulled into Marker text",
              "vector_p1_r2.png" not in out2["question_text"])
    except ImportError:
        pass


def main():
    ensure_pdfs()
    what = sys.argv[1] if len(sys.argv) > 1 else "all"

    if what in ("all", "postprocess"):
        postprocess_checks()

    for style in ("qno", "plain"):
        pdf = DATA / f"test_{style}_style.pdf"
        out = Path(tempfile.gettempdir()) / f"harness_{style}"
        raw = run_extractor(pdf, out)
        if what in ("all", "extractor"):
            extractor_checks(style, raw, out)
        if what in ("all", "segment"):
            segmentation_checks(style, raw)

    print(f"\n{'='*46}\n  {PASS} passed, {FAIL} failed")
    if FAILURES:
        print("  Failed:", *[f"\n   - {f}" for f in FAILURES])
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
