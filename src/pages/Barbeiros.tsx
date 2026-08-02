import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Loader2, Scissors, Clock, Power, ShieldAlert } from 'lucide-react'
import {
  getBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  toggleBarberActive,
} from '@/services/barbers'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { WorkingHoursDialog } from '@/components/barbeiros/WorkingHoursDialog'
import type { Barber } from '@/types'

export default function Barbeiros() {
  const { profile, isSuperAdmin } = useAuth()
  const isAdmin = profile?.role === 'admin' || isSuperAdmin
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [deletingBarber, setDeletingBarber] = useState<Barber | null>(null)
  const [schedulingBarber, setSchedulingBarber] = useState<Barber | null>(null)
  const { toast } = useToast()

  const load = () => {
    setLoading(true)
    getBarbers().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setBarbers(data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async () => {
    if (!deletingBarber) return
    const { error } = await deleteBarber(deletingBarber.id)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Barbeiro removido!', description: deletingBarber.name })
      setDeletingBarber(null)
      load()
    }
  }

  const handleToggleActive = async (barber: Barber) => {
    const newValue = !barber.is_active
    const { error } = await toggleBarberActive(barber.id, newValue)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: newValue ? 'Barbeiro ativado!' : 'Barbeiro desativado!',
        description: barber.name,
      })
      load()
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground mt-1">
          Apenas administradores podem gerenciar barbeiros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scissors className="h-8 w-8 text-accent" /> Barbeiros
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os profissionais da barbearia.</p>
        </div>
        <Button
          className="bg-accent hover:bg-accent/90 text-white"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Adicionar Barbeiro
        </Button>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                </TableCell>
              </TableRow>
            ) : barbers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum barbeiro cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              barbers.map((barber) => (
                <TableRow key={barber.id} className={!barber.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{barber.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={barber.is_active ? 'default' : 'secondary'}
                      className={barber.is_active ? 'bg-emerald-100 text-emerald-800' : ''}
                    >
                      {barber.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(barber.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Horários de trabalho"
                        onClick={() => setSchedulingBarber(barber)}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={barber.is_active ? 'Desativar' : 'Ativar'}
                        onClick={() => handleToggleActive(barber)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingBarber(barber)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingBarber(barber)}
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
      </Card>

      <BarberFormDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSaved={load} />
      {editingBarber && (
        <BarberFormDialog
          open={!!editingBarber}
          barber={editingBarber}
          onOpenChange={(v) => !v && setEditingBarber(null)}
          onSaved={load}
        />
      )}
      <WorkingHoursDialog
        barber={schedulingBarber}
        open={!!schedulingBarber}
        onOpenChange={(v) => !v && setSchedulingBarber(null)}
      />
      <AlertDialog open={!!deletingBarber} onOpenChange={(v) => !v && setDeletingBarber(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir barbeiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deletingBarber?.name}&quot;? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BarberFormDialog({
  open,
  onOpenChange,
  onSaved,
  barber,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  barber?: Barber | null
}) {
  const [name, setName] = useState(barber?.name || '')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setName(barber?.name || '')
  }, [barber, open])

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = barber
      ? await updateBarber(barber.id, name.trim())
      : await createBarber(name.trim())
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: barber ? 'Barbeiro atualizado!' : 'Barbeiro cadastrado!',
        description: name.trim(),
      })
      setName('')
      onOpenChange(false)
      onSaved()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {barber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="font-semibold">Nome</Label>
            <Input
              placeholder="Nome do barbeiro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
