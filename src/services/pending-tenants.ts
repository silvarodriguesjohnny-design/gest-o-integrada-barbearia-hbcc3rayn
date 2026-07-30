import { supabase } from '@/lib/supabase/client'
import { publicSupabase } from '@/lib/supabase/public-client'

export async function submitRegistration(data: Record<string, unknown>) {
  const payload = {
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    cpf_cnpj: data.cpf_cnpj,
    cep: data.cep,
    rua: data.rua,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    cidade: data.cidade,
    estado: data.estado,
    nome_negocio: data.nome_negocio,
    numero_cadeiras: data.numero_cadeiras,
    quantidade_profissionais: data.quantidade_profissionais,
    horario_funcionamento: data.horario_funcionamento,
    status: 'pending',
  }

  const { data: result, error } = await publicSupabase
    .from('pending_tenants')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error }

  await publicSupabase.functions
    .invoke('send-email', {
      body: {
        to: data.email as string,
        subject: 'Seu cadastro está em análise – Na Régua',
        body: `Olá ${data.full_name},\n\nRecebemos seu cadastro para a barbearia "${data.nome_negocio}".\nSeu cadastro está em análise e você será notificado quando for aprovado.\n\nAtenciosamente,\nEquipe Na Régua`,
      },
    })
    .catch(() => {})

  return { data: result, error: null }
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
