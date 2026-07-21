/** Formatadores pt-BR compartilhados (client e server). */

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

export function formatarMoeda(n: number): string {
  return moeda.format(Number.isFinite(n) ? n : 0)
}

export function formatarNumero(n: number): string {
  return inteiro.format(Number.isFinite(n) ? n : 0)
}

export function formatarDecimal(n: number): string {
  return decimal.format(Number.isFinite(n) ? n : 0)
}

/** Recebe uma fração (0.123) e devolve "12,3%". */
export function formatarPercent(fracao: number): string {
  return `${decimal.format((Number.isFinite(fracao) ? fracao : 0) * 100)}%`
}
