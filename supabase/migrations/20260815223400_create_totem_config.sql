-- Tabela de configuração do PWA do Totem (1 linha por tenant).
-- Guarda nome do app, cores, ícones e slug da barbearia que será empacotada.
CREATE TABLE IF NOT EXISTS public.totem_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  background_color TEXT NOT NULL DEFAULT '#D4A44A',
  theme_color TEXT NOT NULL DEFAULT '#D4A44A',
  icon_192_url TEXT,
  icon_512_url TEXT,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uma configuração por tenant (upsert do admin)
CREATE UNIQUE INDEX IF NOT EXISTS idx_totem_config_tenant_id
  ON public.totem_config(tenant_id);

-- RLS: admin (super_admin) gerencia; leitura pública do manifest via edge function
-- (que usa service role), mas mantemos leitura pública anon para o frontend do totem
-- poder buscar o manifest diretamente da tabela.
ALTER TABLE public.totem_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "totem_config_select" ON public.totem_config;
CREATE POLICY "totem_config_select" ON public.totem_config
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "totem_config_insert" ON public.totem_config;
CREATE POLICY "totem_config_insert" ON public.totem_config
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "totem_config_update" ON public.totem_config;
CREATE POLICY "totem_config_update" ON public.totem_config
  FOR UPDATE TO authenticated USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "totem_config_delete" ON public.totem_config;
CREATE POLICY "totem_config_delete" ON public.totem_config
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- Bucket público para ícones do PWA (192/512)
INSERT INTO storage.buckets (id, name, public)
VALUES ('totem-icons', 'totem-icons', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "totem_icons_public_read" ON storage.objects;
CREATE POLICY "totem_icons_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'totem-icons');

DROP POLICY IF EXISTS "totem_icons_authenticated_write" ON storage.objects;
CREATE POLICY "totem_icons_authenticated_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'totem-icons');

DROP POLICY IF EXISTS "totem_icons_authenticated_update" ON storage.objects;
CREATE POLICY "totem_icons_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'totem-icons');
