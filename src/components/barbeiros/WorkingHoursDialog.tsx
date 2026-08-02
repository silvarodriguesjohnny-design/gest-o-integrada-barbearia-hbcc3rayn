import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getBarberSchedules, saveBarberSchedules } from '@/services/barber-schedules'
import type { Barber } from '@/types'

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

interface DaySchedule {
  enabled: boolean
  start: string
  end: string
}

interface Props {
  barber: Barber | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function WorkingHoursDialog({ barber, open, onOpenChange }: Props) {
  const { toast } = useToast()
  const [schedules, setSchedules] = useState<Record<number, DaySchedule>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (barber && open) {
      setLoading(true)
      getBarberSchedules(barber.id).then(({ data }) => {
        const initial: Record<number, DaySchedule> = {}
        DAYS.forEach((d) => {
          initial[d.value] = { enabled: false, start: '09:00', end: '18:00' }
        })
        if (data) {
          data.forEach((s) => {
            initial[s.day_of_week] = {
              enabled: true,
              start: s.start_time,
              end: s.end_time,
            }
          })
        }
        setSchedules(initial)
        setLoading(false)
      })
    }
  }, [barber, open])

  const toggleDay = (day: number) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day]?.enabled },
    }))
  }

  const updateTime = (day: number, field: 'start' | 'end', value: string) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  const handleSave = async () => {
    if (!barber) return
    setSaving(true)
    const toSave = DAYS.filter((d) => schedules[d.value]?.enabled).map((d) => ({
      day_of_week: d.value,
      start_time: schedules[d.value].start,
      end_time: schedules[d.value].end,
    }))
    const { error } = await saveBarberSchedules(barber.id, toSave)
    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Horários salvos!', description: barber.name })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Horários de Trabalho - {barber?.name}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid gap-3 py-4 max-h-[400px] overflow-y-auto">
            {DAYS.map((day) => {
              const sched = schedules[day.value] || { enabled: false, start: '09:00', end: '18:00' }
              return (
                <div
                  key={day.value}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <Checkbox checked={sched.enabled} onCheckedChange={() => toggleDay(day.value)} />
                  <Label
                    className="w-20 text-sm font-medium cursor-pointer"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Label>
                  {sched.enabled && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Input
                        type="time"
                        value={sched.start}
                        onChange={(e) => updateTime(day.value, 'start', e.target.value)}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">até</span>
                      <Input
                        type="time"
                        value={sched.end}
                        onChange={(e) => updateTime(day.value, 'end', e.target.value)}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
