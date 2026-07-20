-- ============================================================
-- Migration 25 — Native push-device registrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  token TEXT NOT NULL UNIQUE,
  disabled_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_devices_user_active ON public.push_devices(user_id, last_seen_at DESC) WHERE disabled_at IS NULL;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
-- Clients never read device tokens directly; authenticated API calls use the
-- service role after verifying the signed-in user.
