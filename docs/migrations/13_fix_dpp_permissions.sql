-- ============================================================
-- Migration: 13 — DPP role grants
-- ============================================================
-- DPP endpoints use the API's service-role database client after performing
-- application-level tenant/ownership checks. Tables from migration 03 were
-- created with RLS policies but without explicit service_role privileges.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dpps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dpp_questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_dpps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.test_batch_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_stats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leaderboards TO service_role;

-- Existing RLS policies define the authenticated users' read surface.
GRANT SELECT ON TABLE public.dpps, public.dpp_questions, public.student_dpps,
  public.test_batch_assignments, public.student_stats, public.leaderboards TO authenticated;
