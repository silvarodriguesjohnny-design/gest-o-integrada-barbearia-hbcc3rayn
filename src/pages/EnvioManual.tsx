import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getCustomers } from '@/services/customers'
import { sendManualWhatsAppMessage } from '@/services/whatsapp'
import { Customer } from '@/types'
import { formatPhone } from '@/lib/masks'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  Send,
  Loader2,
  Phone,
  User,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

export default function EnvioManual() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id

  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('custom')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorAlert, setErrorAlert] = useState<string | null>(null)
  const [lastSuccessMsg, setLastSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    getCustomers(tenantId).then(({ data }) => {
      if (data) setCustomers(data)
    })
  }, [tenantId])

  const handleSelectCustomer = (val: string) => {
    setSelectedCustomerId(val)
    setErrorAlert(null)
    setLastSuccessMsg(null)
    if (val === 'custom') {
      setCustomerName('')
      setPhone('')
      return
    }
    const cust = customers.find((c) => c.id === val)
    if (cust) {
      setCustomerName(cust.name)
      setPhone(cust.phone ? formatPhone(cust.phone) : '')
    }
  }

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhone(val))
    setErrorAlert(null)
  }

  const getSanitizedPreview = (num: string) => {
    let digits = num.replace(/\D/g, '')
    if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
      digits = digits.replace(/^0+/, '')
    }
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`
    }
    return digits
  }

  const sanitizedDigits = getSanitizedPreview(phone)

  const handleApplyTemplate = (tmpl: string) => {
    const nameToUse = customerName || 'Cliente'
    const text = tmpl.replace(/\{nome\}/g, nameToUse)
    setMessage(text)
  }

  const handleInsertVariable = (varName: string) => {
    setMessage((prev) => `${prev} ${varName}`)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) {
      toast({
        title: 'Sessão expirada',
        description: 'Sessão expirada ou barbearia não identificada.',
        variant: 'destructive',
      })
      return
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast({
        title: 'Telefone inválido',
        description: 'Informe um número de telefone válido com DDD (mínimo 10 dígitos).',
        variant: 'destructive',
      })
      return
    }
    if (!message.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Digite a mensagem a ser enviada.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setErrorAlert(null)
    setLastSuccessMsg(null)

    try {
      const { data, error } = await sendManualWhatsAppMessage(
        tenantId,
        phone,
        message,
        customerName || 'Cliente',
        selectedCustomerId !== 'custom' ? selectedCustomerId : undefined,
      )

      if (error || (data && !data.success)) {
        const errorMsg =
          data?.error || error?.message || 'Falha ao enviar mensagem. Verifique a integração.'
        setErrorAlert(errorMsg)
        toast({
          title: 'Falha no envio da mensagem',
          description: errorMsg,
          variant: 'destructive',
        })
      } else {
        const successText = `Mensagem enviada com sucesso para ${customerName || phone}!`
        setLastSuccessMsg(successText)
        toast({
          title: 'Mensagem enviada',
          description: successText,
        })
        setMessage('')
      }
    } catch (err) {
      const msg = `Erro inesperado: ${String(err)}`
      setErrorAlert(msg)
      toast({
        title: 'Erro inesperado',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" /> Envio Manual de Mensagens
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie avisos e lembretes para seus clientes via WhatsApp com formatação automática e
          tratamento de erros.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Nova Mensagem WhatsApp
          </CardTitle>
          <CardDescription>
            Selecione um cliente da base ou digite o número manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-5">
            {errorAlert && (
              <Alert
                variant="destructive"
                className="border-red-500 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="font-semibold">Falha no envio</AlertTitle>
                <AlertDescription className="text-sm mt-1">{errorAlert}</AlertDescription>
              </Alert>
            )}

            {lastSuccessMsg && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="font-semibold">Sucesso!</AlertTitle>
                <AlertDescription className="text-sm mt-1">{lastSuccessMsg}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-select" className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground" /> Selecionar Cliente
                </Label>
                <Select value={selectedCustomerId} onValueChange={handleSelectCustomer}>
                  <SelectTrigger id="customer-select">
                    <SelectValue placeholder="Escolha um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">-- Digitar manualmente --</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${formatPhone(c.phone)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-name">Nome do Destinatário</Label>
                <Input
                  id="customer-name"
                  placeholder="Ex: João Silva"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-muted-foreground" /> Telefone / WhatsApp
              </Label>
              <Input
                id="phone"
                placeholder="(11) 99548-2267"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
              {sanitizedDigits && (
                <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span>Destino formatado (DDI + DDD + Número):</span>
                  <Badge variant="outline" className="font-mono text-xs text-primary">
                    +{sanitizedDigits}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Conteúdo da Mensagem</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => handleInsertVariable('{nome}')}
                >
                  + {'{nome}'}
                </Button>
              </div>
              <Textarea
                id="message"
                rows={4}
                placeholder="Olá {nome}! Tudo bem? Passando para confirmar seu agendamento..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Modelos Rápidos
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleApplyTemplate(
                      'Olá {nome}! Tudo bem? Passando para lembrar do seu agendamento conosco. Qualquer dúvida estamos à disposição!',
                    )
                  }
                >
                  Lembrete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleApplyTemplate(
                      'Olá {nome}! Agradecemos a visita de hoje! Esperamos que tenha gostado do atendimento. Conte sempre conosco!',
                    )
                  }
                >
                  Agradecimento
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleApplyTemplate(
                      'Olá {nome}! Sentimos sua falta! Que tal agendar um novo corte para esta semana?',
                    )
                  }
                >
                  Retorno
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto min-w-[180px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar via WhatsApp
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
