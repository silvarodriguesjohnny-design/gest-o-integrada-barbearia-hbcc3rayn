-- ============================================================
-- Fix the notification pipeline: ensure the DB trigger and cron
-- job can actually invoke edge functions by including the
-- required `apikey` header in pg_net calls.
--
-- The edge functions have JWT verification disabled, so the anon
-- (publishable) key is sufficient. We inline it directly in the
-- function bodies instead of using ALTER DATABASE SET (which
-- requires superuser privileges and only applies to new sessions).
-- ============================================================

-- 1. Update trigger_appointment_confirmation to include apikey header
CREATE OR REPLACE FUNCTION public.trigger_appointment_confirmation()
RETURNS trigger AS $$
DECLARE
  fn_url text;
  svc_key text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'scheduled' THEN
    RETURN NEW;
  END IF;

  fn_url := 'https://xjfzaanptzgojdnvirvg.supabase.co/functions/v1/send-appointment-notification';
  svc_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZnphYW5wdHpnb2pkbnZpcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjYzOTMsImV4cCI6MjA5OTgwMjM5M30.cecz1W7ae8g1KpzLNG1qxeq8YTl0XdpH031SFUD92dY';

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', svc_key,
      'Authorization', 'Bearer ' || svc_key
    ),
    body := jsonb_build_object(
      'appointment_id', NEW.id,
      'type', 'confirmation'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update trigger_send_notifications to include apikey header
CREATE OR REPLACE FUNCTION public.trigger_send_notifications()
RETURNS void AS $$
DECLARE
  fn_url text;
  svc_key text;
BEGIN
  fn_url := 'https://xjfzaanptzgojdnvirvg.supabase.co/functions/v1/send-notifications';
  svc_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZnphYW5wdHpnb2pkbnZpcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjYzOTMsImV4cCI6MjA5OTgwMjM5M30.cecz1W7ae8g1KpzLNG1qxeq8YTl0XdpH031SFUD92dY';

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', svc_key,
      'Authorization', 'Bearer ' || svc_key
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-schedule the cron job to pick up the updated function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-appointment-reminders') THEN
    PERFORM cron.unschedule('send-appointment-reminders');
  END IF;
END $$;

SELECT cron.schedule(
  'send-appointment-reminders',
  '*/30 * * * *',
  $$ SELECT public.trigger_send_notifications(); $$
);
