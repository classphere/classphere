-- ============================================================
-- Migration: 16 — Institute exam catalog
-- The superadmin chooses the examinations an institute is licensed
-- to conduct. Batch creation is enforced against this catalog.
-- ============================================================

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS enabled_exam_codes TEXT[];

UPDATE public.institutes
SET enabled_exam_codes = ARRAY['jee-main', 'jee-advanced', 'neet-ug']
WHERE enabled_exam_codes IS NULL;

ALTER TABLE public.institutes
  ALTER COLUMN enabled_exam_codes SET DEFAULT ARRAY['jee-main', 'jee-advanced', 'neet-ug'];
