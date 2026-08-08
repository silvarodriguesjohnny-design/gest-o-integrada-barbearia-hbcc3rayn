-- Fix GET 400 on /rest/v1/appointments: Add missing FK from appointments.tenant_id to tenants.id
-- Without this FK, PostgREST cannot resolve embedded resource joins like tenant:tenants(name)
-- This caused the public-booking and send-appointment-notification edge functions to silently
-- fail when loading the full appointment with tenant data.

-- Clean up orphaned tenant_id references before adding constraint
DELETE FROM public.appointments
WHERE tenant_id IS NOT NULL
  AND tenant_id NOT IN (SELECT id FROM public.tenants);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Also add FKs for other tables that use tenant:tenants(name) joins in edge functions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;
END $$;
