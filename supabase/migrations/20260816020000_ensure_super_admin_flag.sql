-- Garante que a coluna is_super_admin exista em profiles e que o usuário
-- rodriguesjohnny@hotmail.com esteja marcado como super admin, permitindo
-- acesso ao painel /admin/* protegido pelo SuperAdminRoute.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Marca o usuário alvo como super admin (idempotente).
UPDATE public.profiles
SET is_super_admin = true
WHERE email = 'rodriguesjohnny@hotmail.com';
