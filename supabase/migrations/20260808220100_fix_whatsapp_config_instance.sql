-- Ensure all whatsapp messaging_configs have instance_name = 'barbearia'
-- and a non-empty base_url. The Evolution API requires both fields to construct
-- the correct send URL: {base_url}/message/sendText/{instance_name}

UPDATE public.messaging_configs
SET config_json = jsonb_set(
  COALESCE(config_json, '{}'::jsonb),
  '{instance_name}',
  '"barbearia"'::jsonb,
  true
)
WHERE channel = 'whatsapp';

-- Ensure is_active is true for the most recent whatsapp config per tenant
UPDATE public.messaging_configs
SET is_active = true
WHERE channel = 'whatsapp'
  AND id IN (
    SELECT DISTINCT ON (tenant_id) id
    FROM public.messaging_configs
    WHERE channel = 'whatsapp'
    ORDER BY tenant_id, created_at DESC
  );
