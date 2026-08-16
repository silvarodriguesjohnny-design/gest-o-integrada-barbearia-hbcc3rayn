-- Tabela para armazenar configurações/secrets da plataforma (ex.: chaves do Stripe).
-- Apenas super admins podem ler/escrever via RLS. Edge functions leem via service role.
CREATE TABLE IF NOT EXISTS public.platform_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_secrets ENABLE ROW LEVEL SECURITY;

-- RLS: somente super admins podem ler ou modificar.
DROP POLICY IF EXISTS "platform_secrets_super_admin_select" ON public.platform_secrets;
CREATE POLICY "platform_secrets_super_admin_select" ON public.platform_secrets
  FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "platform_secrets_super_admin_insert" ON public.platform_secrets;
CREATE POLICY "platform_secrets_super_admin_insert" ON public.platform_secrets
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "platform_secrets_super_admin_update" ON public.platform_secrets;
CREATE POLICY "platform_secrets_super_admin_update" ON public.platform_secrets
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "platform_secrets_super_admin_delete" ON public.platform_secrets;
CREATE POLICY "platform_secrets_super_admin_delete" ON public.platform_secrets
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- Trigger para manter updated_at atualizado (reaproveita função existente).
CREATE OR REPLACE TRIGGER trg_platform_secrets_updated_at
  BEFORE UPDATE ON public.platform_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Registro de eventos recebidos pelo webhook do Stripe (para o painel admin
-- exibir "último evento recebido" e confirmar que o webhook está ativo).
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_webhook_events_super_admin_select" ON public.stripe_webhook_events;
CREATE POLICY "stripe_webhook_events_super_admin_select" ON public.stripe_webhook_events
  FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "stripe_webhook_events_service_insert" ON public.stripe_webhook_events;
CREATE POLICY "stripe_webhook_events_service_insert" ON public.stripe_webhook_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at
  ON public.stripe_webhook_events (received_at DESC);
