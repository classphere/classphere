# Extraction Pipeline Accuracy Overhaul — Change Report

Goal: push PDF→JSON extraction toward exact output on JEE/NEET papers.
Constraint honored: **Cerebras `gpt-oss-120b` remains the only LLM** — everything
around it became deterministic, annotated, and verified.

Verified by: 62 deterministic harness checks (2 synthetic papers × 2 numbering
styles), offline end-to-end runs with a mocked LLM, and a live smoke test
(8/8 questions, validator verdict CLEAN, 3 API calls — including one automatic
repair where the model dropped a diagram reference and the pipeline caught it).

---

## Root causes fixed (mapped to your four failure modes)

### 1. LaTeX / math reconstruction errors
The old extractor threw away the geometry that encodes math structure, then a
6,000-token prompt asked the LLM to guess it back.

- **Superscript/subscript detection** (`pymupdf_extractor.py`): span font
  flags + size + baseline offset → emitted as `<sup>/<sub>` tags. `103 cm2`
  is now `10<sup>3</sup> cm<sup>2</sup>` → the LLM outputs `$10^{3}\,\text{cm}^{2}$`
  deterministically. Lines are split at span level so a raised exponent merged
  into a neighboring line by MuPDF is still caught.
- **Stacked fractions**: fraction-bar lines from `page.get_drawings()` are
  matched with the numerator/denominator text stacked around them →
  `<frac><num>-3</num><den>2</den></frac>`. Previously `(A) -3 … 2 3 4 12`
  (numerators and denominators scattered as orphan lines).
- **Garbage-glyph regex bug**: the old `[A-Z]{5,}` pattern mangled every
  ALL-CAPS word — `PHYSICS` → `[PHYSICS]`, `SECTION` → `[SECTION]` — corrupting
  the exact headers subject/type detection depends on. Now only true glyph-name
  artifacts (`ALPHA`, `uniF0B4`) are converted.
- **LaTeX linting** (`extract_common.lint_latex`): unbalanced `$`/braces,
  unmatched `\left/\right`, garbled backslash runs, leftover pipeline tags,
  unicode math outside math mode. Error-level lint triggers automatic repair.

### 2. Cross-page stitching failures
- **Anchor-based question blocks** (`extract_common.segment_questions`)
  replace regex page splicing. Question-start anchors (annotated `data-qcand`
  or regex fallback) are selected by a longest-increasing-chain search with a
  content-quality tie-break, then everything between anchor N and N+1 —
  including page boundaries — becomes question N's block. The LLM always
  receives whole questions; it never stitches.
- The old `Question\b` regex never matched plain `27.`-numbered papers, in
  which case **entire pages were appended to the previous page**. The chain
  search handles both styles, ignores years/instruction lists, and supports
  partial papers starting at any number.
- **Gap-driven recovery**: missing numbers are re-extracted from their own
  block; a missed anchor triggers a "this block contains TWO questions — split
  them" call on the preceding block.
- **Repair sees the full block** (all pages of a split question) instead of
  one truncated page.

### 3. Wrong image-to-option association
- **Geometric image ownership**: images are assigned to a question stem or a
  specific option by column + reading-order interval, emitted as
  `data-owner="option-B" data-conf="high"` AND physically re-positioned after
  their owner's label. Count-based redistribution handles page-split clusters
  deterministically (the old prompt's RULE 5, now done with real geometry).
- **Vector diagrams are captured at all**: drawing primitives are clustered
  into regions and rendered as cropped PNGs. Previously circuit/geometry
  diagrams drawn as vectors were invisible — a major source of missing option
  images — and their text labels leaked into stems (`A B`, `y`).
- **Boilerplate filtering**: logos/headers repeating across pages are dropped
  (xref frequency prescan) instead of polluting a random question.
- **Image audits**: every image in a block must be referenced exactly once in
  the extracted question; unreferenced/nonexistent references are errors that
  trigger repair. (The live smoke test caught exactly this and self-healed.)

### 4. Type / subject misclassification
- **NEET detector**: old rule flipped a whole JEE paper if ONE question was
  mislabeled Biology. Now requires ≥160 questions or ≥10 biology questions.
- **Single-subject guard**: a 75-question single-subject test is no longer
  force-split into Physics/Chemistry/Maths ranges.
- **Section headers are authoritative**: `SECTION-B (Numerical Value Type)`
  headers are annotated at extraction, carried per-block as `type_hint`,
  cross-checked against the LLM's output at the diagnostic stage (mismatch →
  repair with the hint stated as authoritative), and applied in the
  normalizer BEFORE structural range locks.
- **Answer-key cross-check** (`normalize_json.py --answer-key`): fills
  `correct_answer`/`numerical_answer` and corrects types from answer shape
  (numeric → integer, letters → MCQ/MSQ); contradictions are flagged.
- JEE Main structural range locks retained as fallback where no hint exists.

---

## The "100% exact" strategy

An LLM stage can never be formally guaranteed, so the design is:
1. everything that CAN be deterministic IS (geometry, segmentation, ownership,
   types from headers/keys);
2. every question passes an automated verifier (structure, LaTeX, images,
   numbering continuity);
3. error-level defects trigger targeted self-repair with authoritative hints;
4. anything still failing is flagged `_needs_review` with its defect list —
   errors surface for human review instead of shipping silently.
5. optional `--consensus` mode double-extracts and flags field-level
   disagreements (off by default to save quota).

---

## File-by-file

| File | Status | Notes |
|---|---|---|
| `pymupdf_extractor.py` | rewritten (v3) | sup/sub, fractions, vector diagrams, ownership, anchors, boilerplate filter; fixed ALL-CAPS mangling and a line-cluster chaining bug in overlap sorting. Output stays `marker_raw.json`-compatible; "Scanned PDF detected" sentinel preserved. |
| `cerebras_from_marker.py` | rewritten (v2) | block batching, annotation-first prompt, truncation-aware splits, hint cross-checks, full-block repair, gap recovery, `--consensus`, `--pages` (the TS service already passed it; now honored). Importable module + argparse CLI. |
| `extract_common.py` | **new** | segmentation + diagnostics shared by pipeline and validator. |
| `normalize_json.py` | rewritten (v2) | safer NEET/single-subject detection, hint-driven types, `--answer-key`, platform schema (uuid `id`, `question_images`, `options[].image_url`, `mcq_single/mcq_multi/integer`), QA report file. |
| `validate_extraction.py` | **new** | standalone QA gate; exit 1 on errors. |
| `parse_pdf_answer_key.py` | patched | 402 handling removed the WRONG key (rotation index had advanced); now removes the client that failed. |
| `pdfExtractor.service.ts` | patched | image embedding accepts both `![image](f)` and `[image: f]`; extractor timeout 60s→180s (diagram rendering); normalize call passes `--images-dir`. |
| `tests/make_test_pdfs.py`, `tests/run_harness.py` | **new** | synthetic papers reproducing all failure patterns + 62 regression checks. |

## ⚠ Action items for you

1. **Rotate the 8 Cerebras keys in `api_keys.txt`** — they've left your machine
   (shared in this archive).
2. **Type names changed by default**: `normalize_json.py` now emits
   `mcq_single` / `mcq_multi` / `integer` (your doc §4 schema). If
   `tests.controller.ts` expects `MCQ`/`MSQ`/`Numerical`, run with
   `--legacy-types` or update the controller.
3. **Wire the answer key in**: the controller should pass
   `--answer-key <key.json>` to `normalize_json.py` after running
   `parse_pdf_answer_key.py` — it's the strongest deterministic type signal.
4. Upload 1–2 real JEE/NEET PDFs — the harness is built to take golden
   papers; real-font quirks (Symbol-font glyph maps, embedded Type3 fonts)
   are the remaining risk surface.

## Real-paper validation (3 live JEE papers, Cerebras gpt-oss-120b)

Ran the full live pipeline on 3 real 2025 JEE Main papers (AYJR Morning, AYJR
Evening, QFT-22), 75 questions each.

Two real-paper bugs the synthetic tests did NOT catch were found and fixed:
1. **Vector text-absorption** — these papers typeset math as vector outlines, so
   the drawing analyzer bundled real stem text into "diagram" images and deleted
   it. Text retention was only ~90%. Fix: a region is a figure only if the real
   text it overlaps is a tiny label; otherwise the region is dropped and the text
   kept. Retention → ~99%.
2. **Reading-order scramble** — full-width lines split by inline stacked-fractions
   into left/right halves were misread as two columns and interleaved across
   questions. Fix: gap-aware visual-row reassembly (contiguous fragments rejoin;
   real column gutters don't) + a gutter-aware step-8 join.

Results:

| Paper | Extracted | Subjects | Types | Clean (text-layer + valid) | Vector-math dependent | Flagged for review |
|---|---|---|---|---|---|---|
| Morning | 75/75 | 25/25/25 | 60 mcq + 15 int | 51 | 24 | Q38 |
| Evening | 75/75 | 25/25/25 | 60 mcq + 15 int | 44 | 31 | Q33 |
| QFT-22  | 75/75 | 25/25/25 | 60 mcq + 15 int | 39 | 36 | Q2, Q43, Q68 |

- **Deterministic layer is exact**: 225/225 questions detected, zero numbering
  gaps/dupes, correct 25/25/25 subject split and 60+15 type pattern on all three
  — auto-detected (no need to tell it 75 vs 90).
- **Semantic fidelity is high where math is in the text layer** (verified by
  visual diff against the PDF: power-set/set-builder notation, vectors,
  thermodynamics options all faithful).
- **The ceiling is the source + text-only model**: 24–36 questions/paper render
  options or stems as vector-graphic math. The pipeline captures those as images
  (content preserved) but a text-only LLM cannot transcribe math out of an image,
  so their LaTeX can be imperfect. The validator flags the worst; some pass
  structural checks with imperfect LaTeX. Reaching exactness there needs a
  math-OCR / vision step on the captured images (outside the gpt-oss-120b
  text-only constraint).
- No answer keys were embedded, so `correct_answer` is empty and answer
  correctness was not verified — structure + spot-check only.

## Post-run LaTeX/rendering hardening (normalize_json.py)

Two rendering bugs surfaced on real output and are now fixed deterministically
in the normalizer (last line of defense, regardless of what the LLM emits):

1. **Bare LaTeX macros rendered as literal text** — e.g. a stem with
   `$f_v$ \rightarrow Visible light` showed a literal `\rightarrow` because the
   macro sat OUTSIDE the `$...$` delimiters. `wrap_bare_latex()` now scans the
   plain-text gaps between existing math spans and wraps any bare `\macro{...}`
   (and bare unicode math like →, ≤, ×) in `$...$`. Existing `$...$` and `$$..$$`
   spans are preserved untouched; the pass is idempotent.
2. **"Image unavailable" placeholders** — options/stems that referenced an image
   file not present on disk rendered a broken-image placeholder.
   `clean_dead_images()` (active when `--images-dir` is passed) strips any
   `![image](f)` reference whose file is missing and nulls dead `image_url`
   values, so only real, resolvable images remain.

Both are covered by regression checks in `tests/run_harness.py` (postprocess
section) and reduced validator warnings on the real papers (e.g. QFT-22 87→70).

## Round 2 rendering hygiene (normalize_json.py `sanitize_text`)

More real-output issues, fixed deterministically:

- **Literal `\n` rendering as text** (double-escaped newlines showing as a red
  `\n`). `sanitize_text` rewrites a `\n` to a space ONLY when it is followed by
  a non-letter, digit, or uppercase letter — so real LaTeX macros that start
  with n/r/t/f/v (`\neq`, `\nu`, `\nabla`, `\ne`, `\ni`, `\rightarrow`,
  `\times`, `\frac`, `\vec`, `\theta`, …) are never corrupted. Real newlines and
  tabs are also collapsed to spaces (platform stems render inline).
- **Empty / degenerate math spans** (`$ $`, `$\bigl(\,\bigr)$` from an
  emptied-out binomial) are removed.
- **Unbalanced `$`** — an odd number of unescaped `$` (e.g. a stray `$` in a
  chemical equation `FeSO_4$(aq)`) is repaired by dropping the last unmatched
  one, so the math span can't run away and swallow the rest of the option.
  (Cut QFT-22 validator errors 5→2.)

All covered by the `tests/run_harness.py` postprocess section (now 79 checks).

### What these fixes do NOT solve (the vector-math ceiling)

The residual errors — 4 across the 3 papers (morning Q38, evening Q33, QFT-22
Q2 & Q43) — are all the same root cause: the paper renders the *answer options*
(or a stem fraction/binomial) as **vector-drawn math**, not text. The text
layer for those is garbled, so a text-only LLM produces duplicate/empty/garbled
options (e.g. `1/x` read as `x^1`, a binomial `\binom{a}{b}` losing its
numerator, option fractions collapsing to identical text). The pipeline
captures the graphics as images and the validator flags the broken structure —
but turning those drawn equations into correct LaTeX needs a **math-OCR /
vision pass** on the captured images, which is outside the text-only
gpt-oss-120b constraint. This is the next lever, not a normalizer bug.

## Hybrid Marker auto-escalation (vector-math recovery)

The vector-math ceiling is now addressed with an automatic, cost-controlled
escalation to Datalab Marker — **validated live on real papers**.

**Why it works:** these papers draw math/options as vector outlines, so the
text layer is garbled. Marker with `force_ocr=true` reads the *pixels* and
recovers real LaTeX. Measured on the evening paper: it turned a "1 error + Q33
flagged + 70 warnings" PyMuPDF result into **0 errors / 0 flagged / CLEAN**, and
fixed the exact cases you flagged — Q2 (`8!`/`2·(7!)`), Q3 (`\frac{1}{x}`), Q33
(all 4 options), Q1/Q30/Q50 — with **no regressions**, for **~8¢ and ~7s per
24-page paper**.

**The flow (all in `pdfExtractor.service.ts`):**
1. PyMuPDF → Cerebras → normalize (free, instant, exact on clean text).
2. `normalize_json.py` writes an escalation verdict into the QA report
   (`extract_common.vector_math_signature`): escalate if any question is flagged
   with a structural defect OR ≥20% of questions reference vector-drawn regions.
3. If escalate **and** `DATALAB_API_KEY` is set → run Marker (`force_ocr=true`,
   `marker_extractor.py` v2 with the `<math>`→`$` / block-newline / table
   adapter) → Cerebras → normalize.
4. **Best-of-both merge** (`merge_extractions.py`) — decoupled TEXT vs IMAGES:
   - **Text/math**: per question, keep whichever source has fewer structural
     errors; tie → Marker (its LaTeX is reliably better on these papers, and it
     fixes even *undetectable* garbling like `$A_3$`/lost `$\vec p$` that has 0
     validator errors and no vector image). PyMuPDF is kept only where Marker is
     strictly worse (e.g. morning Q52/Q66 where Marker dropped options) — blind
     replacement made morning *worse* (2→4 errors); the merge keeps it at 2.
   - **Images**: ALWAYS prefer PyMuPDF's native embedded images. Marker
     re-renders images from the page raster → JPG artefacts + watermark bleed;
     PyMuPDF extracts the original embedded bytes (crisp). So when a question's
     text comes from Marker, native embedded images are swapped back in by slot
     (stem + each option id). Vector_ crops (drawn math) are never swapped in —
     those are exactly what Marker's LaTeX replaces. Result on evening: 14
     questions keep native images (e.g. Q64's chemical structures) while still
     getting Marker's math — 0 errors, CLEAN.

   Marker is thus purely the OCR/LaTeX engine; PyMuPDF remains the image source.

**No `DATALAB_API_KEY` → clean no-op**: `marker_extractor.py` exits 2, the
orchestrator logs it and keeps the PyMuPDF result. The pipeline still runs fully
free/offline; Marker only ever *adds* quality when a key is present and a paper
needs it.

New/changed files: `marker_extractor.py` (v2: force_ocr, retry, pipeline
adapter), `merge_extractions.py` (new), `extract_common.vector_math_signature`,
`normalize_json.py` (`--source`, escalation verdict in report),
`pdfExtractor.service.ts` (orchestration). Harness: 82 checks.

## IMPORTANT: which output your frontend must read

The scrambled dense-math questions (vectors, determinants, multi-condition
stems) are the **PyMuPDF text-layer output**. They are *exactly* what the Marker
escalation fixes. Two things to know:

1. **Set `DATALAB_API_KEY`** in the environment that runs `extractPDF()`. Without
   it, escalation is a no-op and you get the raw PyMuPDF result (garbled math on
   vector-drawn questions). The service now logs a loud ⚠ warning in that case.
2. **Read the canonical output.** When escalation runs, the service now copies
   the merged result back to `extracted_data/all_extracted_data.json` (and its
   images to `extracted_data/marker_images/`). So a frontend reading the standard
   path always gets the FINAL merged result — never the PyMuPDF intermediate.
   (Or just use the `questions` array returned by `extractPDF()`.)

### Validator caveat (why "0 errors" didn't catch the scrambles)

`validate_extraction.py` checks *structure* — option counts, `$` balance, image
resolvability, numbering. A scrambled stem with 4 valid options and balanced `$`
passes as "clean". So a green validator is necessary, not sufficient: it does not
prove semantic faithfulness. The Marker escalation (not the validator) is what
recovers correct dense-math content; on an escalated paper the merge's
`tie → Marker` rule is what replaces a structurally-valid-but-scrambled PyMuPDF
stem with Marker's correct one.

## Structure-preserving output (tables, lists, line breaks)

Confirmed against the frontend (`marked` v5 with `breaks:true` + KaTeX +
`dangerouslySetInnerHTML`; GFM tables styled in globals.css): the UI renders a
real `\n` as `<br>`, supports GFM markdown tables, and renders `$…$` inside
cells. So the earlier "run-on paragraph" on matching questions was a **backend**
bug (over-sanitizing), not a frontend issue.

Fixes:
- **`sanitize_text` no longer flattens newlines.** A double-escaped literal
  `\n` is converted to a REAL newline (renders as `<br>`) instead of a space,
  and real newlines are preserved (only runs of spaces are collapsed; 3+ blank
  lines capped at one). Enumerated statements and list items keep their own
  lines. `\neq`/`\nu`/`\nabla`… still protected.
- **Marker `<table>` → GFM markdown table** (`marker_extractor.adapt_marker_html`
  / `_table_to_markdown`): rows become `| … |` with a `---` separator, `$…$`
  math and `<img>` preserved in cells, ragged/colspan rows padded to equal
  columns. "Match the columns" / Column I–II questions now render as a real
  2-column table instead of a paragraph — and no longer drop rows (e.g. evening
  Q68 now keeps all four List-I entries incl. the two text reactions, with
  Fittig separated correctly).
- **Cerebras prompt** instructs the model to copy any markdown table verbatim
  and keep newlines for enumerated/column layouts rather than flattening to prose.

- **Split/duplicated tables merged** (`normalize_json.merge_markdown_tables`):
  Marker (and page boundaries) often break ONE matching table into several
  `<table>` blocks, each repeating the `| Column I | Column II |` header — which
  renders as broken header-soup. The normalizer now merges consecutive tables
  with an identical header into a single table (dropping the repeated
  header+separator), so e.g. a 6-row "Column I vs Column II" question that was
  split across a page boundary becomes one clean bordered table. Tables with
  genuinely different headers are left separate.

- **Marker `use_llm` figure descriptions stripped** (`marker_extractor._strip_marker_annotations`):
  Marker emits each figure's description TWICE — in the `<img alt="…">` and in a
  visible `<div class="img-description">` block (a prose description and often a
  Mermaid `graph LR …` of the diagram) — which leaked into the question stem
  (e.g. Q38's circuit showed "graph LR / A((A)) --- NOT1[NOT] … A logic circuit
  diagram with two inputs…"). The frontend renders images by `src`, so these are
  pure clutter. The adapter now removes the `img-description` block, any
  `<pre>/<code>` (mermaid) fences, and the `alt` attribute (keeping `src`).
  Verified: 0 description/mermaid leaks across all 75 evening questions.

Harness: 97 checks.

## Bilingual coaching papers + non-JEE structure

Tested on a Momentum Coaching MTSE scholarship paper (60 Q, Physics/Chemistry/
Maths 20 each, all MCQ, English + Hindi side-by-side). Three additions:

- **Bilingual Hindi-column strip** — coaching papers print each question twice:
  English in one column, a Hindi translation in the other (legacy KrutiDev/DevLys
  font in the PyMuPDF path; real Devanagari after Marker OCR). Both would leak
  into the stem.
  - PyMuPDF path (`pymupdf_extractor`): detect the legacy-Hindi-font column
    (`HINDI_FONT_RE`), find which side it clusters on, and drop that side's text
    AND its duplicate images/diagrams by bbox.
  - Marker path (`marker_extractor`): drop Hindi-side leaf blocks by bbox, plus a
    line-level Devanagari filter for pages where Marker merged both columns into
    one full-width block. Verified: 0 Devanagari across all 60 questions.
- **Adaptive 3-subject split** (`normalize_json.enforce_subjects`): the section
  size now divides the question count evenly when possible (60 → 20/20/20)
  instead of assuming the JEE 25/25 layout.
- **All-MCQ papers skip the JEE integer lock** (`apply_structural_lock`): the
  fixed JEE Main integer ranges are only applied when the paper shows
  integer/numerical evidence (a type hint, a Numerical question, or a fill-in
  blank). An all-MCQ coaching paper keeps all 60 as MCQ instead of having 10
  MCQs wrongly converted to integer.

Harness: 104 checks. (Note: a full live 60-Q re-run was limited by Cerebras key
quota during testing; the fixes are verified by unit + harness checks and the
end-to-end Hindi-strip run.)

## How to run

```powershell
python pymupdf_extractor.py paper.pdf out_dir
python cerebras_from_marker.py out_dir            # add --consensus for double-check runs
python parse_pdf_answer_key.py paper.pdf out_dir/answer_key.json
python normalize_json.py out_dir/all_extracted_data.json --answer-key out_dir/answer_key.json --images-dir out_dir/marker_images
python validate_extraction.py out_dir/all_extracted_data.json --images-dir out_dir/marker_images --expect 75
python tests/run_harness.py                        # 62-check regression suite
```
