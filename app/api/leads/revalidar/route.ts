import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { db } from '@/lib/firebase/admin'
import { classificar } from '@/lib/places/classificar'
import { buscarDetalhes } from '@/lib/places/placeDetails'
import { estadoUso, registrarChamadas } from '@/lib/places/usage'
import { type CacheLead, type Lead, leadId, TTL_CACHE_MS } from '@/lib/tipos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_POR_CHAMADA = 20 // só o que cabe na tela

/**
 * Revalida o cache dos leads VENCIDOS e VISIVEIS (secao 8.5). Cada revalidacao e
 * uma chamada Place Details Enterprise — por isso: so vencidos (checado no
 * server), no maximo os visiveis, respeitando o teto mensal.
 */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let placeIds: string[]
  try {
    placeIds = (await req.json()).placeIds
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (!Array.isArray(placeIds) || placeIds.length === 0) {
    return Response.json({ atualizados: {} })
  }

  const uso = await estadoUso()
  let orcamento = Math.min(uso.restante, MAX_POR_CHAMADA)
  const alvos = placeIds.slice(0, MAX_POR_CHAMADA)

  const atualizados: Record<string, { cache: CacheLead; classificacao: string }> = {}
  let chamadas = 0

  for (const placeId of alvos) {
    if (orcamento <= 0) break

    const ref = db.collection('leads').doc(leadId(usuario.teamId, placeId))
    const snap = await ref.get()
    const lead = snap.data() as Lead | undefined

    // So o dono revalida os proprios leads, e so se de fato vencido.
    if (!lead || lead.ownerUid !== usuario.uid) continue
    if (Date.now() - lead.cache.cachedAt <= TTL_CACHE_MS) continue

    let place
    try {
      place = await buscarDetalhes(placeId)
    } catch {
      continue // erro de rede: nao chegou a billar, nao conta
    }
    // Chegou uma resposta HTTP (200 ou 404) — billou. So agora conta.
    orcamento--
    chamadas++
    if (!place) continue // 404: negocio sumiu; mantem o que ha

    const cache: CacheLead = {
      displayName: place.displayName,
      formattedAddress: place.formattedAddress,
      phone: place.phone,
      websiteUri: place.websiteUri,
      primaryType: place.primaryType,
      cachedAt: Date.now(),
    }
    const classificacao = classificar(place)
    // O campo `proprio` nunca e tocado — aquilo e do usuario (secao 8.5).
    await ref.update({ cache, classificacao, updatedAt: Date.now() })
    atualizados[placeId] = { cache, classificacao }
  }

  if (chamadas > 0) await registrarChamadas(chamadas)
  return Response.json({ atualizados })
}
