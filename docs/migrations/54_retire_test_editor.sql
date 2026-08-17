-- ═══════════════════════════════════════════════════════════════════════════
-- 54. A Test Department is Test Heads, and nothing else
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The department was built for two kinds of people. A Test Editor
-- (test_department_member) prepared a paper and pressed "Submit for review";
-- a Test Head (test_department_head) checked it, marked it ready, and published.
-- Four buttons, deliberately split, so that nobody published their own
-- unchecked work.
--
-- On the ground that split does not exist. The person who uploads the PDF is
-- the person who corrects it and the person who decides it is ready, and asking
-- them to submit a paper to themselves, approve their own submission, and only
-- then publish is three clicks that record no real event. Worse, the Editor
-- could not publish at all, so a department of one Editor was a department that
-- could prepare tests and never release them.
--
-- So the Editor is retired. Every active member becomes a Head, and Head is
-- the only role the department has.
--
-- ── Why three, and not one ─────────────────────────────────────────────────
--
-- Migration 23 allowed exactly one active department account per institute;
-- migration 27 relaxed that to one Head plus any number of Editors. With
-- Editors gone, the one-Head index would cap a whole institute's assessment
-- staff at a single person — which is right for a small coaching and wrong for
-- one running JEE and NEET streams across shifts.
--
-- Three active Heads, as peers with identical permissions. Not a hierarchy:
-- there is no senior Head, and no approval passes between them. The number is a
-- guard against an institute quietly turning its whole staff into publishers,
-- not an org chart.
--
-- A count limit is neither a CHECK constraint (it spans rows) nor a unique
-- index (it is not uniqueness), so it is a BEFORE trigger. The API carries the
-- same check so the user sees a sentence rather than a Postgres exception; this
-- is the backstop for everything that does not go through the API.
--
-- ── Order matters ──────────────────────────────────────────────────────────
--
-- Surplus members are deactivated BEFORE anyone is promoted, and the trigger is
-- created LAST — otherwise the migration's own promotion UPDATE would trip the
-- limit it is installing.
--
-- ── After running this ─────────────────────────────────────────────────────
--
-- /auth/me reads public.users.role, so a promoted account gets its new role on
-- its next profile fetch. The access token's app_metadata.role is updated here
-- too, but a session issued before this migration keeps the old claim until it
-- refreshes — promoted staff should sign out and back in once.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Report before changing anything ────────────────────────────────────────
-- An institute with more than three active members loses some of them below.
-- Which ones is a decision, so it is announced rather than made silently.

DO $$
DECLARE row_record RECORD;
BEGIN
  FOR row_record IN
    SELECT m.institute_id, i.name AS institute_name, count(*) AS active_members
    FROM public.test_department_members m
    LEFT JOIN public.institutes i ON i.id = m.institute_id
    WHERE m.is_active = true
    GROUP BY m.institute_id, i.name
    HAVING count(*) > 3
  LOOP
    RAISE NOTICE
      'Institute % (%) has % active Test Department accounts. The three earliest are kept as Test Heads; the rest are deactivated.',
      row_record.institute_name, row_record.institute_id, row_record.active_members;
  END LOOP;
END $$;

-- ─── Deactivate the surplus ─────────────────────────────────────────────────
-- Same tie-break as migration 23: an existing Head outranks an Editor, then
-- whoever was created first. Deactivating keeps the row, so the paper history
-- and the review audit trail stay attributable.

WITH ranked AS (
  SELECT
    m.user_id,
    row_number() OVER (
      PARTITION BY m.institute_id
      ORDER BY (m.access_level = 'head') DESC, m.created_at ASC
    ) AS position
  FROM public.test_department_members m
  WHERE m.is_active = true
)
UPDATE public.test_department_members m
SET is_active = false, updated_at = now()
FROM ranked r
WHERE m.user_id = r.user_id
  AND r.position > 3;

-- ─── Promote every survivor to Head ─────────────────────────────────────────

DROP INDEX IF EXISTS public.one_active_test_department_head_per_institute;

UPDATE public.test_department_members
SET access_level = 'head', updated_at = now()
WHERE is_active = true
  AND access_level <> 'head';

UPDATE public.users u
SET role = 'test_department_head', updated_at = now()
FROM public.test_department_members m
WHERE m.user_id = u.id
  AND m.is_active = true
  AND u.role = 'test_department_member';

-- The role also travels in the access token's custom claims (migration 32).
-- Wrapped: a database role without privileges on the auth schema should leave
-- the migration succeeding, since public.users.role is what /auth/me reads and
-- the claim catches up on the next token refresh either way.

DO $$
BEGIN
  UPDATE auth.users a
  SET raw_app_meta_data =
        COALESCE(a.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'test_department_head')
  FROM public.test_department_members m
  WHERE m.user_id = a.id
    AND m.is_active = true
    AND COALESCE(a.raw_app_meta_data ->> 'role', '') = 'test_department_member';
EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
  RAISE NOTICE 'Skipped the auth.users app_metadata sync — promoted staff must sign out and back in.';
END $$;

-- ─── The ceiling ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_max_test_heads()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE existing_heads INTEGER;
BEGIN
  -- Only a row that is becoming (or staying) an active Head can breach the
  -- limit. Deactivations and edits to an inactive row are always allowed.
  IF NEW.is_active IS NOT TRUE OR NEW.access_level <> 'head' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO existing_heads
  FROM public.test_department_members
  WHERE institute_id = NEW.institute_id
    AND is_active = true
    AND access_level = 'head'
    AND user_id <> NEW.user_id;

  IF existing_heads >= 3 THEN
    RAISE EXCEPTION
      'An institute may have at most 3 active Test Heads (institute %).', NEW.institute_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_max_test_heads ON public.test_department_members;
CREATE TRIGGER trg_max_test_heads
  BEFORE INSERT OR UPDATE ON public.test_department_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_test_heads();

-- The head lookup runs on every member list and on every appointment.
CREATE INDEX IF NOT EXISTS idx_test_department_active_heads
  ON public.test_department_members (institute_id)
  WHERE is_active = true AND access_level = 'head';

COMMIT;
