export function formatBrasiliaDateTime(isoString: string | null | undefined): string {
  if (!isoString) {
    console.error('[datetime] formatBrasiliaDateTime received null/undefined input')
    return 'Data indisponível'
  }
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      console.error('[datetime] Invalid date value:', isoString)
      return isoString
    }
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const day = parts.find((p) => p.type === 'day')?.value || '00'
    const month = parts.find((p) => p.type === 'month')?.value || '00'
    const year = parts.find((p) => p.type === 'year')?.value || '0000'
    const hour = parts.find((p) => p.type === 'hour')?.value || '00'
    const minute = parts.find((p) => p.type === 'minute')?.value || '00'
    return `${day}/${month}/${year}, ${hour}:${minute}`
  } catch (err) {
    console.error('[datetime] Error formatting date:', isoString, '| error:', String(err))
    return isoString
  }
}
