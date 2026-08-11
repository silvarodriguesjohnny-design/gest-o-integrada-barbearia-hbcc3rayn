-- Enable RLS and create policy for public/anonymous submissions to pending_tenants
ALTER TABLE public.pending_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to pending_tenants" ON public.pending_tenants;
DROP POLICY IF EXISTS "allow_public_insert_pending_tenants" ON public.pending_tenants;
DROP POLICY IF EXISTS "allow_insert_pending_tenants_public" ON public.pending_tenants;
DROP POLICY IF EXISTS "pending_tenants_anon_insert" ON public.pending_tenants;
DROP POLICY IF EXISTS "pending_tenants_admin_insert" ON public.pending_tenants;

CREATE POLICY "Allow public insert to pending_tenants" ON public.pending_tenants
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
