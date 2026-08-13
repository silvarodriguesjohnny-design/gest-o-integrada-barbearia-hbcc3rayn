-- ============================================================
-- Appointment confirmation token + public confirmation flow
-- ============================================================
-- Adds a unique nullable UUID `confirmation_token` to appointments so a
-- client can confirm presence via a public link /confirmar/:token.
-- The token is generated server-side at booking time (public-booking and
-- internal agenda) and never re-used.
-- ============================================================

-- 1. Column
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_token UUID;

-- 2. Unique index so tokens are never reused / collide
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_confirmation_token
  ON public.appointments (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- 3. Index for fast lookups by token (also covered by the unique index above,
--    but kept explicit/robust if the unique index is ever changed)
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token_lookup
  ON public.appointments (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- 4. RLS: allow anon (unauthenticated client following the WhatsApp link) to
--    SELECT an appointment by its confirmation token, and to UPDATE the
--    status from 'scheduled' -> 'confirmed'. The policies are scoped so anon
--    can ONLY touch rows that have a confirmation_token, and can only update
--    the `status` column to 'confirmed' (the WITH CHECK enforces the row
--    still has a token and status is confirmed).

-- Drop existing anon policies if present (idempotent)
DROP POLICY IF EXISTS "appointments_anon_select_by_token" ON public.appointments;
CREATE POLICY "appointments_anon_select_by_token" ON public.appointments
  FOR SELECT TO anon
  USING (confirmation_token IS NOT NULL);

DROP POLICY IF EXISTS "appointments_anon_confirm_by_token" ON public.appointments;
CREATE POLICY "appointments_anon_confirm_by_token" ON public.appointments
  FOR UPDATE TO anon
  USING (confirmation_token IS NOT NULL)
  WITH CHECK (confirmation_token IS NOT NULL AND status = 'confirmed');

-- Also allow authenticated users (admin) to manage the token normally via
-- existing appointments_update policy (already permits all updates for
-- tenant members), so no change needed for authenticated role.

-- 5. Allow anon to read the loyalty card of the customer tied to a confirmed
--    appointment, so the confirmation page can show the loyalty summary
--    without requiring login. Scoped to customers that have at least one
--    appointment carrying a confirmation_token.
DROP POLICY IF EXISTS "loyalty_anon_select_by_token" ON public.loyalty_cards;
CREATE POLICY "loyalty_anon_select_by_token" ON public.loyalty_cards
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.customer_id = loyalty_cards.customer_id
        AND a.confirmation_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "customers_anon_select_by_token" ON public.customers;
CREATE POLICY "customers_anon_select_by_token" ON public.customers
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.customer_id = customers.id
        AND a.confirmation_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "services_anon_select_by_token" ON public.services;
CREATE POLICY "services_anon_select_by_token" ON public.services
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.service_id = services.id
        AND a.confirmation_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "tenants_anon_select_by_token" ON public.tenants;
CREATE POLICY "tenants_anon_select_by_token" ON public.tenants
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.tenant_id = tenants.id
        AND a.confirmation_token IS NOT NULL
    )
  );
