import 'server-only'

import { FieldValue } from 'firebase-admin/firestore'
import { db } from '@/lib/firebase/admin'

/**
 * Trava de custo mensal (secao 8.2). O free tier Enterprise e 1.000 chamadas/mes
 * e cada PAGINA e uma chamada billada. Bloqueamos em 800 para deixar folga. O
 * contador vive em usage/{yyyy-mm} e o free tier reseta dia 1º.
 */
export const LIMITE_MENSAL = 800

export function mesAtual(d = new Date()): string {
  const ano = d.getUTCFullYear()
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

function ref(mes: string) {
  return db.collection('usage').doc(mes)
}

export type EstadoUso = { total: number; limite: number; bloqueado: boolean; restante: number }

export async function estadoUso(mes = mesAtual()): Promise<EstadoUso> {
  const snap = await ref(mes).get()
  const total = (snap.data()?.chamadas as number | undefined) ?? 0
  return {
    total,
    limite: LIMITE_MENSAL,
    bloqueado: total >= LIMITE_MENSAL,
    restante: Math.max(0, LIMITE_MENSAL - total),
  }
}

/** Soma as chamadas de fato feitas numa busca. Cria o doc do mes se preciso. */
export async function registrarChamadas(qtd: number, mes = mesAtual()): Promise<void> {
  if (qtd <= 0) return
  await ref(mes).set(
    { chamadas: FieldValue.increment(qtd), atualizadoEm: Date.now() },
    { merge: true },
  )
}
