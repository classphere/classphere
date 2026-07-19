-- ============================================================
-- Migration: 11 — Persistent student revision queue
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_revision_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exam_code         TEXT NOT NULL,
  subject           TEXT NOT NULL DEFAULT '',
  chapter           TEXT NOT NULL DEFAULT '',
  topic             TEXT NOT NULL DEFAULT '',
  task_type         TEXT NOT NULL CHECK (task_type IN ('mistake_review', 'targeted_practice', 'study_plan')),
  title             TEXT NOT NULL,
  description       TEXT,
  duration_minutes  INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes > 0),
  source_attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  due_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, exam_code, subject, chapter, topic, task_type)
);

CREATE INDEX IF NOT EXISTS idx_student_revision_tasks_queue
  ON public.student_revision_tasks(student_id, status, due_at);

ALTER TABLE public.student_revision_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_manage_own_revision_tasks"
  ON public.student_revision_tasks
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- The API performs ownership checks with its service-role database client.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_revision_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_revision_tasks TO authenticated;
