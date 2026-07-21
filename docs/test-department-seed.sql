-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║   Classphere — Test Department Seed Accounts                               ║
-- ║   Institute: test (test.classphere.com / test.localhost)                   ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- STEP 1: Create in Supabase → Authentication → Users → Add user (auto-confirm)
--   test_head@classphere.com   /  password123
--   test_editor@classphere.com /  password123
--
-- STEP 2: Run the DO $$ block below in the SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_institute_id  UUID;
  v_head_id       UUID;
  v_editor_id     UUID;
BEGIN
  SELECT id INTO v_institute_id FROM public.institutes WHERE subdomain_slug = 'test' LIMIT 1;
  IF v_institute_id IS NULL THEN
    RAISE EXCEPTION 'Institute with subdomain_slug = ''test'' not found.';
  END IF;

  SELECT id INTO v_head_id   FROM auth.users WHERE email = 'test_head@classphere.com'   LIMIT 1;
  SELECT id INTO v_editor_id FROM auth.users WHERE email = 'test_editor@classphere.com' LIMIT 1;

  IF v_head_id   IS NULL THEN RAISE EXCEPTION 'test_head@classphere.com not found in auth.users.';   END IF;
  IF v_editor_id IS NULL THEN RAISE EXCEPTION 'test_editor@classphere.com not found in auth.users.'; END IF;

  -- public.users
  INSERT INTO public.users (id, name, email, role, institute_id, created_at, updated_at)
  VALUES
    (v_head_id,   'Test Head',   'test_head@classphere.com',   'test_department_head',   v_institute_id, now(), now()),
    (v_editor_id, 'Test Editor', 'test_editor@classphere.com', 'test_department_member', v_institute_id, now(), now())
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, institute_id = EXCLUDED.institute_id, updated_at = now();

  -- auth metadata (role in JWT)
  UPDATE auth.users SET
    raw_app_meta_data  = raw_app_meta_data  || jsonb_build_object('role', 'test_department_head'),
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object('name', 'Test Head')
  WHERE id = v_head_id;

  UPDATE auth.users SET
    raw_app_meta_data  = raw_app_meta_data  || jsonb_build_object('role', 'test_department_member'),
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object('name', 'Test Editor')
  WHERE id = v_editor_id;

  -- test_department_members
  INSERT INTO public.test_department_members
    (user_id, institute_id, access_level, title, is_active, created_by, created_at, updated_at)
  VALUES
    (v_head_id,   v_institute_id, 'head',   'Head of Assessment',  true, v_head_id, now(), now()),
    (v_editor_id, v_institute_id, 'editor', 'Test Content Editor', true, v_head_id, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET access_level = EXCLUDED.access_level, is_active = true, updated_at = now();

  RAISE NOTICE 'Done. Head: %, Editor: %', v_head_id, v_editor_id;
END $$;

-- Verify
SELECT u.name, u.email, u.role, m.access_level, m.is_active
FROM public.users u
JOIN public.test_department_members m ON m.user_id = u.id
JOIN public.institutes i ON i.id = u.institute_id
WHERE i.subdomain_slug = 'test'
ORDER BY m.access_level;

-- ── Credentials ───────────────────────────────────────────────────────────────
-- test_head@classphere.com   /  password123  →  Test Department Head
-- test_editor@classphere.com /  password123  →  Test Editor
