CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_appointment_completed()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status != 'completed') THEN
    UPDATE public.customers SET last_visit_at = NOW() WHERE id = NEW.customer_id;

    INSERT INTO public.loyalty_cards (customer_id, stamps_count, is_reward_ready)
    VALUES (NEW.customer_id, 1, false)
    ON CONFLICT (customer_id) DO UPDATE
    SET stamps_count = LEAST(public.loyalty_cards.stamps_count + 1, 12),
        is_reward_ready = (public.loyalty_cards.stamps_count + 1 >= 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_appointment_change
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_completed();

CREATE OR REPLACE VIEW public.inactive_customers AS
SELECT c.* FROM public.customers c
WHERE c.last_visit_at IS NOT NULL
  AND c.last_visit_at < NOW() - INTERVAL '60 days'
UNION
SELECT c.* FROM public.customers c
WHERE c.last_visit_at IS NULL
  AND c.created_at < NOW() - INTERVAL '60 days';

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
  r user_role;
BEGIN
  SELECT role INTO r FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(r, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
