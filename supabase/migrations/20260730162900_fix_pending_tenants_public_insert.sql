-- Ensure anonymous users can INSERT into pending_tenants without RLS errors
-- Drop any previously created insert policies to avoid conflicts
DROP POLICY IF EXISTS "pending_tenants_anon_insert" ON public.pending_tenants;
DROP POLICY IF EXISTS "allow_insert_pending_tenants_public" ON public.pending_tenants;
DROP POLICY IF EXISTS "allow_public_insert_pending_tenants" ON public.pending_tenants;

-- Create the definitive public insert policy
CREATE POLICY "allow_public_insert_pending_tenants" ON public.pending_tenants
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
