-- ============================================================
-- Migration: 42 — Align exam_target with the batch a student is actually in
--
-- users.exam_target is set at registration from a request body defaulting to
-- the string "JEE", and nothing ever updated it afterwards. "JEE" is not an
-- exam code — the codes are jee-main, jee-advanced, jee-main-advanced and
-- neet-ug — and normaliseExamCode() falls through to jee-main for anything
-- unrecognised. So the mismatch never surfaced as an error, only as a NEET
-- student being shown JEE analytics, JEE syllabus coverage, and JEE questions
-- in their daily revision.
--
-- Every student in the table is affected: all four carry "JEE", including one
-- enrolled in a NEET batch.
--
-- Access control does not rely on this column — the API now derives
-- entitlement from the student's active batches on each request, which is the
-- authoritative fact. This aligns the stored value so that the screens still
-- reading it (analytics, syllabus coverage, daily revision) agree with what
-- the student is actually being taught.
-- ============================================================

-- ─── 1. Backfill from the student's active batch ─────────────────────────────
--
-- A student in more than one batch takes the most recently joined, since that
-- is the batch they are currently being taught in. Expired and left batches
-- are ignored — they say what a student used to be preparing for.

WITH current_batch AS (
  SELECT DISTINCT ON (bs.student_id)
         bs.student_id,
         b.exam
  FROM public.batch_students bs
  JOIN public.batches b ON b.id = bs.batch_id
  WHERE bs.left_at IS NULL
    AND b.is_active = true
    AND b.exam IS NOT NULL
    AND (b.starts_at IS NULL OR b.starts_at <= now())
    AND (b.ends_at   IS NULL OR b.ends_at   >  now())
  ORDER BY bs.student_id, bs.joined_at DESC
)
UPDATE public.users u
SET exam_target = cb.exam,
    updated_at  = now()
FROM current_batch cb
WHERE u.id = cb.student_id
  AND u.role = 'student'
  AND (u.exam_target IS DISTINCT FROM cb.exam);

-- ─── 2. Normalise anything left over ─────────────────────────────────────────
--
-- Students with no batch (self-signup, or not yet placed) keep a target, but it
-- should at least be a real code rather than "JEE".

UPDATE public.users
SET exam_target = CASE
      WHEN lower(coalesce(exam_target, '')) IN ('neet', 'neet-ug', 'neet-omr') THEN 'neet-ug'
      WHEN lower(coalesce(exam_target, '')) IN ('jee-advanced', 'jee advanced') THEN 'jee-advanced'
      WHEN lower(coalesce(exam_target, '')) = 'jee-main-advanced'              THEN 'jee-main-advanced'
      ELSE 'jee-main'
    END
WHERE role = 'student'
  AND exam_target NOT IN ('jee-main', 'jee-advanced', 'jee-main-advanced', 'neet-ug');

-- ─── 3. Verify ───────────────────────────────────────────────────────────────
-- Expect every row to read matches = true, or '(no batch)' for unplaced
-- students.

SELECT u.name,
       u.exam_target,
       coalesce(b.exam, '(no batch)')            AS batch_exam,
       (b.exam IS NULL OR b.exam = u.exam_target) AS matches
FROM public.users u
LEFT JOIN LATERAL (
  SELECT b2.exam
  FROM public.batch_students bs
  JOIN public.batches b2 ON b2.id = bs.batch_id
  WHERE bs.student_id = u.id
    AND bs.left_at IS NULL
    AND b2.is_active = true
  ORDER BY bs.joined_at DESC
  LIMIT 1
) b ON true
WHERE u.role = 'student'
ORDER BY matches, u.name;
