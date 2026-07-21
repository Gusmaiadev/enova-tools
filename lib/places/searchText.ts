import 'server-only'

import { FIELD_MASK } from './fieldmask'
import type { Rect } from './geometria'

const URL = 'https://places.googleapis.com/v1/places:searchText'

/** Negocio ja normalizado — o resto do app so conhece este formato. */
export type Place = {
  id: string
  displayName: string
  formattedAddress: string
  phone: string | null
  websiteUri: string | null
  primaryType: string | null
}

/** LocalizedText { text, languageCode } | ausente -> string | null. */
type Localized = { text?: string } | undefined
type PlaceBruto = {
  id?: string
  displayName?: Localized
  formattedAddress?: string
  primaryTypeDisplayName?: Localized
  websiteUri?: string
  nationalPhoneNumber?: string
}
type RespostaBruta = {
  places?: PlaceBruto[]
  nextPageToken?: string
}

export class PlacesError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function normalizar(p: PlaceBruto): Place | null {
  if (!p.id) return null // sem id nao ha como deduplicar; descarta
  return {
    id: p.id,
    displayName: p.displayName?.text ?? '(sem nome)',
    formattedAddress: p.formattedAddress ?? '',
    phone: p.nationalPhoneNumber ?? null,
    websiteUri: p.websiteUri ?? null,
    primaryType: p.primaryTypeDisplayName?.text ?? null,
  }
}

type PaginaParams = {
  bbox: Rect
  tipo: string
  termo: string
  pageToken?: string
  signal?: AbortSignal
}

/**
 * Uma pagina (ate 20). Chamada UNICA e billada — o custo se conta aqui.
 * Todos os campos exceto pageToken precisam ser byte-identicos entre paginas,
 * entao monta-se o corpo de forma deterministica.
 */
async function buscarPagina({
  bbox,
  tipo,
  termo,
  pageToken,
  signal,
}: PaginaParams): Promise<{ places: Place[]; nextPageToken?: string }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new PlacesError('GOOGLE_MAPS_API_KEY não configurado.', 500)

  const body: Record<string, unknown> = {
    textQuery: termo, // searchText EXIGE textQuery
    includedType: tipo, // filtro de tipo (singular)
    strictTypeFiltering: true, // reduz type bleed do textQuery
    pageSize: 20,
    languageCode: 'pt-BR',
    regionCode: 'BR',
    locationRestriction: { rectangle: bbox },
  }
  if (pageToken) body.pageToken = pageToken

  const resp = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!resp.ok) {
    const texto = await resp.text().catch(() => '')
    throw new PlacesError(
      `Places retornou ${resp.status}: ${texto.slice(0, 300)}`,
      resp.status,
    )
  }

  // Resultado vazio vem como {} — places pode nem existir.
  const data = (await resp.json()) as RespostaBruta
  const places = (data.places ?? []).map(normalizar).filter((p): p is Place => p !== null)
  return { places, nextPageToken: data.nextPageToken }
}

export type ContadorPaginas = () => void

/**
 * Ate 3 paginas / 60 itens para uma celula. `aoBillar` e chamado UMA vez por
 * pagina de fato requisitada — e a unidade de custo (cada pagina e um request
 * Enterprise billado). `limitePaginas` corta a paginacao quando o orcamento
 * (teto por busca / restante mensal) acaba, para o teto ser DE FATO duro e nao
 * estourar por ate 2 paginas na ultima celula. Retorna os places dedupados por
 * id dentro da celula.
 */
export async function searchTextPaginado(
  bbox: Rect,
  tipo: string,
  termo: string,
  aoBillar?: ContadorPaginas,
  limitePaginas = 3,
  signal?: AbortSignal,
): Promise<Place[]> {
  const acc = new Map<string, Place>()
  let pageToken: string | undefined

  const paginas = Math.max(0, Math.min(3, limitePaginas))
  for (let pagina = 0; pagina < paginas; pagina++) {
    aoBillar?.()
    const { places, nextPageToken } = await buscarPagina({
      bbox,
      tipo,
      termo,
      pageToken,
      signal,
    })
    for (const p of places) acc.set(p.id, p)

    if (!nextPageToken) break
    pageToken = nextPageToken
  }

  return [...acc.values()]
}
