-- ===========================================================================
-- Correção de lacunas no sistema de pagamentos Stripe (Na Régua)
--
-- LACUNA 1: criar tabela plan_commissions (comissão por plano)
-- LACUNA 2: adicionar commission_pct_override em tenants
-- LACUNA 3: reescrever get_tenant_commission (override -> plano -> 2.0)
-- LACUNA 4: políticas RLS anon (públicas) para o link /agendar/:slug
--
-- LACUNAS 5 e 6 JÁ estavam corretas no banco/edge function e NÃO são
-- refeitas (viola "não refazer o que já existe"):
--   - consume_subscription_session já referencia sessions_limit / sessions_used
--     / created_at / updated_at (nomes reais) com SELECT ... FOR UPDATE e
--     INSERT de auditoria em subscription_usage.
--   - o webhook stripe-webhook já zera sessions_used no invoice.payment_succeeded
--     quando billing_reason = 'subscription_cycle'.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- LACUNA 1 — plan_commissions
--   plan_id é UUID (mesmo tipo de subscription_plans.id). O diagnóstico
--   propunha BIGINT, mas a coluna referenciada é UUID — FK BIGINT falharia.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00
    CHECK (commission_pct >= 0 AND commission_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id)
);

ALTER TABLE public.plan_commissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_plan_commissions_plan
  ON public.plan_commissions(plan_id);

-- updated_at trigger reaproveitando a função pública set_updated_at().
DROP TRIGGER IF EXISTS trg_plan_commissions_updated_at ON public.plan_commissions;
CREATE TRIGGER trg_plan_commissions_updated_at
  BEFORE UPDATE ON public.plan_commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS authenticated: leitura livre; escrita somente pelo dono do tenant do plano.
DROP POLICY IF EXISTS "plan_commissions_select" ON public.plan_commissions;
CREATE POLICY "plan_commissions_select" ON public.plan_commissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "plan_commissions_insert" ON public.plan_commissions;
CREATE POLICY "plan_commissions_insert" ON public.plan_commissions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subscription_plans sp
      WHERE sp.id = plan_id AND sp.tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "plan_commissions_update" ON public.plan_commissions;
CREATE POLICY "plan_commissions_update" ON public.plan_commissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscription_plans sp
      WHERE sp.id = plan_id AND sp.tenant_id = public.get_user_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subscription_plans sp
      WHERE sp.id = plan_id AND sp.tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "plan_commissions_delete" ON public.plan_commissions;
CREATE POLICY "plan_commissions_delete" ON public.plan_commissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscription_plans sp
      WHERE sp.id = plan_id AND sp.tenant_id = public.get_user_tenant_id()
    )
  );

-- Seed idempotente: comissão padrão 2% para todos os planos existentes.
INSERT INTO public.plan_commissions (plan_id, commission_pct)
SELECT sp.id, 2.00
FROM public.subscription_plans sp
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_commissions pc WHERE pc.plan_id = sp.id
);

-- ---------------------------------------------------------------------------
-- LACUNA 2 — commission_pct_override em tenants
--   Coluna anulável: NULL significa "usar a comissão do plano". Quando
--   definida (0 a 100), sobrescreve qualquer comissão de plano.
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS commission_pct_override NUMERIC(5,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_commission_pct_override_check'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_commission_pct_override_check
      CHECK (commission_pct_override IS NULL
             OR (commission_pct_override >= 0 AND commission_pct_override <= 100));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- LACUNA 3 — reescrever get_tenant_commission
--   Mantém a assinatura (p_tenant_id UUID) para não quebrar callers TS
--   (types.ts: { p_tenant_id: string }) nem a assinatura ao vivo.
--   Lógica: override no tenant -> plan_commissions do plano da assinatura
--   ativa -> default 2.00.
--   Usa status = 'active' porque o CHECK de customer_subscriptions é
--   ('active','cancelled','past_due','unpaid') — 'trialing' nunca casaria.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_commission(p_tenant_id UUID)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC(5,2);
BEGIN
  -- 1. Verifica override no tenant.
  SELECT t.commission_pct_override INTO v_commission
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_commission IS NOT NULL THEN
    RETURN v_commission;
  END IF;

  -- 2. Busca pela assinatura ativa do tenant e comissão do plano associado.
  SELECT pc.commission_pct INTO v_commission
  FROM public.customer_subscriptions cs
  JOIN public.subscription_plans sp ON sp.id = cs.plan_id
  LEFT JOIN public.plan_commissions pc ON pc.plan_id = sp.id
  WHERE cs.tenant_id = p_tenant_id
    AND cs.status = 'active'
  ORDER BY cs.created_at DESC
  LIMIT 1;

  IF v_commission IS NOT NULL THEN
    RETURN v_commission;
  END IF;

  -- 3. Default da plataforma.
  RETURN 2.00;
END;
$$;

-- ---------------------------------------------------------------------------
-- LACUNA 4 — políticas anon (públicas) para o link /agendar/:slug
--   O slug funciona como token de acesso público: o link público precisa
--   ler serviços/tenant/barbeiros/planos e criar agendamentos sem login.
--   Políticas amplas coexistem com as políticas por token já existentes
--   (semântica OR). Edge functions continuam usando service_role.
-- ---------------------------------------------------------------------------

-- tenants: leitura anônima livre (o slug é público).
DROP POLICY IF EXISTS "tenants_select_anon" ON public.tenants;
CREATE POLICY "tenants_select_anon" ON public.tenants
  FOR SELECT TO anon USING (true);

-- services: leitura anônima.
DROP POLICY IF EXISTS "services_select_anon" ON public.services;
CREATE POLICY "services_select_anon" ON public.services
  FOR SELECT TO anon USING (true);

-- barbers: leitura anônima.
DROP POLICY IF EXISTS "barbers_select_anon" ON public.barbers;
CREATE POLICY "barbers_select_anon" ON public.barbers
  FOR SELECT TO anon USING (true);

-- appointments: criação anônima (fluxo público de agendamento).
DROP POLICY IF EXISTS "appointments_insert_anon" ON public.appointments;
CREATE POLICY "appointments_insert_anon" ON public.appointments
  FOR INSERT TO anon WITH CHECK (true);

-- subscription_plans: leitura anônima (mostrar preços no link público).
DROP POLICY IF EXISTS "subscription_plans_select_anon" ON public.subscription_plans;
CREATE POLICY "subscription_plans_select_anon" ON public.subscription_plans
  FOR SELECT TO anon USING (true);

-- plan_commissions: leitura anônima.
DROP POLICY IF EXISTS "plan_commissions_select_anon" ON public.plan_commissions;
CREATE POLICY "plan_commissions_select_anon" ON public.plan_commissions
  FOR SELECT TO anon USING (true);
