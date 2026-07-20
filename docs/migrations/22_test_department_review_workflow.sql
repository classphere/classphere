-- ============================================================
-- Migration 22 — Test Department roles and reviewed test workflow
-- ============================================================
-- Run after migration 21. This migration is additive: existing live papers
-- remain live, while all new institute uploads can use the review workflow.

-- Two dedicated institute-scoped roles.  A head can approve/publish; members
-- can prepare and submit drafts.
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN (
    'student', 'teacher', 'institute_admin', 'super_admin',
    'test_department_head', 'test_department_member'
  ));

CREATE TABLE IF NOT EXISTS public.test_department_members (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_department_members_institute
  ON public.test_department_members(institute_id, is_active);

-- Paper workflow and tenancy. `is_published` remains the final learner-access
-- gate; workflow_status records the operational state before publication.
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS review_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_pdf_key TEXT,
  ADD COLUMN IF NOT EXISTS source_page_map JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.papers DROP CONSTRAINT IF EXISTS papers_workflow_status_check;
ALTER TABLE public.papers ADD CONSTRAINT papers_workflow_status_check CHECK (
  workflow_status IN ('draft', 'needs_review', 'changes_requested', 'approved', 'scheduled', 'published', 'archived')
);

UPDATE public.papers
SET workflow_status = CASE
  WHEN is_active = false THEN 'archived'
  WHEN is_published = true THEN 'published'
  ELSE 'draft'
END
WHERE workflow_status = 'draft';

CREATE INDEX IF NOT EXISTS idx_papers_institute_workflow
  ON public.papers(institute_id, workflow_status, created_at DESC);

-- Questions created by an institute are private to that institute. Existing
-- canonical questions remain global (`content_scope = global`, institute_id NULL).
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content_scope TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_reference JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_content_scope_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_content_scope_check CHECK (
  content_scope IN ('global', 'institute_private')
);
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_review_status_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_review_status_check CHECK (
  review_status IN ('draft', 'needs_review', 'changes_requested', 'approved', 'rejected')
);
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_scope_owner_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_scope_owner_check CHECK (
  (content_scope = 'global' AND institute_id IS NULL) OR
  (content_scope = 'institute_private' AND institute_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_questions_institute_review
  ON public.questions(institute_id, review_status, updated_at DESC)
  WHERE institute_id IS NOT NULL;

-- Append-only operational audit trail. Store only the changed fields in the
-- before/after payloads; never store credentials or raw student submissions.
CREATE TABLE IF NOT EXISTS public.test_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  reason TEXT,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_test_review_events_paper
  ON public.test_review_events(paper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_review_events_question
  ON public.test_review_events(question_id, created_at DESC);

ALTER TABLE public.test_department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_review_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_department_members TO service_role;
GRANT SELECT, INSERT ON public.test_review_events TO service_role;

-- Global uploads use the same review-first guarantee. This deliberately does
-- not replace the legacy create_global_paper_with_questions function because
-- production installations may still depend on it.
CREATE OR REPLACE FUNCTION public.create_global_review_draft_with_questions(
  p_exam_id UUID, p_test_type TEXT, p_title TEXT, p_subject TEXT, p_chapter TEXT,
  p_year INTEGER, p_shift TEXT, p_duration_min INTEGER, p_total_marks INTEGER,
  p_difficulty TEXT, p_created_by UUID, p_questions JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paper_id UUID; v_question JSONB; v_question_id UUID; v_position INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_questions) <> 'array' OR jsonb_array_length(p_questions) = 0 OR jsonb_array_length(p_questions) > 500 THEN
    RAISE EXCEPTION 'A global upload must contain between 1 and 500 questions';
  END IF;
  INSERT INTO public.papers (
    exam_id, test_type, title, subject, chapter, year, shift, total_questions,
    total_marks, duration_min, difficulty, is_active, is_published, delivery_mode,
    created_by, workflow_status
  ) VALUES (
    p_exam_id, p_test_type, p_title, NULLIF(p_subject, ''), NULLIF(p_chapter, ''),
    p_year, NULLIF(p_shift, ''), jsonb_array_length(p_questions), p_total_marks,
    p_duration_min, p_difficulty, true, false, 'public_practice', p_created_by, 'draft'
  ) RETURNING id INTO v_paper_id;
  FOR v_question IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
    IF NULLIF(btrim(COALESCE(v_question ->> 'question_text', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Every question must contain question_text';
    END IF;
    v_position := v_position + 1; v_question_id := (v_question ->> 'id')::UUID;
    INSERT INTO public.questions (
      id, exam_id, test_type, subject, chapter, topic, difficulty, year, source,
      question_type, question_text, image_url, options, correct_answer, explanation,
      tags, is_active, content_scope, review_status, created_by
    ) VALUES (
      v_question_id, p_exam_id, p_test_type,
      COALESCE(NULLIF(v_question ->> 'subject', ''), NULLIF(p_subject, ''), 'General'),
      COALESCE(NULLIF(v_question ->> 'chapter', ''), NULLIF(p_chapter, ''), 'General'),
      NULLIF(v_question ->> 'topic', ''), COALESCE(NULLIF(v_question ->> 'difficulty', ''), p_difficulty),
      NULLIF(v_question ->> 'year', '')::INTEGER, COALESCE(NULLIF(v_question ->> 'source', ''), p_title),
      COALESCE(NULLIF(v_question ->> 'question_type', ''), 'mcq_single'), v_question ->> 'question_text',
      NULLIF(v_question ->> 'image_url', ''), COALESCE(v_question -> 'options', '[]'::jsonb),
      v_question -> 'correct_answer', NULLIF(v_question ->> 'explanation', ''),
      COALESCE(v_question -> 'tags', '[]'::jsonb), true, 'global', 'draft', p_created_by
    );
    INSERT INTO public.paper_questions (paper_id, question_id, position) VALUES (v_paper_id, v_question_id, v_position);
  END LOOP;
  RETURN v_paper_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_global_review_draft_with_questions(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_global_review_draft_with_questions(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB) TO service_role;
