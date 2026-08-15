import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Scissors, Gift, BadgeCheck } from 'lucide-react'
import { redeemReward } from '@/services/loyalty'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { CustomerWithDetails } from '@/types'
import { formatCpf } from '@/lib/masks'

export function CustomerProfileModal({
  customer,
  onRedeem,
}: {
  customer: CustomerWithDetails
  onRedeem: () => void
}) {
  const { toast } = useToast()
  const stamps = customer.loyalty_card?.stamps_count ?? 0

  const handleRedeem = async () => {
    const { error } = await redeemReward(customer.id)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Recompensa resgatada!', description: 'Cartão fidelidade resetado.' })
      onRedeem()
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-accent/10 hover:text-accent">
          Ver Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-serif">
            {customer.name}
            {customer.is_subscriber && (
              <Badge className="bg-accent/15 text-accent border-accent/30">
                <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Assinante
              </Badge>
            )}
            {stamps >= 10 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                VIP
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {customer.cpf && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">CPF:</span> {formatCpf(customer.cpf)}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Visitas
              </div>
              <div className="text-2xl font-bold">{customer.visit_count ?? 0}</div>
            </div>
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Selos
              </div>
              <div className="text-2xl font-bold">{stamps}/12</div>
            </div>
            <div className="bg-muted/50 border p-4 rounded-lg flex flex-col justify-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold">
                Última Visita
              </div>
              <div className="text-lg font-bold">
                {customer.last_visit_at
                  ? new Date(customer.last_visit_at).toLocaleDateString('pt-BR')
                  : 'Nunca'}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Cartão Fidelidade (12+1)</h3>
            <div className="grid grid-cols-6 gap-3 sm:gap-4 p-4 rounded-lg border bg-card shadow-sm">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    i < stamps
                      ? 'border-accent bg-accent text-white scale-105 shadow-sm'
                      : 'border-muted bg-transparent text-muted-foreground/30',
                  )}
                >
                  <Scissors className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              ))}
              <div
                className={cn(
                  'aspect-square rounded-full flex items-center justify-center border-2 border-dashed transition-all',
                  stamps >= 12
                    ? 'border-emerald-500 text-emerald-500 bg-emerald-50'
                    : 'border-muted-foreground/30 text-muted-foreground/30',
                )}
              >
                <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 font-medium">
              {stamps >= 12
                ? 'Recompensa pronta! Resgate seu serviço grátis.'
                : `Faltam ${12 - stamps} cortes para ganhar um serviço grátis!`}
            </p>
            {stamps >= 12 && (
              <Button
                onClick={handleRedeem}
                className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Resgatar Recompensa
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
