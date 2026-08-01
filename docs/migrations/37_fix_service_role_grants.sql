-- ============================================================
-- Migration: 37 — Restore service_role grants
--
-- Three tables were created without table-level privileges for service_role,
-- which is the role the entire API runs as:
--
--   exam_calendar           (migration 28)
--   batch_lifecycle_events  (migration 28)
--   student_topic_reviews   (migration 34)
--
-- Every query against them failed with SQLSTATE 42501, "permission denied".
-- RLS was not the cause — an RLS denial returns zero rows, not an error. These
-- were missing GRANTs, so the policies never even came into play.
--
-- The failures were invisible because each caller discards the error:
--
--   * createBatch reads exam_calendar to fill in a batch's expiry date and
--     destructures only `data`. With the read failing, `ends_at` stayed NULL,
--     and a batch with no expiry never expires — so an institute could run one
--     immortal batch and rotate cohorts through a single year's fee forever.
--     This is the revenue leak, and it was a permissions bug the whole time.
--
--   * The nightly lifecycle job treats its audit insert as best-effort and
--     logs without throwing, so batch_lifecycle_events stayed empty.
--
--   * Spaced repetition reads student_topic_reviews, so daily revision and the
--     dashboard's "Today's Revision" card returned nothing at all — the
--     feature has been dead in production since migration 34.
--
-- The blanket grant plus ALTER DEFAULT PRIVILEGES below fixes the class rather
-- than the three known instances, so a table added by a later migration cannot
-- land in the same state. This does not weaken tenant isolation: RLS still
-- governs anon and authenticated, and service_role is designed to bypass it —
-- the API enforces tenancy in application code.
-- ============================================================

-- ─── 1. The three known tables, named explicitly for the record ──────────────

GRANT ALL ON public.exam_calendar          TO service_role;
GRANT ALL ON public.batch_lifecycle_events TO service_role;
GRANT ALL ON public.student_topic_reviews  TO service_role;

-- ─── 2. Everything else currently in the schema ──────────────────────────────

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ─── 3. Stop it recurring ────────────────────────────────────────────────────
-- Applies to objects created later by the role running migrations.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO service_role;

-- ─── 4. Reload PostgREST's schema cache ──────────────────────────────────────
-- Grants and new functions are not picked up until the cache is refreshed;
-- without this, institute_student_counts() from migration 36 stays invisible
-- and its callers keep 404ing on the RPC.

NOTIFY pgrst, 'reload schema';

-- ─── 5. Verify ───────────────────────────────────────────────────────────────
-- Expect one row per table with has_select = true.

SELECT c.relname AS table_name,
       has_table_privilege('service_role', c.oid, 'SELECT') AS has_select,
       has_table_privilege('service_role', c.oid, 'INSERT') AS has_insert
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('exam_calendar', 'batch_lifecycle_events', 'student_topic_reviews')
ORDER BY c.relname;
