-- ═══════════════════════════════════════════════════════════════════════════
-- 52. Roster counts, separate from billable counts
-- ═══════════════════════════════════════════════════════════════════════════
--
-- institute_student_counts() answers a billing question: who are we charging
-- for right now. It therefore excludes batches outside their date window --- a
-- cohort that starts next month is not billable yet, and one that ended is not
-- billable any more. That is correct, and migration 40 tightened it further by
-- excluding departures.
--
-- The superadmin institute list reused it to answer a different question: how
-- many students does this institute have. Those diverge exactly when a batch
-- sits outside its window, and then the CRM shows 0 students for an institute
-- whose own dashboard correctly lists them --- the roster views have never had
-- a date filter. An institute onboarding for next session reads as empty.
--
-- Same shape, same departure rule, no date window. Billing keeps its own
-- function untouched: these must be free to disagree, because they are
-- answering different questions.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.institute_roster_counts()
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
  GROUP BY b.institute_id;
$$;

COMMENT ON FUNCTION public.institute_roster_counts() IS
  'Enrolled students per institute, regardless of whether their batch has started. For rosters and CRM. Billing uses institute_student_counts(), which applies the date window.';

REVOKE ALL ON FUNCTION public.institute_roster_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.institute_roster_counts() TO service_role;
