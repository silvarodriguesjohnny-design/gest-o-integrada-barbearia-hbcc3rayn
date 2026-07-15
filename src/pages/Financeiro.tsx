import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, ShoppingCart, ArrowDownToLine, ArrowUpToLine, CheckCircle2 } from 'lucide-react'
import { MOCK_TRANSACTIONS } from '@/lib/mock'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function Financeiro() {
  const { toast } = useToast()

  const handleCheckout = () => {
    toast({
      title: 'Venda finalizada com sucesso!',
      description: 'O saldo de fidelidade do cliente foi atualizado.',
      variant: 'default',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro & PDV</h1>
        <p className="text-muted-foreground mt-1">Feche atendimentos e controle seu caixa.</p>
      </div>

      <Tabs defaultValue="pdv" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger
            value="pdv"
            className="data-[state=active]:bg-accent data-[state=active]:text-white"
          >
            PDV (Frente de Caixa)
          </TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="pdv" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-elevation transition-shadow">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <ShoppingCart className="h-5 w-5 text-accent" /> Nova Venda
                </CardTitle>
                <CardDescription>Selecione o cliente e os serviços realizados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Buscar Cliente</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">João Silva (VIP)</SelectItem>
                      <SelectItem value="2">Carlos Santos</SelectItem>
                      <SelectItem value="3">Cliente Avulso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Adicionar Serviço / Produto</Label>
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corte">Corte (R$ 45)</SelectItem>
                        <SelectItem value="barba">Barba (R$ 35)</SelectItem>
                        <SelectItem value="pomada">Pomada Modeladora (R$ 50)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="secondary" className="transition-transform active:scale-95">
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-5 bg-muted/30 mt-6 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Corte de Cabelo</span>
                    <span className="font-semibold text-primary">R$ 45,00</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Barba</span>
                    <span className="font-semibold text-primary">R$ 35,00</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center font-bold text-xl">
                    <span>Total</span>
                    <span className="text-emerald-600">R$ 80,00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-elevation transition-shadow">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="font-serif text-xl">Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Método de Pagamento</Label>
                  <Select defaultValue="pix">
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cc">Cartão de Crédito</SelectItem>
                      <SelectItem value="cd">Cartão de Débito</SelectItem>
                      <SelectItem value="money">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg flex gap-3 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div className="text-sm text-accent-foreground/90">
                    <strong>Fidelidade Ativa:</strong> Esta venda adicionará 1 selo ao cartão do
                    cliente João Silva.
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 shadow-md"
                  onClick={handleCheckout}
                >
                  Finalizar Venda - R$ 80,00
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fluxo" className="mt-6">
          <Card className="hover:shadow-elevation transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
              <div>
                <CardTitle className="font-serif text-xl">Histórico de Transações</CardTitle>
                <CardDescription>Entradas e saídas registradas.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="transition-transform active:scale-95">
                <Download className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Data/Hora</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right pr-6">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_TRANSACTIONS.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="pl-6 font-medium">{t.date}</TableCell>
                      <TableCell>{t.desc}</TableCell>
                      <TableCell>{t.method}</TableCell>
                      <TableCell className="text-right pr-6">
                        <span
                          className={cn(
                            'font-bold flex items-center justify-end gap-1.5',
                            t.type === 'in' ? 'text-emerald-600' : 'text-destructive',
                          )}
                        >
                          {t.type === 'in' ? (
                            <ArrowUpToLine className="h-4 w-4" />
                          ) : (
                            <ArrowDownToLine className="h-4 w-4" />
                          )}
                          R$ {t.amount.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
