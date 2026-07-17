CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_tenant ON public.partners(tenant_id);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_select" ON public.partners;
CREATE POLICY "partners_select" ON public.partners FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "partners_insert" ON public.partners;
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "partners_update" ON public.partners FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "partners_delete" ON public.partners;
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP TRIGGER IF EXISTS set_tenant_on_partners ON public.partners;
CREATE TRIGGER set_tenant_on_partners BEFORE INSERT ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_insert" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_update" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_delete" ON public.campaigns;

CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DO $$
DECLARE
  demo_tenant_id uuid;
BEGIN
  SELECT id INTO demo_tenant_id FROM public.tenants LIMIT 1;
  IF demo_tenant_id IS NOT NULL THEN
    INSERT INTO public.partners (name, discount_percentage, tenant_id)
    VALUES
      ('Academia SmartFit', 10.00, demo_tenant_id),
      ('Cervejaria Local', 15.00, demo_tenant_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
