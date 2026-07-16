-- Migration: Analysis Engine v2 (Fully Unified & Scale-Ready)
-- Run this in your Supabase SQL Editor

-- 1. Add distractor_map to questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS distractor_map JSONB DEFAULT NULL;

-- 2. Add error_classification to attempt_answers
ALTER TABLE attempt_answers
  ADD COLUMN IF NOT EXISTS error_classification JSONB DEFAULT NULL;

-- 3. Create student_error_profiles table (Pluralized to match codebase)
CREATE TABLE IF NOT EXISTS student_error_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exam_code      TEXT NOT NULL, -- e.g. "jee-main"
  topic_history  JSONB DEFAULT '{}', -- Historical accuracy list per topic
  last_updated   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, exam_code)
);

-- Index for fast user dashboards & weak topic aggregate lookups
CREATE INDEX IF NOT EXISTS idx_student_error_profiles_lookup 
  ON student_error_profiles(student_id, exam_code);

-- 4. Create analysis_results table (Stores heavy AI-generated analyses)
CREATE TABLE IF NOT EXISTS analysis_results (
  attempt_id     UUID PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  student_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exam_code      TEXT NOT NULL,
  result         JSONB NOT NULL,
  processing_ms  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Index for authorization lookups and batch aggregations
CREATE INDEX IF NOT EXISTS idx_analysis_results_lookup 
  ON analysis_results(student_id, exam_code);
