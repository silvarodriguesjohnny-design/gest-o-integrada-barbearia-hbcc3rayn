import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Save, Loader2, Store, ImageIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { updateTenant, uploadLogo } from '@/services/tenants'

export default function Settings() {
  const { tenant, refreshAuth } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(tenant?.name || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSave = async () => {
    if (!tenant) return
    setSaving(true)
    const { error } = await updateTenant(tenant.id, { name })
    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Configurações salvas!' })
      refreshAuth()
    }
  }

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenant) return
    setUploading(true)
    const { url, error } = await uploadLogo(tenant.id, file)
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' })
    } else if (url) {
      await updateTenant(tenant.id, { logo_url: url })
      toast({ title: 'Logo atualizado!' })
      refreshAuth()
    }
    setUploading(false)
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Você não tem uma barbearia configurada.</p>
      </div>
    )
  }

  const planLabels: Record<string, string> = { essential: 'Essential', pro: 'Pro', elite: 'Elite' }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize a identidade da sua barbearia.</p>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Store className="h-5 w-5 text-accent" /> Identidade da Barbearia
          </CardTitle>
          <CardDescription>Altere o nome e logo exibidos no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 overflow-hidden">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogo}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Enviando...' : 'Enviar Logo'}
              </Button>
              <p className="text-xs text-muted-foreground">PNG ou JPG, até 2MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold">
              Nome da Barbearia
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da sua barbearia"
            />
          </div>

          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plano Atual</span>
              <span className="font-semibold text-accent">
                {planLabels[tenant.plan_type] || tenant.plan_type}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="font-semibold text-emerald-600 capitalize">
                {tenant.subscription_status || 'Ativo'}
              </span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
