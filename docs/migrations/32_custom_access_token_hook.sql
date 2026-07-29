-- ============================================================
-- Migration: 32 — Custom Access Token Hook (role + institute_id in JWT)
--
-- Why: the web app's AppShell / SuperAdminLayout block ALL protected page
-- content from rendering until a full profile fetch (GET /api/v1/auth/me)
-- resolves, purely to know the user's role so it doesn't flash a student's
-- shell to a teacher, etc. Embedding role + institute_id directly into the
-- JWT lets the frontend gate instantly from the token itself — no network
-- round trip — collapsing one full sequential stage out of the auth waterfall
-- on every cold load / new tab / Capacitor app open. See apps/web/src/lib/auth-context.tsx
-- (authRole) and apps/web/src/components/layout/AppShell.tsx.
--
-- This migration only creates the Postgres function. Supabase does not call
-- it automatically — a human must additionally enable it as a "Custom Access
-- Token" Auth Hook:
--
--   Supabase Dashboard → Authentication → Hooks → Add hook →
--     type: "Custom Access Token", function: public.custom_access_token_hook
--
-- The frontend already falls back to the old (slower) /auth/me-based gating
-- if this hook isn't enabled or the function isn't deployed, so running this
-- migration and/or flipping the dashboard toggle are both safe to do at any
-- time, in any order, with zero downtime — nothing breaks in between.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
  user_institute_id uuid;
begin
  select role, institute_id
    into user_role, user_institute_id
    from public.users
    where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role), true);
  end if;

  claims := jsonb_set(
    claims,
    '{app_metadata,institute_id}',
    case when user_institute_id is not null then to_jsonb(user_institute_id) else 'null'::jsonb end,
    true
  );

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Required by Supabase: only the auth admin role may execute the hook function,
-- and it must NOT be callable by normal API roles.
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
