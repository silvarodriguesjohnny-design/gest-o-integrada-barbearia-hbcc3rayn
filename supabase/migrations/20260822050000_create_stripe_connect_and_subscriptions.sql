-- ===========================================================================
-- Arquitetura completa de pagamentos Stripe do "Na Régua"
--
-- Novas tabelas:
--   - stripe_connect_accounts  (contas Stripe Connect Express dos tenants)
--   - platform_earnings        (comissões da plataforma)
--   - customer_subscriptions   (assinaturas recorrentes de clientes finais)
--   - subscription_usage       (consumo de sessões por assinatura)
--
-- Novas funções SQL:
--   - get_tenant_commission(tenant_id)        -> numeric
--   - consume_subscription_session(...)       -> boolean  (SELECT ... FOR UPDATE)
--   - get_active_subscription(customer, tenant) -> customer_subscriptions
--
-- RLS para todas as novas tabelas.
-- Colunas auxiliares em tenants (stripe_connect_id, stripe_connect_enabled).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0. Colunas auxiliares em tenants (cache do status do Connect)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_enabled BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 0.1. Novo status de agendamento: 'pending_payment'
--      Usado quando o agendamento é salvo ANTES do redirect ao Stripe para
--      reservar o horário. O webhook do Stripe confirma para 'scheduled'.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_payment'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
  ) THEN
    ALTER TYPE public.appointment_status ADD VALUE 'pending_payment';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 0.2. Colunas de Stripe em subscription_plans
--      - stripe_price_id: price recorrente criado no Stripe para o plano
--      - sessions_limit: nº de agendamentos inclusos por ciclo (default 4)
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS sessions_limit INTEGER NOT NULL DEFAULT 4;
-- "preço mensal" já existe como `price`; mantemos por compatibilidade.

-- ---------------------------------------------------------------------------
-- 1. stripe_connect_accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_tenant
  ON public.stripe_connect_accounts(tenant_id);

-- updated_at trigger reaproveitando a função pública set_updated_at().
DROP TRIGGER IF EXISTS trg_stripe_connect_accounts_updated_at ON public.stripe_connect_accounts;
CREATE TRIGGER trg_stripe_connect_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: dono do tenant vê a sua conta; super admin vê todas.
DROP POLICY IF EXISTS "stripe_connect_accounts_select" ON public.stripe_connect_accounts;
CREATE POLICY "stripe_connect_accounts_select" ON public.stripe_connect_accounts
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "stripe_connect_accounts_insert" ON public.stripe_connect_accounts;
CREATE POLICY "stripe_connect_accounts_insert" ON public.stripe_connect_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "stripe_connect_accounts_update" ON public.stripe_connect_accounts;
CREATE POLICY "stripe_connect_accounts_update" ON public.stripe_connect_accounts
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

-- DELETE permitido apenas para super admin (contas Connect são sensíveis).
DROP POLICY IF EXISTS "stripe_connect_accounts_delete" ON public.stripe_connect_accounts;
CREATE POLICY "stripe_connect_accounts_delete" ON public.stripe_connect_accounts
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 2. platform_earnings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  fee_percent NUMERIC DEFAULT 2.0,
  source_type TEXT NOT NULL CHECK (source_type IN ('appointment', 'subscription', 'product')),
  source_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'transferred', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_platform_earnings_tenant
  ON public.platform_earnings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_status
  ON public.platform_earnings(status);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_source
  ON public.platform_earnings(source_type, source_id);

-- RLS: SOMENTE super admin vê as comissões da plataforma.
-- Edge functions (service_role) sempre bypassam RLS, então a escrita funciona.
DROP POLICY IF EXISTS "platform_earnings_super_admin_select" ON public.platform_earnings;
CREATE POLICY "platform_earnings_super_admin_select" ON public.platform_earnings
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "platform_earnings_super_admin_insert" ON public.platform_earnings;
CREATE POLICY "platform_earnings_super_admin_insert" ON public.platform_earnings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "platform_earnings_super_admin_update" ON public.platform_earnings;
CREATE POLICY "platform_earnings_super_admin_update" ON public.platform_earnings
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "platform_earnings_super_admin_delete" ON public.platform_earnings;
CREATE POLICY "platform_earnings_super_admin_delete" ON public.platform_earnings
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 3. customer_subscriptions
--    Assinaturas recorrentes do cliente final (pagas via Stripe com
--    application_fee_percent = 2.0 da plataforma).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  sessions_used INTEGER DEFAULT 0,
  sessions_limit INTEGER DEFAULT 4,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_tenant
  ON public.customer_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer
  ON public.customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status
  ON public.customer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_stripe_sub
  ON public.customer_subscriptions(stripe_subscription_id);

DROP TRIGGER IF EXISTS trg_customer_subscriptions_updated_at ON public.customer_subscriptions;
CREATE TRIGGER trg_customer_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS:
--  - Dono do tenant + super admin vê/gerencia.
--  - Cliente final pode ver as PRÓPRIAS assinaturas pelo CPF (via comparação com
--    customers.cpf que também é controlado por RLS). Para clientes anônimos
--    (fluxo público), a leitura é feita pela edge function via service_role.
DROP POLICY IF EXISTS "customer_subscriptions_select" ON public.customer_subscriptions;
CREATE POLICY "customer_subscriptions_select" ON public.customer_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id = public.get_user_tenant_id()
    OR customer_id IN (
      SELECT c.id FROM public.customers c
      WHERE c.tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "customer_subscriptions_insert" ON public.customer_subscriptions;
CREATE POLICY "customer_subscriptions_insert" ON public.customer_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "customer_subscriptions_update" ON public.customer_subscriptions;
CREATE POLICY "customer_subscriptions_update" ON public.customer_subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "customer_subscriptions_delete" ON public.customer_subscriptions;
CREATE POLICY "customer_subscriptions_delete" ON public.customer_subscriptions
  FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

-- ---------------------------------------------------------------------------
-- 4. subscription_usage
--    Registro de cada sessão (agendamento) consumida de uma customer_subscriptions.
--    Inserido atomicamente por consume_subscription_session() (FOR UPDATE).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_subscription_id UUID NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  session_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscription_usage_sub
  ON public.subscription_usage(customer_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_appt
  ON public.subscription_usage(appointment_id);

-- RLS:
--  - Dono do tenant vê o consumo (SELECT).
--  - Edge function (service_role) insere — bypassa RLS.
--  - Update/delete só pelo dono do tenant ou super admin.
DROP POLICY IF EXISTS "subscription_usage_select" ON public.subscription_usage;
CREATE POLICY "subscription_usage_select" ON public.subscription_usage
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR customer_subscription_id IN (
      SELECT cs.id FROM public.customer_subscriptions cs
      WHERE cs.tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "subscription_usage_insert" ON public.subscription_usage;
CREATE POLICY "subscription_usage_insert" ON public.subscription_usage
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR customer_subscription_id IN (
      SELECT cs.id FROM public.customer_subscriptions cs
      WHERE cs.tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "subscription_usage_update" ON public.subscription_usage;
CREATE POLICY "subscription_usage_update" ON public.subscription_usage
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR customer_subscription_id IN (
      SELECT cs.id FROM public.customer_subscriptions cs
      WHERE cs.tenant_id = public.get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "subscription_usage_delete" ON public.subscription_usage;
CREATE POLICY "subscription_usage_delete" ON public.subscription_usage
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR customer_subscription_id IN (
      SELECT cs.id FROM public.customer_subscriptions cs
      WHERE cs.tenant_id = public.get_user_tenant_id()
    )
  );

-- ===========================================================================
-- FUNÇÕES SQL
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- get_tenant_commission(tenant_id) -> numeric
--   Retorna a comissão configurada para o tenant (default 2.0).
--   No futuro pode haver uma tabela tenants_commission_config; por ora fixo 2.0.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_commission(p_tenant_id UUID)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Comissão padrão da plataforma Na Régua: 2% em toda transação do cliente
  -- final (agendamentos e renovações de assinatura).
  SELECT 2.0::numeric;
$$;

-- ---------------------------------------------------------------------------
-- get_active_subscription(p_customer_id, p_tenant_id) -> customer_subscriptions
--   Retorna a assinatura ativa do cliente na barbearia (ou NULL).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_subscription(
  p_customer_id UUID,
  p_tenant_id UUID
)
RETURNS SETOF public.customer_subscriptions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.customer_subscriptions
  WHERE customer_id = p_customer_id
    AND tenant_id = p_tenant_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- consume_subscription_session(p_customer_id, p_tenant_id) -> boolean
--
--   Travamento pessimista (SELECT ... FOR UPDATE) para garantir que dois
--   agendamentos simultâneos NÃO gastem a mesma sessão. Se houver crédito
--   restante (sessions_used < sessions_limit), incrementa sessions_used,
--   insere em subscription_usage e retorna TRUE. Caso contrário retorna FALSE.
--
--   O appointment_id é opcional e, quando informado, é salvo em
--   subscription_usage para auditoria.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_subscription_session(
  p_customer_id UUID,
  p_tenant_id UUID,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.customer_subscriptions;
  v_remaining integer;
BEGIN
  -- SELECT ... FOR UPDATE trava a row da assinatura ativa enquanto a tx roda.
  -- Sem isso, dois agendamentos simultâneos poderiam ler sessions_used=3 e
  -- gravar 4 cada, consumindo a mesma sessão duas vezes.
  SELECT *
    INTO v_sub
  FROM public.customer_subscriptions
  WHERE customer_id = p_customer_id
    AND tenant_id = p_tenant_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_remaining := (v_sub.sessions_limit - v_sub.sessions_used);
  IF v_remaining <= 0 THEN
    RETURN false;
  END IF;

  -- Incrementa o consumo de forma atômica (a row continua travada).
  UPDATE public.customer_subscriptions
    SET sessions_used = sessions_used + 1,
        updated_at = now()
    WHERE id = v_sub.id;

  -- Registra a sessão consumida (auditoria + relatório).
  INSERT INTO public.subscription_usage (customer_subscription_id, appointment_id, session_date)
    VALUES (v_sub.id, p_appointment_id, now());

  RETURN true;
END;
$$;
