-- Ensure RLS policies allow admin to manage pending_tenants
DROP POLICY IF EXISTS "pending_tenants_select" ON public.pending_tenants;
CREATE POLICY "pending_tenants_select" ON public.pending_tenants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pending_tenants_update" ON public.pending_tenants;
CREATE POLICY "pending_tenants_update" ON public.pending_tenants
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pending_tenants_delete" ON public.pending_tenants;
CREATE POLICY "pending_tenants_delete" ON public.pending_tenants
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_public_insert_pending_tenants" ON public.pending_tenants;
CREATE POLICY "allow_public_insert_pending_tenants" ON public.pending_tenants
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed initial admin user (idempotent)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rodriguesjohnny@hotmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'rodriguesjohnny@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Administrador"}',
      true, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, full_name, is_super_admin, role)
    VALUES (new_user_id, 'rodriguesjohnny@hotmail.com', 'Administrador', true, 'admin')
    ON CONFLICT (id) DO UPDATE SET
      is_super_admin = true, role = 'admin', full_name = 'Administrador';
  END IF;
END $$;

-- If user already exists, ensure profile is set as super admin
INSERT INTO public.profiles (id, email, full_name, is_super_admin, role)
SELECT id, email, 'Administrador', true, 'admin'
FROM auth.users
WHERE email = 'rodriguesjohnny@hotmail.com'
ON CONFLICT (id) DO UPDATE SET
  is_super_admin = true, role = 'admin';
