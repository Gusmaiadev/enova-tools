import 'server-only'

/**
 * Preenche as mídias do documento com resultados dos bancos de imagem. A IA
 * descreve o que quer (midia.busca, em português); o orquestrador em ./bancos
 * traduz para inglês e busca. Aqui só trocamos os placeholders pelo resultado.
 *
 * Buscas repetidas viram uma única chamada, e cada ocorrência recebe um
 * resultado diferente (evita a mesma foto três vezes na mesma galeria).
 * Sem nenhuma chave nada acontece: os placeholders continuam e a página funciona.
 */

import { buscarMidias, temBancoMidias } from './bancos'
import { opcoesVideo } from './documento'
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

  if (!temBancoMidias()) {
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
    const resultado = await buscarMidias(modelo.busca, modelo.tipo, modelo.orientacao, {
      limite: Math.min(grupo.length, 12),
    })
    if (!resultado.ok || resultado.midias.length === 0) return
    grupo.forEach((vaga, i) => {
      const achada = resultado.midias[i % resultado.midias.length]
      const atual = vaga.get() as LpMidia
      // `busca` é o que o usuário/IA pediu, em português: o editor mostra e
      // permite editar esse texto, então não pode virar o termo traduzido. As
      // opções de reprodução são do lugar na página, não do arquivo achado.
      vaga.set({
        ...achada,
        alt: atual.alt || achada.alt,
        busca: atual.busca,
        ...opcoesVideo(atual),
      })
      preenchidas++
    })
  })

  await emLotes(tarefas, 4)
  return { preenchidas, pendentes: vagas.length - preenchidas, semChave: false }
}
