import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Scissors, Plus, Pencil, Trash2, Loader2, Clock, DollarSign } from 'lucide-react'
import { getServices, createService, updateService, deleteService } from '@/services/catalog'
import { useToast } from '@/hooks/use-toast'
import type { Service } from '@/types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Servicos() {
  const { toast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Campos do formulário (criar/editar)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('30')
  const [description, setDescription] = useState('')

  const loadServices = () => {
    setLoading(true)
    getServices().then(({ data, error }) => {
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        setServices(data || [])
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    loadServices()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setPrice('')
    setDuration('30')
    setDescription('')
    setShowForm(true)
  }

  const openEdit = (svc: Service) => {
    setEditing(svc)
    setName(svc.name)
    setPrice(String(svc.price))
    setDuration(String(svc.duration_minutes))
    setDescription(svc.description || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!name.trim() || !price) {
      toast({ title: 'Preencha nome e preço', variant: 'destructive' })
      return
    }
    setSaving(true)
    const payload = {
      name: name.trim(),
      price: Number(price),
      duration_minutes: Number(duration) || 30,
      description: description.trim() || undefined,
    }
    const { error } = editing
      ? await updateService(editing.id, payload)
      : await createService(payload)
    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      return
    }
    toast({
      title: editing ? 'Serviço atualizado!' : 'Serviço criado!',
      description: `${name} foi ${editing ? 'atualizado' : 'adicionado'}.`,
    })
    setShowForm(false)
    loadServices()
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    const { error } = await deleteService(id)
    setSaving(false)
    setDeletingId(null)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Serviço excluído' })
    loadServices()
  }

  const totalServices = services.length
  const avgPrice =
    totalServices > 0 ? services.reduce((s, x) => s + Number(x.price), 0) / totalServices : 0
  const avgDuration =
    totalServices > 0
      ? services.reduce((s, x) => s + Number(x.duration_minutes), 0) / totalServices
      : 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie os serviços oferecidos pela sua barbearia.
          </p>
        </div>
        <Button variant="amber" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Serviço
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">
                Serviços Cadastrados
              </p>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalServices}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Preço Médio</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{fmt(avgPrice)}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Duração Média</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{Math.round(avgDuration)} min</p>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4 space-y-0">
          <div>
            <CardTitle className="font-serif text-xl">Lista de Serviços</CardTitle>
            <CardDescription>{totalServices} serviço(s) cadastrado(s)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Serviço</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum serviço cadastrado. Clique em “Novo Serviço” para começar.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium">
                      {s.name}
                      {s.description && (
                        <span className="block text-xs text-muted-foreground">{s.description}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.duration_minutes} min
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {fmt(Number(s.price))}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-accent"
                          title="Editar serviço"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          title="Excluir serviço"
                          onClick={() => setDeletingId(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editing ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold">Nome *</Label>
              <Input
                placeholder="Ex: Corte Masculino"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-semibold">Preço (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Duração (min)</Label>
                <Input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Descrição</Label>
              <Input
                placeholder="Opcional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Excluir serviço</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
