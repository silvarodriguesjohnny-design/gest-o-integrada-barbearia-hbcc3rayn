import type { Transaction } from '@/types'

export function generateFinanceiroPDF(
  transactions: Transaction[],
  totals: { income: number; expense: number; balance: number },
  tenantName: string,
) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const rows = transactions
    .map(
      (t) => `<tr>
      <td>${new Date(t.created_at).toLocaleString('pt-BR')}</td>
      <td>${t.description || '-'}</td>
      <td>${t.type === 'income' ? 'Receita' : 'Despesa'}</td>
      <td>${t.category || '-'}</td>
      <td>${t.payment_method || '-'}</td>
      <td style="text-align:right;color:${t.type === 'income' ? '#059669' : '#dc2626'}">${fmt(Number(t.amount))}</td>
    </tr>`,
    )
    .join('')

  win.document
    .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Financeiro</title>
  <style>
    body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}
    h1{font-size:22px;margin:0 0 4px}
    .subtitle{color:#6b7280;font-size:13px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f3f4f6;padding:8px;text-align:left;border-bottom:2px solid #d1d5db}
    td{padding:8px;border-bottom:1px solid #e5e7eb}
    .totals{margin-top:20px;font-size:14px}
    .total-line{display:flex;justify-content:space-between;padding:4px 0;max-width:320px;margin-left:auto}
    @media print{.no-print{display:none}}
  </style></head><body>
    <h1>Relatório Financeiro - ${tenantName}</h1>
    <p class="subtitle">Gerado em ${new Date().toLocaleString('pt-BR')} | ${transactions.length} transação(ões)</p>
    <table><thead><tr><th>Data/Hora</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Pagamento</th><th style="text-align:right">Valor</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div class="total-line"><span>Total Receitas:</span><strong style="color:#059669">${fmt(totals.income)}</strong></div>
      <div class="total-line"><span>Total Despesas:</span><strong style="color:#dc2626">${fmt(totals.expense)}</strong></div>
      <div class="total-line"><span>Saldo:</span><strong>${fmt(totals.balance)}</strong></div>
    </div>
    <button class="no-print" onclick="window.print()" style="margin-top:24px;padding:10px 20px;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer">Imprimir / Salvar PDF</button>
  </body></html>`)
  win.document.close()
  setTimeout(() => win.print(), 500)
}
