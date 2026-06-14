-- Migration: Analysis Engine v2
-- Run this in your Supabase SQL Editor

-- 1. Add distractor_map to questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS distractor_map JSONB DEFAULT NULL;

-- 2. Add error_classification to attempt_answers
ALTER TABLE attempt_answers
  ADD COLUMN IF NOT EXISTS error_classification JSONB DEFAULT NULL;

-- 3. Create student_error_profile table
CREATE TABLE IF NOT EXISTS student_error_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID REFERENCES users(id) NOT NULL,
  exam_id               UUID REFERENCES exams(id) NOT NULL,

  -- Rolling cumulative counts (ever-increasing)
  conceptual_errors     INTEGER DEFAULT 0,
  calculation_errors    INTEGER DEFAULT 0,
  silly_errors          INTEGER DEFAULT 0,
  partial_solve_errors  INTEGER DEFAULT 0,
  time_management_skips INTEGER DEFAULT 0,

  -- Per-chapter breakdown: {"Thermodynamics":{"conceptual":5,"calculation":2},...}
  chapter_error_profile JSONB DEFAULT '{}',

  -- Rolling window: last 5 tests breakdown for trend charts
  last_5_tests_breakdown JSONB DEFAULT '[]',

  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_error_profile_student ON student_error_profile(student_id, exam_id);

-- 4. Add columns to ai_analyses
ALTER TABLE ai_analyses
  ADD COLUMN IF NOT EXISTS free_marks    JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS skip_analysis JSONB DEFAULT NULL;
