-- ============================================================
-- Migration: 40 — Student departures, and class as a joining fact
--
-- Two problems, both from treating a journey as a snapshot.
--
-- 1. A cohort batch runs for two years. A class 11 student joining in 2026
--    sits the exam in 2028, so the batch cannot expire before then. But most
--    students stay and a few leave, and there was nowhere to record leaving:
--    batch_students held (batch_id, student_id, joined_at) and removal was a
--    hard DELETE. A student who left after class 11 therefore kept billing
--    until 2028, and deleting them to stop that destroyed the evidence they
--    were ever enrolled — so "how many students did we bill for in 2027?"
--    had no answer.
--
-- 2. batches.class_level stored "class 11" as though it were permanent. It is
--    not: the same cohort is class 12 the following year. The stable fact is
--    the class they *joined* in, from which the current class follows.
-- ============================================================

-- ─── 1. Departures ───────────────────────────────────────────────────────────

ALTER TABLE public.batch_students
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

COMMENT ON COLUMN public.batch_students.left_at IS
  'When the student left this batch. NULL means currently enrolled. Set instead of deleting the row, so enrolment history survives and billing can be reconstructed for any past period.';

-- Billing and rosters both ask "who is in this batch right now", which is the
-- whole table minus departures.
CREATE INDEX IF NOT EXISTS idx_batch_students_active
  ON public.batch_students (batch_id)
  WHERE left_at IS NULL;

-- ─── 2. Class is the class they joined in ────────────────────────────────────

ALTER TABLE public.batches
  RENAME COLUMN class_level TO entry_class_level;

COMMENT ON COLUMN public.batches.entry_class_level IS
  'Class the cohort joined in: class_11 | class_12 | dropper. The current class is derived from this and target_year, so a class 11 cohort reads as class 12 in its second year without anyone editing it.';

-- ─── 3. Bill only for students who are still here ────────────────────────────
--
-- Replaces the definition from migration 36. Same rule — a student counts when
-- their batch is active, started and unexpired — with departures now excluded.
-- Without this a student who left in class 11 would be billed through to the
-- exam year, which is the argument this whole model exists to avoid.

CREATE OR REPLACE FUNCTION public.institute_student_counts()
RETURNS TABLE (institute_id UUID, student_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.institute_id, count(DISTINCT bs.student_id)::BIGINT
  FROM public.batch_students bs
  JOIN public.batches b ON b.id = bs.batch_id
  WHERE bs.left_at IS NULL
    AND b.is_active = true
    AND (b.starts_at IS NULL OR b.starts_at <= now())
    AND (b.ends_at   IS NULL OR b.ends_at   >  now())
  GROUP BY b.institute_id;
$$;

REVOKE ALL ON FUNCTION public.institute_student_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.institute_student_counts() TO service_role;

NOTIFY pgrst, 'reload schema';

-- ─── 4. Verify ───────────────────────────────────────────────────────────────

SELECT count(*)                                  AS enrolments,
       count(*) FILTER (WHERE left_at IS NULL)   AS still_enrolled,
       count(*) FILTER (WHERE left_at IS NOT NULL) AS departed
FROM public.batch_students;
