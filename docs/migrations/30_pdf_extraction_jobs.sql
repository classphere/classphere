-- Migration: pdf_extraction_jobs
-- Tracks async PDF extraction jobs for the superadmin extract-pdf pipeline.
-- Status flow: pending -> processing -> done | failed

CREATE TABLE IF NOT EXISTS pdf_extraction_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  requested_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  pages          TEXT,          -- optional page range filter e.g. "1-5"
  result         JSONB,         -- { questions: [...], message: "..." }
  error          TEXT,          -- error message if failed
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ
);

-- Index for fast status polling by the requesting user
CREATE INDEX IF NOT EXISTS idx_pdf_extraction_jobs_status ON pdf_extraction_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pdf_extraction_jobs_requested_by ON pdf_extraction_jobs(requested_by);

-- Auto-delete jobs older than 7 days (they should be fully consumed by then)
-- (Run this as a cron or Supabase pg_cron: SELECT cron.schedule('cleanup-pdf-jobs', '0 3 * * *', 'DELETE FROM pdf_extraction_jobs WHERE created_at < NOW() - INTERVAL ''7 days''');)

-- RLS: only super_admin can read/write; workers use service role (bypasses RLS)
ALTER TABLE pdf_extraction_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_full_access" ON pdf_extraction_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );
