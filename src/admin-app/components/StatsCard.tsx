import { type ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: ReactNode
  icon?: ReactNode
  hint?: string
  accent?: 'amber' | 'green' | 'blue' | 'red'
}

const accentMap = {
  amber: 'bg-[#D4A44A]/10 text-[#D4A44A]',
  green: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
}

export function StatsCard({ title, value, icon, hint, accent = 'amber' }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>}
        </div>
        {icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentMap[accent]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
