-- ============================================================
-- Migration: 55 — A superadmin's own question-bank upload is already reviewed
--
-- create_global_review_draft_with_questions has written every global question
-- as review_status = 'draft' since migration 48. Every consumer of the bank
-- reads approved questions only — getBankQuestions and getBankAvailability
-- (the institute's QuestionPicker), createTest's auto-fill from bank,
-- listQuestions (the teacher's DPP browse), and topic-wise practice — and
-- nothing in the product could ever move a global question out of 'draft':
-- the single writer of review_status = 'approved' is the Test Department's
-- approve step, scoped `.eq("institute_id", instituteId)`, and a global
-- question's institute_id is NULL by the questions_scope_owner_check
-- constraint. publishTest published the *paper* and left its questions
-- untouched.
--
-- The effect, reported live: a superadmin uploads a large global bank, sees it
-- on the superadmin question-bank screen (that screen is deliberately exempt
-- from the approved filter — reviewing drafts is the job there), and finds it
-- nowhere else in the product, with no action available anywhere that would
-- have fixed it. Questions uploaded before migration 22 were never affected,
-- because that migration added the column with DEFAULT 'approved' and so
-- grandfathered in everything that already existed.
--
-- A JSON bank a superadmin assembles and uploads deliberately IS the reviewed
-- artefact; there is nobody upstream of them to review it. The AI extractor is
-- the one real exception — a model read those questions off a PDF and no
-- person has seen them yet — so review_status becomes a parameter rather than
-- being dropped, and the two upload paths pass what they mean.
--
-- p_extracted_from_pdf rides along because the same call site is the only
-- place that knows it: migration 52 added the column so validatePaperQuestions
-- could tell an exam-pattern mismatch that means "extraction dropped
-- questions" from one that means "this paper is deliberately 80 questions",
-- and the global extractor path never set it.
-- ============================================================

-- Dropped rather than CREATE OR REPLACE'd: adding parameters changes the
-- signature, which would leave the 13-argument version in place alongside the
-- new one and make an old-shaped call ambiguous instead of failing loudly.
DROP FUNCTION IF EXISTS public.create_global_review_draft_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB, JSONB
);

-- And the 12-argument version from migrations 22/31, which is almost certainly
-- still sitting in the database: migration 46 added p_marking_scheme through
-- CREATE OR REPLACE, and adding a parameter creates a second function rather
-- than replacing the first. It has been dead since 46 — every call names
-- p_marking_scheme — but it is a SECURITY DEFINER function that writes global
-- content, and leaving stale overloads around is how a call silently resolves
-- to the wrong one.
DROP FUNCTION IF EXISTS public.create_global_review_draft_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB
);

CREATE FUNCTION public.create_global_review_draft_with_questions(
  p_exam_id UUID, p_test_type TEXT, p_title TEXT, p_subject TEXT, p_chapter TEXT,
  p_year INTEGER, p_shift TEXT, p_duration_min INTEGER, p_total_marks INTEGER,
  p_difficulty TEXT, p_created_by UUID, p_questions JSONB,
  p_marking_scheme JSONB DEFAULT NULL,
  -- Defaults describe the AI-extractor path, so a caller that says nothing
  -- gets the cautious behaviour this function has always had.
  p_review_status TEXT DEFAULT 'draft',
  p_extracted_from_pdf BOOLEAN DEFAULT false
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

  -- questions_review_status_check would catch a bad value per row, 2000 rows
  -- into the loop, having already written the paper. Checked once, up front.
  IF p_review_status NOT IN ('draft', 'needs_review', 'changes_requested', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review_status: %', p_review_status;
  END IF;

  INSERT INTO public.papers (
    exam_id, test_type, title, subject, chapter, year, shift, total_questions,
    total_marks, duration_min, difficulty, marking_scheme, is_active, is_published,
    delivery_mode, created_by, workflow_status, extracted_from_pdf
  ) VALUES (
    p_exam_id, p_test_type, p_title, NULLIF(p_subject, ''), NULLIF(p_chapter, ''),
    p_year, NULLIF(p_shift, ''), jsonb_array_length(p_questions), p_total_marks,
    p_duration_min, p_difficulty, p_marking_scheme, true, false, 'public_practice',
    p_created_by, 'draft', p_extracted_from_pdf
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

    -- Always a fresh id: this path only ever creates new rows, and honoring a
    -- client-supplied id risks colliding with a row the same file already
    -- inserted on an earlier, partially-successful attempt.
    v_question_id := gen_random_uuid();

    INSERT INTO public.questions (
      id, exam_id, test_type, subject, chapter, topic, difficulty, year, source,
      question_type, question_text, question_images, options, correct_answer,
      explanation, explanation_images, marks, tags, is_active, content_scope,
      review_status, created_by, content_blocks, extraction_metadata,
      extractor_version, source_crop_url, source_reference, reviewed_by, reviewed_at
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
      true, 'global', p_review_status, p_created_by,
      CASE WHEN jsonb_typeof(v_question -> 'content_blocks') = 'array'
        THEN v_question -> 'content_blocks' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_question -> 'extraction_metadata') = 'object'
        THEN v_question -> 'extraction_metadata' ELSE NULL END,
      NULLIF(v_question ->> 'extractor_version', ''),
      NULLIF(v_question ->> 'source_crop_url', ''),
      CASE WHEN jsonb_typeof(v_question -> 'source_reference') = 'object'
        THEN v_question -> 'source_reference' ELSE '{}'::jsonb END,
      -- Who reviewed it and when, recorded only when it actually arrives
      -- reviewed. The uploader is the reviewer on that path.
      CASE WHEN p_review_status = 'approved' THEN p_created_by ELSE NULL END,
      CASE WHEN p_review_status = 'approved' THEN now() ELSE NULL END
    );

    INSERT INTO public.paper_questions (paper_id, question_id, position)
      VALUES (v_paper_id, v_question_id, v_position);
  END LOOP;

  RETURN v_paper_id;
END; $$;

-- Migration 22 revoked this from PUBLIC and granted it to service_role alone;
-- 31 repeated that, and 46/48/49 quietly dropped it, so the current function is
-- executable by anyone holding an anon or authenticated JWT — a SECURITY
-- DEFINER path that writes global question-bank content. Restored here. The API
-- calls it with the service key, which is the only caller there has ever been.
REVOKE ALL ON FUNCTION public.create_global_review_draft_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB, JSONB, TEXT, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_global_review_draft_with_questions(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT, UUID, JSONB, JSONB, TEXT, BOOLEAN
) TO service_role;

-- ─── One-time backfill ──────────────────────────────────────────────────────
-- Every global question uploaded since migration 48 is sitting in 'draft' and
-- is invisible to the whole product. There is no column that separates the
-- ones that came from the AI extractor from the ones a superadmin uploaded as
-- JSON: extracted_from_pdf defaults false for every existing row and only
-- starts being written truthfully from this migration on, and the payload
-- fingerprints (extractor_version, source_crop_url) appear on both paths,
-- because the JSON files being uploaded are themselves produced by the
-- offline extraction pipeline.
--
-- So this approves all of them. Anything genuinely mid-review in the
-- extractor's queue right now becomes visible in the bank too — the trade is
-- deliberate and stated: leaving them out would mean leaving the reported
-- problem unfixed for an unknown share of the bank, and a question that turns
-- out to be wrong can be sent back from the review screen. Restricted to
-- is_active = true so the questions migrations 50 and 51 deliberately
-- deactivated stay deactivated.
DO $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.questions
  SET review_status = 'approved', updated_at = now()
  WHERE content_scope = 'global'
    AND is_active = true
    AND review_status = 'draft';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfill: approved % global questions that were stranded as drafts.', v_count;
END $$;

NOTIFY pgrst, 'reload schema';
