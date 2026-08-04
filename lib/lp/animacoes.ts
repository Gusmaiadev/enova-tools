/**
 * Catalogo de animacoes de entrada — o elemento anima quando entra na tela.
 *
 * Fonte unica: o rotulo alimenta o editor e os keyframes alimentam o CSS
 * gerado, entao nao existe animacao que apareca no painel e nao exista na
 * pagina (nem o contrario). So saem no CSS os keyframes das animacoes que o
 * documento realmente usa.
 *
 * O nome diz DE ONDE o elemento vem, nao para onde vai: 'fade-baixo' entra
 * subindo a partir de baixo. Em ingles isso e "fadeInUp", que confunde.
 */

/** Deslocamento das entradas direcionais. Ver `overflow-x:clip` em css.ts. */
const D = 48

export const ANIMACOES = [
  { tipo: 'fade', rotulo: 'Aparecer', de: 'opacity:0' },
  { tipo: 'fade-baixo', rotulo: 'Aparecer de baixo', de: `opacity:0;transform:translateY(${D}px)` },
  { tipo: 'fade-cima', rotulo: 'Aparecer de cima', de: `opacity:0;transform:translateY(-${D}px)` },
  {
    tipo: 'fade-esquerda',
    rotulo: 'Aparecer da esquerda',
    de: `opacity:0;transform:translateX(-${D}px)`,
  },
  {
    tipo: 'fade-direita',
    rotulo: 'Aparecer da direita',
    de: `opacity:0;transform:translateX(${D}px)`,
  },
  { tipo: 'zoom', rotulo: 'Ampliar', de: 'opacity:0;transform:scale(.85)' },
  { tipo: 'zoom-saida', rotulo: 'Reduzir', de: 'opacity:0;transform:scale(1.15)' },
  { tipo: 'desliza-baixo', rotulo: 'Deslizar de baixo', de: `transform:translateY(${D * 2}px)` },
  { tipo: 'desliza-cima', rotulo: 'Deslizar de cima', de: `transform:translateY(-${D * 2}px)` },
  {
    tipo: 'desliza-esquerda',
    rotulo: 'Deslizar da esquerda',
    de: `transform:translateX(-${D * 2}px)`,
  },
  {
    tipo: 'desliza-direita',
    rotulo: 'Deslizar da direita',
    de: `transform:translateX(${D * 2}px)`,
  },
  { tipo: 'girar', rotulo: 'Girar', de: 'opacity:0;transform:rotate(-10deg) scale(.9)' },
] as const

export type Animacao = (typeof ANIMACOES)[number]['tipo']

/** Configuracao de animacao de um no ou de uma secao. Tempos em ms. */
export type LpAnimacao = {
  tipo: Animacao
  /** Ausente = DURACAO_PADRAO. */
  duracao?: number
  /** Ausente = sem atraso. */
  atraso?: number
}

export const DURACAO_PADRAO = 800
export const DURACAO_MAX = 3000
export const ATRASO_MAX = 3000

const POR_TIPO = new Map(ANIMACOES.map((a) => [a.tipo as string, a]))
export const animacaoValida = (tipo: string): tipo is Animacao => POR_TIPO.has(tipo)

/**
 * Classes do elemento animado. `lp-an` e o gancho do IntersectionObserver e
 * segura o estado inicial; `lp-an-<tipo>` escolhe o keyframe.
 */
export function classeAnimacao(a: LpAnimacao | undefined): string {
  return a && animacaoValida(a.tipo) ? `lp-an lp-an-${a.tipo}` : ''
}

/**
 * `animation-duration` e `animation-delay` do no, para entrar na regra do
 * .lp-e-<id> junto com o resto do estilo. Sao numeros vindos do documento:
 * passam por limites, nunca vao crus para o CSS.
 */
export function regrasTempo(a: LpAnimacao | undefined): string[] {
  if (!a || !animacaoValida(a.tipo)) return []
  const r: string[] = []
  const ms = (v: unknown, max: number): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), max) : null
  const dur = ms(a.duracao, DURACAO_MAX)
  if (dur !== null && dur !== DURACAO_PADRAO) r.push(`animation-duration:${dur}ms`)
  const atraso = ms(a.atraso, ATRASO_MAX)
  if (atraso) r.push(`animation-delay:${atraso}ms`)
  return r
}

/**
 * CSS das animacoes presentes no documento. Vazio quando nenhuma foi usada —
 * pagina sem animacao nao carrega keyframe nenhum.
 */
export function cssAnimacoes(usadas: Set<string>): string {
  const presentes = ANIMACOES.filter((a) => usadas.has(a.tipo))
  if (presentes.length === 0) return ''
  return (
    // O estado inicial fica no elemento e nao no keyframe: sem isto ele
    // apareceria por um quadro antes de o observador marca-lo.
    `.lp-an{${presentes.some((a) => a.de.includes('opacity')) ? 'opacity:0;' : ''}` +
    `animation-duration:${DURACAO_PADRAO}ms;animation-timing-function:cubic-bezier(.2,.7,.3,1);` +
    `animation-fill-mode:both}\n` +
    // A secao contem o deslocamento horizontal das entradas direcionais:
    // `clip` corta sem virar contexto de rolagem, entao nao quebra o sticky do
    // header nem cria barra lateral no celular.
    `.lp-secao,.lp-an{overflow-x:clip}\n` +
    presentes.map((a) => `.lp-an-${a.tipo}.lp-vis{animation-name:lp-k-${a.tipo}}`).join('\n') +
    '\n' +
    presentes
      .map((a) => `@keyframes lp-k-${a.tipo}{from{${a.de}}to{opacity:1;transform:none}}`)
      .join('\n') +
    '\n' +
    // Quem pediu menos movimento ve o conteudo parado, ja no estado final.
    `@media (prefers-reduced-motion:reduce){.lp-an{opacity:1;animation:none}}\n`
  )
}
