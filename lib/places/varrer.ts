import type { Rect } from './geometria'
import { dividirEm4 } from './geometria'
import { type Place, searchTextPaginado } from './searchText'

/** Teto de profundidade: trava de seguranca contra recursao infinita (secao 8.2). */
export const MAX_DEPTH = 4

/** Teto duro de chamadas (paginas billadas) por busca — trava de custo (secao 8.2). */
export const MAX_PAGINAS_PADRAO = 60

/** Eventos que alimentam o radar da UI em tempo real (secao 4). */
export type EventoRadar =
  | { tipo: 'celula'; bbox: Rect; depth: number }
  | { tipo: 'celula_ok'; bbox: Rect; depth: number; encontrados: number; saturada: boolean }
  | { tipo: 'subdividir'; bbox: Rect; depth: number }
  | { tipo: 'progresso'; total: number; chamadas: number }
  | { tipo: 'truncado'; chamadas: number }

/** Assinatura da funcao que busca uma celula — injetavel para testes sem rede. */
export type BuscarCelula = (
  bbox: Rect,
  tipo: string,
  termo: string,
  aoBillar: () => void,
  limitePaginas: number,
  signal?: AbortSignal,
) => Promise<Place[]>

export type OpcoesVarredura = {
  termo: string
  onEvento?: (e: EventoRadar) => void
  maxPaginas?: number
  signal?: AbortSignal
  buscarCelula?: BuscarCelula
}

export type ResultadoVarredura = {
  places: Map<string, Place>
  chamadas: number
  truncado: boolean
}

/**
 * Varredura recursiva (quadtree) que contorna o teto de 60 do searchText.
 *
 * Se uma celula volta saturada (60), ela esconde mais coisa → parte em 4.
 * Se volta menos de 60, esta completa. Dedupe por place.id num Map unico —
 * celulas se sobrepoem nas bordas de proposito.
 */
export async function varrer(
  bbox: Rect,
  tipo: string,
  opts: OpcoesVarredura,
): Promise<ResultadoVarredura> {
  const buscar = opts.buscarCelula ?? searchTextPaginado
  const maxPaginas = opts.maxPaginas ?? MAX_PAGINAS_PADRAO
  const emitir = opts.onEvento ?? (() => {})

  const places = new Map<string, Place>()
  const estado = { chamadas: 0, truncado: false }

  const aoBillar = () => {
    estado.chamadas++
  }

  async function recursao(cel: Rect, depth: number): Promise<void> {
    if (opts.signal?.aborted) return
    if (depth > MAX_DEPTH) return

    // Trava de custo: nao inicia nova celula se ja batemos o teto.
    if (estado.chamadas >= maxPaginas) {
      if (!estado.truncado) {
        estado.truncado = true
        emitir({ tipo: 'truncado', chamadas: estado.chamadas })
      }
      return
    }

    emitir({ tipo: 'celula', bbox: cel, depth })
    // Corta a paginacao desta celula ao orcamento restante — o teto vira duro.
    const restante = maxPaginas - estado.chamadas
    const encontrados = await buscar(cel, tipo, opts.termo, aoBillar, restante, opts.signal)

    for (const p of encontrados) places.set(p.id, p)

    const saturada = encontrados.length >= 60
    emitir({ tipo: 'celula_ok', bbox: cel, depth, encontrados: encontrados.length, saturada })
    emitir({ tipo: 'progresso', total: places.size, chamadas: estado.chamadas })

    // Bateu o teto → a celula esconde mais → parte em 4 (se ainda cabe profundidade).
    if (saturada && depth < MAX_DEPTH) {
      emitir({ tipo: 'subdividir', bbox: cel, depth })
      for (const q of dividirEm4(cel)) {
        await recursao(q, depth + 1)
      }
    }
  }

  await recursao(bbox, 0)
  return { places, chamadas: estado.chamadas, truncado: estado.truncado }
}
