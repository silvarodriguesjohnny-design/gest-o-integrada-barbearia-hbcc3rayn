import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { Button } from '../components/Button'
import QRCode from 'qrcode'
import {
  MonitorSmartphone,
  RefreshCw,
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  FileArchive,
} from 'lucide-react'
import { downloadPwaZip } from '@/lib/pwa-zip'

interface TenantOption {
  id: string
  name: string
  slug: string | null
}

export function TotemPwaPage() {
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tenantId, setTenantId] = useState('')
  const [appName, setAppName] = useState('')
  const [bgColor, setBgColor] = useState('#D4A44A')
  const [themeColor, setThemeColor] = useState('#D4A44A')
  const [icon192Url, setIcon192Url] = useState<string | null>(null)
  const [icon512Url, setIcon512Url] = useState<string | null>(null)
  const [slug, setSlug] = useState('')

  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, name, slug')
      .order('name', { ascending: true })
      .then(({ data }) => {
        setTenants((data as TenantOption[]) ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!tenantId) return
    const t = tenants.find((x) => x.id === tenantId)
    if (t) setSlug(t.slug || '')
    supabase
      .from('totem_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAppName(data.app_name || t?.name || '')
          setBgColor(data.background_color || '#D4A44A')
          setThemeColor(data.theme_color || '#D4A44A')
          setIcon192Url(data.icon_192_url)
          setIcon512Url(data.icon_512_url)
        } else {
          setAppName(t?.name || '')
          setBgColor('#D4A44A')
          setThemeColor('#D4A44A')
          setIcon192Url(null)
          setIcon512Url(null)
        }
      })
  }, [tenantId, tenants])

  const resizeImage = useCallback((file: File, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas indisponível'))
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, size, size)
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Falha ao gerar imagem'))
        }, 'image/png')
      }
      img.onerror = () => reject(new Error('Falha ao carregar imagem'))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return
    try {
      const blob192 = await resizeImage(file, 192)
      const blob512 = await resizeImage(file, 512)
      const path192 = `${tenantId}/icon-192.png`
      const path512 = `${tenantId}/icon-512.png`
      const [r192, r512] = await Promise.all([
        supabase.storage.from('totem-icons').upload(path192, blob192, {
          upsert: true,
          contentType: 'image/png',
        }),
        supabase.storage.from('totem-icons').upload(path512, blob512, {
          upsert: true,
          contentType: 'image/png',
        }),
      ])
      if (r192.error) throw r192.error
      if (r512.error) throw r512.error
      const u192 = supabase.storage.from('totem-icons').getPublicUrl(path192).data.publicUrl
      const u512 = supabase.storage.from('totem-icons').getPublicUrl(path512).data.publicUrl
      setIcon192Url(u192)
      setIcon512Url(u512)
      setMessage({ type: 'ok', text: 'Ícone enviado (192 e 512).' })
    } catch (err: any) {
      setMessage({ type: 'err', text: err.message || 'Erro no upload.' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleGenerate = async () => {
    if (!tenantId || !appName || !slug) {
      setMessage({ type: 'err', text: 'Selecione a barbearia e informe o nome do app.' })
      return
    }
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('totem_config').upsert({
      tenant_id: tenantId,
      app_name: appName,
      background_color: bgColor,
      theme_color: themeColor,
      icon_192_url: icon192Url,
      icon_512_url: icon512Url,
      slug,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      setMessage({ type: 'err', text: error.message })
      return
    }
    setMessage({ type: 'ok', text: `PWA gerado! manifest disponível em /agendar/${slug}.` })
  }

  const [downloading, setDownloading] = useState(false)

  const installUrl = slug ? `${window.location.origin}/agendar/${slug}?install=true` : ''

  const handleDownloadZip = async () => {
    if (!tenantId || !appName || !slug) {
      setMessage({ type: 'err', text: 'Selecione a barbearia e salve a configuração primeiro.' })
      return
    }
    setDownloading(true)
    setMessage(null)
    try {
      await downloadPwaZip({
        appName,
        bgColor,
        themeColor,
        icon192Url,
        icon512Url,
        slug,
      })
      setMessage({ type: 'ok', text: 'ZIP gerado: manifest.json, index.html e ícones.' })
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Erro ao gerar o ZIP.' })
    } finally {
      setDownloading(false)
    }
  }

  const handleShowQr = async () => {
    if (!installUrl) return
    try {
      const dataUrl = await QRCode.toDataURL(installUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
      setQrOpen(true)
    } catch {
      setMessage({ type: 'err', text: 'Erro ao gerar QR Code.' })
    }
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `totem-qrcode-${slug}.png`
    a.click()
  }

  const handleCopyLink = async () => {
    if (!installUrl) return
    try {
      await navigator.clipboard.writeText(installUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage({ type: 'err', text: 'Não foi possível copiar.' })
    }
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
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold">
          <MonitorSmartphone className="h-6 w-6 text-[#D4A44A]" /> Totem & PWA
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Configure o PWA instalável para tablets/totens da recepção.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-[#D4A44A]/30 bg-[#D4A44A]/5 p-5">
        <h2 className="font-serif text-lg font-semibold">📲 Como funciona</h2>
        <div className="mt-2 space-y-1 text-sm text-[hsl(var(--muted-foreground))]">
          <p>1) Configure os dados abaixo (barbearia, nome, cores e ícone).</p>
          <p>
            2) Clique em <strong>Gerar PWA</strong> para salvar a configuração.
          </p>
          <p>3) No tablet, escaneie o QR Code ou abra o link de instalação.</p>
          <p>
            4) Toque em <strong>"Adicionar à tela inicial"</strong>.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 className="font-serif text-lg font-semibold">Configuração do Totem</h2>
        <div className="mt-4 space-y-5">
          {/* Barbearia */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Barbearia *</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none focus:border-[#D4A44A]"
            >
              <option value="">Selecione a barbearia</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.slug ? `(/${t.slug})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nome do App *</label>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Ex: Barbearia Vintage"
              className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none focus:border-[#D4A44A]"
            />
          </div>

          {/* Cores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Cor de fundo (Splash)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-[hsl(var(--input))]"
                />
                <input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 font-mono text-sm outline-none focus:border-[#D4A44A]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Cor do tema</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-[hsl(var(--input))]"
                />
                <input
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 font-mono text-sm outline-none focus:border-[#D4A44A]"
                />
              </div>
            </div>
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Ícone do App</label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 overflow-hidden">
                {icon512Url ? (
                  <img src={icon512Url} alt="Ícone" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleIconUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!tenantId}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> Enviar ícone
                </Button>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Será redimensionado para 192×192 e 512×512 (PNG).
                </p>
                {icon192Url && (
                  <p className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Ícones prontos
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {appName && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
              <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">Pré-visualização</p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl shadow-md overflow-hidden"
                  style={{ backgroundColor: bgColor }}
                >
                  {icon192Url ? (
                    <img src={icon192Url} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <MonitorSmartphone className="h-7 w-7 text-white" />
                  )}
                </div>
                <span className="max-w-[160px] truncate text-sm font-medium">{appName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} loading={saving} disabled={!tenantId}>
          <RefreshCw className="h-4 w-4" /> Gerar PWA
        </Button>
        <Button variant="outline" onClick={handleShowQr} disabled={!slug}>
          <QrCode className="h-4 w-4" /> Ver QR Code
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadZip}
          loading={downloading}
          disabled={!tenantId || !appName || !slug}
        >
          <FileArchive className="h-4 w-4" /> Baixar App (.zip)
        </Button>
      </div>

      {installUrl && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4 flex-wrap">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">
              Link de instalação no tablet:
            </p>
            <code className="break-all text-sm">{installUrl}</code>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCopyLink}>
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar
              </>
            )}
          </Button>
        </div>
      )}

      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[hsl(var(--card))] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <QrCode className="h-5 w-5 text-[#D4A44A]" /> QR Code de Instalação
            </h3>
            <div className="mt-4 flex flex-col items-center gap-4">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="h-64 w-64 rounded-lg border" />
              )}
              <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                Escaneie com a câmera do tablet.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadQr}>
                <Download className="h-4 w-4" /> Baixar PNG
              </Button>
              <Button size="sm" onClick={() => setQrOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
