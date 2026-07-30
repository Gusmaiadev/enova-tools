import 'server-only'

/**
 * Orquestrador dos bancos de midia. Uma unica busca consulta todas as fontes
 * configuradas em paralelo, mistura os resultados e devolve uma lista so.
 *
 * O que este arquivo resolve, em ordem:
 * 1. Traducao: o termo vai para ingles antes de sair (ver ./traduzir) — e o que
 *    faz a busca funcionar com briefing e IA escrevendo em portugues.
 * 2. Orientacao: o Pexels filtra na origem; o Pixabay nao tem "quadrado" e nao
 *    filtra video nenhum, e o Envato nao filtra nada. Aqui a proporcao real de
 *    cada item e conferida, de modo que a escolha de formato SEMPRE muda o
 *    resultado.
 * 3. Quantidade: varias fontes somadas + paginacao ("carregar mais").
 * 4. Cache de 24h por (fonte, termo, tipo, orientacao, pagina) — exigencia dos
 *    termos do Pixabay e folga nos limites de taxa do Pexels. Melhor esforco:
 *    e memoria do processo, some quando a instancia recicla.
 */

import type { FonteMidia, LpMidia, Orientacao, TipoMidia } from '../tipos'
import { buscarNoEnvato, temEnvato } from './envato'
import { buscarNoPexels, temPexels, type RespostaBanco } from './pexels'
import { buscarNoPixabay, temPixabay } from './pixabay'
import { paraIngles } from './traduzir'
import { orientacaoDe } from './util'

export { temEnvato } from './envato'
export { temPexels } from './pexels'
export { temPixabay } from './pixabay'

type Banco = {
  fonte: FonteMidia
  temChave: () => boolean
  buscar: (
    termo: string,
    tipo: TipoMidia,
    orientacao: Orientacao,
    limite: number,
    pagina: number,
  ) => Promise<RespostaBanco>
  /** Quantos itens pedir para esta fonte (o filtro de proporcao corta parte). */
  pedir: number
  /**
   * Fonte de reserva: so entra se NENHUMA fonte principal tiver chave. E o caso
   * do Envato — misturar previews com marca d'agua e baixa resolucao no meio de
   * resultados limpos do Pexels/Pixabay pioraria a grade. Quem so tem
   * ENVATO_TOKEN continua funcionando como antes, sem precisar mexer em nada.
   */
  reserva?: boolean
}

const BANCOS: Banco[] = [
  { fonte: 'pexels', temChave: temPexels, buscar: buscarNoPexels, pedir: 40 },
  { fonte: 'pixabay', temChave: temPixabay, buscar: buscarNoPixabay, pedir: 60 },
  { fonte: 'envato', temChave: temEnvato, buscar: buscarNoEnvato, pedir: 24, reserva: true },
]

/** Fontes que vao ser consultadas de fato, ja resolvendo principal vs. reserva. */
function escolherBancos(): Banco[] {
  const principais = BANCOS.filter((b) => !b.reserva && b.temChave())
  if (principais.length > 0) return principais
  return BANCOS.filter((b) => b.reserva && b.temChave())
}

/** Abaixo disso, o filtro de proporcao relaxa em vez de devolver quase nada. */
const MINIMO_ANTES_DE_RELAXAR = 12

const VALIDADE_CACHE = 24 * 60 * 60 * 1000
const LIMITE_CACHE = 300

const cache = new Map<string, { em: number; midias: LpMidia[] }>()

function doCache(chave: string): LpMidia[] | null {
  const entrada = cache.get(chave)
  if (!entrada) return null
  if (Date.now() - entrada.em > VALIDADE_CACHE) {
    cache.delete(chave)
    return null
  }
  return entrada.midias
}

function guardar(chave: string, midias: LpMidia[]): void {
  if (cache.size >= LIMITE_CACHE) cache.clear()
  cache.set(chave, { em: Date.now(), midias })
}

/** Fontes que serao consultadas nas buscas. */
export function bancosAtivos(): FonteMidia[] {
  return escolherBancos().map((b) => b.fonte)
}

export function temBancoMidias(): boolean {
  return bancosAtivos().length > 0
}

/**
 * Intercala as listas de cada fonte (uma de cada, em rodadas). Sem isso os 40
 * resultados do Pexels vinham todos antes dos do Pixabay e a segunda fonte so
 * aparecia se o usuario rolasse ate o fim.
 */
function intercalar(listas: LpMidia[][]): LpMidia[] {
  const saida: LpMidia[] = []
  const maior = Math.max(0, ...listas.map((l) => l.length))
  for (let i = 0; i < maior; i++) {
    for (const lista of listas) {
      if (i < lista.length) saida.push(lista[i])
    }
  }
  return saida
}

/** Remove repetidos por URL e por pagina de origem. */
function semRepetidos(midias: LpMidia[]): LpMidia[] {
  const vistos = new Set<string>()
  const saida: LpMidia[] = []
  for (const m of midias) {
    const chaves = [m.url, m.origem].filter((c): c is string => Boolean(c))
    if (chaves.some((c) => vistos.has(c))) continue
    for (const c of chaves) vistos.add(c)
    saida.push(m)
  }
  return saida
}

/**
 * Coloca na frente o que bate com o formato pedido. Quem nao tem dimensao
 * conhecida conta como "bate" — a fonte ja filtrou, nao ha por que descartar.
 * O que nao bate so entra se sobrar pouca coisa (melhor mostrar algo torto do
 * que uma grade vazia).
 */
function porOrientacao(midias: LpMidia[], pedida: Orientacao): LpMidia[] {
  const batem: LpMidia[] = []
  const resto: LpMidia[] = []
  for (const m of midias) {
    const real = orientacaoDe(m.largura, m.altura)
    if (real === null || real === pedida) batem.push(m)
    else resto.push(m)
  }
  return batem.length >= MINIMO_ANTES_DE_RELAXAR ? batem : [...batem, ...resto]
}

export type ResultadoMidia =
  | {
      ok: true
      midias: LpMidia[]
      /** Termo efetivamente enviado as APIs (pode ter sido traduzido). */
      termo: string
      /** O que o usuario digitou. */
      original: string
      traduzido: boolean
      fontes: FonteMidia[]
      /** Ha mais resultados na proxima pagina. */
      temMais: boolean
    }
  | { ok: false; erro: string; semChave?: boolean }

export type OpcoesBusca = { limite?: number; pagina?: number }

/**
 * Busca em todas as fontes configuradas. Nunca lanca. Sem nenhuma chave devolve
 * `semChave` para o chamador cair no placeholder (mesmo padrao da IA de Ads).
 */
export async function buscarMidias(
  busca: string,
  tipo: TipoMidia,
  orientacao: Orientacao,
  opcoes: OpcoesBusca = {},
): Promise<ResultadoMidia> {
  const limite = Math.min(60, Math.max(1, opcoes.limite ?? 24))
  const pagina = Math.min(20, Math.max(1, opcoes.pagina ?? 1))

  const ativos = escolherBancos()
  if (ativos.length === 0) {
    return {
      ok: false,
      semChave: true,
      erro:
        'Busca de mídia não configurada. Adicione PEXELS_API_KEY (e/ou PIXABAY_API_KEY) ao .env.local.',
    }
  }

  const { termo, original, traduzido } = await paraIngles(busca)
  if (termo === '') {
    return { ok: true, midias: [], termo, original, traduzido, fontes: [], temMais: false }
  }

  const respostas = await Promise.all(
    ativos.map(async (banco) => {
      const chave = `${banco.fonte}|${tipo}|${orientacao}|${pagina}|${termo}`
      const guardadas = doCache(chave)
      if (guardadas) return { banco, resposta: { ok: true as const, midias: guardadas } }
      const resposta = await banco.buscar(termo, tipo, orientacao, banco.pedir, pagina)
      if (resposta.ok) guardar(chave, resposta.midias)
      return { banco, resposta }
    }),
  )

  const comSucesso = respostas.filter((r) => r.resposta.ok)
  if (comSucesso.length === 0) {
    const invalida = respostas.some((r) => !r.resposta.ok && r.resposta.chaveInvalida)
    return {
      ok: false,
      erro: invalida
        ? 'Chave do banco de imagens inválida ou expirada. Verifique PEXELS_API_KEY / PIXABAY_API_KEY.'
        : 'Não foi possível falar com o banco de imagens. Verifique a conexão e tente de novo.',
    }
  }

  const listas = comSucesso.map((r) => (r.resposta as { midias: LpMidia[] }).midias)
  const juntas = porOrientacao(semRepetidos(intercalar(listas)), orientacao)

  return {
    ok: true,
    midias: juntas.slice(0, limite),
    termo,
    original,
    traduzido,
    fontes: comSucesso.map((r) => r.banco.fonte),
    temMais: juntas.length > limite,
  }
}

/** Melhor resultado unico (para a geracao automatica), ou null. */
export async function melhorMidia(
  busca: string,
  tipo: TipoMidia,
  orientacao: Orientacao,
): Promise<LpMidia | null> {
  const resultado = await buscarMidias(busca, tipo, orientacao, { limite: 3 })
  if (!resultado.ok || resultado.midias.length === 0) return null
  return resultado.midias[0]
}
