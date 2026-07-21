-- Migration 29 — Question Discrepancy Reports
CREATE TABLE IF NOT EXISTS public.question_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID        NOT NULL,
  reported_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason       TEXT        NOT NULL,
  details      TEXT,
  status       TEXT        NOT NULL DEFAULT 'open',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_reports_question_id_idx ON public.question_reports (question_id);
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_reports_insert_student" ON public.question_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "question_reports_select_staff" ON public.question_reports
  FOR SELECT USING ((auth.jwt() ->> 'role') IN ('super_admin', 'teacher', 'editor'));
