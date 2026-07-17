DO $$ BEGIN
  CREATE TYPE subscription_type AS ENUM ('trial', 'active', 'past_due');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_type subscription_type NOT NULL DEFAULT 'trial';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

UPDATE public.tenants SET trial_ends_at = NOW() + INTERVAL '30 days' WHERE trial_ends_at IS NULL;
UPDATE public.tenants SET subscription_type = 'active' WHERE subscription_type = 'trial' AND created_at < NOW() - INTERVAL '30 days';

DO $$
DECLARE
  admin_user_id uuid;
  demo_tenant_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'rodriguesjohnny@hotmail.com';

  IF admin_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE owner_id = admin_user_id) THEN
      INSERT INTO public.tenants (name, owner_id, plan_type, subscription_type, trial_ends_at, whatsapp_phone)
      VALUES ('Barbearia na Régua', admin_user_id, 'pro', 'active', NOW() + INTERVAL '365 days', '+5511987654321');
    END IF;

    SELECT id INTO demo_tenant_id FROM public.tenants WHERE owner_id = admin_user_id LIMIT 1;
    UPDATE public.profiles SET tenant_id = demo_tenant_id WHERE id = admin_user_id AND tenant_id IS NULL;

    UPDATE public.customers SET tenant_id = demo_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.services SET tenant_id = demo_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.appointments SET tenant_id = demo_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.transactions SET tenant_id = demo_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.loyalty_cards SET tenant_id = demo_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.campaigns SET tenant_id = demo_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;
