ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "tenants_delete" ON public.tenants;
CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id() OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "customers_all" ON public.customers;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "services_all" ON public.services;
DROP POLICY IF EXISTS "services_select" ON public.services;
CREATE POLICY "services_select" ON public.services FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "services_insert" ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "services_update" ON public.services FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "services_delete" ON public.services FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "appointments_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
CREATE POLICY "appointments_select" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "appointments_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "appointments_update" ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "appointments_delete" ON public.appointments FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "transactions_all" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "loyalty_all" ON public.loyalty_cards;
DROP POLICY IF EXISTS "loyalty_select" ON public.loyalty_cards;
DROP POLICY IF EXISTS "loyalty_insert" ON public.loyalty_cards;
DROP POLICY IF EXISTS "loyalty_update" ON public.loyalty_cards;
CREATE POLICY "loyalty_select" ON public.loyalty_cards FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "loyalty_insert" ON public.loyalty_cards FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "loyalty_update" ON public.loyalty_cards FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "loyalty_delete" ON public.loyalty_cards FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "campaigns_all" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
