-- ============================================================
-- Migration: 51 — Migration 50's backfill scope was too narrow
--
-- Migration 50's one-time backfill selected "already-deleted global papers"
-- as is_active = false AND delivery_mode = 'public_practice' AND
-- institute_id IS NULL. That matches every paper the global-upload RPC and
-- bulkDeleteGlobalTests's own eligibility check produce, but not every
-- deleted global paper actually in the table: reported live, a Test Head
-- account was still seeing ~3000 Physics/Chemistry/Math/Biology questions
-- under a JEE Main batch after running migration 50. Traced to papers
-- titled "mock", "helloo", "digital test" — old dev/test content, correctly
-- is_active: false, but with delivery_mode: 'assigned_scheduled' instead of
-- 'public_practice'. institute_id IS NULL is the real, sufficient signal
-- that a paper is global — no institute has ever owned it — and delivery_mode
-- was never a safe second gate on top of that.
--
-- This migration is a record of a cleanup already run directly against
-- production via the RPC (2739 questions deactivated, verified against the
-- exact counts reported) rather than through a file, since the fix couldn't
-- wait on a review-and-approve round trip. Running it again is a safe no-op:
-- deactivate_orphaned_paper_questions only touches rows that are currently
-- is_active = true, so anything it already caught simply won't match twice.
-- ============================================================

DO $$
DECLARE
  v_paper_ids UUID[];
  v_count INTEGER;
BEGIN
  SELECT array_agg(id) INTO v_paper_ids
  FROM public.papers
  WHERE is_active = false
    AND institute_id IS NULL;

  IF v_paper_ids IS NOT NULL THEN
    SELECT public.deactivate_orphaned_paper_questions(v_paper_ids) INTO v_count;
    RAISE NOTICE 'Backfill (corrected scope): deactivated % previously-orphaned questions from % already-deleted global papers.', v_count, array_length(v_paper_ids, 1);
  END IF;
END $$;
