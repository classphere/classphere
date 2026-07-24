-- ============================================================
-- Migration 31 — Fix missing unique constraints for upsert
-- ============================================================

-- ── 1. attempt_answers: unique constraint for upsert onConflict ───────────────
-- The submitAttempt handler upserts answers with onConflict: "attempt_id,question_id"
-- but no unique constraint existed, causing a 500 on every test submission.
-- Note: the table may already have duplicate rows (from failed upserts falling
-- through to inserts). Deduplicate first by keeping only the latest row per pair.
DELETE FROM public.attempt_answers a
USING public.attempt_answers b
WHERE a.attempt_id = b.attempt_id
  AND a.question_id = b.question_id
  AND a.created_at < b.created_at;

-- Now add the unique constraint the upsert requires
ALTER TABLE public.attempt_answers
  ADD CONSTRAINT attempt_answers_attempt_question_unique UNIQUE (attempt_id, question_id);

-- ── 2. notifications: fix partial index → full unique constraint ───────────────
-- The notifications upsert uses onConflict: "user_id,event_key" but the
-- existing index is partial (WHERE event_key IS NOT NULL) which Postgres
-- rejects for ON CONFLICT targeting.
UPDATE public.notifications
  SET event_key = 'legacy:' || id::text
WHERE event_key IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN event_key SET NOT NULL;

DROP INDEX IF EXISTS public.idx_notifications_user_event;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_event_key_unique UNIQUE (user_id, event_key);
