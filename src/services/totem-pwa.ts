import { supabase } from '@/lib/supabase/client'

export interface TotemConfig {
  id: string
  tenant_id: string
  app_name: string
  background_color: string
  theme_color: string
  icon_192_url: string | null
  icon_512_url: string | null
  slug: string
  created_at: string
  updated_at: string
}

/** URL pública do manifest.json (servida pela edge function totem-pwa). */
export function manifestUrl(slug: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base}/functions/v1/totem-pwa/manifest.json?slug=${encodeURIComponent(slug)}`
}

/** URL pública do Service Worker. */
export function serviceWorkerUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base}/functions/v1/totem-pwa/sw.js`
}

/** Busca a configuração do totem de um tenant (admin, autenticado). */
export async function getTotemConfig(
  tenantId: string,
): Promise<{ config: TotemConfig | null; error: any }> {
  const { data, error } = await supabase.functions.invoke('totem-pwa', {
    body: { _method: 'GET', tenant_id: tenantId },
  })
  if (error) return { config: null, error }
  return { config: data?.config ?? null, error: null }
}

/** Salva (upsert) a configuração do totem (admin, autenticado). */
export async function saveTotemConfig(
  payload: Omit<TotemConfig, 'id' | 'created_at' | 'updated_at'>,
): Promise<{ config: TotemConfig | null; error: any }> {
  const { data, error } = await supabase.functions.invoke('totem-pwa', {
    body: payload,
  })
  if (error) return { config: null, error }
  return { config: data?.config ?? null, error: null }
}

/**
 * Faz upload de um ícone (já redimensionado no browser para 192 ou 512)
 * para o bucket público `totem-icons` e retorna a URL pública.
 */
export async function uploadTotemIcon(
  tenantId: string,
  size: 192 | 512,
  blob: Blob,
): Promise<{ url: string | null; error: any }> {
  const path = `${tenantId}/icon-${size}.png`
  const { error: uploadError } = await supabase.storage
    .from('totem-icons')
    .upload(path, blob, { upsert: true, contentType: 'image/png' })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage.from('totem-icons').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

/**
 * Busca a configuração do totem publicamente (sem auth) pelo slug,
 * para que o frontend do totem possa ler cores/ícone para preview.
 * Usa uma query REST direta à tabela totem_config (RLS permite SELECT público).
 */
export async function getPublicTotemConfig(
  slug: string,
): Promise<{ config: TotemConfig | null; error: any }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL as string}/rest/v1/totem_config?slug=eq.${encodeURIComponent(slug)}&limit=1`
  try {
    const resp = await fetch(url, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string}`,
        Accept: 'application/json',
      },
    })
    if (!resp.ok) return { config: null, error: new Error(`HTTP ${resp.status}`) }
    const rows = (await resp.json()) as TotemConfig[]
    return { config: rows[0] ?? null, error: null }
  } catch (err: any) {
    return { config: null, error: err }
  }
}
