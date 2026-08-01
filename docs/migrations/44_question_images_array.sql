-- ============================================================
-- Migration: 44 — Give question figures the same array treatment
--
-- image_url holds exactly one figure. The extraction pipeline has been
-- producing an array all along — normalize_json.py builds question_images the
-- same way it builds explanation_images — so a question with a circuit diagram
-- and a graph loses one of them silently at ingest, with nothing to indicate
-- anything was dropped.
--
-- image_url is deliberately kept rather than replaced. Thirty-seven API call
-- sites and seven renderers read it, and migrating them in one change would be
-- a large blast radius for no immediate gain. It now means "the first figure",
-- is maintained automatically alongside the array, and readers can move across
-- one at a time.
-- ============================================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.questions.question_images IS
  'Every figure belonging to the question stem, in reading order. image_url mirrors the first entry so existing readers keep working.';

-- ─── Backfill from the single column ─────────────────────────────────────────
-- An existing row has at most one figure, so the array is that figure or empty.

UPDATE public.questions
SET question_images = to_jsonb(ARRAY[image_url])
WHERE image_url IS NOT NULL
  AND btrim(image_url) <> ''
  AND jsonb_array_length(question_images) = 0;

CREATE INDEX IF NOT EXISTS idx_questions_with_images
  ON public.questions ((jsonb_array_length(question_images)))
  WHERE jsonb_array_length(question_images) > 0;

-- ─── Verify ──────────────────────────────────────────────────────────────────
-- with_array should equal with_single_url immediately after running: nothing
-- in the table can have had more than one figure until the next upload.

SELECT count(*)                                                      AS questions,
       count(*) FILTER (WHERE image_url IS NOT NULL AND btrim(image_url) <> '') AS with_single_url,
       count(*) FILTER (WHERE jsonb_array_length(question_images) > 0)          AS with_array,
       count(*) FILTER (WHERE jsonb_array_length(question_images) > 1)          AS multi_figure
FROM public.questions;
