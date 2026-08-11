-- ═══════════════════════════════════════════════════════════════════════════
-- 53. Archiving a batch is a departure, not a disappearance
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Deactivating a batch set batches.is_active = false and did nothing else. The
-- batch then vanished from every screen — listBatches filters on is_active and
-- there is no archive view — while batch_students kept every row with
-- left_at NULL. The record therefore claimed the students were still enrolled
-- in a batch nobody could see, and:
--
--   • roster and billing rollups both require b.is_active, so the institute's
--     student total silently dropped;
--   • getStudentExamCodes skips inactive batches, so students lost question and
--     DPP access with nothing recording why;
--   • under the one-active-batch index from migration 51 those students still
--     hold a live enrolment, so they cannot be added elsewhere — and the bulk
--     move UI picks its source from the batch list, which no longer shows the
--     batch they are in.
--
-- Archiving now writes left_at for the roster, which is what it always meant.
-- Two columns make that reversible rather than destructive:
--
--   batches.archived_at        — when, so an archive is distinguishable from a
--                                batch that was never active
--   batch_students.left_reason — why, so restoring a batch can put back exactly
--                                the people the archive removed and not the
--                                ones who had already left of their own accord
--
-- Matching on timestamps instead would be guesswork the moment anything else
-- touched a row in the same second.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.batches.archived_at IS
  'When the batch was archived. NULL for a live batch. is_active = false with archived_at NULL predates this migration.';

ALTER TABLE public.batch_students
  ADD COLUMN IF NOT EXISTS left_reason TEXT
  CHECK (left_reason IN ('departed', 'moved', 'batch_archived'));

COMMENT ON COLUMN public.batch_students.left_reason IS
  'Why this enrolment ended. NULL while active, or for departures recorded before this column existed. batch_archived rows are the ones a restore puts back.';

-- ─── Backfill: batches archived before this existed ─────────────────────────
-- Their students are still marked as enrolled in an invisible batch, which is
-- the bug itself. Give them the departure the archive should have written, and
-- date it to the batch's archival so the history is not simply stamped "now".
-- created_at is the only timestamp these rows carry; it is a floor, not the
-- real moment, and is honest about being an estimate by being the one date we
-- actually know.

UPDATE public.batches
SET archived_at = COALESCE(archived_at, created_at)
WHERE is_active = false
  AND archived_at IS NULL;

UPDATE public.batch_students AS bs
SET left_at      = COALESCE(bs.left_at, b.archived_at, now()),
    left_reason  = 'batch_archived'
FROM public.batches AS b
WHERE bs.batch_id = b.id
  AND b.is_active = false
  AND bs.left_at IS NULL;

-- ─── Index ──────────────────────────────────────────────────────────────────
-- Restore reads "the rows this batch's archive ended", and the archived list
-- reads "batches with an archived_at". Both are narrow lookups on wide tables.

CREATE INDEX IF NOT EXISTS idx_batch_students_archived
  ON public.batch_students (batch_id)
  WHERE left_reason = 'batch_archived';

CREATE INDEX IF NOT EXISTS idx_batches_archived
  ON public.batches (institute_id, archived_at)
  WHERE archived_at IS NOT NULL;

COMMIT;
