-- ============================================================
-- Migration: 15 — Superadmin entitlements and atomic global uploads
-- Run after migrations 10 and 14.
-- ============================================================

-- A tenant can have historical subscription records, but only one record is
-- used for its current entitlement. These indexes support the auth check.
CREATE INDEX IF NOT EXISTS idx_subscriptions_entitlement_lookup
  ON public.institute_subscriptions (institute_id, status, current_period_end DESC);

-- The platform is currently trial-only. Give existing active institutes that
-- have no entitlement record one initial two-month trial, rather than locking
-- them out when the central entitlement guard is deployed. Existing trial and
-- paid records are intentionally left untouched.
INSERT INTO public.institute_subscriptions (
  institute_id, plan_tier, status, current_period_start, current_period_end
)
SELECT i.id, 'trial', 'trialing', now(), now() + interval '2 months'
FROM public.institutes i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.institute_subscriptions s
    WHERE s.institute_id = i.id
      AND s.status IN ('trialing', 'active')
  );

-- Atomically creates the global paper, its questions, and all paper links.
-- This prevents a failed upload from leaving orphaned question rows behind.
CREATE OR REPLACE FUNCTION public.create_global_paper_with_questions(
  p_exam_id UUID,
  p_test_type TEXT,
  p_title TEXT,
  p_subject TEXT,
  p_chapter TEXT,
  p_year INTEGER,
  p_shift TEXT,
  p_duration_min INTEGER,
  p_total_marks INTEGER,
  p_difficulty TEXT,
  p_created_by UUID,
  p_questions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paper_id UUID;
  v_question JSONB;
  v_question_id UUID;
  v_position INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_questions) <> 'array'
     OR jsonb_array_length(p_questions) = 0
     OR jsonb_array_length(p_questions) > 500 THEN
    RAISE EXCEPTION 'A global upload must contain between 1 and 500 questions';
  END IF;

  INSERT INTO public.papers (
    exam_id, test_type, title, subject, chapter, year, shift,
    total_questions, total_marks, duration_min, difficulty,
    is_active, is_published, delivery_mode, created_by
  ) VALUES (
    p_exam_id, p_test_type, p_title, NULLIF(p_subject, ''), NULLIF(p_chapter, ''),
    p_year, NULLIF(p_shift, ''), jsonb_array_length(p_questions), p_total_marks,
    p_duration_min, p_difficulty, true, true, 'public_practice', p_created_by
  ) RETURNING id INTO v_paper_id;

  FOR v_question IN SELECT value FROM jsonb_array_elements(p_questions)
  LOOP
    IF NULLIF(btrim(COALESCE(v_question ->> 'question_text', '')), '') IS NULL
       OR jsonb_typeof(COALESCE(v_question -> 'correct_answer', 'null'::jsonb)) <> 'array'
       OR jsonb_array_length(v_question -> 'correct_answer') = 0 THEN
      RAISE EXCEPTION 'Every question must contain question_text and correct_answer';
    END IF;

    v_position := v_position + 1;
    v_question_id := (v_question ->> 'id')::UUID;

    INSERT INTO public.questions (
      id, exam_id, test_type, subject, chapter, topic, difficulty, year, source,
      question_type, question_text, image_url, options, correct_answer,
      explanation, tags, is_active
    ) VALUES (
      v_question_id, p_exam_id, p_test_type,
      COALESCE(NULLIF(v_question ->> 'subject', ''), NULLIF(p_subject, ''), 'General'),
      COALESCE(NULLIF(v_question ->> 'chapter', ''), NULLIF(p_chapter, ''), 'General'),
      NULLIF(v_question ->> 'topic', ''),
      COALESCE(NULLIF(v_question ->> 'difficulty', ''), p_difficulty),
      NULLIF(v_question ->> 'year', '')::INTEGER,
      COALESCE(NULLIF(v_question ->> 'source', ''), p_title),
      COALESCE(NULLIF(v_question ->> 'question_type', ''), 'mcq_single'),
      v_question ->> 'question_text',
      NULLIF(v_question ->> 'image_url', ''),
      COALESCE(v_question -> 'options', '[]'::jsonb),
      v_question -> 'correct_answer',
      NULLIF(v_question ->> 'explanation', ''),
      COALESCE(v_question -> 'tags', '[]'::jsonb),
      true
    );

    INSERT INTO public.paper_questions (paper_id, question_id, position)
    VALUES (v_paper_id, v_question_id, v_position);
  END LOOP;

  RETURN v_paper_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_global_paper_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_global_paper_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB
) TO service_role;
