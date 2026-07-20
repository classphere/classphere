-- ============================================================
-- Migration 23 — One Test Admin per institute
-- ============================================================
-- The Test Department is deliberately a single accountable role for now.
-- Existing inactive/legacy members are retained for audit history, but cannot
-- be used to operate the department.

WITH ranked AS (
  SELECT
    m.user_id,
    row_number() OVER (
      PARTITION BY m.institute_id
      ORDER BY (u.role = 'test_department_head') DESC, m.created_at ASC
    ) AS position
  FROM public.test_department_members m
  JOIN public.users u ON u.id = m.user_id
  WHERE m.is_active = true
)
UPDATE public.test_department_members m
SET is_active = false, updated_at = now()
FROM ranked r
WHERE m.user_id = r.user_id AND r.position > 1;

-- If a legacy member remains as the sole active person, promote that account
-- to the Test Admin capability rather than leaving the institute unmanaged.
UPDATE public.users u
SET role = 'test_department_head', updated_at = now()
FROM public.test_department_members m
WHERE m.user_id = u.id
  AND m.is_active = true
  AND u.role = 'test_department_member';

CREATE UNIQUE INDEX IF NOT EXISTS one_active_test_department_account_per_institute
  ON public.test_department_members (institute_id)
  WHERE is_active = true;
