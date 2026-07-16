-- =====================================================================
-- Migration: 06 — Disable RLS and Grant Permissions on Junction Tables
-- Run this in your Supabase SQL Editor to resolve the permission errors.
-- =====================================================================

-- 1. Grant privileges to all roles
GRANT ALL ON TABLE public.batch_teachers TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.test_batch_assignments TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.paper_questions TO postgres, service_role, authenticated, anon;

-- 2. Disable RLS to ensure clean insert/select operations on join tables
ALTER TABLE public.batch_teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_batch_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_questions DISABLE ROW LEVEL SECURITY;
