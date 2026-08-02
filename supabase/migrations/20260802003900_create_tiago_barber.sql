DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.appointments
  WHERE barber_name = 'Thiago'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.appointments LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.barbers
    WHERE name = 'Tiago' AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    INSERT INTO public.barbers (name, tenant_id)
    VALUES ('Tiago', v_tenant_id);
  END IF;

  UPDATE public.appointments
  SET barber_name = 'Tiago'
  WHERE barber_name = 'Thiago';
END $$;
