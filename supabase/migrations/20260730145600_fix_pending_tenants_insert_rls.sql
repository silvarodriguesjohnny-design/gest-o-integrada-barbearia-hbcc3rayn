-- Allow any user (including anonymous) to INSERT into pending_tenants
-- This is needed because the onboarding form is a public page
DROP POLICY IF EXISTS "allow_insert_pending_tenants_public" ON public.pending_tenants;
CREATE POLICY "allow_insert_pending_tenants_public" ON public.pending_tenants
  FOR INSERT TO anon, authenticated WITH CHECK (true);
