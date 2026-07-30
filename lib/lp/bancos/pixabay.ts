import 'server-only'

/**
 * Pixabay (https://pixabay.com/api/docs/) — segunda fonte, somada ao Pexels
 * para dobrar a variedade de cada busca. Chave gratuita, licenca de uso
 * comercial, sem marca d'agua.
 *
 * Limites: 100 requisicoes/60s. Os termos pedem que as respostas sejam
 * cacheadas por 24h (ver cache em ./index) e que a interface mostre de onde a
 * midia veio.
 *
 * Diferencas em relacao ao Pexels que o codigo precisa contornar:
 * - `orientation` aceita so all/horizontal/vertical — nao tem "square". Para
 *   quadrado pedimos `all` e o orquestrador filtra pela proporcao.
 * - A busca de VIDEO nao tem `orientation` nenhum: mesmo caminho, filtro depois.
 * - `webformatURL` (640px) vale 24h; `largeImageURL` (1280px) e o que da para
 *   guardar no documento. Por isso `url` sai do largeImageURL, e o webformat
 *   fica so na miniatura do seletor (que e sempre recem-buscada).
 */

import type { LpMidia, Orientacao, TipoMidia } from '../tipos'
import type { RespostaBanco } from './pexels'
import { escalarLadoMaior } from './util'

const IMAGENS = 'https://pixabay.com/api/'
const VIDEOS = 'https://pixabay.com/api/videos/'

/** largeImageURL e o maior tamanho sem "full API access": 1280px no lado maior. */
const LADO_MAX_PAGINA = 1280

export const temPixabay = (): boolean => Boolean(process.env.PIXABAY_API_KEY)

const texto = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined

const numero = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined

/** 'office, team, meeting' -> 'Office, team, meeting' (o Pixabay nao tem alt). */
function altDasTags(tags: unknown, busca: string): string {
  const t = texto(tags)
  if (!t) return busca
  const primeiras = t.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3).join(', ')
  return primeiras === '' ? busca : primeiras.charAt(0).toUpperCase() + primeiras.slice(1)
}

const perfil = (user: unknown, id: unknown): string | undefined =>
  texto(user) && numero(id) ? `https://pixabay.com/users/${texto(user)}-${numero(id)}/` : undefined

type ImagemBruta = {
  largeImageURL?: unknown
  webformatURL?: unknown
  previewURL?: unknown
  imageWidth?: unknown
  imageHeight?: unknown
  tags?: unknown
  pageURL?: unknown
  user?: unknown
  user_id?: unknown
}

function mapearImagem(item: ImagemBruta, busca: string, orientacao: Orientacao): LpMidia | null {
  const grande = texto(item.largeImageURL) ?? texto(item.webformatURL)
  if (!grande) return null
  const thumb = texto(item.webformatURL) ?? texto(item.previewURL)
  const dims = escalarLadoMaior(numero(item.imageWidth), numero(item.imageHeight), LADO_MAX_PAGINA)
  const autorUrl = perfil(item.user, item.user_id)
  return {
    tipo: 'imagem',
    url: grande,
    alt: altDasTags(item.tags, busca),
    busca,
    orientacao,
    fonte: 'pixabay',
    ...(thumb ? { thumb } : {}),
    ...(texto(item.pageURL) ? { origem: texto(item.pageURL) } : {}),
    ...(texto(item.user) ? { autor: texto(item.user) } : {}),
    ...(autorUrl ? { autorUrl } : {}),
    ...dims,
  }
}

type TamanhoVideo = { url?: unknown; width?: unknown; height?: unknown; thumbnail?: unknown }

type VideoBruto = {
  videos?: Record<string, TamanhoVideo | undefined>
  duration?: unknown
  tags?: unknown
  pageURL?: unknown
  user?: unknown
  user_id?: unknown
}

function mapearVideo(item: VideoBruto, busca: string, orientacao: Orientacao): LpMidia | null {
  const v = item.videos ?? {}
  // Full HD basta para a pagina; `large` costuma ser 4K e pesa dezenas de MB.
  const principal = [v.medium, v.large, v.small, v.tiny].find((t) => texto(t?.url))
  const url = texto(principal?.url)
  if (!url) return null

  const leve = [v.tiny, v.small].find((t) => texto(t?.url))
  const previa = texto(leve?.url)
  const thumb =
    texto(principal?.thumbnail) ??
    texto(v.large?.thumbnail) ??
    texto(v.medium?.thumbnail) ??
    texto(v.small?.thumbnail) ??
    texto(v.tiny?.thumbnail)
  const autorUrl = perfil(item.user, item.user_id)

  return {
    tipo: 'video',
    url,
    alt: altDasTags(item.tags, busca),
    busca,
    orientacao,
    fonte: 'pixabay',
    ...(thumb ? { thumb } : {}),
    ...(previa && previa !== url ? { previa } : {}),
    ...(texto(item.pageURL) ? { origem: texto(item.pageURL) } : {}),
    ...(texto(item.user) ? { autor: texto(item.user) } : {}),
    ...(autorUrl ? { autorUrl } : {}),
    ...(numero(principal?.width) ? { largura: numero(principal?.width) } : {}),
    ...(numero(principal?.height) ? { altura: numero(principal?.height) } : {}),
    ...(numero(item.duration) ? { duracao: numero(item.duration) } : {}),
  }
}

/** Busca no Pixabay. Nunca lanca: erro vira `{ ok: false }`. */
export async function buscarNoPixabay(
  termo: string,
  tipo: TipoMidia,
  orientacao: Orientacao,
  limite: number,
  pagina = 1,
): Promise<RespostaBanco> {
  const chave = process.env.PIXABAY_API_KEY
  if (!chave) return { ok: false }

  const parametros = new URLSearchParams({
    key: chave,
    q: termo,
    safesearch: 'true',
    // Minimo 3 no Pixabay; pedimos folga porque o filtro de proporcao corta.
    per_page: String(Math.min(200, Math.max(3, limite))),
    page: String(Math.max(1, pagina)),
  })
  if (tipo !== 'video') {
    parametros.set('image_type', 'photo')
    // Sem "square" na API: em quadrado pedimos tudo e filtramos pela proporcao.
    if (orientacao !== 'quadrado') {
      parametros.set('orientation', orientacao === 'retrato' ? 'vertical' : 'horizontal')
    }
  }

  try {
    const resp = await fetch(`${tipo === 'video' ? VIDEOS : IMAGENS}?${parametros}`, {
      signal: AbortSignal.timeout(15000),
    })
    // O Pixabay responde 400 com corpo de texto quando a chave e invalida.
    if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
      return { ok: false, chaveInvalida: true }
    }
    if (!resp.ok) return { ok: false }
    const dados = await resp.json()
    const brutos: unknown[] = Array.isArray(dados?.hits) ? dados.hits : []
    const midias = brutos
      .map((b) =>
        tipo === 'video'
          ? mapearVideo(b as VideoBruto, termo, orientacao)
          : mapearImagem(b as ImagemBruta, termo, orientacao),
      )
      .filter((m): m is LpMidia => m !== null)
    return { ok: true, midias }
  } catch {
    return { ok: false }
  }
}
