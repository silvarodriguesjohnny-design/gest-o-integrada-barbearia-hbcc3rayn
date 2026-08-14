-- ============================================================
-- Controle de Estoque Real
-- 1) Adiciona colunas de estoque na tabela products
-- 2) Cria enum stock_movement_type e tabela stock_movements
-- 3) Cria função SECURITY DEFINER para registrar movimentações
--    (baixa automática no PDV + entrada/ajuste manuais)
-- 4) RLS: apenas admin gerencia estoque; barbeiro comum (operator)
--    só lê products; cliente/anon sem acesso a stock_movements
-- ============================================================

-- 1) Colunas de estoque em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 5;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2);

-- Inicializa estoque de produtos existentes (default 0 já aplicado)
-- Índice para alertas de estoque baixo por tenant
CREATE INDEX IF NOT EXISTS idx_products_stock_tenant
  ON public.products(tenant_id, stock_quantity);

-- 2) Enum e tabela stock_movements
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE public.stock_movement_type AS ENUM ('entrada', 'saida');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.stock_movement_type NOT NULL,
  quantity integer NOT NULL CHECK (quantity <> 0),
  reason text NOT NULL DEFAULT 'Ajuste manual',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant
  ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
  ON public.stock_movements(created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS stock_movements: apenas admin (barbeiro chefe) lê/escreve
DROP POLICY IF EXISTS "stock_movements_admin_all" ON public.stock_movements;
CREATE POLICY "stock_movements_admin_all" ON public.stock_movements
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- 3) Função SECURITY DEFINER para registrar movimentações de estoque.
--    - reason = 'Venda PDV' (saida): permitido para admin e operator
--      (baixa automática no caixa)
--    - demais motivos (entrada/ajuste manual): apenas admin
--    Atualiza products.stock_quantity de forma atômica e insere o
--    histórico em stock_movements.
CREATE OR REPLACE FUNCTION public.register_stock_movement(
  p_product_id uuid,
  p_movement_type public.stock_movement_type,
  p_quantity integer,
  p_reason text DEFAULT 'Ajuste manual'
) RETURNS public.stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_tenant_id uuid;
  v_current integer;
  v_new integer;
  v_movement public.stock_movement_type := p_movement_type;
  v_qty integer := abs(p_quantity);
  v_row public.stock_movements;
BEGIN
  SELECT public.get_user_role() INTO v_role;

  -- Baixa automática no PDV: admin ou operator
  IF p_reason = 'Venda PDV' THEN
    IF v_role NOT IN ('admin', 'operator') THEN
      RAISE EXCEPTION 'Sem permissão para baixa de estoque';
    END IF;
    v_movement := 'saida';
  ELSE
    -- Entrada/ajuste manual: apenas admin (barbeiro chefe)
    IF v_role <> 'admin' THEN
      RAISE EXCEPTION 'Apenas o administrador pode ajustar o estoque';
    END IF;
  END IF;

  SELECT tenant_id, stock_quantity INTO v_tenant_id, v_current
    FROM public.products WHERE id = p_product_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

  IF v_movement = 'entrada' THEN
    v_new := v_current + v_qty;
  ELSE
    v_new := v_current - v_qty;
  END IF;

  UPDATE public.products
    SET stock_quantity = v_new
    WHERE id = p_product_id;

  INSERT INTO public.stock_movements
    (product_id, movement_type, quantity, reason, created_by, tenant_id)
  VALUES
    (p_product_id, v_movement, v_qty, p_reason, auth.uid(), v_tenant_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Permite que qualquer usuário autenticado chame a RPC (a validação
-- de papel é feita dentro da função).
GRANT EXECUTE ON FUNCTION public.register_stock_movement(uuid, public.stock_movement_type, integer, text)
  TO authenticated;
