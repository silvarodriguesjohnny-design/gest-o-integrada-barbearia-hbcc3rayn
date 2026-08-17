import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // eslint-disable-next-line no-console
  console.error('[admin-app] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY ausentes.')
}

// Cliente Supabase totalmente isolado do src/ principal.
// Usa a chave publishable (anon) — a mesma do projeto, mas instância própria.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
