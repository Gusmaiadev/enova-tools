import 'server-only'

import { db } from '@/lib/firebase/admin'
import { classificar } from '@/lib/places/classificar'
import type { Place } from '@/lib/places/searchText'
import { type Lead, leadId, type StatusLead } from '@/lib/tipos'

function docLead(teamId: string, placeId: string) {
  return db.collection('leads').doc(leadId(teamId, placeId))
}

/** Monta o doc completo de um lead a partir de um Place recem-buscado. */
export function montarLead(
  place: Place,
  teamId: string,
  ownerUid: string,
  ownerName: string,
): Lead {
  const agora = Date.now()
  return {
    placeId: place.id,
    teamId,
    ownerUid,
    ownerName,
    status: 'salvo',
    classificacao: classificar(place),
    cache: {
      displayName: place.displayName,
      formattedAddress: place.formattedAddress,
      phone: place.phone,
      websiteUri: place.websiteUri,
      primaryType: place.primaryType,
      cachedAt: agora,
    },
    proprio: { notas: '', telefoneConfirmado: null, contatoNome: null },
    createdAt: agora,
    updatedAt: agora,
  }
}

/**
 * Salva varios leads de uma vez (botao "Salvar todos"). Usa .create() por doc:
 * quem ja existe (meu ou de colega) e pulado sem sobrescrever — o leadId composto
 * garante isso. Todos os novos ficam com o dono atual (vao para "Meus leads").
 */
export async function salvarLote(
  places: Place[],
  teamId: string,
  ownerUid: string,
  ownerName: string,
): Promise<{ salvosIds: string[]; pulados: number }> {
  // Dedupe da entrada por id, descartando sem id.
  const unicos = [
    ...new Map(places.filter((p) => p?.id).map((p) => [p.id, p])).values(),
  ]

  const resultados = await Promise.allSettled(
    unicos.map((p) =>
      docLead(teamId, p.id)
        .create(montarLead(p, teamId, ownerUid, ownerName))
        .then(() => p.id),
    ),
  )

  const salvosIds = resultados
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map((r) => r.value)
  return { salvosIds, pulados: unicos.length - salvosIds.length }
}

export type ResultadoSalvar =
  | { ok: true; lead: Lead }
  | { ok: false; status: number; erro: string }

/**
 * Salva um lead. O leadId composto (teamId__placeId) torna a duplicata
 * fisicamente impossivel (secao 6): create() falha se ja existe, e nesse caso
 * informamos de quem e — nao roubamos o lead de um colega.
 */
export async function salvarLead(
  place: Place,
  teamId: string,
  ownerUid: string,
  ownerName: string,
): Promise<ResultadoSalvar> {
  const lead = montarLead(place, teamId, ownerUid, ownerName)
  try {
    await docLead(teamId, place.id).create(lead)
    return { ok: true, lead }
  } catch (e) {
    // ALREADY_EXISTS (gRPC code 6)
    if (typeof e === 'object' && e !== null && (e as { code?: number }).code === 6) {
      const snap = await docLead(teamId, place.id).get()
      const dono = (snap.data() as Lead | undefined)?.ownerName ?? 'um colega'
      return { ok: false, status: 409, erro: `Este lead já foi salvo por ${dono}.` }
    }
    return { ok: false, status: 500, erro: 'Não foi possível salvar o lead.' }
  }
}

const CAMPOS_STATUS: StatusLead[] = [
  'salvo',
  'contatado',
  'negociando',
  'fechado',
  'descartado',
]

export type PatchLead = {
  status?: StatusLead
  proprio?: Partial<Lead['proprio']>
}

/** Atualiza status e/ou os dados proprios. So o dono edita. */
export async function atualizarLead(
  teamId: string,
  placeId: string,
  ownerUid: string,
  patch: PatchLead,
): Promise<{ ok: true } | { ok: false; status: number; erro: string }> {
  const ref = docLead(teamId, placeId)
  const snap = await ref.get()
  const lead = snap.data() as Lead | undefined
  if (!lead) return { ok: false, status: 404, erro: 'Lead não encontrado.' }
  if (lead.ownerUid !== ownerUid) {
    return { ok: false, status: 403, erro: 'Este lead é de outro membro da equipe.' }
  }

  const update: Record<string, unknown> = { updatedAt: Date.now() }

  if (patch.status !== undefined) {
    if (!CAMPOS_STATUS.includes(patch.status)) {
      return { ok: false, status: 400, erro: 'Status inválido.' }
    }
    update.status = patch.status
  }

  if (patch.proprio) {
    // Merge campo a campo para nao apagar o que nao veio no patch.
    if (patch.proprio.notas !== undefined) update['proprio.notas'] = patch.proprio.notas
    if (patch.proprio.telefoneConfirmado !== undefined)
      update['proprio.telefoneConfirmado'] = patch.proprio.telefoneConfirmado
    if (patch.proprio.contatoNome !== undefined)
      update['proprio.contatoNome'] = patch.proprio.contatoNome
  }

  await ref.update(update)
  return { ok: true }
}
