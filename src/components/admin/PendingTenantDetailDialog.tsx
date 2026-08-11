import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { PendingTenant } from '@/types'

const FIELDS: { key: keyof PendingTenant; label: string }[] = [
  { key: 'full_name', label: 'Nome Completo' },
  { key: 'nome_negocio', label: 'Nome do Negócio' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { key: 'cep', label: 'CEP' },
  { key: 'rua', label: 'Rua' },
  { key: 'numero', label: 'Número' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'horario_funcionamento', label: 'Horário de Funcionamento' },
  { key: 'numero_cadeiras', label: 'Nº de Cadeiras' },
  { key: 'quantidade_profissionais', label: 'Nº de Profissionais' },
]

export function PendingTenantDetailDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: PendingTenant | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!tenant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Detalhes do Cadastro</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {tenant.nome_negocio}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {tenant.status}
            </Badge>
          </div>
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="flex justify-between gap-4 text-sm border-b pb-2">
              <span className="text-muted-foreground font-medium">{label}</span>
              <span className="text-right font-semibold">
                {tenant[key] !== null && tenant[key] !== undefined && tenant[key] !== ''
                  ? String(tenant[key])
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
