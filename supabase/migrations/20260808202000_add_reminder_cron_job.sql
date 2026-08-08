-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function that invokes the send-notifications edge function
CREATE OR REPLACE FUNCTION public.trigger_send_notifications()
RETURNS void AS $$
DECLARE
  fn_url text;
  svc_key text;
BEGIN
  fn_url := 'https://xjfzaanptzgojdnvirvg.supabase.co/functions/v1/send-notifications';
  svc_key := current_setting('app.settings.service_role_key', true);

  IF svc_key IS NULL OR svc_key = '' THEN
    RAISE NOTICE 'Service role key not available in app.settings; skipping send-notifications invocation.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove existing schedule if present (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-appointment-reminders') THEN
    PERFORM cron.unschedule('send-appointment-reminders');
  END IF;
END $$;

-- Schedule the reminder job to run every 30 minutes
SELECT cron.schedule(
  'send-appointment-reminders',
  '*/30 * * * *',
  $$ SELECT public.trigger_send_notifications(); $$
);
