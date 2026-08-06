-- ============================================================
-- Migration: 34 — Spaced repetition state per topic
--
-- Students forget Class 11 chapters long before the exam. This table drives a
-- daily revision set that brings a topic back at widening intervals.
--
-- The scheduled unit is a TOPIC, not a question. Re-showing the same question
-- teaches the answer; re-testing the same topic with a fresh question from the
-- bank teaches the method, which is what the exam actually measures.
--
-- Distinct from student_revision_tasks: that table holds one-off tasks that are
-- completed once (unique per topic + task_type). This one holds long-lived
-- scheduling state that repeats for the life of the student's preparation.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_topic_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exam_code         TEXT NOT NULL,
  subject           TEXT NOT NULL DEFAULT '',
  chapter           TEXT NOT NULL DEFAULT '',
  topic             TEXT NOT NULL DEFAULT '',

  -- ── SM-2 style scheduling state ──────────────────────────────────────────
  -- Days until the next review. 0 means "not yet scheduled".
  interval_days     INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  -- Ease factor: how fast intervals grow for this student on this topic.
  -- Floored at 1.3 as in SM-2, so a chronically weak topic keeps coming back.
  ease              REAL NOT NULL DEFAULT 2.5 CHECK (ease >= 1.3),
  -- Consecutive successful reviews. Reset to 0 on a lapse.
  repetitions       INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  -- Lifetime count of failed reviews — a durable "this topic is hard for them"
  -- signal that survives the repetitions reset.
  lapses            INTEGER NOT NULL DEFAULT 0 CHECK (lapses >= 0),

  last_accuracy     INTEGER CHECK (last_accuracy BETWEEN 0 AND 100),
  last_reviewed_at  TIMESTAMPTZ,
  due_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(student_id, exam_code, chapter, topic)
);

-- The daily query is "what is due for this student right now, soonest first".
CREATE INDEX IF NOT EXISTS idx_topic_reviews_due
  ON public.student_topic_reviews(student_id, due_at);

-- Supports "which topics does this student keep failing" without scanning.
CREATE INDEX IF NOT EXISTS idx_topic_reviews_lapses
  ON public.student_topic_reviews(student_id, lapses DESC)
  WHERE lapses > 0;

ALTER TABLE public.student_topic_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read their own topic reviews" ON public.student_topic_reviews;
CREATE POLICY "Students read their own topic reviews" ON public.student_topic_reviews
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- Writes go through the service role only: the schedule is derived from measured
-- performance, so a client must not be able to mark a topic as revised.
GRANT SELECT ON public.student_topic_reviews TO authenticated;
