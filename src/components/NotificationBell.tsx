import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Bell, Calendar, Building2, Clock } from 'lucide-react'
import { getRecentActivities } from '@/services/notifications'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface Activity {
  type: string
  title: string
  subtitle: string
  time: string
}

export function NotificationBell() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [hasUnread, setHasUnread] = useState(true)
  const { isSuperAdmin } = useAuth()

  useEffect(() => {
    getRecentActivities(isSuperAdmin).then(({ data }) => {
      if (data) setActivities(data)
    })
  }, [isSuperAdmin])

  return (
    <Popover onOpenChange={(open) => open && setHasUnread(false)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && activities.length > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive border border-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3">
          <p className="font-semibold text-sm">Notificações</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma atividade recente.
            </p>
          ) : (
            activities.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 border-b last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                    a.type === 'appointment' ? 'bg-accent/10' : 'bg-emerald-100',
                  )}
                >
                  {a.type === 'appointment' ? (
                    <Calendar className="h-4 w-4 text-accent" />
                  ) : (
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {a.time}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
