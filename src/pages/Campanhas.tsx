import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MessageSquare, Handshake, PlayCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Campanhas() {
  const { toast } = useToast()

  const handleActivate = () => {
    toast({
      title: 'Campanha ativada!',
      description: 'As mensagens serão disparadas nas datas configuradas.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fidelidade & Campanhas</h1>
        <p className="text-muted-foreground mt-1">Automatize mensagens e gerencie parceiros.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="hover:shadow-elevation transition-shadow">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <CalendarDays className="h-5 w-5 text-accent" /> Campanhas Sazonais
              </CardTitle>
              <CardDescription>Configure gatilhos para datas comemorativas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="border rounded-lg p-5 space-y-5 bg-card shadow-sm hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-lg font-bold font-serif">Dia dos Pais</Label>
                    <p className="text-sm text-muted-foreground">Envia mensagem 5 dias antes.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Desconto (%)</Label>
                    <Input type="number" defaultValue={15} className="w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Mensagem (WhatsApp)</Label>
                  <Textarea
                    defaultValue="Fala {nome}! O Dia dos Pais está chegando. Venha dar um trato no visual e ganhe 15% de desconto. Agende aqui: {link}"
                    className="h-24 resize-none"
                  />
                </div>
                <Button
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white transition-transform active:scale-95"
                  onClick={handleActivate}
                >
                  <PlayCircle className="h-4 w-4 mr-2" /> Salvar e Ativar
                </Button>
              </div>

              <div className="border rounded-lg p-5 space-y-4 opacity-70 hover:opacity-100 transition-all bg-card shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-lg font-bold font-serif">Aniversariantes do Mês</Label>
                    <p className="text-sm text-muted-foreground">Envia no dia 1º de cada mês.</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-destructive/50 bg-destructive/5 hover:shadow-elevation transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-destructive font-serif text-xl">
                <MessageSquare className="h-5 w-5" /> Alerta de Inatividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-5 text-foreground/80 leading-relaxed">
                Envia automaticamente uma mensagem de resgate para clientes que não visitam a
                barbearia há mais de <strong className="text-destructive">60 dias</strong>.
              </p>
              <Button variant="destructive" className="w-full transition-transform active:scale-95">
                Configurar Mensagem
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elevation transition-shadow">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <Handshake className="h-5 w-5 text-accent" /> Módulo de Parceiros
              </CardTitle>
              <CardDescription>Empresas com convênio.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-semibold">Academia SmartFit</p>
                    <p className="text-sm text-muted-foreground">Desconto de 10%</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                    Ativo
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-semibold">Cervejaria Local</p>
                    <p className="text-sm text-muted-foreground">1 Chopp Grátis</p>
                  </div>
                  <Badge variant="secondary">Pausado</Badge>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-primary mt-4 border-dashed border-2 hover:bg-accent/5 hover:text-accent hover:border-accent transition-colors"
                >
                  + Adicionar Parceiro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
