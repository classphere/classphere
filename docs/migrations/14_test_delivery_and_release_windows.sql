-- ============================================================
-- Migration: 14 — Test delivery modes and enforced release windows
-- ============================================================
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'public_practice'
    CHECK (delivery_mode IN ('public_practice', 'assigned_scheduled')),
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS result_release_at TIMESTAMPTZ;

-- Existing batch-assigned papers are institute material, never public mocks.
UPDATE public.papers p
SET delivery_mode = 'assigned_scheduled',
    available_from = COALESCE(p.available_from, assignment.first_scheduled_at)
FROM (
  SELECT test_id, MIN(scheduled_at) AS first_scheduled_at
  FROM public.test_batch_assignments
  GROUP BY test_id
) assignment
WHERE assignment.test_id = p.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'papers_release_window_check'
      AND conrelid = 'public.papers'::regclass
  ) THEN
    ALTER TABLE public.papers
      ADD CONSTRAINT papers_release_window_check
      CHECK (available_until IS NULL OR available_from IS NULL OR available_until > available_from);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_papers_delivery_window
  ON public.papers(delivery_mode, is_active, is_published, available_from);
