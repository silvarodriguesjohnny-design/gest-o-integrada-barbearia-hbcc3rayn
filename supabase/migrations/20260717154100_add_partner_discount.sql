ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0;

UPDATE public.customers SET discount_percentage = 0 WHERE discount_percentage IS NULL;
