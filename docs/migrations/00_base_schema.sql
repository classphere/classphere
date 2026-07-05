-- ============================================================
-- Migration: 00 — Base Schema (users, institutes, batches, attempts)
-- Run this FIRST in Supabase SQL Editor before any other migration.
-- ============================================================

-- ─── 1. users ────────────────────────────────────────────────────────────────
-- Mirrors Supabase auth.users — stores app-level profile + role.
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student'  -- 'student' | 'teacher' | 'institute_admin' | 'super_admin'
                CHECK (role IN ('student', 'teacher', 'institute_admin', 'super_admin')),
  avatar_url    TEXT,
  exam_target   TEXT DEFAULT 'JEE',             -- 'JEE' | 'NEET' | 'Both'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role  ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ─── 2. institutes ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institutes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  owner_id      UUID REFERENCES public.users(id),
  plan          TEXT DEFAULT 'free',            -- 'free' | 'pro' | 'enterprise'
  logo_url      TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. batches ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  exam          TEXT NOT NULL,                  -- 'JEE' | 'NEET' | 'Both'
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batches_institute ON public.batches(institute_id);

-- ─── 4. batch_students ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_students (
  batch_id    UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (batch_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_students_student ON public.batch_students(student_id);

-- ─── 5. batch_invites ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  code        TEXT UNIQUE NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  max_uses    INTEGER,                          -- null = unlimited
  used_count  INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_code    ON public.batch_invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_batch   ON public.batch_invites(batch_id);

-- ─── 6. attempts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  paper_id        UUID,                         -- references papers(id) — added after migration 02
  batch_id        UUID REFERENCES public.batches(id),
  score           INTEGER DEFAULT 0,
  max_score       INTEGER DEFAULT 0,
  accuracy        NUMERIC(5,2),                 -- e.g. 71.25
  time_taken_min  INTEGER,
  status          TEXT DEFAULT 'completed',     -- 'in_progress' | 'completed'
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_student   ON public.attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_paper     ON public.attempts(paper_id);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON public.attempts(submitted_at DESC);

-- ─── 7. attempt_answers ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id            UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id           UUID,
  selected_answer       JSONB,                  -- ["A"] or ["A","C"] or ["42"]
  is_correct            BOOLEAN,
  time_spent_sec        INTEGER,
  error_classification  JSONB,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_answers_attempt ON public.attempt_answers(attempt_id);

-- ─── 8. RLS Policies ──────────────────────────────────────────────────────────
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_invites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers    ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "users_read_own"   ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
-- Service role (API server) can do everything — no policy needed (bypasses RLS)

-- Students can see batches they belong to
CREATE POLICY "batches_read" ON public.batches FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.batch_students bs WHERE bs.batch_id = id AND bs.student_id = auth.uid()
  ));

-- Students can see their own batch membership
CREATE POLICY "batch_students_read_own" ON public.batch_students FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Students can read their own attempts
CREATE POLICY "attempts_read_own" ON public.attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Students can read their own answers
CREATE POLICY "answers_read_own" ON public.attempt_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid()
  ));

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Run migration 02 next (02_questions_seed_schema.sql) to add the questions/papers tables.
-- Then run superadmin-seed.sql to create admin accounts.
