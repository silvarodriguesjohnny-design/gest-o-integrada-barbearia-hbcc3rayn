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
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'rodriguesjohnny@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Administrador"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_user_id, 'rodriguesjohnny@hotmail.com', 'Administrador', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

INSERT INTO public.services (id, name, description, price, duration_minutes) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Corte', 'Corte de cabelo masculino', 45.00, 30),
  ('a0000000-0000-0000-0000-000000000002', 'Barba', 'Modelagem de barba', 35.00, 20),
  ('a0000000-0000-0000-0000-000000000003', 'Combo', 'Corte + Barba', 75.00, 50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, name, email, phone, birthday, created_at, last_visit_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'João Silva', 'joao@email.com', '(11) 98765-4321', '1990-05-15', '2023-01-10T00:00:00Z', '2026-07-10T14:00:00Z'),
  ('b0000000-0000-0000-0000-000000000002', 'Carlos Santos', 'carlos@email.com', '(11) 91234-5678', '1985-12-22', '2023-03-15T00:00:00Z', '2026-07-01T10:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'Roberto Almeida', 'roberto@email.com', '(11) 99999-8888', '1992-07-16', '2023-06-01T00:00:00Z', '2026-07-14T14:00:00Z'),
  ('b0000000-0000-0000-0000-000000000004', 'Fernando Costa', 'fernando@email.com', '(11) 97777-6666', '1988-03-08', '2023-07-20T00:00:00Z', '2026-04-10T09:00:00Z'),
  ('b0000000-0000-0000-0000-000000000005', 'Marcos Paulo', 'marcos@email.com', '(11) 95555-4444', '1995-09-30', '2023-02-05T00:00:00Z', '2026-07-12T16:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.loyalty_cards (id, customer_id, stamps_count, is_reward_ready) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 11, false),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 3, false),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 8, false),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 1, false),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 5, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (id, customer_id, service_id, barber_name, status, start_time, end_time) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Thiago', 'confirmed', '2026-07-16T09:00:00Z', '2026-07-16T09:50:00Z'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Felipe', 'scheduled', '2026-07-16T10:30:00Z', '2026-07-16T11:00:00Z'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Thiago', 'completed', '2026-07-16T14:00:00Z', '2026-07-16T14:20:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, type, amount, description, category, payment_method, customer_id, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'income', 35.00, 'Serviço: Barba (Roberto Almeida)', 'servico', 'PIX', 'b0000000-0000-0000-0000-000000000003', '2026-07-16T14:30:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'expense', 350.00, 'Compra de Produtos - Fornecedor A', 'fornecedor', 'Transferência', NULL, '2026-07-15T10:00:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'income', 75.00, 'Serviço: Combo (João Silva)', 'servico', 'Cartão de Crédito', 'b0000000-0000-0000-0000-000000000001', '2026-07-14T18:00:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'income', 45.00, 'Serviço: Corte (Marcos Paulo)', 'servico', 'PIX', 'b0000000-0000-0000-0000-000000000005', '2026-07-12T16:30:00Z'),
  ('e0000000-0000-0000-0000-000000000005', 'income', 35.00, 'Serviço: Barba (Carlos Santos)', 'servico', 'Dinheiro', 'b0000000-0000-0000-0000-000000000002', '2026-07-01T10:30:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.campaigns (id, title, discount_percentage, start_date, end_date, auto_trigger, message_template, is_active) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Dia dos Pais', 15.00, '2026-08-01', '2026-08-15', true, 'Fala {nome}! O Dia dos Pais está chegando. Venha dar um trato no visual e ganhe 15% de desconto. Agende aqui: {link}', true),
  ('f0000000-0000-0000-0000-000000000002', 'Aniversariantes do Mês', 10.00, '2026-07-01', '2026-07-31', false, 'Feliz aniversário {nome}! Venha comemorar seu mês com a gente e ganhe 10% de desconto em qualquer serviço!', false)
ON CONFLICT (id) DO NOTHING;
