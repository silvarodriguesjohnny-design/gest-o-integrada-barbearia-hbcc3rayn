import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportAppointment, BillingRow, ReportSummary } from '@/services/reports'
import { formatDateBR, formatTimeHHMM } from '@/lib/date-utils'

const BOM = '\uFEFF'
const DELIMITER = ';'

function escapeCsv(value: string): string {
  const needsQuote =
    value.includes(DELIMITER) || value.includes('"') || value.includes('\n') || value.includes('\r')
  const escaped = value.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtBRLPlain(v: number): string {
  // CSV-friendly: "1.234,56"
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, filename)
}

/* ----------------------------- Agendamentos ----------------------------- */

export function exportAppointmentsCsv(
  appointments: ReportAppointment[],
  startDate: string,
  endDate: string,
) {
  const headers = [
    'Data',
    'Horário',
    'Cliente',
    'Telefone',
    'Serviço',
    'Profissional',
    'Status',
    'Valor (R$)',
    'Barbearia',
  ]
  const rows = appointments.map((a) => [
    formatDateBR(a.start_time),
    formatTimeHHMM(a.start_time),
    a.customer_name,
    a.customer_phone || '',
    a.service_name,
    a.barber_name || '',
    STATUS_LABELS[a.status] || a.status,
    fmtBRLPlain(a.service_price || 0),
    a.tenant_name,
  ])

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => escapeCsv(String(c))).join(DELIMITER))
    .join('\r\n')

  downloadCsv(csv, `agendamentos_${startDate}_${endDate}.csv`)
}

export function exportAppointmentsPdf(
  appointments: ReportAppointment[],
  tenantName: string,
  startDate: string,
  endDate: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const now = new Date().toLocaleString('pt-BR')

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Relatório de Agendamentos — ${tenantName}`, 40, 40)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90)
  doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, 40, 58)

  autoTable(doc, {
    startY: 80,
    head: [
      [
        'Data',
        'Horário',
        'Cliente',
        'Telefone',
        'Serviço',
        'Profissional',
        'Status',
        'Valor (R$)',
        'Barbearia',
      ],
    ],
    body: appointments.map((a) => [
      formatDateBR(a.start_time),
      formatTimeHHMM(a.start_time),
      a.customer_name,
      a.customer_phone || '—',
      a.service_name,
      a.barber_name || '—',
      STATUS_LABELS[a.status] || a.status,
      fmtBRL(a.service_price || 0),
      a.tenant_name,
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 40, right: 40 },
  })

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY ?? 80
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Gerado em ${now}`, 40, Math.min(finalY + 24, doc.internal.pageSize.getHeight() - 24))
  doc.text(
    `${appointments.length} registro(s)`,
    pageWidth - 40,
    Math.min(finalY + 24, doc.internal.pageSize.getHeight() - 24),
    { align: 'right' },
  )

  doc.save(`agendamentos_${startDate}_${endDate}.pdf`)
}

/* ------------------------------- Faturamento ----------------------------- */

export function exportBillingCsv(billing: BillingRow[], startDate: string, endDate: string) {
  const headers = [
    'Barbearia',
    'Mês/Ano',
    'Total de Agendamentos',
    'Concluídos',
    'Taxa de Comparecimento (%)',
    'Faturamento Total (R$)',
    'Ticket Médio (R$)',
  ]
  const rows = billing.map((b) => [
    b.tenantName,
    b.monthYear,
    String(b.totalAppointments),
    String(b.completed),
    String(b.attendanceRate),
    fmtBRLPlain(b.revenue),
    fmtBRLPlain(b.averageTicket),
  ])

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => escapeCsv(String(c))).join(DELIMITER))
    .join('\r\n')

  downloadCsv(csv, `faturamento_${startDate}_${endDate}.csv`)
}

export function exportBillingPdf(
  billing: BillingRow[],
  summary: ReportSummary,
  tenantName: string,
  startDate: string,
  endDate: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const now = new Date().toLocaleString('pt-BR')

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Relatório de Faturamento — ${tenantName}`, 40, 40)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90)
  doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, 40, 58)

  // Summary cards
  const cards = [
    { label: 'Faturamento Total', value: fmtBRL(summary.totalRevenue) },
    { label: 'Ticket Médio', value: fmtBRL(summary.averageTicket) },
    { label: 'Total de Concluídos', value: String(summary.totalCompleted) },
    { label: 'Taxa de Comparecimento', value: `${summary.attendanceRate}%` },
  ]
  const cardW = (pageWidth - 80 - 30) / 4
  cards.forEach((c, i) => {
    const x = 40 + i * (cardW + 10)
    doc.setFillColor(250, 247, 242)
    doc.roundedRect(x, 76, cardW, 56, 4, 4, 'F')
    doc.setDrawColor(217, 119, 6)
    doc.setLineWidth(1)
    doc.line(x, 76, x + cardW, 76)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.setFont('helvetica', 'normal')
    doc.text(c.label, x + 8, 94)
    doc.setFontSize(13)
    doc.setTextColor(30)
    doc.setFont('helvetica', 'bold')
    doc.text(c.value, x + 8, 116)
  })

  autoTable(doc, {
    startY: 150,
    head: [
      [
        'Barbearia',
        'Mês/Ano',
        'Agendamentos',
        'Concluídos',
        'Comparecimento',
        'Faturamento',
        'Ticket Médio',
      ],
    ],
    body: billing.map((b) => [
      b.tenantName,
      b.monthYear,
      String(b.totalAppointments),
      String(b.completed),
      `${b.attendanceRate}%`,
      fmtBRL(b.revenue),
      fmtBRL(b.averageTicket),
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 40, right: 40 },
  })

  const finalY = (doc as any).lastAutoTable?.finalY ?? 150
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em ${now}`, 40, Math.min(finalY + 24, doc.internal.pageSize.getHeight() - 24))
  doc.text(
    `${billing.length} grupo(s)`,
    pageWidth - 40,
    Math.min(finalY + 24, doc.internal.pageSize.getHeight() - 24),
    { align: 'right' },
  )

  doc.save(`faturamento_${startDate}_${endDate}.pdf`)
}
