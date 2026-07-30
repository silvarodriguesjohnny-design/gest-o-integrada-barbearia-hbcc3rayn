-- Add explicit RLS policy allowing authenticated admin/super_admin users to INSERT into pending_tenants
-- This complements the existing public insert policies for the onboarding form
DROP POLICY IF EXISTS "pending_tenants_admin_insert" ON public.pending_tenants;
CREATE POLICY "pending_tenants_admin_insert" ON public.pending_tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin' OR public.is_super_admin());
