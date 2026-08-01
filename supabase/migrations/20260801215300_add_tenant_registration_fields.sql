ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS rua TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS horario_funcionamento TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS numero_cadeiras INTEGER DEFAULT 1;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS quantidade_profissionais INTEGER DEFAULT 1;

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR owner_id = auth.uid());
