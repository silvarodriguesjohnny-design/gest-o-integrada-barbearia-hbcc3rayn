CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID
);

CREATE INDEX IF NOT EXISTS idx_barbers_tenant ON public.barbers(tenant_id);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barbers_select" ON public.barbers;
CREATE POLICY "barbers_select" ON public.barbers FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "barbers_insert" ON public.barbers;
CREATE POLICY "barbers_insert" ON public.barbers FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "barbers_update" ON public.barbers;
CREATE POLICY "barbers_update" ON public.barbers FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "barbers_delete" ON public.barbers;
CREATE POLICY "barbers_delete" ON public.barbers FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP TRIGGER IF EXISTS set_tenant_on_barbers ON public.barbers;
CREATE TRIGGER set_tenant_on_barbers BEFORE INSERT ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DO $$
DECLARE
  demo_tenant_id uuid;
BEGIN
  SELECT id INTO demo_tenant_id FROM public.tenants LIMIT 1;
  IF demo_tenant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.barbers WHERE tenant_id = demo_tenant_id) THEN
      INSERT INTO public.barbers (name, tenant_id)
      VALUES
        ('João Silva', demo_tenant_id),
        ('Pedro Santos', demo_tenant_id);
    END IF;
  END IF;
END $$;
