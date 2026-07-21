-- Test Department team roles and batch lifecycle controls.
-- Safe to run after migrations 22 and 23.

DROP INDEX IF EXISTS public.one_active_test_department_account_per_institute;

ALTER TABLE public.test_department_members
  ADD COLUMN IF NOT EXISTS access_level TEXT;

UPDATE public.test_department_members m
SET access_level = CASE WHEN u.role = 'test_department_head' THEN 'head' ELSE 'editor' END
FROM public.users u
WHERE u.id = m.user_id AND m.access_level IS NULL;

ALTER TABLE public.test_department_members ALTER COLUMN access_level SET DEFAULT 'editor';
ALTER TABLE public.test_department_members ALTER COLUMN access_level SET NOT NULL;
ALTER TABLE public.test_department_members DROP CONSTRAINT IF EXISTS test_department_members_access_level_check;
ALTER TABLE public.test_department_members ADD CONSTRAINT test_department_members_access_level_check
  CHECK (access_level IN ('head', 'editor'));

-- One accountable head, any number of editors.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_test_department_head_per_institute
  ON public.test_department_members (institute_id)
  WHERE is_active = true AND access_level = 'head';

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_lifecycle_window_check;
ALTER TABLE public.batches ADD CONSTRAINT batches_lifecycle_window_check
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);
CREATE INDEX IF NOT EXISTS idx_batches_lifecycle
  ON public.batches (institute_id, is_active, starts_at, ends_at);
