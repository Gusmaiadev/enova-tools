import 'server-only'

import type { Place } from './searchText'

/**
 * ⚠️ EXCECAO UNICA ao veto de Place Details (secao 7.1).
 *
 * A 7.1 probe Place Details para HIDRATAR buscas — la o searchText entrega 20
 * negocios por chamada e o Details seria 20x mais caro. Aqui e outra operacao:
 * revalidar UM lead salvo pelo seu placeId, que o searchText nao sabe fazer.
 * So e chamado para leads VENCIDOS (>30 dias) e VISIVEIS, em lote, sob demanda,
 * contando no mesmo teto mensal. Volume minimo por design.
 *
 * Field mask do Details NAO leva prefixo `places.` (e um recurso unico, nao lista).
 */
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'primaryTypeDisplayName',
  'websiteUri', // Enterprise — mesmo balde da searchText
  'nationalPhoneNumber',
].join(',')

type Localized = { text?: string } | undefined
type DetailsBruto = {
  id?: string
  displayName?: Localized
  formattedAddress?: string
  primaryTypeDisplayName?: Localized
  websiteUri?: string
  nationalPhoneNumber?: string
}

/** Retorna o Place atualizado, ou null se o negocio nao existe mais (404). */
export async function buscarDetalhes(placeId: string): Promise<Place | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY não configurado.')

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=BR`
  const resp = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': DETAILS_FIELD_MASK,
    },
    cache: 'no-store',
  })

  if (resp.status === 404) return null // negocio removido do Google
  if (!resp.ok) {
    throw new Error(`Place Details retornou ${resp.status}.`)
  }

  const d = (await resp.json()) as DetailsBruto
  return {
    id: d.id ?? placeId,
    displayName: d.displayName?.text ?? '(sem nome)',
    formattedAddress: d.formattedAddress ?? '',
    phone: d.nationalPhoneNumber ?? null,
    websiteUri: d.websiteUri ?? null,
    primaryType: d.primaryTypeDisplayName?.text ?? null,
  }
}
