/**
 * Coercao da arvore de elementos vinda do cliente.
 *
 * O PUT que salva o documento do editor aceita o JSON inteiro, entao isto e
 * conteudo NAO confiavel: cada no e remontado campo a campo, e o que nao for
 * reconhecido some em vez de virar HTML imprevisivel. Mesma disciplina do
 * validar.ts, so que para a arvore.
 */

import type {
  Aparencia,
  Caixa,
  Dispositivo,
  LpContainer,
  LpElemento,
  LpEstilo,
  LpMidia,
  LpBotao,
  PorDisp,
} from './tipos'
import { PROPORCOES_VALIDAS } from './padroes'
import { corSegura, gerarId, limitar } from './util'

const obj = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

const opcional = (v: unknown, max: number): string | undefined => {
  const s = str(v, max).trim()
  return s === '' ? undefined : s
}

const idSeguro = (v: unknown): string => {
  const limpo = typeof v === 'string' ? v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) : ''
  return limpo === '' ? gerarId() : limpo
}

const DISPOSITIVOS_VALIDOS = new Set(['desktop', 'tablet', 'celular'])

/**
 * Limites contra payload hostil. Sem teto de profundidade, uma arvore aninhada
 * milhares de vezes estoura a pilha no render recursivo do compilador.
 */
const PROFUNDIDADE_MAX = 12
const FILHOS_MAX = 60
const ITENS_MAX = 60

/** Valor por dispositivo: so as tres chaves conhecidas, so o que coage. */
function porDisp<T>(bruto: unknown, coagir: (v: unknown) => T | undefined): PorDisp<T> | undefined {
  const o = obj(bruto)
  const fora: PorDisp<T> = {}
  for (const d of Object.keys(o)) {
    if (!DISPOSITIVOS_VALIDOS.has(d)) continue
    const v = coagir(o[d])
    if (v !== undefined) fora[d as Dispositivo] = v
  }
  return Object.keys(fora).length > 0 ? fora : undefined
}

const numeroEntre = (min: number, max: number) => (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? limitar(v, min, max, min) : undefined

const textoAte = (max: number) => (v: unknown) => opcional(v, max)

const cor = (v: unknown) => {
  const s = opcional(v, 40)
  return s === undefined ? undefined : corSegura(s, '#000000')
}

const umDe =
  <T extends string>(validos: readonly T[]) =>
  (v: unknown): T | undefined =>
    validos.includes(v as T) ? (v as T) : undefined

const soVerdadeiro = (v: unknown) => (v === true ? true : undefined)

function caixa(v: unknown): Caixa | undefined {
  const o = obj(v)
  const lado = (x: unknown) =>
    typeof x === 'number' && Number.isFinite(x) ? limitar(x, -400, 400, 0) : 0
  const c: Caixa = {
    topo: lado(o.topo),
    direita: lado(o.direita),
    base: lado(o.base),
    esquerda: lado(o.esquerda),
  }
  // Caixa toda zerada nao gera CSS — melhor sair do documento.
  return c.topo || c.direita || c.base || c.esquerda ? c : undefined
}

function coergirEstilo(v: unknown): LpEstilo | undefined {
  const o = obj(v)
  const e: LpEstilo = {}
  const por = <T>(chave: keyof LpEstilo, bruto: unknown, coagir: (x: unknown) => T | undefined) => {
    const valor = porDisp(bruto, coagir)
    if (valor) (e as Record<string, unknown>)[chave] = valor
  }
  por('cor', o.cor, cor)
  por('fundo', o.fundo, cor)
  por('fonte', o.fonte, textoAte(60))
  por('tamanho', o.tamanho, textoAte(20))
  por('peso', o.peso, numeroEntre(100, 900))
  por('alturaLinha', o.alturaLinha, textoAte(12))
  por('espacamentoLetras', o.espacamentoLetras, textoAte(12))
  por('alinhamento', o.alinhamento, umDe(['left', 'center', 'right'] as const))
  por('margem', o.margem, caixa)
  por('padding', o.padding, caixa)
  por('largura', o.largura, textoAte(20))
  por('raio', o.raio, numeroEntre(0, 400))
  por('sombra', o.sombra, textoAte(120))
  por('altura', o.altura, textoAte(20))
  por('proporcao', o.proporcao, textoAte(12))
  por('ajuste', o.ajuste, umDe(['cobrir', 'conter', 'preencher'] as const))
  return Object.keys(e).length > 0 ? e : undefined
}

const APARENCIAS = new Set<string>([
  'card',
  'plano',
  'plano-destaque',
  'produto',
  'bloco',
  'figura',
  'beneficio',
  'marco',
  'caixa-cta',
])

type Base = { id: string; estilo?: LpEstilo; oculto?: PorDisp<boolean> }

/** Campos que todo nó tem. */
function base(o: Record<string, unknown>): Base {
  const b: Base = { id: idSeguro(o.id) }
  const estilo = coergirEstilo(o.estilo)
  if (estilo) b.estilo = estilo
  const oculto = porDisp(o.oculto, soVerdadeiro)
  if (oculto) b.oculto = oculto
  return b
}

export type CoergirMidia = (v: unknown) => LpMidia | null
export type CoergirBotao = (v: unknown) => LpBotao | null

/**
 * Um nó da árvore. Devolve null para o que não reconhece — nó inválido some da
 * página em vez de virar HTML imprevisível.
 *
 * `coergirMidia` e `coergirBotao` vêm de validar.ts por parâmetro: são as mesmas
 * regras da mídia e do botão do formato tipado, e duplicá-las aqui seria abrir
 * caminho para as duas versões divergirem.
 */
export function coergirElemento(
  bruto: unknown,
  midiaDe: CoergirMidia,
  botaoDe: CoergirBotao,
  profundidade = 0,
): LpElemento | null {
  if (profundidade > PROFUNDIDADE_MAX) return null
  const o = obj(bruto)
  const tipo = String(o.tipo ?? '')
  const b = base(o)

  if (tipo === 'container') {
    const c: LpContainer = {
      ...b,
      tipo: 'container',
      direcao: porDisp(o.direcao, umDe(['linha', 'coluna'] as const)) ?? { desktop: 'coluna' },
      filhos: lista(o.filhos)
        .slice(0, FILHOS_MAX)
        .map((f) => coergirElemento(f, midiaDe, botaoDe, profundidade + 1))
        .filter((f): f is LpElemento => f !== null),
    }
    if (APARENCIAS.has(String(o.aparencia))) c.aparencia = o.aparencia as Aparencia
    const colunas = porDisp(o.colunas, numeroEntre(1, 12))
    if (colunas) c.colunas = colunas
    // Catalogo fechado: isto vira grid-template-columns.
    const proporcao = porDisp(o.proporcaoColunas, (v) =>
      typeof v === 'string' && PROPORCOES_VALIDAS.has(v) ? v : undefined,
    )
    if (proporcao) c.proporcaoColunas = proporcao
    const gap = porDisp(o.gap, numeroEntre(0, 200))
    if (gap) c.gap = gap
    const alinhar = porDisp(o.alinhar, umDe(['inicio', 'centro', 'fim', 'esticar'] as const))
    if (alinhar) c.alinhar = alinhar
    const justificar = porDisp(o.justificar, umDe(['inicio', 'centro', 'fim', 'entre'] as const))
    if (justificar) c.justificar = justificar
    return c
  }

  switch (tipo) {
    case 'titulo':
      return {
        ...b,
        tipo: 'titulo',
        nivel: umDe(['h1', 'h2', 'h3', 'h4'] as const)(o.nivel) ?? 'h2',
        texto: str(o.texto, 500),
      }
    case 'texto':
      return {
        ...b,
        tipo: 'texto',
        papel: umDe(['subtitulo', 'corpo'] as const)(o.papel) ?? 'corpo',
        texto: str(o.texto, 4000),
      }
    case 'imagem':
    case 'video': {
      const midia = midiaDe(o.midia)
      // Sem mídia válida o widget não tem o que mostrar.
      if (!midia) return null
      return { ...b, tipo: midia.tipo === 'video' ? 'video' : 'imagem', midia }
    }
    case 'botao': {
      const botao = botaoDe(o.botao)
      if (!botao) return null
      return { ...b, tipo: 'botao', botao }
    }
    case 'icone':
      return { ...b, tipo: 'icone', nome: str(o.nome, 40) }
    case 'numero':
      return { ...b, tipo: 'numero', valor: str(o.valor, 40), rotulo: str(o.rotulo, 200) }
    case 'lista':
      return {
        ...b,
        tipo: 'lista',
        itens: lista(o.itens)
          .slice(0, ITENS_MAX)
          .map((i) => {
            const it = obj(i)
            const item: { id: string; icone?: string; texto: string } = {
              id: idSeguro(it.id),
              texto: str(it.texto, 300),
            }
            const icone = opcional(it.icone, 40)
            if (icone) item.icone = icone
            return item
          }),
      }
    case 'espacador':
      return {
        ...b,
        tipo: 'espacador',
        altura: porDisp(o.altura, numeroEntre(0, 400)) ?? { desktop: 40 },
      }
    case 'divisor':
      return { ...b, tipo: 'divisor' }
    case 'faq':
      return {
        ...b,
        tipo: 'faq',
        perguntas: lista(o.perguntas)
          .slice(0, ITENS_MAX)
          .map((p) => {
            const q = obj(p)
            return {
              id: idSeguro(q.id),
              pergunta: str(q.pergunta, 300),
              resposta: str(q.resposta, 4000),
            }
          }),
      }
    case 'abas':
      return {
        ...b,
        tipo: 'abas',
        abas: lista(o.abas)
          .slice(0, ITENS_MAX)
          .map((a) => {
            const t = obj(a)
            return {
              id: idSeguro(t.id),
              titulo: str(t.titulo, 200),
              texto: str(t.texto, 4000),
              imagem: midiaDe(t.imagem),
            }
          }),
      }
    case 'carrossel':
      return {
        ...b,
        tipo: 'carrossel',
        slides: lista(o.slides)
          .slice(0, ITENS_MAX)
          .map((s) => {
            const sl = obj(s)
            return {
              id: idSeguro(sl.id),
              imagem: midiaDe(sl.imagem),
              titulo: opcional(sl.titulo, 200),
              texto: opcional(sl.texto, 2000),
            }
          }),
      }
    case 'depoimentos':
      return {
        ...b,
        tipo: 'depoimentos',
        depoimentos: lista(o.depoimentos)
          .slice(0, ITENS_MAX)
          .map((d) => {
            const dp = obj(d)
            return {
              id: idSeguro(dp.id),
              texto: str(dp.texto, 2000),
              nome: str(dp.nome, 120),
              cargo: opcional(dp.cargo, 160),
              foto: midiaDe(dp.foto),
            }
          }),
      }
    case 'comparacao':
      return {
        ...b,
        tipo: 'comparacao',
        rotulos: lista(o.rotulos)
          .slice(0, ITENS_MAX)
          .map((r) => str(r, 200)),
        colunas: lista(o.colunas)
          .slice(0, 12)
          .map((c) => {
            const col = obj(c)
            const coluna: { id: string; titulo: string; celulas: string[]; destaque?: boolean } = {
              id: idSeguro(col.id),
              titulo: str(col.titulo, 200),
              celulas: lista(col.celulas)
                .slice(0, ITENS_MAX)
                .map((x) => str(x, 200)),
            }
            if (col.destaque === true) coluna.destaque = true
            return coluna
          }),
      }
    case 'formulario': {
      const destino = opcional(o.destino, 600)
      return { ...b, tipo: 'formulario', ...(destino ? { destino } : {}) }
    }
    default:
      return null
  }
}

/** Raiz da seção: precisa ser container, senão o compilador não sabe renderizar. */
export function coergirRaiz(
  bruto: unknown,
  midiaDe: CoergirMidia,
  botaoDe: CoergirBotao,
): LpContainer | undefined {
  const el = coergirElemento(bruto, midiaDe, botaoDe)
  return el?.tipo === 'container' ? el : undefined
}
