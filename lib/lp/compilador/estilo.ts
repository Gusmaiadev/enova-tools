/**
 * CSS derivado da arvore: layout do container e sobreposicoes de LpEstilo, um
 * seletor .lp-e-<id> por no.
 *
 * A saida vem separada por dispositivo para o chamador emitir UM bloco de media
 * query com todos os elementos, em vez de tres por elemento. A heranca sai da
 * cascata: sendo max-width, numa tela de 500px os dois blocos valem e o de 640
 * vence por vir depois.
 */

import { caminharElementos } from '../arvore'
import { familiaCss } from '../fontes'
import { DISPOSITIVOS, PROPORCOES_VALIDAS } from '../padroes'
import type { Caixa, Dispositivo, LpContainer, LpElemento, LpEstilo, PorDisp } from '../tipos'
import { DECORACOES, ESTILOS_FONTE, TRANSFORMACOES } from '../tipos'
import { corSegura, escCss } from '../util'


const ALINHAR: Record<string, string> = {
  inicio: 'flex-start',
  centro: 'center',
  fim: 'flex-end',
  esticar: 'stretch',
}

const JUSTIFICAR: Record<string, string> = {
  inicio: 'flex-start',
  centro: 'center',
  fim: 'flex-end',
  entre: 'space-between',
}

const caixaCss = (c: Caixa) =>
  `${num(c.topo)}px ${num(c.direita)}px ${num(c.base)}px ${num(c.esquerda)}px`

/** Numero seguro: valor vindo do documento nunca entra cru no CSS. */
function num(n: unknown): string {
  return typeof n === 'number' && Number.isFinite(n) ? String(n) : '0'
}

/** Regras de layout do container num dispositivo. */
function regrasContainer(c: LpContainer, d: Dispositivo): string[] {
  const r: string[] = []
  const direcao = c.direcao[d]
  const colunas = c.colunas?.[d]
  // Proporcao so vale do catalogo — ver PROPORCOES_VALIDAS. Fora dele, ignora e
  // cai em colunas iguais, em vez de deixar passar CSS arbitrario.
  const proporcao = c.proporcaoColunas?.[d]
  const trilhas =
    proporcao && PROPORCOES_VALIDAS.has(proporcao)
      ? proporcao
      : colunas !== undefined
        ? `repeat(${num(colunas)},1fr)`
        : ''
  if (direcao === 'linha' && trilhas) {
    r.push('display:grid', `grid-template-columns:${trilhas}`)
  } else if (direcao === 'linha') {
    r.push('display:flex', 'flex-direction:row', 'flex-wrap:wrap')
  } else if (direcao === 'coluna') {
    r.push('display:flex', 'flex-direction:column')
  } else if (trilhas) {
    // Colunas mudam de valor num breakpoint em que a direcao nao muda.
    r.push(`grid-template-columns:${trilhas}`)
  }
  if (c.gap?.[d] !== undefined) r.push(`gap:${num(c.gap[d])}px`)
  const al = c.alinhar?.[d]
  if (al) r.push(`align-items:${ALINHAR[al]}`)
  const ju = c.justificar?.[d]
  if (ju) r.push(`justify-content:${JUSTIFICAR[ju]}`)
  return r
}

const OBJECT_FIT: Record<string, string> = {
  cobrir: 'cover',
  conter: 'contain',
  preencher: 'fill',
}

/**
 * Nos que sao um BLOCO dentro do container, e nao texto corrido. Neles
 * `text-align` nao posiciona nada — no botao ele so centraliza o rotulo dentro
 * do proprio botao, que ja vem centralizado.
 *
 * `margin-inline:auto` posiciona, e funciona nos tres casos que o container
 * pode ser: coluna, linha e grade. `align-self` so serviria na coluna, e
 * `justify-self` so na grade.
 */
const POSICIONAVEIS = new Set(['imagem', 'video', 'botao', 'icone'])

/** `margin-inline` leva dois valores: inicio e fim. */
const MARGEM_ALINHAMENTO: Record<string, string> = {
  left: '0 auto',
  center: 'auto',
  right: 'auto 0',
}

/** Regras de LpEstilo num dispositivo. */
function regrasEstilo(e: LpEstilo, d: Dispositivo, posicionavel: boolean): string[] {
  const r: string[] = []
  const em = <T>(p: PorDisp<T> | undefined): T | undefined => p?.[d]
  const cor = em(e.cor)
  if (cor) r.push(`color:${escCss(corSegura(cor, 'inherit'))}`)
  const fundo = em(e.fundo)
  if (fundo) r.push(`background:${escCss(corSegura(fundo, 'transparent'))}`)
  const fonte = em(e.fonte)
  if (fonte) r.push(`font-family:${familiaCss(fonte)}`)
  const tamanho = em(e.tamanho)
  if (tamanho) r.push(`font-size:${escCss(tamanho)}`)
  const peso = em(e.peso)
  if (peso !== undefined) r.push(`font-weight:${num(peso)}`)
  const altura = em(e.alturaLinha)
  if (altura) r.push(`line-height:${escCss(altura)}`)
  const espaco = em(e.espacamentoLetras)
  if (espaco) r.push(`letter-spacing:${escCss(espaco)}`)
  // Unioes fechadas: so entra no CSS o que esta no catalogo de tipos.ts.
  const estiloFonte = em(e.estiloFonte)
  if (estiloFonte && ESTILOS_FONTE.includes(estiloFonte)) r.push(`font-style:${estiloFonte}`)
  const transformacao = em(e.transformacao)
  if (transformacao && TRANSFORMACOES.includes(transformacao)) {
    r.push(`text-transform:${transformacao}`)
  }
  const decoracao = em(e.decoracao)
  if (decoracao && DECORACOES.includes(decoracao)) r.push(`text-decoration-line:${decoracao}`)
  const margem = em(e.margem)
  if (margem) r.push(`margin:${caixaCss(margem)}`)
  const padding = em(e.padding)
  if (padding) r.push(`padding:${caixaCss(padding)}`)
  const largura = em(e.largura)
  if (largura) r.push(`width:${escCss(largura)}`)
  const raio = em(e.raio)
  if (raio !== undefined) r.push(`border-radius:${num(raio)}px`)
  const sombra = em(e.sombra)
  if (sombra) r.push(`box-shadow:${escCss(sombra)}`)
  const alturaCaixa = em(e.altura)
  if (alturaCaixa) r.push(`height:${escCss(alturaCaixa)}`)
  const proporcao = em(e.proporcao)
  if (proporcao) r.push(`aspect-ratio:${escCss(proporcao)}`)

  // Alinhamento por ULTIMO, e depois de `margem`: no bloco posicionavel ele sai
  // como margin-inline, que a regra de `margin` acima apagaria se viesse antes.
  const alinhamento = em(e.alinhamento)
  if (alinhamento) {
    r.push(
      posicionavel
        ? `margin-inline:${MARGEM_ALINHAMENTO[alinhamento]}`
        : `text-align:${escCss(alinhamento)}`,
    )
  }
  return r
}

function regrasDoNo(el: LpElemento, d: Dispositivo): string {
  const ehMidia = el.tipo === 'imagem' || el.tipo === 'video'
  const r: string[] = []
  if (el.tipo === 'container') r.push(...regrasContainer(el, d))
  if (el.estilo) r.push(...regrasEstilo(el.estilo, d, POSICIONAVEIS.has(el.tipo)))
  // A checagem de tipo vem antes do acesso: `altura` so existe no espacador, e
  // o TypeScript so libera o campo depois de estreitar a uniao.
  if (el.tipo === 'espacador' && el.altura[d] !== undefined) {
    r.push(`height:${num(el.altura[d])}px`)
  }
  // `oculto` por ultimo: esconder vence qualquer display que o layout pos.
  if (el.oculto?.[d]) r.push('display:none')

  const regras = r.length > 0 ? [`.lp-e-${el.id}{${r.join(';')}}`] : []

  // `object-fit` mora no <img>/<video>, nao no quadro que os envolve — por isso
  // sai como regra descendente em vez de entrar na regra do no.
  const ajuste = ehMidia ? el.estilo?.ajuste?.[d] : undefined
  if (ajuste && OBJECT_FIT[ajuste]) {
    regras.push(`.lp-e-${el.id} img,.lp-e-${el.id} video{object-fit:${OBJECT_FIT[ajuste]}}`)
  }
  return regras.join('\n')
}

/** CSS de todos os nos da arvore, separado por dispositivo. */
export function cssDaArvore(raiz: LpContainer): Record<Dispositivo, string> {
  const nos = caminharElementos(raiz)
  const fora = Object.fromEntries(DISPOSITIVOS.map((d) => [d, ''])) as Record<Dispositivo, string>
  for (const d of DISPOSITIVOS) {
    fora[d] = nos
      .map((el) => regrasDoNo(el, d))
      .filter(Boolean)
      .join('\n')
  }
  return fora
}
