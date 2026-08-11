DO $$
BEGIN
  UPDATE public.services
  SET duration_minutes = 60
  WHERE name = 'Combo';
END $$;
