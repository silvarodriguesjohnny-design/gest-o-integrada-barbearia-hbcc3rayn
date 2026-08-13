-- Migration: Seed admin user and update pending_tenants policies
DO $$
DECLARE
  super_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rodriguesjohnny@hotmail.com') THEN
    super_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      super_user_id,
      '00000000-0000-0000-0000-000000000000',
      'rodriguesjohnny@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Johnny Rodrigues"}',
      true, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );

    INSERT INTO public.profiles (
      id, email, full_name, role, is_super_admin
    ) VALUES (
      super_user_id,
      'rodriguesjohnny@hotmail.com',
      'Johnny Rodrigues',
      'admin',
      true
    ) ON CONFLICT (id) DO UPDATE SET is_super_admin = true, role = 'admin';
  ELSE
    UPDATE public.profiles
    SET is_super_admin = true, role = 'admin'
    WHERE email = 'rodriguesjohnny@hotmail.com';
  END IF;
END $$;

-- Ensure RLS policies for pending_tenants are complete and idempotent
DROP POLICY IF EXISTS "pending_tenants_select_authenticated" ON public.pending_tenants;
CREATE POLICY "pending_tenants_select_authenticated" ON public.pending_tenants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pending_tenants_update_authenticated" ON public.pending_tenants;
CREATE POLICY "pending_tenants_update_authenticated" ON public.pending_tenants
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "pending_tenants_delete_authenticated" ON public.pending_tenants;
CREATE POLICY "pending_tenants_delete_authenticated" ON public.pending_tenants
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "pending_tenants_insert_all" ON public.pending_tenants;
CREATE POLICY "pending_tenants_insert_all" ON public.pending_tenants
  FOR INSERT WITH CHECK (true);
