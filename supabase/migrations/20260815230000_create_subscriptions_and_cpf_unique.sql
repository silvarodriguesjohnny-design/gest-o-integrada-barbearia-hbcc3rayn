-- Fase 2: Sistema de Assinaturas + Stripe
-- Cria tabelas de planos de assinatura, assinaturas e invoices.
-- Garante CPF único por tenant (unique partial index).
-- Observação: a coluna is_super_admin em profiles já existe (migration 20260716212000).

-- ===========================================================================
-- 1. subscription_plans
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  services_included JSONB NOT NULL DEFAULT '[]'::jsonb,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  prepaid_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  prepaid_months INTEGER NOT NULL DEFAULT 0,
  prepaid_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_tenant ON public.subscription_plans(tenant_id);

-- ===========================================================================
-- 2. subscriptions
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  payment_type TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON public.subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ===========================================================================
-- 3. subscription_invoices
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_sub ON public.subscription_invoices(subscription_id);

-- ===========================================================================
-- 4. CPF único por tenant (unique partial index)
--    Permite NULL (vários clientes sem CPF) e duplicidade entre tenants.
-- ===========================================================================
-- Limpa CPFs duplicados dentro do mesmo tenant antes de criar o índice único,
-- mantendo apenas o registro mais antigo de cada CPF.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'customers_cpf_tenant_uniq'
  ) THEN
    -- Remove duplicates: for each (tenant_id, cpf) group with >1 row, null out
    -- cpf on the newer duplicates so the unique index can be created.
    UPDATE public.customers c
    SET cpf = NULL
    WHERE cpf IS NOT NULL
      AND id NOT IN (
        SELECT (MIN(id::text))::uuid FROM public.customers
        WHERE cpf IS NOT NULL
        GROUP BY tenant_id, cpf
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS customers_cpf_tenant_uniq
  ON public.customers(tenant_id, cpf)
  WHERE cpf IS NOT NULL;

-- ===========================================================================
-- 5. updated_at trigger para subscription_plans e subscriptions
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- 6. RLS policies
-- ===========================================================================

-- subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select" ON public.subscription_plans;
CREATE POLICY "subscription_plans_select" ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "subscription_plans_insert" ON public.subscription_plans;
CREATE POLICY "subscription_plans_insert" ON public.subscription_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "subscription_plans_update" ON public.subscription_plans;
CREATE POLICY "subscription_plans_update" ON public.subscription_plans
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "subscription_plans_delete" ON public.subscription_plans;
CREATE POLICY "subscription_plans_delete" ON public.subscription_plans
  FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

-- Leitura pública anônima dos planos ativos de um tenant (fluxo público de assinatura)
DROP POLICY IF EXISTS "subscription_plans_anon_select_active" ON public.subscription_plans;
CREATE POLICY "subscription_plans_anon_select_active" ON public.subscription_plans
  FOR SELECT TO anon
  USING (active = true);

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

-- subscription_invoices
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_invoices_select" ON public.subscription_invoices;
CREATE POLICY "subscription_invoices_select" ON public.subscription_invoices
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR subscription_id IN (
      SELECT id FROM public.subscriptions WHERE tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "subscription_invoices_insert" ON public.subscription_invoices;
CREATE POLICY "subscription_invoices_insert" ON public.subscription_invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR subscription_id IN (
      SELECT id FROM public.subscriptions WHERE tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "subscription_invoices_update" ON public.subscription_invoices;
CREATE POLICY "subscription_invoices_update" ON public.subscription_invoices
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR subscription_id IN (
      SELECT id FROM public.subscriptions WHERE tenant_id = public.get_user_tenant_id()
    )
  );

-- ===========================================================================
-- 7. Seed: garantir que rodriguesjohnny@hotmail.com seja super admin
-- ===========================================================================
UPDATE public.profiles
SET is_super_admin = true
WHERE email = 'rodriguesjohnny@hotmail.com';
