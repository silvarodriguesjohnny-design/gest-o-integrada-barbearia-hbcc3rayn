import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Users,
  CalendarDays,
  CreditCard,
  MonitorSmartphone,
  Scissors,
} from 'lucide-react'
import { type ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: '/barbearias', label: 'Barbearias', icon: <Store className="h-4 w-4" /> },
  { to: '/clientes', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
  { to: '/agendamentos', label: 'Agendamentos', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/stripe', label: 'Stripe', icon: <CreditCard className="h-4 w-4" /> },
  { to: '/totem-pwa', label: 'Totem / PWA', icon: <MonitorSmartphone className="h-4 w-4" /> },
]

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div className="flex h-16 items-center gap-2 border-b border-[hsl(var(--border))] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4A44A] text-white">
          <Scissors className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-serif text-base font-semibold">Na Régua</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Admin Console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#D4A44A]/10 text-[#D4A44A]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
              }`
            }
          >
            {it.icon}
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[hsl(var(--border))] p-4 text-xs text-[hsl(var(--muted-foreground))]">
        Aplicação isolada · v1.0
      </div>
    </aside>
  )
}
