import { useAdminAuth } from '../auth'
import { LogOut, ShieldCheck } from 'lucide-react'

export function Header() {
  const { profile, signOut } = useAdminAuth()
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#D4A44A]" />
        <span className="font-serif text-lg font-semibold">Painel Administrativo</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium leading-tight">
            {profile?.full_name || profile?.email || 'Admin'}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-tight">Super Admin</p>
        </div>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          title="Sair"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </header>
  )
}
