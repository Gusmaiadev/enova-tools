import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { db } from '@/lib/firebase/admin'
import { salvarLead } from '@/lib/leads/persistencia'
import type { Place } from '@/lib/places/searchText'
import type { Lead, LeadEquipe } from '@/lib/tipos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/leads — lista meus leads e os da equipe (uma query, split em memoria). */
export async function GET() {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const snap = await db.collection('leads').where('teamId', '==', usuario.teamId).get()

  const meus: Lead[] = []
  const equipe: LeadEquipe[] = []
  for (const d of snap.docs) {
    const lead = d.data() as Lead
    if (lead.ownerUid === usuario.uid) {
      meus.push(lead)
    } else {
      // O campo `proprio` (notas, telefone confirmado, contato) e do dono e nunca
      // sai para o resto da equipe (secao 8.5) — a aba Equipe so mostra nome+status.
      const semProprio: Partial<Lead> = { ...lead }
      delete semProprio.proprio
      equipe.push(semProprio as LeadEquipe)
    }
  }

  const ordena = (a: { updatedAt: number }, b: { updatedAt: number }) =>
    b.updatedAt - a.updatedAt
  return Response.json({ meus: meus.sort(ordena), equipe: equipe.sort(ordena) })
}

/** POST /api/leads — salva um lead a partir de um resultado de busca. */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let place: Place
  try {
    place = (await req.json()).place
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!place?.id || typeof place.id !== 'string') {
    return Response.json({ erro: 'Lead inválido.' }, { status: 400 })
  }

  const r = await salvarLead(place, usuario.teamId, usuario.uid, usuario.name)
  if (!r.ok) return Response.json({ erro: r.erro }, { status: r.status })
  return Response.json({ ok: true, lead: r.lead })
}
