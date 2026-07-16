-- ============================================================
-- Migration: 04 — Add created_by Column to papers Table
-- Run this in your Supabase SQL Editor to resolve the missing
-- schema column error.
-- ============================================================

ALTER TABLE public.papers 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Enable index for fast querying by creator
CREATE INDEX IF NOT EXISTS idx_papers_created_by ON public.papers(created_by);
