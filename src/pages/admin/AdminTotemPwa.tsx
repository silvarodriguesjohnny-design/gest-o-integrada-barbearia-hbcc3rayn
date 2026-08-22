import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
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
import { getAllTenants } from '@/services/super-admin'
import { saveTotemConfig, getTotemConfig, uploadTotemIcon } from '@/services/totem-pwa'
import { useToast } from '@/hooks/use-toast'
import { downloadPwaZip } from '@/lib/pwa-zip'
import QRCode from 'qrcode'

interface TenantOption {
  id: string
  name: string
  slug: string
}

export default function AdminTotemPwa() {
  const { toast } = useToast()
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [tenantId, setTenantId] = useState('')
  const [appName, setAppName] = useState('')
  const [bgColor, setBgColor] = useState('#D4A44A')
  const [themeColor, setThemeColor] = useState('#D4A44A')
  const [icon192Url, setIcon192Url] = useState<string | null>(null)
  const [icon512Url, setIcon512Url] = useState<string | null>(null)
  const [slug, setSlug] = useState('')

  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAllTenants().then(({ data }) => {
      if (data) {
        setTenants(data.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })))
      }
      setLoading(false)
    })
  }, [])

  // Carrega a config quando um tenant é selecionado
  useEffect(() => {
    if (!tenantId) return
    const t = tenants.find((x) => x.id === tenantId)
    if (t) setSlug(t.slug)
    getTotemConfig(tenantId).then(({ config }) => {
      if (config) {
        setAppName(config.app_name)
        setBgColor(config.background_color)
        setThemeColor(config.theme_color)
        setIcon192Url(config.icon_192_url)
        setIcon512Url(config.icon_512_url)
      } else {
        const tenant = tenants.find((x) => x.id === tenantId)
        setAppName(tenant?.name || '')
        setBgColor('#D4A44A')
        setThemeColor('#D4A44A')
        setIcon192Url(null)
        setIcon512Url(null)
      }
    })
  }, [tenantId, tenants])

  // Redimensiona imagem para o tamanho alvo usando canvas
  const resizeImage = useCallback((file: File, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas indisponível'))
        // Fundo branco para imagens sem transparência ficarem consistentes
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, size, size)
        // Cover (preserva aspecto, corta excesso)
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
      const [{ url: url192, error: err192 }, { url: url512, error: err512 }] = await Promise.all([
        uploadTotemIcon(tenantId, 192, blob192),
        uploadTotemIcon(tenantId, 512, blob512),
      ])
      if (err192 || err512) throw err192 || err512
      setIcon192Url(url192)
      setIcon512Url(url512)
      toast({ title: 'Ícone enviado', description: '192×192 e 512×512 gerados.' })
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: err.message || 'Não foi possível enviar o ícone.',
        variant: 'destructive',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleGenerate = async () => {
    if (!tenantId || !appName || !slug) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione a barbearia e informe o nome do app.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    const { config, error } = await saveTotemConfig({
      tenant_id: tenantId,
      app_name: appName,
      background_color: bgColor,
      theme_color: themeColor,
      icon_192_url: icon192Url,
      icon_512_url: icon512Url,
      slug,
    })
    setSaving(false)
    if (error) {
      toast({
        title: 'Erro ao gerar PWA',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      })
      return
    }
    setGenerating(true)
    // Pequeno delay para feedback visual
    setTimeout(() => setGenerating(false), 700)
    toast({
      title: 'PWA gerado com sucesso!',
      description: `manifest.json disponível para /agendar/${slug}.`,
    })
    // void config para evitar warning de unused
    void config
  }

  const installUrl = slug ? `${window.location.origin}/agendar/${slug}?install=true` : ''

  const handleDownloadZip = async () => {
    if (!tenantId || !appName || !slug) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione a barbearia e informe o nome do app antes de baixar.',
        variant: 'destructive',
      })
      return
    }
    setDownloading(true)
    try {
      await downloadPwaZip({
        appName,
        bgColor,
        themeColor,
        icon192Url,
        icon512Url,
        slug,
      })
      toast({
        title: 'ZIP gerado!',
        description: 'manifest.json, index.html e ícones (192/512).',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar ZIP',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
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
      toast({ title: 'Erro ao gerar QR Code', variant: 'destructive' })
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
      toast({ title: 'Não foi possível copiar', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MonitorSmartphone className="h-7 w-7 text-accent" />
          Totem & PWA
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure o PWA instalável para Tablets/Totens da recepção.
        </p>
      </div>

      {/* Passo a passo */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            📲 Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1.5">
          <p>1) Configure os dados abaixo (barbearia, nome, cores e ícone).</p>
          <p>
            2) Clique em <strong>Gerar PWA</strong> para criar o manifest e o Service Worker.
          </p>
          <p>3) No Tablet, escaneie o QR Code ou abra o link de instalação.</p>
          <p>
            4) Toque em <strong>"Adicionar à tela inicial"</strong>.
          </p>
          <p>5) Pronto! O totem está ativo e abre em modo standalone.</p>
        </CardContent>
      </Card>

      {/* Formulário */}
      <Card>
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl">Configuração do Totem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* Barbearia */}
          <div className="space-y-2">
            <Label className="font-semibold">Barbearia *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a barbearia" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} <span className="text-muted-foreground ml-1">/{t.slug}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A barbearia selecionada determina qual <code>/agendar/:slug</code> será empacotado.
            </p>
          </div>

          {/* Nome do app */}
          <div className="space-y-2">
            <Label className="font-semibold">Nome do App *</Label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Ex: Barbearia Vintage"
            />
            <p className="text-xs text-muted-foreground">
              Nome exibido embaixo do ícone na tela inicial do Tablet.
            </p>
          </div>

          {/* Cores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Cor de fundo (Splash)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-12 rounded border border-input cursor-pointer bg-background"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">Cor da tela de abertura.</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Cor do tema</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="h-10 w-12 rounded border border-input cursor-pointer bg-background"
                />
                <Input
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">Cor da barra de status.</p>
            </div>
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <Label className="font-semibold">Ícone do App</Label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden">
                {icon512Url ? (
                  <img src={icon512Url} alt="Ícone" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
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
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!tenantId}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" /> Enviar ícone
                </Button>
                <p className="text-xs text-muted-foreground">
                  Será redimensionado para 192×192 e 512×512 (PNG).
                </p>
                {icon192Url && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ícones prontos (192 + 512)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {appName && (
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs text-muted-foreground mb-2">Pré-visualização do ícone</p>
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
                <span className="text-sm font-medium truncate max-w-[160px]">{appName}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        <Button variant="amber" onClick={handleGenerate} loading={saving} disabled={!tenantId}>
          {!saving && <RefreshCw className={`h-4 w-4 mr-1 ${generating ? 'animate-spin' : ''}`} />}
          Gerar PWA
        </Button>
        <Button variant="outline" onClick={handleShowQr} disabled={!slug}>
          <QrCode className="h-4 w-4 mr-1" /> Ver QR Code
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadZip}
          loading={downloading}
          disabled={!tenantId || !appName}
        >
          {!downloading && <FileArchive className="h-4 w-4 mr-1" />}
          Baixar App (.zip)
        </Button>
      </div>

      {/* Link copiável */}
      {installUrl && (
        <Card className="bg-muted/20">
          <CardContent className="flex items-center justify-between gap-3 p-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Ou acesse diretamente no Tablet:</p>
              <code className="text-sm break-all">{installUrl}</code>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1 text-success" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog do QR Code */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <QrCode className="h-5 w-5 text-accent" /> QR Code de Instalação
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR Code de instalação do PWA"
                className="rounded-lg border w-64 h-64"
              />
            )}
            <p className="text-sm text-muted-foreground text-center">
              Escaneie com a câmera do Tablet para abrir o link de instalação.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDownloadQr}>
              <Download className="h-4 w-4 mr-1" /> Baixar PNG
            </Button>
            <Button variant="amber" onClick={() => setQrOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
