import { db } from './db'
import { supabase } from '@/lib/supabase/client'
import type { Tenant, PlanType } from '@/types'

export function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 8)
  )
}

export async function createTenant(data: {
  name: string
  owner_id: string
  plan_type: PlanType
  slug?: string
  status?: string
}): Promise<{ data: Tenant | null; error: any }> {
  const insertData = {
    ...data,
    slug: data.slug || generateSlug(data.name),
    status: data.status || 'active',
  }
  const { data: result, error } = await db.from('tenants').insert(insertData).select().single()
  return { data: result, error }
}

export async function updateTenant(
  id: string,
  data: {
    name?: string
    logo_url?: string
    whatsapp_phone?: string
    full_name?: string | null
    email?: string | null
    phone?: string | null
    cpf_cnpj?: string | null
    cep?: string | null
    rua?: string | null
    numero?: string | null
    complemento?: string | null
    bairro?: string | null
    cidade?: string | null
    estado?: string | null
    horario_funcionamento?: string | null
    numero_cadeiras?: number | null
    quantidade_profissionais?: number | null
    plan_type?: PlanType
  },
): Promise<{ error: any }> {
  const { error } = await db.from('tenants').update(data).eq('id', id)
  return { error }
}

export async function uploadLogo(
  tenantId: string,
  file: File,
): Promise<{ url: string | null; error: any }> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${tenantId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
