import 'server-only'

import { db } from '@/lib/firebase/admin'
import type { StatusLead } from '@/lib/tipos'

export type IndiceEquipe = {
  meus: Set<string>
  equipe: Map<string, { ownerName: string; status: StatusLead }>
}

/**
 * Indice da equipe inteira numa UNICA query (secao 8.4). Nada de
 * where('placeId','in',[...]) — o operador `in` do Firestore para em 30 valores.
 * Com ~5 usuarios sao centenas de docs; filtrar em memoria e instantaneo.
 */
export async function indiceDaEquipe(teamId: string, uid: string): Promise<IndiceEquipe> {
  const snap = await db
    .collection('leads')
    .where('teamId', '==', teamId)
    .select('placeId', 'ownerUid', 'ownerName', 'status') // so o necessario
    .get()

  const meus = new Set<string>()
  const equipe = new Map<string, { ownerName: string; status: StatusLead }>()

  for (const d of snap.docs) {
    const l = d.data() as {
      placeId: string
      ownerUid: string
      ownerName: string
      status: StatusLead
    }
    if (l.ownerUid === uid) meus.add(l.placeId)
    else equipe.set(l.placeId, { ownerName: l.ownerName, status: l.status })
  }

  return { meus, equipe }
}
