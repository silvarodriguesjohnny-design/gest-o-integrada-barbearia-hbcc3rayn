import { useEffect, useState, useMemo } from 'react'
import { Plus, RefreshCw, Pencil, Power, Trash2, Loader2, Tag, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getServices } from '@/services/catalog'
import {
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanActive,
  deleteSubscriptionPlan,
  calcPrepaidPrice,
} from '@/services/subscriptions'
import type { SubscriptionPlan, Service } from '@/types'

const PREPAID_MONTHS_OPTIONS = [3, 6, 12]

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Assinaturas() {
  const { tenant } = useAuth()
  const { toast } = useToast()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)
  const [saving, setSaving] = useState(false)

  const tenantId = tenant?.id || ''

  const load = async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const [planned, svc] = await Promise.all([
        listSubscriptionPlans(tenantId),
        getServices().then(({ data }) => data || []),
      ])
      setPlans(planned)
      setServices(svc)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const handleToggle = async (plan: SubscriptionPlan) => {
    try {
      await toggleSubscriptionPlanActive(plan.id, !plan.active)
      toast({ title: plan.active ? 'Plano inativado' : 'Plano ativado' })
      load()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Excluir o plano "${plan.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteSubscriptionPlan(plan.id)
      toast({ title: 'Plano excluído' })
      load()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-accent" />
            Assinaturas
          </h1>
          <p className="text-muted-foreground text-sm">
            Crie planos de assinatura para seus clientes com pagamento mensal ou antecipado com
            desconto.
          </p>
        </div>
        <Button
          variant="amber"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Plano
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Tag className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-semibold">Nenhum plano cadastrado</h3>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro plano de assinatura para começar a receber pagamentos recorrentes.
            </p>
            <Button
              variant="amber"
              className="mt-2"
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Criar plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const includedNames = plan.services_included
              .map((sid) => services.find((s) => s.id === sid)?.name)
              .filter(Boolean)
            return (
              <Card key={plan.id} className={!plan.active ? 'opacity-60' : ''}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={plan.active ? 'default' : 'secondary'}>
                      {plan.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {includedNames.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {includedNames.map((n) => (
                        <Badge key={n} variant="outline" className="text-xs">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Mensal</span>
                      <span className="font-bold text-lg">{fmt(plan.price)}</span>
                    </div>
                    {plan.prepaid_months > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Pacote {plan.prepaid_months} meses
                        </span>
                        <div className="text-right">
                          <div className="font-bold text-accent">{fmt(plan.prepaid_price)}</div>
                          <div className="text-xs text-muted-foreground">
                            {plan.prepaid_discount_pct}% off à vista
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditing(plan)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(plan)}
                      title={plan.active ? 'Inativar' : 'Ativar'}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => handleDelete(plan)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        services={services}
        tenantId={tenantId}
        saving={saving}
        onSave={async (values) => {
          setSaving(true)
          try {
            if (editing) {
              await updateSubscriptionPlan(editing.id, values)
              toast({ title: 'Plano atualizado!' })
            } else {
              await createSubscriptionPlan(tenantId, values)
              toast({ title: 'Plano criado!' })
            }
            setDialogOpen(false)
            load()
          } catch (e: any) {
            toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}

interface PlanDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: SubscriptionPlan | null
  services: Service[]
  tenantId: string
  saving: boolean
  onSave: (v: {
    name: string
    description: string | null
    services_included: string[]
    price: number
    prepaid_discount_pct: number
    prepaid_months: number
    prepaid_price: number
    active: boolean
  }) => Promise<void>
}

function PlanDialog({ open, onOpenChange, editing, services, saving, onSave }: PlanDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [price, setPrice] = useState('')
  const [discountPct, setDiscountPct] = useState('10')
  const [prepaidMonths, setPrepaidMonths] = useState('3')

  useEffect(() => {
    if (open) {
      setName(editing?.name || '')
      setDescription(editing?.description || '')
      setSelectedServices(editing?.services_included || [])
      setPrice(editing ? String(editing.price) : '')
      setDiscountPct(editing ? String(editing.prepaid_discount_pct) : '10')
      setPrepaidMonths(editing ? String(editing.prepaid_months) : '3')
    }
  }, [open, editing])

  const numericPrice = parseFloat(price.replace(',', '.')) || 0
  const numericDiscount = parseFloat(discountPct.replace(',', '.')) || 0
  const numericMonths = parseInt(prepaidMonths, 10) || 0
  const prepaidPrice = useMemo(
    () => calcPrepaidPrice(numericPrice, numericMonths, numericDiscount),
    [numericPrice, numericMonths, numericDiscount],
  )

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      name,
      description: description.trim() || null,
      services_included: selectedServices,
      price: numericPrice,
      prepaid_discount_pct: numericDiscount,
      prepaid_months: numericMonths,
      prepaid_price: prepaidPrice,
      active: editing ? editing.active : true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Plano' : 'Novo Plano de Assinatura'}</DialogTitle>
          <DialogDescription>
            Configure o plano, serviços inclusos e opções de pagamento antecipado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Nome do plano</Label>
            <Input
              id="plan-name"
              placeholder="Ex: Combo Mensal, Só Corte, Só Barba"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-desc">Descrição</Label>
            <Textarea
              id="plan-desc"
              placeholder="Descreva os benefícios do plano..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Serviços inclusos</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum serviço cadastrado. Cadastre serviços no Financeiro.
                </p>
              ) : (
                services.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="rounded"
                    />
                    <span className="flex-1 text-sm">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{fmt(s.price)}</span>
                    {selectedServices.includes(s.id) && (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-price">Preço mensal (R$)</Label>
              <Input
                id="plan-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="99,90"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-discount">% desconto à vista</Label>
              <Input
                id="plan-discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="10"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-months">Meses do pacote antecipado</Label>
            <Select value={prepaidMonths} onValueChange={setPrepaidMonths}>
              <SelectTrigger id="plan-months">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREPAID_MONTHS_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} meses
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {numericPrice > 0 && numericMonths > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">De</span>
                <span className="line-through text-muted-foreground">
                  {fmt(numericPrice * numericMonths)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Preço à vista</span>
                <span className="text-lg font-bold text-accent">{fmt(prepaidPrice)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Economia de {fmt(numericPrice * numericMonths - prepaidPrice)} para o cliente
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="amber" disabled={saving || !name || numericPrice <= 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar' : 'Criar plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
