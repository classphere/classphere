-- ============================================================
-- Migration 31 — Ordered question content and extraction provenance
-- ============================================================
-- Additive and regression-safe:
--   * Existing rows are not rewritten.
--   * Existing question_text/image_url/options remain the compatibility API.
--   * Structured content is nullable and used only by extractor v4 records.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS content_blocks JSONB,
  ADD COLUMN IF NOT EXISTS extraction_metadata JSONB,
  ADD COLUMN IF NOT EXISTS extractor_version TEXT,
  ADD COLUMN IF NOT EXISTS source_crop_url TEXT;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_content_blocks_array_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_content_blocks_array_check CHECK (
  content_blocks IS NULL OR jsonb_typeof(content_blocks) = 'array'
);

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_extraction_metadata_object_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_extraction_metadata_object_check CHECK (
  extraction_metadata IS NULL OR jsonb_typeof(extraction_metadata) = 'object'
);

CREATE INDEX IF NOT EXISTS idx_questions_extractor_version
  ON public.questions(extractor_version)
  WHERE extractor_version IS NOT NULL;

COMMENT ON COLUMN public.questions.content_blocks IS
  'Ordered v4 blocks for markdown, math, images, diagrams, tables, and source-crop fallbacks. Legacy fields remain populated.';
COMMENT ON COLUMN public.questions.extraction_metadata IS
  'Extraction profile, confidence, review flags, and source-page provenance for reviewer tooling.';
COMMENT ON COLUMN public.questions.extractor_version IS
  'Extractor contract that produced the structured fields. NULL means legacy behavior.';
COMMENT ON COLUMN public.questions.source_crop_url IS
  'Lossless source crop shown when structured extraction is uncertain or an asset fails.';

-- Keep the established global draft RPC signature while persisting optional v4
-- fields. Callers using the legacy payload continue to insert NULL v4 columns.
CREATE OR REPLACE FUNCTION public.create_global_review_draft_with_questions(
  p_exam_id UUID, p_test_type TEXT, p_title TEXT, p_subject TEXT, p_chapter TEXT,
  p_year INTEGER, p_shift TEXT, p_duration_min INTEGER, p_total_marks INTEGER,
  p_difficulty TEXT, p_created_by UUID, p_questions JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paper_id UUID; v_question JSONB; v_question_id UUID; v_position INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_questions) <> 'array'
     OR jsonb_array_length(p_questions) = 0
     OR jsonb_array_length(p_questions) > 500 THEN
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
    IF v_question ? 'content_blocks'
       AND v_question -> 'content_blocks' IS NOT NULL
       AND v_question -> 'content_blocks' <> 'null'::jsonb
       AND jsonb_typeof(v_question -> 'content_blocks') <> 'array' THEN
      RAISE EXCEPTION 'content_blocks must be a JSON array when supplied';
    END IF;
    IF v_question ? 'extraction_metadata'
       AND v_question -> 'extraction_metadata' IS NOT NULL
       AND v_question -> 'extraction_metadata' <> 'null'::jsonb
       AND jsonb_typeof(v_question -> 'extraction_metadata') <> 'object' THEN
      RAISE EXCEPTION 'extraction_metadata must be a JSON object when supplied';
    END IF;

    v_position := v_position + 1;
    v_question_id := (v_question ->> 'id')::UUID;

    INSERT INTO public.questions (
      id, exam_id, test_type, subject, chapter, topic, difficulty, year, source,
      question_type, question_text, image_url, options, correct_answer, explanation,
      tags, is_active, content_scope, review_status, created_by,
      content_blocks, extraction_metadata, extractor_version, source_crop_url,
      source_reference
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
      COALESCE(v_question -> 'correct_answer', '[]'::jsonb),
      NULLIF(v_question ->> 'explanation', ''),
      COALESCE(v_question -> 'tags', '[]'::jsonb),
      true, 'global', 'draft', p_created_by,
      CASE WHEN jsonb_typeof(v_question -> 'content_blocks') = 'array'
        THEN v_question -> 'content_blocks' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_question -> 'extraction_metadata') = 'object'
        THEN v_question -> 'extraction_metadata' ELSE NULL END,
      NULLIF(v_question ->> 'extractor_version', ''),
      NULLIF(v_question ->> 'source_crop_url', ''),
      CASE WHEN jsonb_typeof(v_question -> 'source_reference') = 'object'
        THEN v_question -> 'source_reference' ELSE '{}'::jsonb END
    );

    INSERT INTO public.paper_questions (paper_id, question_id, position)
      VALUES (v_paper_id, v_question_id, v_position);
  END LOOP;

  RETURN v_paper_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_global_review_draft_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_global_review_draft_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB
) TO service_role;
