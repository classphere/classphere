-- Migration 07: Add scheduled_at column to test_batch_assignments
-- This allows tests to have a specific scheduled date per assignment,
-- which is displayed to students on their dashboard.

ALTER TABLE public.test_batch_assignments
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT now();
