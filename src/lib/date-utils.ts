/**
 * Utility functions for standardized local date/time conversions across the app.
 * Prevents timezone offset bugs where 09:00 displays as 06:00.
 */

export function formatTimeHHMM(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '--:--'
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  if (isNaN(d.getTime())) return '--:--'
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatLocalDateYYYYMMDD(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return ''
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildIsoString(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return new Date().toISOString()
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return localDate.toISOString()
}

export function formatDateBR(dateOrIso: Date | string | undefined): string {
  if (!dateOrIso) return ''
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
