import { supabase } from '@/lib/supabase/client'
import { db } from './db'

export async function inviteUser(
  email: string,
  role: string,
  tenantId: string | null,
): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { email, role, tenant_id: tenantId },
  })
  if (error) {
    const message = data?.error || error.message || 'Erro ao enviar convite.'
    return { data: null, error: { message } }
  }
  if (data?.error) {
    return { data: null, error: { message: data.error } }
  }
  return { data, error: null }
}

export async function getInvitations(): Promise<{ data: any[] | null; error: any }> {
  const { data, error } = await db
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function getAllProfiles(): Promise<{ data: any[] | null; error: any }> {
  const { data, error } = await db
    .from('profiles')
    .select('*, tenant:tenants(name)')
    .order('created_at', { ascending: false })
  return { data, error }
}
