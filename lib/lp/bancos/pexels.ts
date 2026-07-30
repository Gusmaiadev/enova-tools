import 'server-only'

/**
 * Pexels (https://www.pexels.com/api/) — fonte principal de fotos e videos.
 *
 * Por que ele: chave gratuita, sem marca d'agua, licenca de uso comercial,
 * filtro de orientacao nativo (landscape/portrait/square) tanto em foto quanto
 * em video, e todo video vem com poster estatico (`image`) mais arquivos em
 * varias resolucoes — e o que permite a previa ao passar o mouse.
 *
 * Limites: 200 requisicoes/hora e 20.000/mes por chave.
 *
 * Obrigacao dos termos: a interface precisa creditar o autor e apontar para o
 * Pexels. Guardamos `autor`/`autorUrl`/`origem` justamente para isso.
 */

import type { LpMidia, Orientacao, TipoMidia } from '../tipos'
import { escalar } from './util'

const FOTOS = 'https://api.pexels.com/v1/search'
const VIDEOS = 'https://api.pexels.com/videos/search'

/** Largura do arquivo que vai para a pagina (hero em tela cheia cabe em 1920). */
const LARGURA_PAGINA = 1920
/** Largura da miniatura do seletor. */
const LARGURA_THUMB = 600
/** Teto de altura do video que vai para a pagina — 4K num hero e desperdicio. */
const ALTURA_MAX_VIDEO = 1080

const ORIENTACAO: Record<Orientacao, string> = {
  paisagem: 'landscape',
  retrato: 'portrait',
  quadrado: 'square',
}

export const temPexels = (): boolean => Boolean(process.env.PEXELS_API_KEY)

/**
 * Os proprios valores de `src` que a API devolve sao a URL original com estes
 * parametros. Sem `h`, o servico redimensiona preservando a proporcao — por
 * isso nao usamos `src.large2x`, que corta para 940x650 e deforma retratos.
 */
function redimensionar(original: string, largura: number): string {
  const [base] = original.split('?')
  return `${base}?auto=compress&cs=tinysrgb&w=${largura}`
}

type FotoBruta = {
  src?: Record<string, unknown>
  width?: unknown
  height?: unknown
  alt?: unknown
  url?: unknown
  photographer?: unknown
  photographer_url?: unknown
}

type ArquivoVideo = {
  link?: unknown
  file_type?: unknown
  width?: unknown
  height?: unknown
  quality?: unknown
}

type VideoBruto = {
  image?: unknown
  url?: unknown
  duration?: unknown
  width?: unknown
  height?: unknown
  user?: { name?: unknown; url?: unknown }
  video_files?: ArquivoVideo[]
}

const texto = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined

const numero = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined

function mapearFoto(item: FotoBruta, busca: string, orientacao: Orientacao): LpMidia | null {
  const src = item.src ?? {}
  const original = texto(src.original) ?? texto(src.large) ?? texto(src.medium)
  if (!original) return null
  const dims = escalar(numero(item.width), numero(item.height), LARGURA_PAGINA)
  return {
    tipo: 'imagem',
    url: redimensionar(original, LARGURA_PAGINA),
    thumb: redimensionar(original, LARGURA_THUMB),
    alt: texto(item.alt) ?? busca,
    busca,
    orientacao,
    fonte: 'pexels',
    ...(texto(item.url) ? { origem: texto(item.url) } : {}),
    ...(texto(item.photographer) ? { autor: texto(item.photographer) } : {}),
    ...(texto(item.photographer_url) ? { autorUrl: texto(item.photographer_url) } : {}),
    ...dims,
  }
}

/** Melhor mp4 até `alturaMax`; se todos passarem do teto, o menor deles. */
function escolherArquivo(arquivos: ArquivoVideo[], alturaMax: number): ArquivoVideo | null {
  const mp4 = arquivos.filter(
    (a) => texto(a.link) && (a.file_type === undefined || /mp4/i.test(String(a.file_type))),
  )
  if (mp4.length === 0) return null
  const altura = (a: ArquivoVideo) => numero(a.height) ?? 0
  const cabem = mp4.filter((a) => altura(a) > 0 && altura(a) <= alturaMax)
  if (cabem.length > 0) {
    return cabem.reduce((melhor, a) => (altura(a) > altura(melhor) ? a : melhor))
  }
  return mp4.reduce((menor, a) => (altura(a) < altura(menor) ? a : menor))
}

function mapearVideo(item: VideoBruto, busca: string, orientacao: Orientacao): LpMidia | null {
  const arquivos = Array.isArray(item.video_files) ? item.video_files : []
  const principal = escolherArquivo(arquivos, ALTURA_MAX_VIDEO)
  const link = principal ? texto(principal.link) : undefined
  if (!link) return null

  // Previa do hover: o menor mp4 disponivel (carrega rapido e nao come banda).
  const leve = escolherArquivo(arquivos, 480)
  const previa = leve ? texto(leve.link) : undefined

  const largura = numero(principal?.width) ?? numero(item.width)
  const altura = numero(principal?.height) ?? numero(item.height)

  return {
    tipo: 'video',
    url: link,
    alt: busca,
    busca,
    orientacao,
    fonte: 'pexels',
    ...(texto(item.image) ? { thumb: texto(item.image) } : {}),
    ...(previa && previa !== link ? { previa } : {}),
    ...(texto(item.url) ? { origem: texto(item.url) } : {}),
    ...(texto(item.user?.name) ? { autor: texto(item.user?.name) } : {}),
    ...(texto(item.user?.url) ? { autorUrl: texto(item.user?.url) } : {}),
    ...(largura ? { largura } : {}),
    ...(altura ? { altura } : {}),
    ...(numero(item.duration) ? { duracao: numero(item.duration) } : {}),
  }
}

export type RespostaBanco =
  | { ok: true; midias: LpMidia[] }
  | { ok: false; chaveInvalida?: boolean }

/** Busca no Pexels. Nunca lanca: erro vira `{ ok: false }` e o orquestrador segue. */
export async function buscarNoPexels(
  termo: string,
  tipo: TipoMidia,
  orientacao: Orientacao,
  limite: number,
  pagina = 1,
): Promise<RespostaBanco> {
  const chave = process.env.PEXELS_API_KEY
  if (!chave) return { ok: false }

  const parametros = new URLSearchParams({
    query: termo,
    orientation: ORIENTACAO[orientacao],
    per_page: String(Math.min(80, Math.max(1, limite))),
    page: String(Math.max(1, pagina)),
  })

  try {
    const resp = await fetch(`${tipo === 'video' ? VIDEOS : FOTOS}?${parametros}`, {
      headers: { Authorization: chave },
      signal: AbortSignal.timeout(15000),
    })
    if (resp.status === 401 || resp.status === 403) return { ok: false, chaveInvalida: true }
    if (!resp.ok) return { ok: false }
    const dados = await resp.json()
    const brutos: unknown[] = Array.isArray(dados?.photos)
      ? dados.photos
      : Array.isArray(dados?.videos)
        ? dados.videos
        : []
    const midias = brutos
      .map((b) =>
        tipo === 'video'
          ? mapearVideo(b as VideoBruto, termo, orientacao)
          : mapearFoto(b as FotoBruta, termo, orientacao),
      )
      .filter((m): m is LpMidia => m !== null)
    return { ok: true, midias }
  } catch {
    return { ok: false }
  }
}
