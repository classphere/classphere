-- ============================================================
-- Migration: 02 — Questions + Papers Schema
-- Run this in your Supabase SQL Editor BEFORE running seed-questions.js
-- ============================================================

-- ─── 1. exams table ──────────────────────────────────────────────────────────
-- Represents top-level exams (JEE Main, JEE Advanced, NEET-UG, SSC CGL, etc.)
CREATE TABLE IF NOT EXISTS exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,         -- e.g. "jee-main", "neet-ug", "ssc-cgl"
  full_name   TEXT NOT NULL,                -- e.g. "JEE Main"
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed initial exams
INSERT INTO exams (code, full_name) VALUES
  ('jee-main',     'JEE Main'),
  ('jee-advanced', 'JEE Advanced'),
  ('neet-ug',      'NEET-UG'),
  ('ssc-cgl',      'SSC CGL')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. questions table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY,          -- keep the UUID from the scraper
  exam_id         UUID REFERENCES exams(id) NOT NULL,

  -- Classification
  test_type       TEXT NOT NULL,             -- 'chapter-wise' | 'mock-test' | 'pyq'
  subject         TEXT NOT NULL,             -- 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics'
  chapter         TEXT NOT NULL,
  topic           TEXT,
  difficulty      TEXT,                      -- 'easy' | 'medium' | 'hard'
  year            INTEGER,                   -- null for chapter-wise, set for PYQs
  source          TEXT,

  -- Content
  question_type   TEXT NOT NULL DEFAULT 'mcq_single',  -- 'mcq_single' | 'mcq_multiple' | 'integer'
  question_text   TEXT NOT NULL,
  image_url       TEXT,
  options         JSONB NOT NULL DEFAULT '[]',          -- [{id, text, image_url}]
  correct_answer  JSONB NOT NULL DEFAULT '[]',          -- ["A"] or ["A","C"]
  explanation     TEXT,
  tags            JSONB DEFAULT '[]',

  -- Analysis engine fields
  distractor_map  JSONB DEFAULT NULL,       -- {A: {error_type, trap_description, common_mistake}}
  marking_scheme  JSONB DEFAULT NULL,       -- {correct, incorrect, unattempted}

  -- Meta
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam        ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_test_type   ON questions(test_type);
CREATE INDEX IF NOT EXISTS idx_questions_subject     ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_chapter     ON questions(chapter);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty  ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_year        ON questions(year);

-- ─── 3. papers table ─────────────────────────────────────────────────────────
-- Represents a grouped set of questions (Mock Test, PYQ Paper, or Chapter-wise Test)
CREATE TABLE IF NOT EXISTS papers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID REFERENCES exams(id) NOT NULL,

  test_type     TEXT NOT NULL,              -- 'chapter-wise' | 'mock-test' | 'pyq'
  title         TEXT NOT NULL,             -- "JEE Main 2024 Jan Shift 1"
  subject       TEXT,                      -- set for chapter-wise tests
  chapter       TEXT,                      -- set for chapter-wise tests
  year          INTEGER,                   -- set for PYQs
  shift         TEXT,                      -- "27 Jan – Shift 1"

  total_questions INTEGER NOT NULL DEFAULT 0,
  total_marks     INTEGER NOT NULL DEFAULT 0,
  duration_min    INTEGER NOT NULL DEFAULT 180,
  difficulty      TEXT,                    -- 'easy' | 'medium' | 'hard'

  -- Metadata
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_papers_exam_type ON papers(exam_id, test_type);

-- ─── 4. paper_questions join table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paper_questions (
  paper_id     UUID REFERENCES papers(id) ON DELETE CASCADE,
  question_id  UUID REFERENCES questions(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,           -- question order within the paper
  PRIMARY KEY (paper_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_pq_paper ON paper_questions(paper_id);

-- ─── 5. Enable RLS (Supabase) ────────────────────────────────────────────────
ALTER TABLE exams           ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "exams_read"     ON exams          FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "questions_read" ON questions FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "papers_read"    ON papers    FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "pq_read"        ON paper_questions FOR SELECT TO authenticated USING (true);

-- Only service role (seed script / admin) can write
-- (service_role bypasses RLS by default in Supabase — no policy needed for writes)
