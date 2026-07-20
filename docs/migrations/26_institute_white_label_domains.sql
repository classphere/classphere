-- ============================================================
-- Migration: 26 — institute white-label and custom-domain settings
-- Safe to run on databases where migration 10 was already applied.
-- ============================================================

ALTER TABLE public.institute_settings
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS theme_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS support_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_institute_settings_custom_domain_unique
  ON public.institute_settings (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;

-- Older institutes may predate institute_settings. Ensure every institute has
-- a settings row and carry forward its generated Classphere subdomain.
INSERT INTO public.institute_settings (institute_id, subdomain)
SELECT id, subdomain_slug
FROM public.institutes
WHERE subdomain_slug IS NOT NULL
ON CONFLICT (institute_id) DO UPDATE
SET subdomain = COALESCE(public.institute_settings.subdomain, EXCLUDED.subdomain),
    updated_at = now();

