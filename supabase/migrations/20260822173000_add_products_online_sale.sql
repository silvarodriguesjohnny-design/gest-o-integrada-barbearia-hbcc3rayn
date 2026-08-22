-- ===========================================================================
-- Venda de produtos online — carrinho pós-agendamento no link público
--
-- 1) Estende public.products com image_url, category, active, updated_at
--    (a tabela já existe — adicionamos apenas as colunas novas).
-- 2) Cria public.product_sales (registro de produtos vendidos no checkout).
-- 3) RLS:
--    - products: anon SELECT (link público) + mantém authenticated CRUD.
--    - product_sales: authenticated CRUD do tenant.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Novas colunas de products
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Geral';
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- updated_at trigger reaproveitando a função pública set_updated_at().
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Tabela product_sales
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'in_person',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_product_sales_tenant
  ON public.product_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_appointment
  ON public.product_sales(appointment_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product
  ON public.product_sales(product_id);

-- ---------------------------------------------------------------------------
-- 3) RLS — products
--    O link público (/agendar/:slug) precisa ler os produtos ativos do
--    tenant anonimamente. O slug é o token de acesso público, então a
--    leitura anon é ampla (igual a services/subscription_plans já fazem).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_select_anon" ON public.products;
CREATE POLICY "products_select_anon" ON public.products
  FOR SELECT TO anon USING (true);

-- Recria as políticas authenticated com isolamento por tenant (antes eram
-- USING true — agora travam ao tenant do usuário, exceto super admin).
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

-- ---------------------------------------------------------------------------
-- 3b) RLS — product_sales (somente o dono do tenant lê/gerencia)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_sales_select" ON public.product_sales;
CREATE POLICY "product_sales_select" ON public.product_sales
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "product_sales_insert" ON public.product_sales;
CREATE POLICY "product_sales_insert" ON public.product_sales
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "product_sales_update" ON public.product_sales;
CREATE POLICY "product_sales_update" ON public.product_sales
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "product_sales_delete" ON public.product_sales;
CREATE POLICY "product_sales_delete" ON public.product_sales
  FOR DELETE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

-- ---------------------------------------------------------------------------
-- 4) Storage bucket para imagens de produtos
--    Cria o bucket público e políticas de acesso: o dono do tenant faz
--    upload/update/delete dos próprios arquivos; anon só lê (público).
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Upload: authenticated, isolado por tenant via metadata do caminho
-- (product-images/<tenant_id>/<filename>).
DROP POLICY IF EXISTS "product_images_upload" ON storage.objects;
CREATE POLICY "product_images_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

-- Update: dono do tenant
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
CREATE POLICY "product_images_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

-- Delete: dono do tenant
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

-- Read: público (bucket público)
DROP POLICY IF EXISTS "product_images_read" ON storage.objects;
CREATE POLICY "product_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
