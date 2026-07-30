-- Consolidate and ensure a single clean public INSERT policy on pending_tenants
-- Drop all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "allow_insert_pending_tenants_public" ON public.pending_tenants;
DROP POLICY IF EXISTS "allow_public_insert_pending_tenants" ON public.pending_tenants;
DROP POLICY IF EXISTS "pending_tenants_anon_insert" ON public.pending_tenants;
DROP POLICY IF EXISTS "pending_tenants_admin_insert" ON public.pending_tenants;

-- Allow anyone (anon + authenticated) to INSERT — public onboarding form
CREATE POLICY "allow_public_insert_pending_tenants" ON public.pending_tenants
  FOR INSERT TO anon, authenticated WITH CHECK (true);
