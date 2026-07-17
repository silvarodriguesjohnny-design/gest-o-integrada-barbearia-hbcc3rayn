import { supabase } from '@/lib/supabase/client'

export async function notifyNewTenant(
  tenantName: string,
  planType: string,
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('tenant-billing', {
    body: { action: 'new_tenant', tenant_name: tenantName, plan_type: planType },
  })
  return { data, error }
}

export async function checkExpiredTrials(): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('tenant-billing', {
    body: { action: 'check_billing' },
  })
  return { data, error }
}
