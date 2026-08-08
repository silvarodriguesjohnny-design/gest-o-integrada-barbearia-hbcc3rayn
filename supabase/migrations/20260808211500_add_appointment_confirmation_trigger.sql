-- Add composite index for faster duplicate-check queries on notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_appt_channel_status
  ON public.notification_logs(appointment_id, channel, status, notification_type);

-- Index for filtering by notification_type (used by send-appointment-notification)
CREATE INDEX IF NOT EXISTS idx_notification_logs_type
  ON public.notification_logs(notification_type);

-- ---------------------------------------------------------------------------
-- Database trigger: after a new appointment is inserted, dispatch a
-- confirmation WhatsApp message via the send-appointment-notification edge
-- function using pg_net.  This guarantees a server-side confirmation for
-- EVERY appointment (public booking link AND internal agenda) without
-- depending on the browser.
-- The send-appointment-notification edge function already has duplicate
-- protection (only skips when a *successful* send exists), so multiple
-- triggers (e.g. from the public-booking edge function's explicit call plus
-- this trigger) are safe.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trigger_appointment_confirmation()
RETURNS trigger AS $$
DECLARE
  fn_url text;
  svc_key text;
BEGIN
  -- Only send confirmation for newly scheduled appointments
  IF NEW.status IS DISTINCT FROM 'scheduled' THEN
    RETURN NEW;
  END IF;

  fn_url := 'https://xjfzaanptzgojdnvirvg.supabase.co/functions/v1/send-appointment-notification';
  svc_key := current_setting('app.settings.service_role_key', true);

  IF svc_key IS NULL OR svc_key = '' THEN
    RAISE NOTICE 'Service role key not available in app.settings; skipping appointment confirmation notification.';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
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

-- Idempotent: drop and recreate the trigger
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_appointment_confirmation();
