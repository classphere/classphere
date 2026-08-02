-- ============================================================
-- Migration: 46 — Marking scheme on the paper
--
-- Scoring carried one flat scheme for an entire paper —
-- { correct: 4, incorrect: -1, unattempted: 0 } hardcoded at attempt creation
-- and applied to every question. That is true of NEET and of JEE Main, and
-- false of JEE Advanced, where a single-correct question is +3/-1, a
-- multiple-correct one is +4/-2 with partial credit for choosing some of the
-- correct options, and a numerical carries no negative marking at all.
--
-- The scheme belongs to the paper rather than to the exam because Advanced
-- changes it between years. Storing it per paper means a 2019 paper and a 2024
-- paper each keep their own rules, and re-scoring an old attempt gives the
-- same answer it gave at the time.
--
-- NULL means "use the exam's default", which exists for NEET and JEE Main and
-- deliberately does not for Advanced — see marking-scheme.ts.
-- ============================================================

ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS marking_scheme JSONB;

COMMENT ON COLUMN public.papers.marking_scheme IS
  'Marks per question type, e.g. {"mcq_single":{"correct":3,"incorrect":-1},"mcq_multi":{"correct":4,"incorrect":-2,"partial":"per_correct_option"}}. NULL falls back to the exam default. Stored per paper because JEE Advanced changes its scheme between years.';

-- ─── Per-question override ───────────────────────────────────────────────────
--
-- The paper's scheme keys on question type, which holds within a paper in most
-- years: Advanced sections are defined by type. It breaks when one paper has
-- two sections of the same type scored differently, which does happen and
-- cannot be expressed by type alone.
--
-- NULL for essentially every question. Nothing in NEET or JEE Main needs it.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS marks JSONB;

COMMENT ON COLUMN public.questions.marks IS
  'Overrides the paper marking_scheme for this question alone, e.g. {"correct":4,"incorrect":-2}. NULL means use the paper scheme for this question type. Needed only where one paper scores two sections of the same type differently.';

-- ─── Backfill the uniform exams ──────────────────────────────────────────────
--
-- Every existing paper was scored +4/-1 on every question, so recording that
-- explicitly changes nothing about how they score — it only makes the rule
-- visible, and stops a future default change silently re-scoring old attempts.

UPDATE public.papers p
SET marking_scheme = '{"default": {"correct": 4, "incorrect": -1, "unattempted": 0}}'::jsonb
FROM public.exams e
WHERE e.id = p.exam_id
  AND p.marking_scheme IS NULL
  AND e.code IN ('neet-ug', 'jee-main', 'jee-main-advanced');

-- ─── Verify ──────────────────────────────────────────────────────────────────
-- Advanced papers are expected to remain NULL until each states its scheme.

SELECT e.code                                              AS exam,
       count(*)                                            AS papers,
       count(*) FILTER (WHERE p.marking_scheme IS NOT NULL) AS with_scheme
FROM public.papers p
JOIN public.exams e ON e.id = p.exam_id
GROUP BY e.code
ORDER BY e.code;

-- ─── Redefine the upload RPC ─────────────────────────────────────────────────
--
-- Three changes, all of which the application already assumes:
--
--   * The INSERT lists image_url and neither question_images nor
--     explanation_images, so every figure the ingest computed was discarded at
--     this boundary. The arrays are what carry figures now; image_url is
--     dropped by migration 45 and referencing it here would break this
--     function the moment that runs.
--
--   * p_marking_scheme records how the paper is scored, so an Advanced paper
--     keeps the rules it was set with rather than inheriting whatever the
--     default happens to be when someone re-scores it years later.
--
--   * total_marks arrives already summed from the questions' own types.
--
-- Everything else is unchanged from migration 31.

CREATE OR REPLACE FUNCTION public.create_global_review_draft_with_questions(
  p_exam_id UUID, p_test_type TEXT, p_title TEXT, p_subject TEXT, p_chapter TEXT,
  p_year INTEGER, p_shift TEXT, p_duration_min INTEGER, p_total_marks INTEGER,
  p_difficulty TEXT, p_created_by UUID, p_questions JSONB,
  p_marking_scheme JSONB DEFAULT NULL
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
    total_marks, duration_min, difficulty, marking_scheme, is_active, is_published,
    delivery_mode, created_by, workflow_status
  ) VALUES (
    p_exam_id, p_test_type, p_title, NULLIF(p_subject, ''), NULLIF(p_chapter, ''),
    p_year, NULLIF(p_shift, ''), jsonb_array_length(p_questions), p_total_marks,
    p_duration_min, p_difficulty, p_marking_scheme, true, false, 'public_practice',
    p_created_by, 'draft'
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
      question_type, question_text, question_images, options, correct_answer,
      explanation, explanation_images, marks, tags, is_active, content_scope,
      review_status, created_by, content_blocks, extraction_metadata,
      extractor_version, source_crop_url, source_reference
    ) VALUES (
      v_question_id, p_exam_id, p_test_type,
      COALESCE(NULLIF(v_question ->> 'subject', ''), NULLIF(p_subject, ''), 'Unclassified'),
      COALESCE(NULLIF(v_question ->> 'chapter', ''), NULLIF(p_chapter, ''), 'General'),
      NULLIF(v_question ->> 'topic', ''),
      COALESCE(NULLIF(v_question ->> 'difficulty', ''), p_difficulty),
      NULLIF(v_question ->> 'year', '')::INTEGER,
      COALESCE(NULLIF(v_question ->> 'source', ''), p_title),
      COALESCE(NULLIF(v_question ->> 'question_type', ''), 'mcq_single'),
      v_question ->> 'question_text',
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

-- The old 12-argument signature would otherwise linger beside the new one and
-- be chosen whenever a caller omits the scheme.
DROP FUNCTION IF EXISTS public.create_global_review_draft_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB
);

NOTIFY pgrst, 'reload schema';
