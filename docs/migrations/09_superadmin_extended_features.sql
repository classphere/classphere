-- ============================================================
-- Migration: 09 — Superadmin Extended Features (support_tickets, replies, configs, logs)
-- ============================================================

-- ─── 1. support_tickets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  institute_id  UUID REFERENCES public.institutes(id) ON DELETE SET NULL,
  subject       TEXT NOT NULL,
  message       TEXT NOT NULL,
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_author    ON public.support_tickets(author_id);
CREATE INDEX IF NOT EXISTS idx_tickets_institute ON public.support_tickets(institute_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status    ON public.support_tickets(status);

-- ─── 2. ticket_replies ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replies_ticket ON public.ticket_replies(ticket_id);

-- ─── 3. system_settings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  key           TEXT PRIMARY KEY,
  value         JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed default settings
INSERT INTO public.system_settings (key, value)
VALUES 
  ('maintenance_mode', 'false'::jsonb),
  ('deterministic_engine', 'true'::jsonb),
  ('ssc_pacing', 'true'::jsonb),
  ('custom_domains_enabled', 'true'::jsonb),
  ('forum_moderation_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─── 4. audit_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  detail        TEXT NOT NULL,
  category      TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'success', 'error')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON public.audit_logs(created_at DESC);

-- ─── 5. institute_invoices ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institute_invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  amount_paid   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  plan          TEXT NOT NULL DEFAULT 'free',
  status        TEXT NOT NULL DEFAULT 'paid'
                CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_institute ON public.institute_invoices(institute_id);

-- ─── 6. RLS Policies ──────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_invoices ENABLE ROW LEVEL SECURITY;

-- Tickets: users can read/write their own tickets; superadmins can do everything
CREATE POLICY "tickets_read_own" ON public.support_tickets FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
  ));

CREATE POLICY "tickets_write_own" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "tickets_admin_update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
  ));

-- Replies: users can read replies to their own tickets; insert replies to their own tickets
CREATE POLICY "replies_read" ON public.ticket_replies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t 
    WHERE t.id = ticket_id AND (t.author_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    ))
  ));

CREATE POLICY "replies_write" ON public.ticket_replies FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- System settings & Audit logs: superadmins can read/write
CREATE POLICY "settings_admin" ON public.system_settings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
  ));

CREATE POLICY "audit_logs_admin" ON public.audit_logs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
  ));

CREATE POLICY "invoices_admin" ON public.institute_invoices FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
  ));
