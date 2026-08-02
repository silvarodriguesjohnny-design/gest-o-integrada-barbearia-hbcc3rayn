ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.barber_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(barber_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_barber_schedules_barber ON public.barber_schedules(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_schedules_tenant ON public.barber_schedules(tenant_id);

ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barber_schedules_select" ON public.barber_schedules;
CREATE POLICY "barber_schedules_select" ON public.barber_schedules
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "barber_schedules_insert" ON public.barber_schedules;
CREATE POLICY "barber_schedules_insert" ON public.barber_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "barber_schedules_update" ON public.barber_schedules;
CREATE POLICY "barber_schedules_update" ON public.barber_schedules
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "barber_schedules_delete" ON public.barber_schedules;
CREATE POLICY "barber_schedules_delete" ON public.barber_schedules
  FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP TRIGGER IF EXISTS set_tenant_on_barber_schedules ON public.barber_schedules;
CREATE TRIGGER set_tenant_on_barber_schedules BEFORE INSERT ON public.barber_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DO $$
DECLARE
  b RECORD;
BEGIN
  FOR b IN SELECT id, tenant_id FROM public.barbers LIMIT 2 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.barber_schedules WHERE barber_id = b.id) THEN
      INSERT INTO public.barber_schedules (barber_id, day_of_week, start_time, end_time, tenant_id)
      VALUES
        (b.id, 1, '09:00', '18:00', b.tenant_id),
        (b.id, 2, '09:00', '18:00', b.tenant_id),
        (b.id, 3, '09:00', '18:00', b.tenant_id),
        (b.id, 4, '09:00', '18:00', b.tenant_id),
        (b.id, 5, '09:00', '18:00', b.tenant_id),
        (b.id, 6, '09:00', '16:00', b.tenant_id);
    END IF;
  END LOOP;
END $$;
