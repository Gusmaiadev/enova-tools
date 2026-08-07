/**
 * CSS derivado da arvore: layout do container e sobreposicoes de LpEstilo, um
 * seletor .lp-e-<id> por no.
 *
 * A saida vem separada por dispositivo para o chamador emitir UM bloco de media
 * query com todos os elementos, em vez de tres por elemento. A heranca sai da
 * cascata: sendo max-width, numa tela de 500px os dois blocos valem e o de 640
 * vence por vir depois.
 */

import { regrasTempo } from '../animacoes'
import { caminharElementos } from '../arvore'
import { familiaCss } from '../fontes'
import { DISPOSITIVOS, PROPORCOES_VALIDAS } from '../padroes'
import { partesDe } from '../partes'
import type {
  Caixa,
  Dispositivo,
  EstiloHover,
  LpContainer,
  LpElemento,
  LpEstilo,
  PorDisp,
} from '../tipos'
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
 * Os tres degraus de sombra do catalogo. Valor fora dele so aparece em
 * documento anterior ao catalogo, e passa por escCss como qualquer outro CSS
 * vindo do documento.
 */
const CSS_SOMBRA: Record<string, string> = {
  suave: '0 4px 12px -4px rgba(15,23,42,.20)',
  media: '0 14px 30px -14px rgba(15,23,42,.30)',
  forte: '0 26px 50px -22px rgba(15,23,42,.42)',
}

const sombraCss = (v: string) => CSS_SOMBRA[v] ?? escCss(v)

/**
 * O que muda ao passar o mouse. So sai no desktop: hover nao existe em tela de
 * toque, e repetir a regra por breakpoint encheria a folha a toa.
 */
function regrasHover(h: EstiloHover): string[] {
  const r: string[] = []
  if (h.cor) r.push(`color:${escCss(corSegura(h.cor, 'inherit'))}`)
  if (h.fundo) r.push(`background:${escCss(corSegura(h.fundo, 'transparent'))}`)
  if (h.sombra) r.push(`box-shadow:${sombraCss(h.sombra)}`)
  // Os dois movimentos moram no mesmo transform: separados, o segundo apagaria
  // o primeiro.
  const movimento: string[] = []
  if (h.subir) movimento.push(`translateY(-${num(h.subir)}px)`)
  if (h.escala !== undefined && h.escala !== 100) {
    movimento.push(`scale(${(limitarEscala(h.escala) / 100).toFixed(2)})`)
  }
  if (movimento.length > 0) r.push(`transform:${movimento.join(' ')}`)
  return r
}

const limitarEscala = (n: number) => Math.min(150, Math.max(50, Number.isFinite(n) ? n : 100))

/** Propriedades que o hover anima — as unicas que ele sabe mudar. */
const TRANSICAO = 'transition:color .2s,background-color .2s,box-shadow .2s,transform .2s'

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
  if (margem) {
    // Margem horizontal zerada sai como `margin-block`, e nao como o atalho de
    // quatro lados. O atalho apagaria o `margin-inline:auto` que centraliza o
    // FAQ e os depoimentos: mexer no espaco de cima jogava os dois para a
    // esquerda. Escrevendo um valor nas laterais, ai sim o atalho vale.
    r.push(
      margem.esquerda === 0 && margem.direita === 0
        ? `margin-block:${num(margem.topo)}px ${num(margem.base)}px`
        : `margin:${caixaCss(margem)}`,
    )
  }
  const padding = em(e.padding)
  if (padding) r.push(`padding:${caixaCss(padding)}`)
  const largura = em(e.largura)
  // `max-width:none` junto: sem isso o limite que o widget traz de fabrica
  // (760px no FAQ, 820px nos depoimentos) vencia a largura escolhida, e o campo
  // parecia quebrado para qualquer valor acima do limite.
  if (largura) r.push(`width:${escCss(largura)}`, 'max-width:none')
  const raio = em(e.raio)
  if (raio !== undefined) r.push(`border-radius:${num(raio)}px`)
  const sombra = em(e.sombra)
  if (sombra) r.push(`box-shadow:${sombraCss(sombra)}`)
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
  // Duracao e atraso da animacao so no desktop: sao um tempo, nao um tamanho —
  // repetir por breakpoint so encheria a folha com a mesma regra.
  if (d === 'desktop') r.push(...regrasTempo(el.animacao))
  // A transicao mora no estado NORMAL: sem ela o hover trocaria a cor de uma
  // vez so, sem passagem. Entra antes da regra do no ser montada, para os dois
  // sairem juntos em vez de virar um segundo bloco com o mesmo seletor.
  const ligado = el.estilo?.hover && el.estilo.hover.ativo !== false
  const hover = d === 'desktop' && ligado ? regrasHover(el.estilo!.hover!) : []
  if (hover.length > 0) r.push(TRANSICAO)
  // `oculto` por ultimo: esconder vence qualquer display que o layout pos.
  if (el.oculto?.[d]) r.push('display:none')

  const regras = r.length > 0 ? [`.lp-e-${el.id}{${r.join(';')}}`] : []
  if (hover.length > 0) regras.push(`.lp-e-${el.id}:hover{${hover.join(';')}}`)

  // Partes do widget composto. Regra descendente porque a folha base escreve
  // cor, fonte, peso e tamanho direto nos textos de dentro, e regra no filho
  // vence heranca — o estilo do no de fora nunca alcancaria nenhum deles. Com a
  // classe do no na frente, esta ganha por especificidade (uma classe a mais).
  for (const parte of partesDe(el.tipo)) {
    const estilo = el.partes?.[parte.chave]
    if (!estilo) continue
    const prefixados = parte.seletores.map((s) => `.lp-e-${el.id} ${s}`)
    const rs = regrasEstilo(estilo, d, false)
    if (rs.length > 0) regras.push(`${prefixados.join(',')}{${rs.join(';')}}`)

    // O encaixe mora no <img>/<video>, nao no quadro que os envolve — a mesma
    // separacao do no de midia. Na `foto` o seletor ja e a propria imagem.
    const ajuste = parte.midia ? estilo.ajuste?.[d] : undefined
    if (ajuste && OBJECT_FIT[ajuste]) {
      const alvo =
        parte.midia === 'foto'
          ? prefixados
          : prefixados.flatMap((s) => [`${s} img`, `${s} video`])
      regras.push(`${alvo.join(',')}{object-fit:${OBJECT_FIT[ajuste]}}`)
    }
  }

  // `object-fit` mora no <img>/<video>, nao no quadro que os envolve — por isso
  // sai como regra descendente em vez de entrar na regra do no.
  const ajuste = ehMidia ? el.estilo?.ajuste?.[d] : undefined
  if (ajuste && OBJECT_FIT[ajuste]) {
    regras.push(`.lp-e-${el.id} img,.lp-e-${el.id} video{object-fit:${OBJECT_FIT[ajuste]}}`)
  }

  // Botao e icone chegam com `align-self:flex-start` do CSS base, que existe
  // para eles nao esticarem de ponta a ponta num container em coluna. So que
  // align-self VENCE o align-items do pai — e era isso que prendia o botao a
  // esquerda na secao centralizada, no CTA e no banner, que antes da arvore
  // saiam centralizados pelo text-align da caixa. Aqui o alinhamento escolhido
  // no container volta a alcancar os dois.
  const alinharPai = el.tipo === 'container' ? el.alinhar?.[d] : undefined
  if (alinharPai && ALINHAR[alinharPai]) {
    regras.push(
      `.lp-e-${el.id} > .lp-btn,.lp-e-${el.id} > .lp-icone{align-self:${ALINHAR[alinharPai]}}`,
    )
  }

  // Botao colado na base de cada bloco filho. `margin-top:auto` joga toda a
  // sobra de espaco para cima dele; como os blocos de uma grade ja saem com a
  // mesma altura, os botoes acabam todos na mesma linha. Alcanca o botao que e
  // filho DIRETO do bloco, que e onde os presets o poem. Sai so no desktop: nao
  // e valor por dispositivo, e a mesma decisao de leitura em qualquer tela.
  if (d === 'desktop' && el.tipo === 'container' && el.botoesNaBase) {
    regras.push(`.lp-e-${el.id} > * > .lp-btn{margin-top:auto}`)
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
