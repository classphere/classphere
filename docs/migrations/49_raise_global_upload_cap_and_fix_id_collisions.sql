-- ============================================================
-- Migration: 49 — Raise the global upload cap, stop trusting client ids
--
-- create_global_review_draft_with_questions (migration 48) had its own
-- hardcoded "> 500" check, separate from the Node-level cap in
-- superadmin.controller.ts. Raising the Node cap to 2000 (commit b8974ff)
-- did nothing for this: the RPC still rejected any chapter over 500
-- questions with "A global upload must contain between 1 and 500
-- questions" before the Node check was ever reached. Raised here to match.
--
-- Separately, the function inserted questions using the id the client sent
-- in the payload verbatim. That id is minted once by normalize_json.py at
-- extraction time and baked into the JSON file, so resubmitting a file
-- that already landed successfully in an earlier upload attempt — exactly
-- what happens when a superadmin retries a batch after some files in it
-- already succeeded — collides on questions_pkey. This is a "create a new
-- draft" operation; there is no reason to honor a caller-supplied primary
-- key here at all, so the function now always mints its own.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_global_review_draft_with_questions(
  p_exam_id UUID, p_test_type TEXT, p_title TEXT, p_subject TEXT, p_chapter TEXT,
  p_year INTEGER, p_shift TEXT, p_duration_min INTEGER, p_total_marks INTEGER,
  p_difficulty TEXT, p_created_by UUID, p_questions JSONB,
  p_marking_scheme JSONB DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_paper_id UUID; v_question JSONB; v_question_id UUID;
  v_position INTEGER := 0; v_stated INTEGER; v_is_gap BOOLEAN;
BEGIN
  IF jsonb_typeof(p_questions) <> 'array'
     OR jsonb_array_length(p_questions) = 0
     OR jsonb_array_length(p_questions) > 2000 THEN
    RAISE EXCEPTION 'A global upload must contain between 1 and 2000 questions';
  END IF;

  INSERT INTO public.papers (
    exam_id, test_type, title, subject, chapter, year, shift, total_questions,
    total_marks, duration_min, difficulty, marking_scheme, is_active, is_published,
    delivery_mode, created_by, workflow_status
  ) VALUES (
    p_exam_id, p_test_type, p_title, NULLIF(p_subject, ''), NULLIF(p_chapter, ''),
    p_year, NULLIF(p_shift, ''), jsonb_array_length(p_questions), p_total_marks,
    p_duration_min, p_difficulty, p_marking_scheme, true, false, 'public_practice',
    p_created_by, 'draft'
  ) RETURNING id INTO v_paper_id;

  FOR v_question IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
    v_is_gap := COALESCE((v_question ->> 'is_gap')::BOOLEAN, false);

    -- A gap is a slot a reviewer still has to fill, so it is allowed to be
    -- empty. Everything else must carry its text.
    IF NOT v_is_gap
       AND NULLIF(btrim(COALESCE(v_question ->> 'question_text', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Every question must contain question_text (or be marked is_gap)';
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

    -- The paper's own numbering wins where the payload states it. Falling back
    -- to a running counter keeps banks that do not number their questions
    -- working exactly as before.
    v_stated := NULLIF(v_question ->> 'question_number', '')::INTEGER;
    IF v_stated IS NOT NULL AND v_stated > 0 THEN
      v_position := v_stated;
    ELSE
      v_position := v_position + 1;
    END IF;

    -- Always a fresh id: this path only ever creates new draft rows, and
    -- honoring a client-supplied id risks colliding with a row the same
    -- file already inserted on an earlier, partially-successful attempt.
    v_question_id := gen_random_uuid();

    INSERT INTO public.questions (
      id, exam_id, test_type, subject, chapter, topic, difficulty, year, source,
      question_type, question_text, question_images, options, correct_answer,
      explanation, explanation_images, marks, tags, is_active, content_scope,
      review_status, created_by, content_blocks, extraction_metadata,
      extractor_version, source_crop_url, source_reference
    ) VALUES (
      v_question_id, p_exam_id, p_test_type,
      COALESCE(NULLIF(v_question ->> 'subject', ''), NULLIF(p_subject, ''), 'Unclassified'),
      COALESCE(NULLIF(v_question ->> 'chapter', ''), NULLIF(p_chapter, ''), 'General'),
      NULLIF(v_question ->> 'topic', ''),
      COALESCE(NULLIF(v_question ->> 'difficulty', ''), p_difficulty, 'medium'),
      NULLIF(v_question ->> 'year', '')::INTEGER,
      COALESCE(NULLIF(v_question ->> 'source', ''), p_title),
      COALESCE(NULLIF(v_question ->> 'question_type', ''), 'mcq_single'),
      COALESCE(v_question ->> 'question_text', ''),
      CASE WHEN jsonb_typeof(v_question -> 'question_images') = 'array'
        THEN v_question -> 'question_images' ELSE '[]'::jsonb END,
      COALESCE(v_question -> 'options', '[]'::jsonb),
      COALESCE(v_question -> 'correct_answer', '[]'::jsonb),
      NULLIF(v_question ->> 'explanation', ''),
      CASE WHEN jsonb_typeof(v_question -> 'explanation_images') = 'array'
        THEN v_question -> 'explanation_images' ELSE '[]'::jsonb END,
      CASE WHEN jsonb_typeof(v_question -> 'marks') = 'object'
        THEN v_question -> 'marks' ELSE NULL END,
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

NOTIFY pgrst, 'reload schema';
