import type { Transaction } from '@/types'
import { createZip } from '@/lib/zip-writer'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  cc: 'Cartão de Crédito',
  cd: 'Cartão de Débito',
  money: 'Dinheiro',
}

const CATEGORY_LABELS: Record<string, string> = {
  servico: 'Serviço',
  produto: 'Produto',
}

export function generateFinanceiroExcel(
  transactions: Transaction[],
  totals: { income: number; expense: number; balance: number },
  tenantName: string,
  customerMap: Map<string, string>,
) {
  const headers = [
    'Data/Hora',
    'Tipo',
    'Descrição',
    'Categoria',
    'Origem da Receita',
    'Método de Pagamento',
    'Cliente',
    'Valor',
  ]
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  let rows = '<row r="1">'
  headers.forEach((h, i) => {
    rows += `<c r="${cols[i]}1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`
  })
  rows += '</row>'

  transactions.forEach((t, idx) => {
    const r = idx + 2
    const tipo = t.type === 'income' ? 'Receita' : 'Despesa'
    const cat = t.category ? CATEGORY_LABELS[t.category] || t.category : '-'
    const pag = t.payment_method ? PAYMENT_LABELS[t.payment_method] || t.payment_method : '-'
    const cli = t.customer_id ? customerMap.get(t.customer_id) || '-' : '-'
    const data = new Date(t.created_at).toLocaleString('pt-BR')

    rows += `<row r="${r}">`
    rows += `<c r="A${r}" t="inlineStr"><is><t>${escapeXml(data)}</t></is></c>`
    rows += `<c r="B${r}" t="inlineStr"><is><t>${escapeXml(tipo)}</t></is></c>`
    rows += `<c r="C${r}" t="inlineStr"><is><t>${escapeXml(t.description || '-')}</t></is></c>`
    rows += `<c r="D${r}" t="inlineStr"><is><t>${escapeXml(cat)}</t></is></c>`
    rows += `<c r="E${r}" t="inlineStr"><is><t>${escapeXml(cat)}</t></is></c>`
    rows += `<c r="F${r}" t="inlineStr"><is><t>${escapeXml(pag)}</t></is></c>`
    rows += `<c r="G${r}" t="inlineStr"><is><t>${escapeXml(cli)}</t></is></c>`
    rows += `<c r="H${r}"><v>${Number(t.amount)}</v></c>`
    rows += '</row>'
  })

  const tr = transactions.length + 3
  rows += `<row r="${tr}"><c r="A${tr}" t="inlineStr"><is><t>Total Receitas:</t></is></c><c r="H${tr}"><v>${totals.income}</v></c></row>`
  rows += `<row r="${tr + 1}"><c r="A${tr + 1}" t="inlineStr"><is><t>Total Despesas:</t></is></c><c r="H${tr + 1}"><v>${totals.expense}</v></c></row>`
  rows += `<row r="${tr + 2}"><c r="A${tr + 2}" t="inlineStr"><is><t>Saldo:</t></is></c><c r="H${tr + 2}"><v>${totals.balance}</v></c></row>`

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="22"/><col min="2" max="2" width="12"/><col min="3" max="3" width="30"/><col min="4" max="4" width="15"/><col min="5" max="5" width="18"/><col min="6" max="6" width="22"/><col min="7" max="7" width="22"/><col min="8" max="8" width="14"/></cols><sheetData>${rows}</sheetData></worksheet>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatório Financeiro" sheetId="1" r:id="rId1"/></sheets></workbook>`

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`

  const enc = new TextEncoder()
  const blob = createZip([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml) },
  ])

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
