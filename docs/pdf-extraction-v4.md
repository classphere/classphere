# PDF Extraction v4: Ordered Content and No-Silent-Loss Rollout

## Purpose

V4 adds deterministic document profiling, ordered question content, source provenance, confidence/review metadata, and one shared renderer used by the CBT, extraction preview, Test Editor, Test Head, and Superadmin review. It is additive: legacy fields remain populated and remain the fallback for every existing question.

The safety contract is **no silent loss**. Structured text, math, diagrams, option images, and tables are used when verified. Uncertain regions retain a source crop and a review reason rather than shipping corrupted content as if it were correct.

## The pipeline

There is no switch. `PDF_EXTRACTOR_V4` existed while profiling was being rolled out and has been removed, because switching it off did not fall back to something simpler — it lost capability. Answer-key and solution pages stopped being excluded from extraction, so their numbering produced question anchors and the reconciler created a blank placeholder for each; nothing read the marks off the instructions page; and questions reached the database without `extraction_metadata`, which is where the paper validator reads review reasons from. Profiling *failing* is still handled — the extractor carries on without a profile — which was the only fallback the flag genuinely offered.

Every extraction now runs:

1. `document_profile.py` classifies digital/scanned/hybrid pages, likely columns, page roles, and OCR/escalation needs without writing files.
2. When the user did not request a page range, confidently detected answer-key and worked-solution pages are excluded from question segmentation.
3. Section-local numbering resets are segmented independently and deterministically renumbered into CBT order while retaining the printed source number as provenance.
4. The PyMuPDF/Gemini pipeline performs extraction. `pymupdf_extractor.py` renders each page and emits geometry-annotated HTML with question-number anchors; `gemini_page_extractor.py` sends the page image, the next page's image and that HTML to Gemini per page, then reconciles the result against the anchors and re-asks any page that came back short.

   Scanned pages are **rejected, not escalated** — `is_digital_pdf()` requires a text layer and the job fails with "Scanned PDF detected". The Datalab Marker best-of-both merge that used to handle hybrid/OCR pages no longer exists; OCR input is an open gap rather than a fallback path.
5. `pdfExtractorV4.service.ts` adds extraction metadata.
6. Upload controllers persist R2-backed ordered blocks while preserving `question_text`, `image_url`, `options`, and `explanation`.

## Database migration

Apply `docs/migrations/31_question_content_v2.sql` before enabling v4. It adds nullable columns only and does not rewrite existing rows:

- `content_blocks`
- `extraction_metadata`
- `extractor_version`
- `source_crop_url`

The migration also updates the existing global-draft RPC to accept those optional fields without changing its signature or legacy behavior.

## Golden corpus

The five supplied PDFs are intentionally **not committed**. Their hashes and expectations live in:

`apps/api/src/services/extractor/tests/golden/corpus.manifest.json`

Validate copies placed in a private corpus directory:

```bash
python apps/api/src/services/extractor/tests/validate_golden_corpus.py \
  --corpus-dir /secure/path/to/pdf-corpus
```

To validate completed extraction JSON as well, name the files by manifest id and add:

```bash
--extractions-dir /secure/path/to/extraction-json
```

The acceptance gate requires exact question counts and numbering, no leakage from answer-key/solution-only pages, resolvable assets, valid LaTeX, correct option ownership, and source-crop fallback for uncertain tables/regions.

## Deterministic profiler tests

```bash
python -m unittest apps/api/src/services/extractor/tests/test_document_profile.py
```

The tests use in-memory PDFs and do not create or clean tmp/temp directories.

## Verifying a change to extraction

The canary sequence below described enabling v4 alongside the old path. There is
no longer an old path to compare against, so the check is now against the source
PDF itself:

1. Apply migration 31 if it has not been applied.
2. Run the golden profile gate: `python tests/validate_golden_corpus.py`.
3. Extract one document from each corpus class.
4. Read the completeness block — `anchors_matched / expected_total` — and the
   verification block, which scores each question's wording against the page it
   came from.
5. Open the paper in review and compare question count, numbering, types,
   options, assets and tables against the source PDF.

## Rollback

There is no flag to unset. Extraction changes roll back by deploying the previous
build. The `content_blocks`, `extraction_metadata`, `extractor_version` and
`source_crop_url` columns are nullable and legacy fields stay populated, so an
older build reads rows written by a newer one without a data migration.

## Temporary files

V4 does not introduce, modify, migrate, commit, or clean any tmp/temp folders. Existing runtime working-directory behavior remains untouched.
