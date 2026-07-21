import 'server-only'

import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

/** Gera um codigo de 6 digitos com entropia criptografica (nao Math.random). */
export function gerarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** So o hash e persistido — nunca o codigo em texto plano (secao 5.4). */
export function hashDoCodigo(codigo: string): string {
  return createHash('sha256').update(codigo).digest('hex')
}

/**
 * Comparacao em tempo constante (secao 5.4). Comparar os hashes (nao os codigos)
 * ja da tamanho fixo, mas timingSafeEqual fecha o vazamento de qualquer jeito.
 */
export function codigoConfere(codigoDigitado: string, hashGuardado: string): boolean {
  const a = Buffer.from(hashDoCodigo(codigoDigitado), 'hex')
  const b = Buffer.from(hashGuardado, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Normaliza o que o usuario digitou: so digitos, exatamente 6. */
export function normalizarCodigo(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  const limpo = bruto.replace(/\D/g, '')
  return limpo.length === 6 ? limpo : null
}
