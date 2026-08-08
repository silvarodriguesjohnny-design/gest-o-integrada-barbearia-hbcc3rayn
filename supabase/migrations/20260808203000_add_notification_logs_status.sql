-- Add status and notification_type columns to notification_logs for traceable send history
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS notification_type TEXT;
