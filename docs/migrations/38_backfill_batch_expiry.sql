-- ============================================================
-- Migration: 38 — Backfill expiry dates onto existing batches
--
-- Every batch created before migration 37 has ends_at = NULL, because the
-- exam_calendar lookup that fills it in was failing on a missing GRANT and the
-- caller discarded the error. A batch with no expiry never expires, so the
-- nightly lifecycle job skips it, its students bill forever, and an institute
-- can rotate new cohorts through it without ever renewing.
--
-- Migration 37 stops new batches landing that way. This repairs the ones
-- already there.
--
-- Dates come from exam_calendar, rolled forward a year when the suggested date
-- has already passed — the same rule createBatch applies, so a batch fixed
-- here matches one created today.
--
-- Only NULL rows are touched. A date somebody set by hand is never overwritten.
-- ============================================================

-- ─── 1. Backfill ─────────────────────────────────────────────────────────────

-- Where migration 39 has already established a target year, that year decides
-- the cycle and the calendar supplies only the month and day — the same rule
-- createBatch applies. Rolling the stored date forward a year is the fallback
-- for batches with no target year, and it is only correct for the next cycle:
-- a class 11 cohort sitting in 2028 would otherwise be handed a 2027 expiry.
--
-- No updated_at is set: public.batches does not have that column. Its only
-- timestamp is created_at.
UPDATE public.batches b
SET ends_at = make_date(
      COALESCE(
        b.target_year,
        EXTRACT(YEAR FROM CASE
          WHEN c.suggested_ends_at < CURRENT_DATE THEN c.suggested_ends_at + INTERVAL '1 year'
          ELSE c.suggested_ends_at
        END)::INTEGER
      ),
      EXTRACT(MONTH FROM c.suggested_ends_at)::INTEGER,
      EXTRACT(DAY   FROM c.suggested_ends_at)::INTEGER
    )::timestamptz + INTERVAL '23 hours 59 minutes'
FROM public.exam_calendar c
WHERE b.exam = c.exam_code
  AND b.ends_at IS NULL;

-- ─── 2. Report what is still open ────────────────────────────────────────────
--
-- Batches whose `exam` does not match any exam_calendar.exam_code keep a NULL
-- expiry — there is no honest date to infer, and guessing one would cut real
-- students off. Expect the two legacy "E2E Test Batch 2026" rows here, which
-- store exam = 'JEE' rather than a calendar code such as 'jee-main'.
--
-- Set these by hand in the batches page, or delete them if they are test data.

SELECT b.id,
       b.name,
       b.exam        AS unmatched_exam_code,
       b.is_active,
       b.created_at
FROM public.batches b
WHERE b.ends_at IS NULL
ORDER BY b.created_at;

-- ─── 3. Verify ───────────────────────────────────────────────────────────────

SELECT count(*) FILTER (WHERE ends_at IS NOT NULL) AS with_expiry,
       count(*) FILTER (WHERE ends_at IS NULL)     AS still_immortal,
       count(*)                                    AS total
FROM public.batches;
