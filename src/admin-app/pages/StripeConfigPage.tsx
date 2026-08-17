import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { Button } from '../components/Button'
import {
  CreditCard,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Webhook,
  Zap,
} from 'lucide-react'

const KEY_LABELS = {
  STRIPE_SECRET_KEY: 'Chave Secreta (Secret Key)',
  STRIPE_WEBHOOK_SECRET: 'Chave do Webhook (Webhook Secret)',
  STRIPE_PUBLISHABLE_KEY: 'Chave Publicável (Publishable Key)',
} as const

const KEY_PLACEHOLDERS = {
  STRIPE_SECRET_KEY: 'sk_live_... ou sk_test_...',
  STRIPE_WEBHOOK_SECRET: 'whsec_...',
  STRIPE_PUBLISHABLE_KEY: 'pk_live_... ou pk_test_...',
} as const

type SecretKey = keyof typeof KEY_LABELS
const SECRET_KEYS: SecretKey[] = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PUBLISHABLE_KEY',
]

interface SecretRow {
  key: string
  value: string | null
  updated_at: string | null
}

interface PlatformSecretStatus {
  configured: boolean
  masked: string | null
  updated_at: string | null
}

export function StripeConfigPage() {
  const [secrets, setSecrets] = useState<Record<SecretKey, SecretRow | null>>({
    STRIPE_SECRET_KEY: null,
    STRIPE_WEBHOOK_SECRET: null,
    STRIPE_PUBLISHABLE_KEY: null,
  })
  const [values, setValues] = useState<Record<SecretKey, string>>({
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    STRIPE_PUBLISHABLE_KEY: '',
  })
  const [show, setShow] = useState<Record<SecretKey, boolean>>({
    STRIPE_SECRET_KEY: false,
    STRIPE_WEBHOOK_SECRET: false,
    STRIPE_PUBLISHABLE_KEY: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('platform_secrets')
      .select('key, value, updated_at')
      .in('key', SECRET_KEYS)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const map: Record<SecretKey, SecretRow | null> = {
      STRIPE_SECRET_KEY: null,
      STRIPE_WEBHOOK_SECRET: null,
      STRIPE_PUBLISHABLE_KEY: null,
    }
    for (const row of (data as SecretRow[]) ?? []) {
      if (row.key in map) map[row.key as SecretKey] = row
    }
    setSecrets(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      let firstErr: any = null
      for (const k of SECRET_KEYS) {
        const v = values[k].trim()
        if (!v) continue
        const { error } = await supabase
          .from('platform_secrets')
          .upsert({ key: k, value: v, updated_at: new Date().toISOString() })
        if (error && !firstErr) firstErr = error
      }
      if (firstErr) {
        setError(firstErr.message)
      } else {
        setSuccess('Configuração salva com sucesso.')
        setValues({
          STRIPE_SECRET_KEY: '',
          STRIPE_WEBHOOK_SECRET: '',
          STRIPE_PUBLISHABLE_KEY: '',
        })
        await load()
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-config', { method: 'GET' })
      if (error) {
        setTestResult(`❌ Erro: ${error.message}`)
      } else if (data?.configured) {
        setTestResult('✅ Conexão válida — Stripe configurado corretamente.')
      } else {
        setTestResult('⚠️ Stripe não configurado — defina as chaves e salve.')
      }
    } catch (e: any) {
      setTestResult(`❌ Falha: ${e?.message || 'erro desconhecido'}`)
    } finally {
      setTesting(false)
    }
  }

  const statusOf = (k: SecretKey): PlatformSecretStatus => {
    const row = secrets[k]
    if (!row || !row.value) {
      return { configured: false, masked: null, updated_at: row?.updated_at ?? null }
    }
    const v = row.value
    const masked = v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : '••••'
    return { configured: true, masked, updated_at: row.updated_at }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D4A44A] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">Configuração do Stripe</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Gerencie as chaves da API do Stripe usadas em pagamentos e assinaturas.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {SECRET_KEYS.map((k) => {
          const st = statusOf(k)
          return (
            <div
              key={k}
              className={`flex items-center gap-3 rounded-xl border p-5 ${
                st.configured
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-amber-200 bg-amber-50/40'
              }`}
            >
              {st.configured ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{KEY_LABELS[k]}</p>
                <p className="text-lg font-semibold">
                  {st.configured ? 'Configurado ✅' : 'Não configurado ⚠️'}
                </p>
                {st.masked && (
                  <p className="text-xs font-mono text-[hsl(var(--muted-foreground))] truncate">
                    {st.masked}
                  </p>
                )}
              </div>
            </div>
          )
        })}

        <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <Webhook className="h-8 w-8 text-[hsl(var(--muted-foreground))] shrink-0" />
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Endpoint do Webhook</p>
            <p className="text-xs font-mono break-all">
              https://xjfzaanptzgojdnvirvg.supabase.co/functions/v1/stripe-webhook
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <CreditCard className="h-5 w-5 text-[#D4A44A]" /> Atualizar Configuração
        </h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Preencha apenas os campos que deseja atualizar. Deixe em branco para manter o valor atual.
        </p>

        <div className="mt-4 space-y-4">
          {SECRET_KEYS.map((k) => (
            <div key={k} className="space-y-2">
              <label htmlFor={k} className="text-sm font-semibold">
                {KEY_LABELS[k]}
              </label>
              <div className="relative">
                <input
                  id={k}
                  type={show[k] ? 'text' : 'password'}
                  placeholder={KEY_PLACEHOLDERS[k]}
                  value={values[k]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [k]: e.target.value }))}
                  autoComplete="off"
                  className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 pr-10 text-sm outline-none focus:border-[#D4A44A] focus:ring-2 focus:ring-[#D4A44A]/30"
                />
                <button
                  type="button"
                  onClick={() => setShow((prev) => ({ ...prev, [k]: !prev[k] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  tabIndex={-1}
                >
                  {show[k] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" /> Salvar configuração
          </Button>
          <Button variant="outline" onClick={handleTest} loading={testing}>
            <Zap className="h-4 w-4" /> Testar Conexão
          </Button>
        </div>

        {testResult && (
          <div className="mt-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 text-sm">
            {testResult}
          </div>
        )}
      </div>
    </div>
  )
}
