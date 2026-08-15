-- ============================================================
-- Barber public agenda: public_token + barber_id on appointments
-- ============================================================
-- 1. Adds a unique `public_token` (uuid) to `barbers` so each barber
--    has a shareable, unauthenticated link /barbeiro/{token} that
--    exposes their upcoming appointments.
-- 2. Adds `barber_id` (nullable FK -> barbers.id) to `appointments`
--    and backfills it from `barber_name` matched within the same tenant.
-- 3. RLS policies allowing anon SELECT on barbers (by token) and on
--    appointments (future/today only, for that barber's token).
-- Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

-- -------------------------------------------------------
-- 1. barbers.public_token
-- -------------------------------------------------------
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid();

-- Backfill tokens for any pre-existing barbers that have NULL token
UPDATE public.barbers
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

-- Unique index so tokens never collide / are never reused
CREATE UNIQUE INDEX IF NOT EXISTS idx_barbers_public_token
  ON public.barbers (public_token)
  WHERE public_token IS NOT NULL;

-- Fast lookup by token
CREATE INDEX IF NOT EXISTS idx_barbers_public_token_lookup
  ON public.barbers (public_token)
  WHERE public_token IS NOT NULL;

-- -------------------------------------------------------
-- 2. appointments.barber_id
-- -------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS barber_id UUID;

-- Foreign key (nullable). Drop first if exists to keep idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_barber_id_fkey'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_barber_id_fkey
      FOREIGN KEY (barber_id) REFERENCES public.barbers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_barber_id
  ON public.appointments (barber_id)
  WHERE barber_id IS NOT NULL;

-- Backfill barber_id from barber_name matched within the same tenant.
-- Only touches rows that still have NULL barber_id.
UPDATE public.appointments a
SET barber_id = b.id
FROM public.barbers b
WHERE a.barber_id IS NULL
  AND a.barber_name IS NOT NULL
  AND trim(a.barber_name) <> ''
  AND b.name = a.barber_name
  AND (a.tenant_id IS NULL OR a.tenant_id = b.tenant_id);

-- -------------------------------------------------------
-- 3. RLS policies for anonymous barber agenda access
-- -------------------------------------------------------

-- Allow anon to read the barber row that owns a public_token.
-- Supabase: the anon role only has SELECT by default on tables where a
-- policy targets `TO anon`, so we add one scoped to public_token presence.
DROP POLICY IF EXISTS "barbers_anon_select_by_token" ON public.barbers;
CREATE POLICY "barbers_anon_select_by_token" ON public.barbers
  FOR SELECT TO anon
  USING (public_token IS NOT NULL);

-- Allow anon to read appointments whose barber is reachable by a public_token.
-- Only future or today's appointments are exposed (no historical exposure).
-- "Today" is computed in America/Sao_Paulo to match the app locale.
DROP POLICY IF EXISTS "appointments_anon_select_by_barber_token" ON public.appointments;
CREATE POLICY "appointments_anon_select_by_barber_token" ON public.appointments
  FOR SELECT TO anon
  USING (
    barber_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.barbers b
      WHERE b.id = appointments.barber_id
        AND b.public_token IS NOT NULL
    )
    AND start_time >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
  );

-- Allow anon to read the customers and services referenced by those
-- barber-token appointments, so the public agenda can show client/service names.
DROP POLICY IF EXISTS "customers_anon_select_by_barber_token" ON public.customers;
CREATE POLICY "customers_anon_select_by_barber_token" ON public.customers
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.customer_id = customers.id
        AND a.barber_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.barbers b
          WHERE b.id = a.barber_id AND b.public_token IS NOT NULL
        )
    )
  );

DROP POLICY IF EXISTS "services_anon_select_by_barber_token" ON public.services;
CREATE POLICY "services_anon_select_by_barber_token" ON public.services
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.service_id = services.id
        AND a.barber_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.barbers b
          WHERE b.id = a.barber_id AND b.public_token IS NOT NULL
        )
    )
  );
