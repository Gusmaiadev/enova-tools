import 'server-only'

import { db } from '@/lib/firebase/admin'

export type IndiceEquipe = {
  meus: Set<string>
  /** placeIds ja salvos por colegas — somem das minhas novas buscas. */
  equipe: Set<string>
}

/**
 * Indice da equipe inteira numa UNICA query (secao 8.4). Nada de
 * where('placeId','in',[...]) — o operador `in` do Firestore para em 30 valores.
 * Com ~5 usuarios sao centenas de docs; filtrar em memoria e instantaneo.
 *
 * A busca descarta tanto os meus leads quanto os de colegas, entao so precisamos
 * saber QUAIS placeIds ja pertencem a alguem — nem nome nem status.
 */
export async function indiceDaEquipe(teamId: string, uid: string): Promise<IndiceEquipe> {
  const snap = await db
    .collection('leads')
    .where('teamId', '==', teamId)
    .select('placeId', 'ownerUid') // so o necessario
    .get()

  const meus = new Set<string>()
  const equipe = new Set<string>()

  for (const d of snap.docs) {
    const l = d.data() as { placeId: string; ownerUid: string }
    if (l.ownerUid === uid) meus.add(l.placeId)
    else equipe.add(l.placeId)
  }

  return { meus, equipe }
}
