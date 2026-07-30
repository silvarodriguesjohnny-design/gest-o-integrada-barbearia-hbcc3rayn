CREATE TABLE IF NOT EXISTS public.pending_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf_cnpj TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  nome_negocio TEXT NOT NULL,
  numero_cadeiras INTEGER DEFAULT 1,
  quantidade_profissionais INTEGER DEFAULT 1,
  horario_funcionamento TEXT,
  tenant_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inactivity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  days INTEGER NOT NULL DEFAULT 30,
  message TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '["email"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messaging_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  appointment_id UUID,
  channel TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'simulated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_tenants_status ON public.pending_tenants(status);
CREATE INDEX IF NOT EXISTS idx_inactivity_alerts_tenant ON public.inactivity_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messaging_configs_tenant ON public.messaging_configs(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messaging_configs_tenant_channel ON public.messaging_configs(tenant_id, channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant ON public.notification_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON public.email_logs(tenant_id);

ALTER TABLE public.pending_tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_tenants_anon_insert" ON public.pending_tenants;
CREATE POLICY "pending_tenants_anon_insert" ON public.pending_tenants FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "pending_tenants_select" ON public.pending_tenants;
CREATE POLICY "pending_tenants_select" ON public.pending_tenants FOR SELECT TO authenticated USING (public.is_super_admin());
DROP POLICY IF EXISTS "pending_tenants_update" ON public.pending_tenants;
CREATE POLICY "pending_tenants_update" ON public.pending_tenants FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
DROP POLICY IF EXISTS "pending_tenants_delete" ON public.pending_tenants;
CREATE POLICY "pending_tenants_delete" ON public.pending_tenants FOR DELETE TO authenticated USING (public.is_super_admin());

ALTER TABLE public.inactivity_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inactivity_alerts_select" ON public.inactivity_alerts;
CREATE POLICY "inactivity_alerts_select" ON public.inactivity_alerts FOR SELECT TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
DROP POLICY IF EXISTS "inactivity_alerts_insert" ON public.inactivity_alerts;
CREATE POLICY "inactivity_alerts_insert" ON public.inactivity_alerts FOR INSERT TO authenticated WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
DROP POLICY IF EXISTS "inactivity_alerts_update" ON public.inactivity_alerts;
CREATE POLICY "inactivity_alerts_update" ON public.inactivity_alerts FOR UPDATE TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id()) WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
DROP POLICY IF EXISTS "inactivity_alerts_delete" ON public.inactivity_alerts;
CREATE POLICY "inactivity_alerts_delete" ON public.inactivity_alerts FOR DELETE TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

ALTER TABLE public.messaging_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messaging_configs_select" ON public.messaging_configs;
CREATE POLICY "messaging_configs_select" ON public.messaging_configs FOR SELECT TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
DROP POLICY IF EXISTS "messaging_configs_insert" ON public.messaging_configs;
CREATE POLICY "messaging_configs_insert" ON public.messaging_configs FOR INSERT TO authenticated WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
DROP POLICY IF EXISTS "messaging_configs_update" ON public.messaging_configs;
CREATE POLICY "messaging_configs_update" ON public.messaging_configs FOR UPDATE TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id()) WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
DROP POLICY IF EXISTS "messaging_configs_delete" ON public.messaging_configs;
CREATE POLICY "messaging_configs_delete" ON public.messaging_configs FOR DELETE TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_logs_select" ON public.notification_logs;
CREATE POLICY "notification_logs_select" ON public.notification_logs FOR SELECT TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_logs_select" ON public.email_logs;
CREATE POLICY "email_logs_select" ON public.email_logs FOR SELECT TO authenticated USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
