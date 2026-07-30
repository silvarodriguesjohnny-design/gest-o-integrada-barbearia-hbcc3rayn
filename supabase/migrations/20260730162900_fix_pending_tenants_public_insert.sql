-- Ensure anonymous users can INSERT into pending_tenants without RLS errors
-- Use a DO block to avoid DROP/CREATE cycles that can trigger transient 502s
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pending_tenants'
      AND schemaname = 'public'
      AND policyname = 'allow_public_insert_pending_tenants'
  ) THEN
    CREATE POLICY "allow_public_insert_pending_tenants" ON public.pending_tenants
      FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END
$$;
