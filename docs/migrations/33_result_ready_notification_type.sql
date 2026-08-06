-- ============================================================
-- Migration: 33 — Add 'result_ready' notification type
--
-- Fired from apps/api/src/workers/analysis.worker.ts once an attempt's
-- analysis finishes computing, so students get notified their result/report
-- is ready instead of having to keep checking back.
-- ============================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('dpp_assigned', 'test_published', 'study_material_published', 'system', 'result_ready'));
