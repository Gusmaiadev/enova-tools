import 'server-only'

/**
 * Envato Market (https://build.envato.com) — fonte OPCIONAL e legada. Fica
 * desligada a menos que ENVATO_TOKEN exista.
 *
 * Ressalvas conhecidas, e o motivo de nao ser mais a fonte principal:
 * - As URLs sao PREVIEWS com marca d'agua do Market, em resolucao baixa. Para a
 *   arte final o usuario baixa o item licenciado pela pagina `origem`.
 * - O PhotoDune e um acervo antigo e pequeno perto de Pexels/Pixabay.
 * - A API nao tem filtro de orientacao nenhum, so termo/categoria. Quem separa
 *   por proporcao e o orquestrador, pelas dimensoes do preview.
 * - O acervo e etiquetado em ingles (por isso a traducao em ./traduzir).
 */

import type { LpMidia, Orientacao, TipoMidia } from '../tipos'
import type { RespostaBanco } from './pexels'

const ENDPOINT = 'https://api.envato.com/v1/discovery/search/search/item'

export const temEnvato = (): boolean => Boolean(process.env.ENVATO_TOKEN)

type ItemBruto = {
  name?: unknown
  url?: unknown
  author_username?: unknown
  previews?: unknown
}

type Grupo = Record<string, unknown>

const texto = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined

const numero = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined
}

const grupos = (previews: unknown): Record<string, Grupo | undefined> =>
  previews !== null && typeof previews === 'object'
    ? (previews as Record<string, Grupo | undefined>)
    : {}

/** Maior imagem de preview disponivel, com as dimensoes quando informadas. */
function imagemPreview(p: Record<string, Grupo | undefined>): {
  url?: string
  largura?: number
  altura?: number
} {
  const candidatos: (Grupo | undefined)[] = [
    p.landscape_preview,
    p.icon_with_landscape_preview,
    p.icon_with_square_preview,
    p.thumbnail_preview,
    p.live_site,
  ]
  for (const grupo of candidatos) {
    if (!grupo) continue
    const url =
      texto(grupo.landscape_url) ??
      texto(grupo.square_url) ??
      texto(grupo.large_url) ??
      texto(grupo.screenshot_url)
    if (url) {
      return {
        url,
        largura: numero(grupo.landscape_width ?? grupo.width),
        altura: numero(grupo.landscape_height ?? grupo.height),
      }
    }
  }
  // Ultimo recurso: qualquer *_url que nao seja icone minusculo.
  for (const grupo of Object.values(p)) {
    if (!grupo) continue
    for (const [k, v] of Object.entries(grupo)) {
      if (k.endsWith('_url') && !k.startsWith('icon') && texto(v)) return { url: v as string }
    }
  }
  return {}
}

function mapear(item: ItemBruto, busca: string, orientacao: Orientacao, tipo: TipoMidia): LpMidia | null {
  const p = grupos(item.previews)
  const imagem = imagemPreview(p)

  if (tipo === 'video') {
    const url =
      texto(p.icon_with_video_preview?.video_url) ?? texto(p.video_preview?.video_url)
    if (!url) return null
    // O grupo do video traz tambem o quadro estatico — e o poster que faltava.
    const thumb =
      texto(p.icon_with_video_preview?.landscape_url) ??
      texto(p.video_preview?.landscape_url) ??
      imagem.url
    return {
      tipo: 'video',
      url,
      alt: texto(item.name) ?? busca,
      busca,
      orientacao,
      fonte: 'envato',
      ...(thumb ? { thumb } : {}),
      ...(texto(item.url) ? { origem: texto(item.url) } : {}),
      ...(texto(item.author_username) ? { autor: texto(item.author_username) } : {}),
    }
  }

  if (!imagem.url) return null
  return {
    tipo: 'imagem',
    url: imagem.url,
    alt: texto(item.name) ?? busca,
    busca,
    orientacao,
    fonte: 'envato',
    ...(texto(item.url) ? { origem: texto(item.url) } : {}),
    ...(texto(item.author_username) ? { autor: texto(item.author_username) } : {}),
    ...(imagem.largura ? { largura: imagem.largura } : {}),
    ...(imagem.altura ? { altura: imagem.altura } : {}),
  }
}

/** Busca no Envato. Nunca lanca: erro vira `{ ok: false }`. */
export async function buscarNoEnvato(
  termo: string,
  tipo: TipoMidia,
  orientacao: Orientacao,
  limite: number,
  pagina = 1,
): Promise<RespostaBanco> {
  const token = process.env.ENVATO_TOKEN
  if (!token) return { ok: false }

  const parametros = new URLSearchParams({
    site: tipo === 'video' ? 'videohive.net' : 'photodune.net',
    term: termo,
    page_size: String(Math.min(30, Math.max(1, limite))),
    page: String(Math.max(1, pagina)),
    sort_by: 'rating',
  })
  if (tipo === 'video') parametros.set('category', 'stock-footage')

  try {
    const resp = await fetch(`${ENDPOINT}?${parametros}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'E-nova Tools (criador de landing pages; busca de midia para clientes)',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (resp.status === 401 || resp.status === 403) return { ok: false, chaveInvalida: true }
    if (!resp.ok) return { ok: false }
    const dados = (await resp.json()) as { matches?: ItemBruto[] }
    const midias = (dados.matches ?? [])
      .map((m) => mapear(m, termo, orientacao, tipo))
      .filter((m): m is LpMidia => m !== null)
    return { ok: true, midias }
  } catch {
    return { ok: false }
  }
}
