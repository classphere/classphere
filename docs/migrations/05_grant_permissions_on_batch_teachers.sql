-- ============================================================
-- Migration: 05 — Grant permissions on batch_teachers table
-- Run this in your Supabase SQL Editor to resolve the
-- "permission denied for table batch_teachers" error.
-- ============================================================

GRANT ALL ON TABLE public.batch_teachers TO postgres, service_role, authenticated, anon;
