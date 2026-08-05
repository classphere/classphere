-- ============================================================
-- Migration: 50 — Remove the retired gamification and merit-list objects
--
-- Four objects that nothing writes and nothing reads. All four are the remains
-- of a ranking model the product deliberately moved away from: a platform-wide
-- merit list ordering every student by lifetime score, plus an XP layer to sit
-- beside it. Neither was finished, and what replaced them needs none of it.
--
--   leaderboards (table)
--     One XP total per (batch, student). Written on every DPP submission and
--     read by nothing, anywhere, ever — the ranking code never referenced this
--     table once. An empty filing cabinet: the boards students actually see
--     were never kept in it.
--
--   student_stats.xp
--     Four XP per correct DPP answer, accumulated behind a compare-and-swap
--     retry loop that could spin five times with backoff on every submission.
--     No screen has ever shown a student their XP.
--
--   student_stats.rank_score
--     total_score x accuracy, recomputed on every test submission. It ordered
--     the lifetime merit list. Because total_score only grows, it rewarded
--     volume over ability: forty papers at 45% outranked six at 85%. Its only
--     reader was an endpoint already answering 410 Gone.
--
--   student_stats.streak_days
--     Read by the student dashboard, incremented by nothing. It was structurally
--     zero for every student on the platform, for the whole life of the column.
--
-- What replaced them needs no stored aggregate at all. The three live boards —
-- per paper, weekly, and all-time — are computed on demand from `attempts` and
-- `attempt_answers`, which are the source of truth. Ranking is derived, not
-- cached, so there is nothing here to keep in step.
--
-- The rest of student_stats stays: total_score, total_max_score, total_tests,
-- accuracy_pct, exam_code and last_test_date are all still written on submit
-- and read by the institute reports.
--
-- Application code stopped writing every one of these before this migration, so
-- running it changes no behaviour. It is, however, irreversible — the data in
-- these columns is discarded. That is intended: none of it was ever displayed,
-- so there is nothing to preserve.
-- ============================================================

BEGIN;

-- CASCADE also removes idx_leaderboards_batch, the row-level security policy
-- "leaderboards_select", and the grants made to service_role and authenticated
-- in migrations 03 and 13. There are no foreign keys pointing at this table.
DROP TABLE IF EXISTS public.leaderboards CASCADE;

ALTER TABLE public.student_stats
  DROP COLUMN IF EXISTS xp,
  DROP COLUMN IF EXISTS rank_score,
  DROP COLUMN IF EXISTS streak_days;

COMMIT;
