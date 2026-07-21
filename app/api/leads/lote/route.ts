import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { salvarLote } from '@/lib/leads/persistencia'
import type { Place } from '@/lib/places/searchText'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LOTE = 200 // teto de sanidade

/** POST /api/leads/lote — salva varios leads gerados de uma vez em "Meus leads". */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let places: Place[]
  try {
    places = (await req.json()).places
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (!Array.isArray(places)) {
    return Response.json({ erro: 'Nenhum lead para salvar.' }, { status: 400 })
  }

  const { salvosIds, pulados } = await salvarLote(
    places.slice(0, MAX_LOTE),
    usuario.teamId,
    usuario.uid,
    usuario.name,
  )
  return Response.json({ ok: true, salvos: salvosIds.length, salvosIds, pulados })
}
