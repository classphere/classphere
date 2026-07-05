-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║   ExamPrep — Super Admin Seed Script                                        ║
-- ║   Step 1 (auth.users) already succeeded — this runs the rest.              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ── Upsert into public.users with super_admin role ────────────────────────────
-- Run this AFTER migration 00_base_schema.sql has been executed.

INSERT INTO public.users (id, name, email, role, created_at, updated_at)
VALUES
  (
    (SELECT id FROM auth.users WHERE email = 'harsh@classphere.com' LIMIT 1),
    'Harsh Singh', 'harsh@classphere.com', 'super_admin', now(), now()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'gargie@classphere.com' LIMIT 1),
    'Gargie Singh', 'gargie@classphere.com', 'super_admin', now(), now()
  )
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  u.id,
  u.name,
  u.email,
  u.role,
  au.raw_app_meta_data->>'role' AS auth_role,
  au.email_confirmed_at IS NOT NULL AS email_confirmed
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.role = 'super_admin';

-- ── After running ─────────────────────────────────────────────────────────────
-- Login at: /superadmin/login
-- harsh@classphere.com  /  harsh@15dec
-- gargie@classphere.com /  gargie@02may
