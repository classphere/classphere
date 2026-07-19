-- ============================================================
-- Migration: 10 — Institute provisioning foundations
-- Aligns the live schema with the institute and superadmin APIs.
-- Run after migrations 00–09.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES public.institutes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS active_session_token UUID;

CREATE INDEX IF NOT EXISTS idx_users_institute_id ON public.users(institute_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS subdomain_slug TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_institutes_subdomain_slug_unique
  ON public.institutes(subdomain_slug)
  WHERE subdomain_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.institute_settings (
  institute_id UUID PRIMARY KEY REFERENCES public.institutes(id) ON DELETE CASCADE,
  subdomain TEXT UNIQUE,
  theme_logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.institute_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_institute ON public.institute_subscriptions(institute_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.institute_subscriptions(status);

ALTER TABLE public.institute_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_subscriptions ENABLE ROW LEVEL SECURITY;
