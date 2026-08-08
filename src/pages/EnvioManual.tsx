import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Send, MessageSquare, AlertTriangle, Phone } from 'lucide-react'
import { getCustomers } from '@/services/customers'
import { sendManualMessage, type ManualMessageType } from '@/services/manual-message'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import type { CustomerWithDetails } from '@/types'

const MESSAGE_TYPES: { value: ManualMessageType; label: string; description: string }[] = [
  { value: 'ausencia', label: 'Ausência', description: 'Aviso de não comparecimento' },
  { value: 'campanha', label: 'Campanha', description: 'Mensagem promocional' },
  {
    value: 'confirmacao',
    label: 'Confirmação de Agendamento',
    description: 'Confirma agendamento',
  },
  { value: 'teste', label: 'Teste', description: 'Mensagem de teste' },
]

function buildMessage(type: ManualMessageType, customerName: string): string {
  switch (type) {
    case 'ausencia':
      return `⚠️ *Aviso de Ausência*\n\nOlá ${customerName}!\nNotamos que você não compareceu ao seu último agendamento.\nEntre em contato para remarcar!`
    case 'campanha':
      return `🎉 *Campanha Promocional*\n\nOlá ${customerName}!\nTemos uma oferta especial para você! Aproveite condições únicas em nossos serviços.\nAgende já o seu horário!`
    case 'confirmacao':
      return `✅ *Confirmação de Agendamento*\n\nOlá ${customerName}!\nSeu agendamento foi confirmado.\nEstamos te esperando!`
    case 'teste':
      return `🧪 *Mensagem de Teste*\n\nOlá ${customerName}!\nEste é um teste do sistema de mensagens.\nSe você recebeu esta mensagem, a configuração está funcionando!`
  }
}

export default function EnvioManual() {
  const { tenant } = useAuth()
  const { toast } = useToast()
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [messageType, setMessageType] = useState<ManualMessageType>('teste')

  useEffect(() => {
    getCustomers().then(({ data, error }) => {
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else setCustomers(data || [])
      setLoading(false)
    })
  }, [])

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId],
  )

  const messagePreview = useMemo(
    () => (selectedCustomer ? buildMessage(messageType, selectedCustomer.name) : ''),
    [messageType, selectedCustomer],
  )

  const handleSend = async () => {
    if (!tenant || !selectedCustomer) return
    if (!selectedCustomer.phone) {
      toast({
        title: 'Cliente sem telefone',
        description: 'O cliente selecionado não possui número de telefone.',
        variant: 'destructive',
      })
      return
    }
    setSending(true)
    const { data, error } = await sendManualMessage(tenant.id, selectedCustomer.id, messageType)
    setSending(false)
    if (error) {
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Falha no envio.',
        variant: 'destructive',
      })
    } else if (data?.error) {
      toast({
        title: 'Falha no envio',
        description: data.error,
        variant: 'destructive',
      })
    } else if (data?.success === false) {
      toast({
        title: 'Falha no envio',
        description: data?.error || 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Mensagem enviada!',
        description: data?.message || 'WhatsApp enviado com sucesso.',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Envio Manual de Mensagem</h1>
        <p className="text-muted-foreground mt-1">
          Envie mensagens via WhatsApp para seus clientes.
        </p>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <MessageSquare className="h-5 w-5 text-accent" /> Nova Mensagem
          </CardTitle>
          <CardDescription>Selecione um cliente e o tipo de mensagem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label className="font-semibold">Cliente</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.phone ? `— ${c.phone}` : '(sem telefone)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {selectedCustomer.phone || 'Sem telefone cadastrado'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Tipo de Mensagem</Label>
            <div className="grid grid-cols-2 gap-3">
              {MESSAGE_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  onClick={() => setMessageType(mt.value)}
                  className={cn(
                    'text-left p-3 rounded-lg border-2 transition-all',
                    messageType === mt.value
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50',
                  )}
                >
                  <div className="font-semibold text-sm">{mt.label}</div>
                  <div className="text-xs text-muted-foreground">{mt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {messagePreview && (
            <div className="space-y-2">
              <Label className="font-semibold">Pré-visualização</Label>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap font-mono">
                {messagePreview}
              </div>
            </div>
          )}

          {selectedCustomer && !selectedCustomer.phone && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Este cliente não possui telefone. O envio será bloqueado.
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !selectedCustomer || !selectedCustomer.phone}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
