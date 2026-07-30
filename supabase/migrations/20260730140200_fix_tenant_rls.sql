DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
DROP POLICY IF EXISTS "allow_insert_tenants" ON public.tenants;
CREATE POLICY "allow_insert_tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid() OR id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin'))
  WITH CHECK (id = auth.uid() OR public.is_super_admin() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin'));
