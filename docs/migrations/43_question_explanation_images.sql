-- ============================================================
-- Migration: 43 — Give explanation images a column
--
-- The extraction pipeline produces them: normalize_json.py pulls image
-- references out of the explanation markdown into an `explanation_images`
-- array. Nothing ever stored it. The bulk-upload insert has no such field, so
-- every extracted explanation image has been discarded at ingest — 7,745
-- questions carry explanation text and not one carries an image.
--
-- Three names were in play and none agreed:
--
--   extractor JSON             explanation_images     (array)
--   packages/types             explanation_image_url  (single string)
--   questions table            — did not exist
--
-- The analysis engine selected the middle one, PostgREST returned 42703, the
-- error was discarded, and every analysis silently ran on zero questions (see
-- migration notes in db.service.ts).
--
-- The array is the honest shape: a worked solution routinely has more than one
-- diagram, and the extractor already collects them that way.
-- ============================================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS explanation_images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.questions.explanation_images IS
  'Image URLs supporting the explanation, in reading order. Array because a worked solution often needs several diagrams. Populated from the extractor''s explanation_images.';

-- Questions whose explanation carries images are rare enough that a partial
-- index is worth more than a full one.
CREATE INDEX IF NOT EXISTS idx_questions_with_explanation_images
  ON public.questions ((jsonb_array_length(explanation_images)))
  WHERE jsonb_array_length(explanation_images) > 0;

-- ─── Verify ──────────────────────────────────────────────────────────────────

SELECT count(*)                                                        AS questions,
       count(*) FILTER (WHERE jsonb_array_length(explanation_images) > 0) AS with_images
FROM public.questions;
