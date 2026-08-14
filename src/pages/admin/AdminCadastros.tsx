import { PendingTenants } from '@/components/PendingTenants'

export default function AdminCadastros() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastros Pendentes</h1>
        <p className="text-muted-foreground mt-1">
          Aprove ou rejeite novos cadastros de barbearias.
        </p>
      </div>
      <PendingTenants refreshTrigger={0} />
    </div>
  )
}
