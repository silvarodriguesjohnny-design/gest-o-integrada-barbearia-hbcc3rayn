-- Adiciona o campo de preferência do barbeiro para pagamento antecipado.
-- O Stripe (chaves, webhook) é 100% responsabilidade do admin/super admin.
-- O barbeiro só liga/desliga este toggle Sim/Não na sua agenda.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS prepayment_enabled BOOLEAN NOT NULL DEFAULT false;

-- Reafirma as policies de UPDATE do tenants (idempotente): só o dono da
-- barbearia (owner_id = auth.uid()) ou um super admin pode alterar o tenant
-- (incluindo o novo campo prepayment_enabled).
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR owner_id = auth.uid());

-- Garante leitura pelo dono (e super admin) — idempotente.
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid() OR id = public.get_user_tenant_id());
