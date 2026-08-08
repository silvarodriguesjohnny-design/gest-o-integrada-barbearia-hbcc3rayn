-- Deduplicate existing notification_logs rows so the partial unique index can be created.
-- Keep only the newest row per (appointment_id, notification_type, channel) among
-- 'sent'/'pending' rows and delete older duplicates.
DELETE FROM public.notification_logs a
USING public.notification_logs b
WHERE a.appointment_id = b.appointment_id
  AND a.notification_type = b.notification_type
  AND a.channel = b.channel
  AND a.status IN ('sent', 'pending')
  AND b.status IN ('sent', 'pending')
  AND a.appointment_id IS NOT NULL
  AND b.appointment_id IS NOT NULL
  AND a.created_at < b.created_at;

-- If there are still duplicates with identical created_at, keep the one with the
-- lexicographically larger id (deterministic tiebreaker since id is a uuid PK).
DELETE FROM public.notification_logs a
USING public.notification_logs b
WHERE a.appointment_id = b.appointment_id
  AND a.notification_type = b.notification_type
  AND a.channel = b.channel
  AND a.status IN ('sent', 'pending')
  AND b.status IN ('sent', 'pending')
  AND a.appointment_id IS NOT NULL
  AND b.appointment_id IS NOT NULL
  AND a.created_at = b.created_at
  AND a.id::text < b.id::text;

-- Race-safe deduplication: ensure only one notification per appointment/type/channel
-- This partial unique index allows multiple 'failed' rows (for retries) but prevents
-- two 'sent' or 'pending' rows for the same (appointment_id, notification_type, channel)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_appt_dedup
  ON public.notification_logs (appointment_id, notification_type, channel)
  WHERE status IN ('sent', 'pending') AND appointment_id IS NOT NULL;

-- Drop the appointment confirmation trigger to eliminate the dual-send path.
-- The send-appointment-notification edge function is now called explicitly by
-- public-booking (and by the admin frontend), so the DB trigger is redundant.
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;

DROP FUNCTION IF EXISTS public.trigger_appointment_confirmation();
