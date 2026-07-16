ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.get_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- customers
DROP POLICY IF EXISTS "customers_all" ON public.customers;
CREATE POLICY "customers_all" ON public.customers FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator', 'viewer'));
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'operator'));
DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator'))
  WITH CHECK (public.get_user_role() IN ('admin', 'operator'));

-- services
DROP POLICY IF EXISTS "services_all" ON public.services;
CREATE POLICY "services_all" ON public.services FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "services_select" ON public.services;
CREATE POLICY "services_select" ON public.services FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator', 'viewer'));

-- appointments
DROP POLICY IF EXISTS "appointments_all" ON public.appointments;
CREATE POLICY "appointments_all" ON public.appointments FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
CREATE POLICY "appointments_select" ON public.appointments FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator', 'viewer'));
DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
CREATE POLICY "appointments_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'operator'));
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
CREATE POLICY "appointments_update" ON public.appointments FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator'))
  WITH CHECK (public.get_user_role() IN ('admin', 'operator'));

-- transactions (admin only)
DROP POLICY IF EXISTS "transactions_all" ON public.transactions;
CREATE POLICY "transactions_all" ON public.transactions FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');

-- loyalty_cards
DROP POLICY IF EXISTS "loyalty_all" ON public.loyalty_cards;
CREATE POLICY "loyalty_all" ON public.loyalty_cards FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "loyalty_select" ON public.loyalty_cards;
CREATE POLICY "loyalty_select" ON public.loyalty_cards FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator'));
DROP POLICY IF EXISTS "loyalty_insert" ON public.loyalty_cards;
CREATE POLICY "loyalty_insert" ON public.loyalty_cards FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'operator'));
DROP POLICY IF EXISTS "loyalty_update" ON public.loyalty_cards;
CREATE POLICY "loyalty_update" ON public.loyalty_cards FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator'))
  WITH CHECK (public.get_user_role() IN ('admin', 'operator'));

-- campaigns
DROP POLICY IF EXISTS "campaigns_all" ON public.campaigns;
CREATE POLICY "campaigns_all" ON public.campaigns FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'operator', 'viewer'));
