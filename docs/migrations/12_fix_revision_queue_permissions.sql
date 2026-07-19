-- ============================================================
-- Migration: 12 — Revision queue role grants
-- ============================================================
-- Migration 11 enables RLS but a table created by the migration owner does
-- not automatically grant REST/API roles access.  The backend deliberately
-- uses the service_role client for tenant-checked operations, so grant that
-- role the required table privileges.  Authenticated users retain their
-- own-row restriction through the existing RLS policy.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_revision_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_revision_tasks TO authenticated;
