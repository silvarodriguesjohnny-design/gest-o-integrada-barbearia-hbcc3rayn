import { supabase } from '@/lib/supabase/client'
import { publicSupabase } from '@/lib/supabase/public-client'

export async function submitRegistration(data: Record<string, unknown>) {
  const payload = {
    full_name: String(data.full_name || '').trim(),
    email: String(data.email || '')
      .trim()
      .toLowerCase(),
    phone: data.phone ? String(data.phone).trim() : null,
    cpf_cnpj: data.cpf_cnpj ? String(data.cpf_cnpj).trim() : null,
    cep: data.cep ? String(data.cep).trim() : null,
    rua: data.rua ? String(data.rua).trim() : null,
    numero: data.numero ? String(data.numero).trim() : null,
    complemento: data.complemento ? String(data.complemento).trim() : null,
    bairro: data.bairro ? String(data.bairro).trim() : null,
    cidade: data.cidade ? String(data.cidade).trim() : null,
    estado: data.estado ? String(data.estado).trim() : null,
    nome_negocio: String(data.nome_negocio || '').trim(),
    numero_cadeiras: Number(data.numero_cadeiras) || 1,
    quantidade_profissionais: Number(data.quantidade_profissionais) || 1,
    horario_funcionamento: data.horario_funcionamento
      ? String(data.horario_funcionamento).trim()
      : null,
    status: 'pending',
  }

  const client = publicSupabase || supabase
  const { error } = await client.from('pending_tenants').insert([payload])

  if (error) {
    console.error('Error submitting tenant registration:', error)
    return { data: null, error }
  }

  try {
    await client.functions.invoke('send-email', {
      body: {
        to: payload.email,
        subject: 'Seu cadastro está em análise – Na Régua',
        body: `Olá ${payload.full_name},\n\nRecebemos seu cadastro para a barbearia "${payload.nome_negocio}".\nSeu cadastro está em análise e você será notificado quando for aprovado.\n\nAtenciosamente,\nEquipe Na Régua`,
      },
    })
  } catch {
    /* ignore email function failure so registration remains successful */
  }

  return { data: { success: true }, error: null }
}

export async function getPendingTenants() {
  const { data, error } = await supabase
    .from('pending_tenants')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function rejectPendingTenant(id: string) {
  const { data, error } = await supabase
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
