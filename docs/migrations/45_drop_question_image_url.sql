-- ============================================================
-- Migration: 45 — Drop questions.image_url
--
-- A question's figures live in question_images. image_url held exactly one,
-- which meant a stem with a circuit diagram and a graph lost one of them, and
-- it has been redundant since migration 44 backfilled the array.
--
-- Verified before writing this: of 56,314 questions, 536 carry an image_url,
-- 536 carry a populated question_images, and zero have an image_url missing
-- from their array. Nothing is lost by removing it.
--
-- options[].image_url is untouched. It lives inside the options JSONB, not in
-- this column, and one figure per option is the right shape there.
--
-- RUN THIS LAST. The application no longer reads or writes the column, so
-- dropping it is safe at any point after deploying that change — but there is
-- no reason to hurry, and keeping it until the re-upload has landed leaves a
-- way back if a question's figures need checking against what was there
-- before.
-- ============================================================

-- ─── Refuse to run if anything would actually be lost ────────────────────────
-- Belt and braces: if a row still has an image_url absent from its array, this
-- aborts rather than dropping the only copy.

DO $$
DECLARE
  orphaned INTEGER;
BEGIN
  SELECT count(*) INTO orphaned
  FROM public.questions
  WHERE image_url IS NOT NULL
    AND btrim(image_url) <> ''
    AND NOT (question_images @> to_jsonb(ARRAY[image_url]));

  IF orphaned > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop image_url: % question(s) have a figure that is not in question_images. Re-run migration 44 first.',
      orphaned;
  END IF;
END $$;

-- ─── Drop ────────────────────────────────────────────────────────────────────

ALTER TABLE public.questions DROP COLUMN IF EXISTS image_url;

-- ─── Verify ──────────────────────────────────────────────────────────────────

SELECT count(*)                                                        AS questions,
       count(*) FILTER (WHERE jsonb_array_length(question_images) > 0) AS with_figures,
       count(*) FILTER (WHERE jsonb_array_length(question_images) > 1) AS multi_figure
FROM public.questions;
