-- ============================================================
-- Migration: 39 — Target year and class level on batches
--
-- An institute's batch list was a flat, undifferentiated set. The only thing
-- distinguishing "Target 2026 morning" from "Target Morning 2026" was a name
-- somebody typed, and once a session ends its batches sit in the same list as
-- the live ones forever.
--
-- Target year is the classification that actually matters to a coaching
-- institute: in 2026, a batch targeting 2028 is class 11 and one targeting
-- 2027 is class 12 or droppers. It also inverts a relationship that was
-- backwards. Expiry used to be guessed from exam_calendar and rolled forward a
-- year whenever the stored date had already passed — which is why a batch
-- named "Droppers 2026" ends up with an April 2027 date via arithmetic rather
-- than intent. With the target year stated, the expiry is a plain lookup:
-- that exam's month and day, in that year.
--
-- Class level cannot be derived and so is its own column. Target 2027 is
-- class 12 for one institute and droppers for another, and an institute
-- running both needs to tell them apart. Nullable, because existing batches
-- have no honest answer and guessing would mislabel real cohorts.
-- ============================================================

-- ─── 1. Columns ──────────────────────────────────────────────────────────────

ALTER TABLE public.batches
  -- The exam year this cohort is sitting for. Not the year the batch runs:
  -- a class 11 batch starting in 2026 targets 2028.
  ADD COLUMN IF NOT EXISTS target_year INTEGER
    CHECK (target_year IS NULL OR target_year BETWEEN 2020 AND 2100),

  ADD COLUMN IF NOT EXISTS class_level TEXT
    CHECK (class_level IS NULL OR class_level IN ('class_11', 'class_12', 'dropper'));

COMMENT ON COLUMN public.batches.target_year IS
  'Exam year this cohort sits for. Drives the suggested expiry and the grouping in the institute batch list.';
COMMENT ON COLUMN public.batches.class_level IS
  'class_11 | class_12 | dropper. Not derivable from target_year — 2027 is class 12 for one institute and droppers for another.';

-- ─── 2. Backfill from the expiry date where there is one ─────────────────────

UPDATE public.batches
SET target_year = EXTRACT(YEAR FROM ends_at)::INTEGER
WHERE target_year IS NULL
  AND ends_at IS NOT NULL;

-- ─── 3. Backfill the rest from the exam calendar ─────────────────────────────
--
-- Batches still carrying a NULL expiry (see migrations 37 and 38) get the same
-- treatment createBatch applies, so running this before or after 38 lands on
-- the same answer.

UPDATE public.batches b
SET target_year = EXTRACT(
      YEAR FROM CASE
        WHEN c.suggested_ends_at < CURRENT_DATE THEN c.suggested_ends_at + INTERVAL '1 year'
        ELSE c.suggested_ends_at
      END
    )::INTEGER
FROM public.exam_calendar c
WHERE b.exam = c.exam_code
  AND b.target_year IS NULL;

-- ─── 4. Index for the grouped list ───────────────────────────────────────────
-- The institute batch list reads every batch for one institute and groups by
-- year, newest first.

CREATE INDEX IF NOT EXISTS idx_batches_institute_target_year
  ON public.batches (institute_id, target_year DESC);

-- ─── 5. Verify ───────────────────────────────────────────────────────────────

SELECT target_year,
       class_level,
       count(*) AS batches,
       count(*) FILTER (WHERE ends_at IS NULL) AS missing_expiry
FROM public.batches
GROUP BY target_year, class_level
ORDER BY target_year DESC NULLS LAST, class_level;
