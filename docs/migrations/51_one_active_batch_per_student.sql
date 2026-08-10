-- ═══════════════════════════════════════════════════════════════════════════
-- 51. One active batch per student
-- ═══════════════════════════════════════════════════════════════════════════
--
-- batch_students is PRIMARY KEY (batch_id, student_id). That prevents adding
-- the same student to the same batch twice, and permits adding them to two
-- different batches — which every write path did, because none of them looked
-- outside the batch they were writing to. The import even documented it:
-- "Same phone + different batch → add to new batch", reported to the institute
-- as an updated assignment when it was really a second live enrolment.
--
-- A student enrolled in two batches drew exam codes and assigned tests from
-- both cohorts, and appeared twice in per-batch roster totals. Billing was
-- never affected — institute_student_counts() counts DISTINCT student_id.
--
-- Moving a student between batches is unaffected: that is a departure plus an
-- enrolment, so only one row is ever active. The application side lives in
-- apps/api/src/lib/batch-enrolment.ts.
--
-- NOTE: this makes a student doing both JEE and NEET impossible to model as
-- two batches. That case belongs to a batch whose exam covers both, not to
-- dual enrolment. Drop the index below to reverse the decision.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Resolve the duplicates already in the table ──────────────────────────
-- Keep the most recent enrolment and retire the rest. Most recent is the right
-- survivor: a duplicate is created by adding someone to a new batch, so the
-- latest row is the batch the institute last said they belonged to. batch_id
-- breaks ties so the choice is deterministic rather than dependent on scan
-- order. Retired rows keep their history — this is the same departure any
-- admin-initiated removal writes.

WITH ranked AS (
  SELECT
    batch_id,
    student_id,
    row_number() OVER (
      PARTITION BY student_id
      ORDER BY joined_at DESC NULLS LAST, batch_id
    ) AS rn
  FROM public.batch_students
  WHERE left_at IS NULL
)
UPDATE public.batch_students AS bs
SET left_at = now()
FROM ranked AS r
WHERE bs.batch_id   = r.batch_id
  AND bs.student_id = r.student_id
  AND r.rn > 1;

-- ─── 2. Enforce it ───────────────────────────────────────────────────────────
-- Partial, so the history of past enrolments is unconstrained — a student may
-- have left any number of batches. Only the live ones are exclusive.

CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_students_one_active
  ON public.batch_students (student_id)
  WHERE left_at IS NULL;

COMMENT ON INDEX public.uq_batch_students_one_active IS
  'A student belongs to exactly one batch at a time. Changing batch is a departure (left_at) plus an enrolment, never two live rows.';

COMMIT;
