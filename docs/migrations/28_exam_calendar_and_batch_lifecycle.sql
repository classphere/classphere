-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 28 — Exam Calendar + Batch Lifecycle Events                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ── 1. Exam Calendar ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_calendar (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_code        TEXT        NOT NULL UNIQUE,
  exam_label       TEXT        NOT NULL,
  suggested_ends_at DATE       NOT NULL,
  notes            TEXT,
  updated_by       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with 2026 exam dates
INSERT INTO public.exam_calendar (exam_code, exam_label, suggested_ends_at, notes) VALUES
  ('jee-main',          'JEE Main',           '2026-04-30', 'Session 2 typically ends April'),
  ('jee-advanced',      'JEE Advanced',        '2026-06-30', 'Results typically out by June end'),
  ('jee-main-advanced', 'JEE Main + Advanced', '2026-06-30', 'Full JEE cycle — expires after Advanced'),
  ('neet-ug',           'NEET UG',             '2026-06-30', 'Results typically out by June end')
ON CONFLICT (exam_code) DO UPDATE SET
  suggested_ends_at = EXCLUDED.suggested_ends_at,
  exam_label        = EXCLUDED.exam_label,
  notes             = EXCLUDED.notes,
  updated_at        = now();

-- RLS
ALTER TABLE public.exam_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_calendar_read_all" ON public.exam_calendar
  FOR SELECT USING (true);

CREATE POLICY "exam_calendar_write_superadmin" ON public.exam_calendar
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin');

-- ── 2. Batch Lifecycle Events (audit) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_lifecycle_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     UUID        NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  event        TEXT        NOT NULL, -- 'auto_expired' | 'manually_deactivated' | 'reactivated'
  triggered_by TEXT        NOT NULL DEFAULT 'system', -- 'system' or user_id
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS batch_lifecycle_events_batch_id_idx
  ON public.batch_lifecycle_events (batch_id);

ALTER TABLE public.batch_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batch_lifecycle_superadmin_full" ON public.batch_lifecycle_events
  FOR ALL USING ((auth.jwt() ->> 'role') = 'super_admin');

CREATE POLICY "batch_lifecycle_institute_read" ON public.batch_lifecycle_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.batches b
      JOIN public.users u ON u.institute_id = b.institute_id
      WHERE b.id = batch_lifecycle_events.batch_id
        AND u.id = auth.uid()
        AND u.role = 'institute_admin'
    )
  );

-- ── 3. Add jee-main-advanced to institutes allowed exam codes ─────────────────
-- Update the CHECK constraint if it exists
ALTER TABLE public.institutes
  DROP CONSTRAINT IF EXISTS institutes_enabled_exam_codes_check;

-- ── 4. Verify ─────────────────────────────────────────────────────────────────
SELECT exam_code, exam_label, suggested_ends_at, notes
FROM public.exam_calendar
ORDER BY suggested_ends_at;
