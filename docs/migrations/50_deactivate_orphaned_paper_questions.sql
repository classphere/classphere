-- ============================================================
-- Migration: 50 — Deleting a global paper doesn't delete its questions
--
-- deleteTest and bulkDeleteGlobalTests (tests.controller.ts) have only ever
-- set papers.is_active = false. Every consumer that draws from the question
-- bank — createTest's "Auto-fill from bank" mode, getBankAvailability,
-- getBankQuestions, QuestionPicker, topic-wise practice — queries the
-- questions table directly, scoped by exam/subject/content_scope/
-- review_status, with no reference to which paper (if any) a question came
-- from. Deleting the paper a chapter's questions were uploaded under left
-- every one of those questions exactly as eligible as before: reported live,
-- a superadmin deleted a global chapter's paper, re-uploaded fresh content
-- for it, and the old questions were still being drawn from because nothing
-- had ever deactivated them.
--
-- This RPC deactivates a paper's questions when it's deleted — but only the
-- ones not also reachable through some OTHER still-active paper. Not every
-- question exists 1:1 with the paper it's listed under, so a blind
-- "deactivate everything paper_questions to this paper_id" would have
-- silently pulled the ground out from under whatever else still uses it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.deactivate_orphaned_paper_questions(p_paper_ids UUID[])
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH candidate_questions AS (
    SELECT DISTINCT pq.question_id
    FROM public.paper_questions pq
    WHERE pq.paper_id = ANY(p_paper_ids)
  ),
  still_referenced AS (
    SELECT DISTINCT pq2.question_id
    FROM public.paper_questions pq2
    JOIN public.papers p ON p.id = pq2.paper_id
    WHERE pq2.question_id IN (SELECT question_id FROM candidate_questions)
      AND NOT (pq2.paper_id = ANY(p_paper_ids))
      AND p.is_active = true
  )
  UPDATE public.questions
  SET is_active = false, updated_at = now()
  WHERE id IN (SELECT question_id FROM candidate_questions)
    AND id NOT IN (SELECT question_id FROM still_referenced)
    AND is_active = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

-- ─── One-time backfill ──────────────────────────────────────────────────────
-- Every global paper already deleted before this function existed left its
-- questions live. Scoped to institute_id IS NULL + delivery_mode =
-- 'public_practice' — how create_global_review_draft_with_questions and
-- bulkDeleteGlobalTests already identify a global paper — specifically so
-- this does not touch institute-scoped papers. Test Department's archive
-- (migration 49's neighbor, this session) is deliberately reversible and
-- leaves its questions alone; that design decision would be silently undone
-- here if archived institute papers were swept in too.
DO $$
DECLARE
  v_paper_ids UUID[];
  v_count INTEGER;
BEGIN
  SELECT array_agg(id) INTO v_paper_ids
  FROM public.papers
  WHERE is_active = false
    AND delivery_mode = 'public_practice'
    AND institute_id IS NULL;

  IF v_paper_ids IS NOT NULL THEN
    SELECT public.deactivate_orphaned_paper_questions(v_paper_ids) INTO v_count;
    RAISE NOTICE 'Backfill: deactivated % previously-orphaned questions from % already-deleted global papers.', v_count, array_length(v_paper_ids, 1);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
