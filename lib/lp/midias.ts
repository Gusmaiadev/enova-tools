import 'server-only'

/**
 * Preenche as mídias do documento com resultados do Envato. A IA descreve o
 * que quer (midia.busca); aqui trocamos os placeholders pelos previews reais.
 *
 * Buscas repetidas viram uma única chamada, e cada ocorrência recebe um
 * resultado diferente (evita a mesma foto três vezes na mesma galeria).
 * Sem ENVATO_TOKEN nada acontece: os placeholders continuam e a página funciona.
 */

import { buscarMidias, temEnvato } from './envato'
import type { LpDocumento, LpMidia } from './tipos'

type Slot = { get: () => LpMidia | null | undefined; set: (m: LpMidia) => void }

/** Toda mídia do documento, como pares de leitura/escrita. */
function slots(doc: LpDocumento): Slot[] {
  const lista: Slot[] = []
  for (const secao of doc.secoes) {
    lista.push({ get: () => secao.midia, set: (m) => { secao.midia = m } })
    if (secao.fundo) {
      lista.push({ get: () => secao.fundo?.midia, set: (m) => { if (secao.fundo) secao.fundo.midia = m } })
    }
    for (const item of secao.itens) {
      lista.push({ get: () => item.imagem, set: (m) => { item.imagem = m } })
    }
  }
  return lista
}

const ehPlaceholder = (m: LpMidia) => m.url === '' || m.url.startsWith('data:')

const chave = (m: LpMidia) => `${m.tipo}|${m.orientacao}|${m.busca.trim().toLowerCase()}`

/** Executa as tarefas com no máximo `limite` em paralelo. */
async function emLotes<T>(tarefas: (() => Promise<T>)[], limite: number): Promise<T[]> {
  const resultados: T[] = []
  for (let i = 0; i < tarefas.length; i += limite) {
    const lote = tarefas.slice(i, i + limite)
    resultados.push(...(await Promise.all(lote.map((t) => t()))))
  }
  return resultados
}

export type ResultadoMidias = {
  /** Quantas mídias foram preenchidas com resultado real. */
  preenchidas: number
  /** Quantas continuaram como placeholder. */
  pendentes: number
  semChave: boolean
}

/** Muta o documento no lugar, preenchendo o que der. Nunca lança. */
export async function preencherMidias(doc: LpDocumento): Promise<ResultadoMidias> {
  const vagas = slots(doc).filter((s) => {
    const m = s.get()
    return m !== null && m !== undefined && ehPlaceholder(m) && m.busca.trim() !== ''
  })

  if (!temEnvato()) {
    return { preenchidas: 0, pendentes: vagas.length, semChave: true }
  }
  if (vagas.length === 0) {
    return { preenchidas: 0, pendentes: 0, semChave: false }
  }

  const grupos = new Map<string, Slot[]>()
  for (const vaga of vagas) {
    const k = chave(vaga.get() as LpMidia)
    const grupo = grupos.get(k)
    if (grupo) grupo.push(vaga)
    else grupos.set(k, [vaga])
  }

  let preenchidas = 0
  const tarefas = [...grupos.values()].map((grupo) => async () => {
    const modelo = grupo[0].get() as LpMidia
    const resultado = await buscarMidias(
      modelo.busca,
      modelo.tipo,
      modelo.orientacao,
      Math.min(grupo.length, 12),
    )
    if (!resultado.ok || resultado.midias.length === 0) return
    grupo.forEach((vaga, i) => {
      const achada = resultado.midias[i % resultado.midias.length]
      const atual = vaga.get() as LpMidia
      vaga.set({ ...achada, alt: atual.alt || achada.alt, busca: atual.busca })
      preenchidas++
    })
  })

  await emLotes(tarefas, 4)
  return { preenchidas, pendentes: vagas.length - preenchidas, semChave: false }
}
