import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, Clock, Eye } from 'lucide-react'
import { getPendingTenants, approveTenant, rejectPendingTenant } from '@/services/pending-tenants'
import { useToast } from '@/hooks/use-toast'
import type { PendingTenant } from '@/types'
import { PendingTenantDetailDialog } from '@/components/admin/PendingTenantDetailDialog'

export function PendingTenants({ refreshTrigger }: { refreshTrigger?: number }) {
  const [tenants, setTenants] = useState<PendingTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [detailTenant, setDetailTenant] = useState<PendingTenant | null>(null)
  const { toast } = useToast()

  const load = () => {
    setLoading(true)
    getPendingTenants().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setTenants(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [refreshTrigger])

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    const { data, error } = await approveTenant(id)
    setActionLoading(null)
    if (error) {
      toast({
        title: 'Erro ao aprovar',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      })
    } else {
      const msg =
        data?.email_sent === false
          ? 'Barbearia aprovada, mas houve erro ao enviar email. O usuário pode redefinir a senha na página de login.'
          : data?.whatsapp_sent
            ? 'Barbearia aprovada! O usuário receberá e-mail e WhatsApp com as instruções de acesso.'
            : 'Barbearia aprovada! O usuário receberá um e-mail com as instruções de acesso.'
      toast({ title: 'Aprovado!', description: msg })
      load()
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(id)
    const { error } = await rejectPendingTenant(id)
    setActionLoading(null)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Cadastro rejeitado.' })
      load()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  const pending = tenants.filter((t) => t.status === 'pending')
  if (pending.length === 0) return null

  return (
    <Card className="p-4 mb-6 border-amber-200 bg-amber-50/50">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold">Cadastros Pendentes ({pending.length})</h2>
      </div>
      <div className="space-y-3">
        {pending.map((t) => (
          <div
            key={t.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{t.full_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {t.nome_negocio}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {t.email} • {t.phone || 'Sem telefone'} • {t.cidade}/{t.estado}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDetailTenant(t)}>
                <Eye className="h-4 w-4 mr-1" /> Detalhes
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleApprove(t.id)}
                disabled={actionLoading === t.id}
              >
                {actionLoading === t.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(t.id)}
                disabled={actionLoading === t.id}
              >
                <X className="h-4 w-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </div>
        ))}
      </div>
      <PendingTenantDetailDialog
        tenant={detailTenant}
        open={!!detailTenant}
        onOpenChange={(v) => !v && setDetailTenant(null)}
      />
    </Card>
  )
}
