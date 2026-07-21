import 'server-only'

import { db } from '@/lib/firebase/admin'
import type { AcaoLog, RegistroLog } from '@/lib/tipos'

/**
 * Log do que os usuarios fizeram nas ferramentas (hoje: buscas de leads). Best-
 * effort: gravar o log nunca pode derrubar a acao principal, por isso engole erros.
 */
export async function registrarLog(
  entrada: Omit<RegistroLog, 'createdAt'>,
): Promise<void> {
  try {
    await db.collection('logs').add({ ...entrada, createdAt: Date.now() })
  } catch {
    // ignora: um log perdido nao pode quebrar a busca
  }
}

/**
 * Ultimos registros da equipe, mais recentes primeiro. Filtra por igualdade
 * (indice de campo unico, automatico) e ordena em memoria — a equipe e pequena,
 * entao nao vale um indice composto so para isto.
 */
export async function listarLogs(teamId: string, limite = 200): Promise<RegistroLog[]> {
  const snap = await db.collection('logs').where('teamId', '==', teamId).get()
  return snap.docs
    .map((d) => d.data() as RegistroLog)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limite)
}

export const ROTULO_ACAO: Record<AcaoLog, string> = {
  busca_leads: 'Gerou busca de leads',
}
