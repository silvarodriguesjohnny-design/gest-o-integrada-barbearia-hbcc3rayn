import { supabase } from '@/lib/supabase/client'
import { db } from './db'

export async function triggerNotifications(
  body?: Record<string, unknown>,
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('send-notifications', {
    body: body || {},
  })
  return { data, error }
}

export async function getRecentActivities(
  isSuperAdmin: boolean,
): Promise<{ data: any[] | null; error: any }> {
  try {
    const [apptRes, tenantRes] = await Promise.all([
      db
        .from('appointments')
        .select('*, customer:customers(name), service:services(name)')
        .order('created_at', { ascending: false })
        .limit(5),
      isSuperAdmin
        ? db
            .from('tenants')
            .select('name, created_at, plan_type')
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
    ])

    const activities: any[] = []
    for (const appt of apptRes.data || []) {
      activities.push({
        type: 'appointment',
        title: `Agendamento: ${appt.service?.name || 'Serviço'}`,
        subtitle: `Cliente: ${appt.customer?.name || 'N/A'}`,
        time: new Date(appt.created_at).toLocaleString('pt-BR'),
      })
    }
    for (const tenant of tenantRes.data || []) {
      activities.push({
        type: 'tenant',
        title: `Nova barbearia: ${tenant.name}`,
        subtitle: `Plano: ${tenant.plan_type}`,
        time: new Date(tenant.created_at).toLocaleString('pt-BR'),
      })
    }
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    return { data: activities.slice(0, 8), error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}
