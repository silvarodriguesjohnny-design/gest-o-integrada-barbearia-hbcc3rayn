import { supabase } from '@/lib/supabase/client'
import { db } from './db'

export async function submitRegistration(data: Record<string, unknown>) {
  const { data: result, error } = await db.from('pending_tenants').insert(data).select().single()
  if (error) return { data: null, error }

  await supabase.functions
    .invoke('send-email', {
      body: {
        to: data.email,
        subject: 'Seu cadastro está em análise – Na Régua',
        body: `Olá ${data.full_name},\n\nRecebemos seu cadastro para a barbearia "${data.nome_negocio}".\nSeu cadastro está em análise e você será notificado quando for aprovado.\n\nAtenciosamente,\nEquipe Na Régua`,
      },
    })
    .catch(() => {})

  return { data: result, error: null }
}

export async function getPendingTenants() {
  const { data, error } = await db
    .from('pending_tenants')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function rejectPendingTenant(id: string) {
  const { data, error } = await db
    .from('pending_tenants')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function approveTenant(pendingTenantId: string) {
  const { data, error } = await supabase.functions.invoke('approve-tenant', {
    body: { pending_tenant_id: pendingTenantId },
  })
  return { data, error }
}

export async function createTenantDirect(data: {
  full_name: string
  email: string
  phone?: string
  nome_negocio: string
}) {
  const { data: result, error } = await supabase.functions.invoke('approve-tenant', {
    body: { ...data },
  })
  return { data: result, error }
}
