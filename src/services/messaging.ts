import { supabase } from '@/lib/supabase/client'
import { db } from './db'

export async function getMessagingConfigs(tenantId: string) {
  const { data, error } = await db.from('messaging_configs').select('*').eq('tenant_id', tenantId)
  return { data, error }
}

export async function upsertMessagingConfig(
  tenantId: string,
  channel: string,
  configJson: Record<string, unknown>,
  isActive: boolean,
) {
  const { data, error } = await db
    .from('messaging_configs')
    .upsert(
      { tenant_id: tenantId, channel, config_json: configJson, is_active: isActive },
      { onConflict: 'tenant_id,channel' },
    )
    .select()
    .single()
  return { data, error }
}

export async function testMessaging(
  channel: string,
  config: Record<string, unknown>,
  tenantId?: string,
) {
  const { data, error } = await supabase.functions.invoke('test-messaging', {
    body: { channel, config, tenant_id: tenantId },
  })
  return { data, error }
}
