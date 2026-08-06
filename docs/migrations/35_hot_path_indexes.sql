-- ============================================================
-- Migration: 35 — Composite indexes matching the actual query shapes
--
-- The existing indexes are single-column (attempts.student_id,
-- attempts.submitted_at, questions.chapter …). Postgres can only use one of
-- them per scan, so the hottest paths filter on one column and then discard
-- rows. These composites match how the queries are really written.
--
-- CONCURRENTLY is deliberately NOT used: Supabase's SQL editor runs statements
-- in a transaction, which CONCURRENTLY forbids. These tables are small enough
-- today that a brief lock is fine. If run later against a large table, execute
-- each statement separately with CREATE INDEX CONCURRENTLY instead.
-- ============================================================

-- Student dashboard and history:
--   WHERE student_id = ? AND status = 'submitted' ORDER BY submitted_at DESC
CREATE INDEX IF NOT EXISTS idx_attempts_student_status_submitted
  ON public.attempts (student_id, status, submitted_at DESC);

-- Batch average for a paper, and the batch comparison matrix:
--   WHERE paper_id = ? AND batch_id = ? AND status = 'submitted'
CREATE INDEX IF NOT EXISTS idx_attempts_paper_batch_status
  ON public.attempts (paper_id, batch_id, status);

-- Revision, boosters and topic practice all draw from the active bank by
-- chapter, usually narrowing to a topic. A partial index keeps it small by
-- excluding inactive rows, which are never served.
CREATE INDEX IF NOT EXISTS idx_questions_active_chapter_topic
  ON public.questions (chapter, topic)
  WHERE is_active = true;

-- Same access pattern one level up, for subject-wide practice.
CREATE INDEX IF NOT EXISTS idx_questions_active_exam_subject
  ON public.questions (exam_id, subject)
  WHERE is_active = true;

-- "Has this student already seen these questions?" — now asked with an
-- explicit id list, so both columns matter.
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question_attempt
  ON public.attempt_answers (question_id, attempt_id);

ANALYZE public.attempts;
ANALYZE public.questions;
ANALYZE public.attempt_answers;
