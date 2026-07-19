-- ============================================================
-- Migration: 03 — DPPs, Gamification, and Schema Upgrades
-- ============================================================

-- ─── 1. Add error_topics to student_error_profiles ───────────
-- Used by student mistake diary to track resolved states
ALTER TABLE public.student_error_profiles
  ADD COLUMN IF NOT EXISTS error_topics JSONB DEFAULT '{}';

-- Add is_published to papers table to support publishing workflow
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Drop existing partial/broken tables to guarantee clean schema recreation
DROP TABLE IF EXISTS public.leaderboards CASCADE;
DROP TABLE IF EXISTS public.student_dpps CASCADE;
DROP TABLE IF EXISTS public.dpp_questions CASCADE;
DROP TABLE IF EXISTS public.dpps CASCADE;
DROP TABLE IF EXISTS public.test_batch_assignments CASCADE;
DROP TABLE IF EXISTS public.student_stats CASCADE;

-- ─── 2. test_batch_assignments ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.test_batch_assignments (
  test_id     UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  batch_id    UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (test_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_tba_batch ON public.test_batch_assignments(batch_id);

-- ─── 3. dpps table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dpps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  batch_id        UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  subject         TEXT,
  chapter         TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  due_date        TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dpps_batch ON public.dpps(batch_id);

-- ─── 4. dpp_questions table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dpp_questions (
  dpp_id       UUID REFERENCES public.dpps(id) ON DELETE CASCADE,
  question_id  UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  PRIMARY KEY (dpp_id, question_id)
);

-- ─── 5. student_dpps table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_dpps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  dpp_id          UUID REFERENCES public.dpps(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'submitted'
  score           INTEGER DEFAULT 0,
  max_score       INTEGER DEFAULT 0,
  attempt_answers JSONB DEFAULT '[]',
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, dpp_id)
);

CREATE INDEX IF NOT EXISTS idx_sd_student ON public.student_dpps(student_id);

-- ─── 6. student_stats table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  exam_code       TEXT,
  xp              INTEGER DEFAULT 0,
  total_score     INTEGER DEFAULT 0,
  total_max_score INTEGER DEFAULT 0,
  total_tests     INTEGER DEFAULT 0,
  accuracy_pct    INTEGER DEFAULT 0,
  rank_score      INTEGER DEFAULT 0,
  streak_days     INTEGER DEFAULT 0,
  last_test_date  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. leaderboards table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES public.users(id) ON DELETE CASCADE,
  xp          INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboards_batch ON public.leaderboards(batch_id, xp DESC);

-- ─── 8. RLS Policies ──────────────────────────────────────────
ALTER TABLE public.test_batch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpps                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dpps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_stats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards           ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "tba_select" ON public.test_batch_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpps_select" ON public.dpps FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "dpp_questions_select" ON public.dpp_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "student_dpps_select" ON public.student_dpps FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "student_stats_select" ON public.student_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "leaderboards_select" ON public.leaderboards FOR SELECT TO authenticated USING (true);

-- API operations are performed through the service-role client after the
-- controller has verified tenant and ownership access. Explicit grants are
-- required in addition to the RLS policies above.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dpps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dpp_questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_dpps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.test_batch_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_stats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leaderboards TO service_role;
GRANT SELECT ON TABLE public.dpps, public.dpp_questions, public.student_dpps,
  public.test_batch_assignments, public.student_stats, public.leaderboards TO authenticated;
