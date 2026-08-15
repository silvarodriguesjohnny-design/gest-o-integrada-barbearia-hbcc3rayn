export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function formatCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function formatCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function isValidCpfCnpj(value: string): boolean {
  const d = value.replace(/\D/g, '')
  return d.length === 11 || d.length === 14
}

// --- CPF (Receita Federal) ---

export function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  // Rejeita CPFs com todos os dígitos iguais (000.000.000-00, 111.111.111-11, ...)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i)
  let firstCheck = (sum * 10) % 11
  if (firstCheck === 10) firstCheck = 0
  if (firstCheck !== parseInt(cpf[9], 10)) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i)
  let secondCheck = (sum * 10) % 11
  if (secondCheck === 10) secondCheck = 0
  return secondCheck === parseInt(cpf[10], 10)
}
