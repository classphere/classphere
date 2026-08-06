-- ============================================================
-- Migration: 36 — Per-student pricing
--
-- Classphere is sold per student per year, but the schema had no rate, no
-- seat count, and no way to express one. What it had instead was a plan tier
-- (`free` / `pro` / `enterprise`) inherited from a generic SaaS template, plus
-- an `institutes.plan` column whose UI offered `free | trial | active |
-- enterprise` — a list that mixes lifecycle (trial, active) with tier (free,
-- enterprise), so a trialling institute could not also carry a price.
--
-- This replaces the tier concept with the commercial terms actually sold:
-- a per-student rate, with a flat annual override for negotiated deals.
-- `institute_subscriptions.status` already modelled the lifecycle correctly
-- and is left alone.
--
-- `institutes.plan` is NOT dropped: institute_invoices joins it and older
-- rows reference it. It stops being read for pricing decisions, and is left
-- for a later cleanup once nothing depends on it.
-- ============================================================

-- ─── 1. Commercial terms ─────────────────────────────────────────────────────

ALTER TABLE public.institute_subscriptions
  -- Which of the two shapes this institute is billed on. Per-student is the
  -- product; flat exists for chains that negotiate a fixed annual number.
  ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'per_student'
    CHECK (billing_mode IN ('per_student', 'flat')),

  -- Money is stored in paise as an integer, never rupees as a float. A rate
  -- multiplied by a student count is exactly where binary floating point
  -- starts losing fractions of a rupee. ₹590/year = 59000 paise.
  ADD COLUMN IF NOT EXISTS price_per_student_paise INTEGER NOT NULL DEFAULT 59000
    CHECK (price_per_student_paise >= 0),

  -- Only meaningful when billing_mode = 'flat'; NULL otherwise.
  ADD COLUMN IF NOT EXISTS flat_annual_paise INTEGER
    CHECK (flat_annual_paise IS NULL OR flat_annual_paise >= 0),

  -- When the trial converts. Distinct from current_period_end, which is the
  -- paid term — an institute can be trialling with no period at all.
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- A flat-billed institute without a flat price is not a deal, it is a bug.
-- Named so a failed insert says which rule it broke.
ALTER TABLE public.institute_subscriptions
  DROP CONSTRAINT IF EXISTS institute_subscriptions_flat_requires_price;
ALTER TABLE public.institute_subscriptions
  ADD CONSTRAINT institute_subscriptions_flat_requires_price
    CHECK (billing_mode <> 'flat' OR flat_annual_paise IS NOT NULL);

COMMENT ON COLUMN public.institute_subscriptions.billing_mode IS
  'per_student (default product) or flat (negotiated annual fee).';
COMMENT ON COLUMN public.institute_subscriptions.price_per_student_paise IS
  'Annual rate per student, in paise. 59000 = ₹590/student/year.';
COMMENT ON COLUMN public.institute_subscriptions.flat_annual_paise IS
  'Negotiated annual fee in paise. Required when billing_mode = flat, else NULL.';

-- ─── 2. Every institute needs a subscription row ─────────────────────────────
--
-- GET /institutes/me/subscription returns 404 when no row exists, so an
-- institute onboarded without one has a permanently broken billing page.
-- Institutes currently marked 'trial' start as trialing; everything else
-- inherits the default rate and its active/inactive state.

INSERT INTO public.institute_subscriptions (institute_id, plan_tier, status, billing_mode, price_per_student_paise, trial_ends_at)
SELECT
  i.id,
  'standard',
  CASE
    WHEN lower(coalesce(i.plan, '')) = 'trial' THEN 'trialing'
    WHEN i.is_active IS FALSE                  THEN 'cancelled'
    ELSE 'active'
  END,
  'per_student',
  59000,
  -- Existing trials get a 60-day window from onboarding rather than an
  -- immediate expiry, so nobody is cut off by running this migration.
  CASE WHEN lower(coalesce(i.plan, '')) = 'trial' THEN i.created_at + INTERVAL '60 days' END
FROM public.institutes i
WHERE NOT EXISTS (
  SELECT 1 FROM public.institute_subscriptions s WHERE s.institute_id = i.id
);

-- ─── 3. Backfill terms on rows that already existed ──────────────────────────

UPDATE public.institute_subscriptions
SET billing_mode = 'per_student',
    price_per_student_paise = 59000
WHERE price_per_student_paise IS NULL
   OR price_per_student_paise = 0;

-- Align status with the institute's active flag for rows predating this model.
UPDATE public.institute_subscriptions s
SET status = 'cancelled'
FROM public.institutes i
WHERE s.institute_id = i.id
  AND i.is_active IS FALSE
  AND s.status <> 'cancelled';

-- ─── 4. Billed student counts ────────────────────────────────────────────────
--
-- An institute is billed for the students it is currently teaching: those in a
-- batch that is active, has started, and has not passed its expiry date.
--
-- Tying the count to batch lifecycle is what makes a session a renewal
-- boundary. Without it an institute could run one immortal batch and rotate
-- new cohorts through it forever on a single year's fee; and, in the other
-- direction, would keep being billed for students who left years ago.
--
-- The CRM list previously tallied batch_students rows in Node, which was wrong
-- twice over for money: it counted enrolments rather than students, so anyone
-- in two batches was billed twice, and the fetch was unbounded, so it
-- truncated at PostgREST's 1000-row cap and *under*-counted exactly the large
-- institutes worth the most. count(DISTINCT ...) settles the first; doing it
-- in Postgres settles the second. PostgREST cannot express GROUP BY, hence a
-- function.

CREATE OR REPLACE FUNCTION public.institute_student_counts()
RETURNS TABLE (institute_id UUID, student_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.institute_id, count(DISTINCT bs.student_id)::BIGINT
  FROM public.batch_students bs
  JOIN public.batches b ON b.id = bs.batch_id
  WHERE b.is_active = true
    AND (b.starts_at IS NULL OR b.starts_at <= now())
    AND (b.ends_at   IS NULL OR b.ends_at   >  now())
  GROUP BY b.institute_id;
$$;

REVOKE ALL ON FUNCTION public.institute_student_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.institute_student_counts() TO service_role;

-- ─── 5. Index ────────────────────────────────────────────────────────────────
-- Revenue rollups scan every active subscription and read the terms; this
-- covers that read without touching the table.

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing
  ON public.institute_subscriptions (status, billing_mode)
  INCLUDE (institute_id, price_per_student_paise, flat_annual_paise);
