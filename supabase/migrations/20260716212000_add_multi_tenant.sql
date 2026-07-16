DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('essential', 'pro', 'elite');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  plan_type plan_type NOT NULL DEFAULT 'essential',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_tenant ON public.loyalty_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON public.campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  s boolean;
BEGIN
  SELECT is_super_admin INTO s FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(s, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid AS $$
DECLARE
  t uuid;
BEGIN
  SELECT tenant_id INTO t FROM public.profiles WHERE id = auth.uid();
  RETURN t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_tenant_on_customers ON public.customers;
CREATE TRIGGER set_tenant_on_customers BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_on_services ON public.services;
CREATE TRIGGER set_tenant_on_services BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_on_appointments ON public.appointments;
CREATE TRIGGER set_tenant_on_appointments BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_on_transactions ON public.transactions;
CREATE TRIGGER set_tenant_on_transactions BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_on_loyalty_cards ON public.loyalty_cards;
CREATE TRIGGER set_tenant_on_loyalty_cards BEFORE INSERT ON public.loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_on_campaigns ON public.campaigns;
CREATE TRIGGER set_tenant_on_campaigns BEFORE INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email = 'rodriguesjohnny@hotmail.com'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE VIEW public.inactive_customers WITH (security_invoker = true) AS
SELECT c.* FROM public.customers c
WHERE c.last_visit_at IS NOT NULL
  AND c.last_visit_at < NOW() - INTERVAL '60 days'
UNION
SELECT c.* FROM public.customers c
WHERE c.last_visit_at IS NULL
  AND c.created_at < NOW() - INTERVAL '60 days';

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_authenticated_write" ON storage.objects;
CREATE POLICY "logos_authenticated_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_authenticated_update" ON storage.objects;
CREATE POLICY "logos_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'logos');

UPDATE public.profiles SET is_super_admin = true WHERE email = 'rodriguesjohnny@hotmail.com';
