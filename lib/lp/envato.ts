import 'server-only'

/**
 * Busca de midia na API publica do Envato Market (token pessoal, gratis para
 * assinantes: https://build.envato.com). Fotos vem do PhotoDune e videos do
 * VideoHive — as URLs retornadas sao PREVIEWS (com marca d'agua do Market);
 * para a arte final o usuario baixa o item licenciado pela pagina `origem`.
 *
 * A API do Envato Elements e restrita a parceiros aprovados; se um dia houver
 * acesso, basta trocar a implementacao de buscarMidias mantendo o contrato.
 *
 * Sem ENVATO_TOKEN a ferramenta segue funcionando com placeholders (mesmo
 * padrao semChave da IA de Ads).
 */

import type { LpMidia, Orientacao, TipoMidia } from './tipos'

const ENDPOINT = 'https://api.envato.com/v1/discovery/search/search/item'

export type ResultadoMidia =
  | { ok: true; midias: LpMidia[] }
  | { ok: false; erro: string; semChave?: boolean }

export function temEnvato(): boolean {
  return Boolean(process.env.ENVATO_TOKEN)
}

type ItemBruto = {
  name?: unknown
  url?: unknown
  previews?: unknown
}

/** Varre o objeto previews atras da melhor URL de imagem/video disponivel. */
function urlPreview(previews: unknown, tipo: TipoMidia): string | null {
  if (previews === null || typeof previews !== 'object') return null
  const p = previews as Record<string, Record<string, unknown> | undefined>
  if (tipo === 'video') {
    const video =
      p.icon_with_video_preview?.video_url ?? p.video_preview?.video_url ?? null
    if (typeof video === 'string' && video !== '') return video
    return null
  }
  const candidatas = [
    p.landscape_preview?.landscape_url,
    p.icon_with_landscape_preview?.landscape_url,
    p.icon_with_square_preview?.square_url,
    p.live_site?.screenshot_url,
  ]
  for (const c of candidatas) {
    if (typeof c === 'string' && c !== '') return c
  }
  // Ultimo recurso: qualquer *_url que nao seja icone minusculo.
  for (const grupo of Object.values(p)) {
    if (grupo === null || typeof grupo !== 'object') continue
    for (const [chave, valor] of Object.entries(grupo)) {
      if (chave.endsWith('_url') && !chave.startsWith('icon') && typeof valor === 'string') {
        return valor
      }
    }
  }
  return null
}

/**
 * Busca itens no Envato Market. Dica passada ao usuario: termos em ingles
 * retornam bem mais resultados (o catalogo e etiquetado em ingles).
 */
export async function buscarMidias(
  busca: string,
  tipo: TipoMidia,
  orientacao: Orientacao,
  limite = 10,
): Promise<ResultadoMidia> {
  const token = process.env.ENVATO_TOKEN
  if (!token) {
    return {
      ok: false,
      semChave: true,
      erro: 'Busca de mídia não configurada. Adicione ENVATO_TOKEN ao .env.local para buscar no Envato.',
    }
  }
  const termo = busca.trim()
  if (termo === '') return { ok: true, midias: [] }

  const parametros = new URLSearchParams({
    site: tipo === 'video' ? 'videohive.net' : 'photodune.net',
    term: termo,
    page_size: String(Math.min(30, Math.max(1, limite))),
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
    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, semChave: true, erro: 'Token do Envato inválido ou expirado. Verifique ENVATO_TOKEN.' }
    }
    if (!resp.ok) {
      return { ok: false, erro: `O Envato respondeu com erro (${resp.status}). Tente de novo.` }
    }
    const dados = (await resp.json()) as { matches?: ItemBruto[] }
    const midias: LpMidia[] = []
    for (const item of dados.matches ?? []) {
      const url = urlPreview(item.previews, tipo)
      if (!url) continue
      midias.push({
        tipo,
        url,
        alt: typeof item.name === 'string' ? item.name : busca,
        busca,
        orientacao,
        origem: typeof item.url === 'string' ? item.url : undefined,
      })
      if (midias.length >= limite) break
    }
    return { ok: true, midias }
  } catch {
    return { ok: false, erro: 'Falha ao falar com o Envato. Verifique a conexão e tente de novo.' }
  }
}

/** Melhor resultado unico (para a geracao automatica), ou null. */
export async function melhorMidia(
  busca: string,
  tipo: TipoMidia,
  orientacao: Orientacao,
): Promise<LpMidia | null> {
  const resultado = await buscarMidias(busca, tipo, orientacao, 3)
  if (!resultado.ok || resultado.midias.length === 0) return null
  return resultado.midias[0]
}
