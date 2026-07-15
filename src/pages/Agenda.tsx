import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, Plus, Share2, User } from 'lucide-react'
import { MOCK_APPOINTMENTS } from '@/lib/mock'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function Agenda() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const { toast } = useToast()

  const copyLink = () => {
    navigator.clipboard.writeText('https://barberflow.app/book/minhabarbearia')
    toast({
      title: 'Link copiado!',
      description: 'Envie para seus clientes agendarem online.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus horários e agendamentos.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copyLink}
            className="transition-transform active:scale-95"
          >
            <Share2 className="h-4 w-4 mr-2" /> Link Público
          </Button>
          <NewBookingModal />
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 h-fit hover:shadow-elevation transition-shadow">
          <CardContent className="p-3">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md mx-auto"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 hover:shadow-elevation transition-shadow">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Horários - {date?.toLocaleDateString('pt-BR')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {MOCK_APPOINTMENTS.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-20 px-2 py-1.5 rounded-md bg-accent/10 text-accent shrink-0">
                    <Clock className="h-4 w-4 mb-1" />
                    <span className="font-bold">{app.time}</span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center w-full">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">
                        Cliente
                      </p>
                      <p className="font-semibold flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {app.customer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">
                        Serviço
                      </p>
                      <p className="font-medium">{app.service}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">
                        Profissional
                      </p>
                      <p className="font-medium">{app.barber}</p>
                    </div>
                    <div className="text-right sm:text-center md:text-right w-full">
                      <Badge
                        variant={app.status === 'Concluído' ? 'secondary' : 'default'}
                        className={
                          app.status === 'Concluído'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : ''
                        }
                      >
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function NewBookingModal() {
  const { toast } = useToast()

  const handleSave = () => {
    toast({
      title: 'Agendamento criado',
      description: 'O cliente receberá uma notificação via WhatsApp.',
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-white transition-transform active:scale-95">
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Novo Agendamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cliente</Label>
            <Input placeholder="Nome do cliente" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Serviço</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corte">Corte (R$ 45)</SelectItem>
                  <SelectItem value="barba">Barba (R$ 35)</SelectItem>
                  <SelectItem value="combo">Corte + Barba (R$ 75)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Profissional</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thiago">Thiago</SelectItem>
                  <SelectItem value="felipe">Felipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Data</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Horário</Label>
              <Input type="time" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button onClick={handleSave} className="bg-primary text-white">
              Salvar Agendamento
            </Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
