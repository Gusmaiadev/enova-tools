/**
 * Caminhamento da arvore de elementos da secao. Modulo puro, sem conhecer
 * presets nem compilador — quem precisa varrer a arvore (coleta de midias,
 * geracao de CSS, busca de no) parte daqui.
 */

import type { LpContainer, LpElemento, LpMidia } from './tipos'
import { gerarId } from './util'

/** Todos os nos em profundidade, a raiz primeiro. */
export function caminharElementos(raiz: LpContainer): LpElemento[] {
  const fora: LpElemento[] = []
  const visitar = (el: LpElemento) => {
    fora.push(el)
    if (el.tipo === 'container') el.filhos.forEach(visitar)
  }
  visitar(raiz)
  return fora
}

/**
 * Midias que o no cita. Precisa conhecer cada widget composto: uma midia
 * esquecida aqui e um arquivo que a limpeza de orfaos apaga com a pagina ainda
 * usando (ver arquivosUsados em documento.ts).
 */
export function midiasDoElemento(el: LpElemento): LpMidia[] {
  switch (el.tipo) {
    case 'imagem':
    case 'video':
      return [el.midia]
    case 'abas':
      return el.abas.map((a) => a.imagem).filter((m): m is LpMidia => Boolean(m))
    case 'carrossel':
      return el.slides.map((s) => s.imagem).filter((m): m is LpMidia => Boolean(m))
    case 'depoimentos':
      return el.depoimentos.map((d) => d.foto).filter((m): m is LpMidia => Boolean(m))
    default:
      return []
  }
}

/* --------------------------- operacoes de arvore -------------------------- */

/** No pelo id, em qualquer profundidade. */
export function acharNo(raiz: LpContainer, id: string): LpElemento | null {
  return caminharElementos(raiz).find((el) => el.id === id) ?? null
}

/** Copia profunda (a arvore e JSON puro, sem funcao nem data). */
const clonarArvore = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/**
 * Arvore nova com o no alterado pela funcao. A entrada nao e tocada: o editor
 * guarda snapshots no historico, e mutar quebraria o Ctrl+Z.
 */
export function atualizarNo(
  raiz: LpContainer,
  id: string,
  mut: (el: LpElemento) => void,
): LpContainer {
  const copia = clonarArvore(raiz)
  const alvo = acharNo(copia, id)
  if (alvo) mut(alvo)
  return copia
}

/**
 * Quanta coisa some junto com o no: a subarvore, no container, e a lista
 * propria, nos widgets compostos. Zero = so ele mesmo.
 *
 * Precisa conhecer cada widget composto, como midiasDoElemento: um esquecido
 * aqui e um FAQ de dez perguntas que o editor apaga sem perguntar nada.
 */
export function quantoLeva(el: LpElemento): number {
  switch (el.tipo) {
    case 'container':
      // -1 porque o caminhamento conta o proprio container.
      return caminharElementos(el).length - 1
    case 'faq':
      return el.perguntas.length
    case 'abas':
      return el.abas.length
    case 'carrossel':
      return el.slides.length
    case 'depoimentos':
      return el.depoimentos.length
    case 'comparacao':
      return el.colunas.length
    case 'lista':
      return el.itens.length
    default:
      return 0
  }
}

/**
 * Container que segura o no — null quando ele e a raiz ou nao esta na arvore.
 * O editor pergunta antes de remover: a selecao sobe para o pai em vez de cair
 * no vazio, e assim da para apagar um irmao atras do outro sem reclicar.
 */
export function paiDe(raiz: LpContainer, id: string): LpContainer | null {
  for (const el of caminharElementos(raiz)) {
    if (el.tipo === 'container' && el.filhos.some((f) => f.id === id)) return el
  }
  return null
}

/** Arvore nova sem o no. A raiz nao pode ser removida. */
export function removerNo(raiz: LpContainer, id: string): LpContainer {
  if (raiz.id === id) return raiz
  const copia = clonarArvore(raiz)
  const podar = (c: LpContainer) => {
    c.filhos = c.filhos.filter((f) => f.id !== id)
    for (const f of c.filhos) if (f.tipo === 'container') podar(f)
  }
  podar(copia)
  return copia
}

/** Ids novos em toda a subarvore — copia nao pode repetir id de ninguem. */
export function regerarIds<T extends LpElemento>(el: T): T {
  const copia = clonarArvore(el)
  const nos = copia.tipo === 'container' ? caminharElementos(copia) : [copia as LpElemento]
  for (const no of nos) no.id = gerarId()
  return copia
}

/**
 * Deixa o container com `quantidade` filhos: para crescer, copia o ultimo (com
 * ids novos, como duplicarNo); para encolher, corta do fim. Muta no lugar — e o
 * que o painel faz por dentro de mutarNo.
 *
 * Container vazio fica vazio: sem nenhum filho para copiar nao ha o que
 * multiplicar, e inventar um widget aqui seria adivinhar o que o usuario quer.
 */
export function definirQuantidadeFilhos(c: LpContainer, quantidade: number): void {
  const alvo = Math.max(0, Math.floor(quantidade))
  if (c.filhos.length === 0 || alvo === c.filhos.length) return
  if (alvo < c.filhos.length) {
    c.filhos = c.filhos.slice(0, alvo)
    return
  }
  // O modelo e o ultimo filho de ANTES: copiar sempre dele mantem as copias
  // iguais entre si, em vez de encadear copia de copia.
  const modelo = c.filhos[c.filhos.length - 1]
  while (c.filhos.length < alvo) c.filhos.push(regerarIds(modelo))
}

/** Copia do no logo depois dele, com ids novos. */
export function duplicarNo(raiz: LpContainer, id: string): LpContainer {
  const copia = clonarArvore(raiz)
  const inserir = (c: LpContainer): boolean => {
    const i = c.filhos.findIndex((f) => f.id === id)
    if (i >= 0) {
      c.filhos.splice(i + 1, 0, regerarIds(c.filhos[i]))
      return true
    }
    return c.filhos.some((f) => f.tipo === 'container' && inserir(f))
  }
  inserir(copia)
  return copia
}

/**
 * Tipos presentes na pagina — os widgets de cada secao migrada, mais o preset
 * das que ainda nao tiverem arvore. O compilador usa para emitir so o CSS e o
 * JS do que a pagina realmente contem.
 *
 * Precisa ser por WIDGET, nao pelo preset da secao: assim que der para inserir
 * um FAQ dentro de uma secao que nasceu como CTA, a chave do preset deixaria a
 * pagina sem o CSS do accordion.
 */
export function tiposNaPagina(doc: { secoes: { tipo?: string; raiz?: LpContainer }[] }): Set<string> {
  const usados = new Set<string>()
  for (const s of doc.secoes) {
    if (s.raiz) for (const el of caminharElementos(s.raiz)) usados.add(el.tipo)
    else if (s.tipo) usados.add(s.tipo)
  }
  return usados
}

/**
 * Animacoes presentes na pagina — das secoes e de qualquer no dentro delas.
 * Vazio = pagina sem keyframe nenhum e sem o observador no JS.
 */
export function animacoesNaPagina(doc: {
  secoes: { animacao?: { tipo: string }; raiz?: LpContainer }[]
}): Set<string> {
  const usadas = new Set<string>()
  for (const s of doc.secoes) {
    if (s.animacao) usadas.add(s.animacao.tipo)
    if (s.raiz) {
      for (const el of caminharElementos(s.raiz)) if (el.animacao) usadas.add(el.animacao.tipo)
    }
  }
  return usadas
}
