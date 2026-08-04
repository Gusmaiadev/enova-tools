/**
 * Padroes de espacamento da arvore.
 *
 * Vivem aqui porque tem DOIS consumidores que nao podem divergir: o CSS base
 * (que aplica quando o no nao tem valor proprio) e o painel (que mostra esses
 * mesmos numeros nos campos, para o usuario ver o que esta valendo e poder
 * mudar — inclusive para zero).
 */

import type { Caixa } from './tipos'

/** Espaco entre os filhos de um container, em px. */
export const GAP_PADRAO = 15

/**
 * Largura maxima do conteudo, em px — a de sempre, antes de o tema poder
 * defini-la. Vale para header, rodape e todas as secoes: os tres usam
 * .lp-container, que le --largura.
 */
export const LARGURA_PADRAO = 1140

/**
 * Proporcoes de coluna oferecidas por quantidade de colunas. Catalogo FECHADO
 * de proposito: o valor vira `grid-template-columns`, e o documento chega do
 * cliente e da IA — aceitar texto livre ali seria injecao de CSS.
 *
 * Lido pelo painel (para montar o seletor) e pela coercao (para recusar o que
 * nao estiver na lista).
 */
export const PROPORCOES_COLUNAS: Record<number, { valor: string; rotulo: string }[]> = {
  2: [
    { valor: '', rotulo: 'Iguais (50 / 50)' },
    { valor: '2fr 1fr', rotulo: '66 / 33' },
    { valor: '1fr 2fr', rotulo: '33 / 66' },
    { valor: '3fr 2fr', rotulo: '60 / 40' },
    { valor: '2fr 3fr', rotulo: '40 / 60' },
    { valor: '3fr 1fr', rotulo: '75 / 25' },
    { valor: '1fr 3fr', rotulo: '25 / 75' },
  ],
  3: [
    { valor: '', rotulo: 'Iguais (1/3 cada)' },
    { valor: '2fr 1fr 1fr', rotulo: 'Primeira maior' },
    { valor: '1fr 2fr 1fr', rotulo: 'Do meio maior' },
    { valor: '1fr 1fr 2fr', rotulo: 'Última maior' },
  ],
  4: [
    { valor: '', rotulo: 'Iguais' },
    { valor: '2fr 1fr 1fr 1fr', rotulo: 'Primeira maior' },
    { valor: '1fr 1fr 1fr 2fr', rotulo: 'Última maior' },
  ],
}

/** Todo valor aceito, para a coercao conferir sem conhecer o painel. */
export const PROPORCOES_VALIDAS = new Set(
  Object.values(PROPORCOES_COLUNAS)
    .flat()
    .map((p) => p.valor)
    .filter(Boolean),
)

/** Limites do controle de largura, por dispositivo. */
export const FAIXA_LARGURA: Record<'desktop' | 'tablet' | 'celular', [number, number]> = {
  desktop: [720, 1920],
  tablet: [480, 1280],
  celular: [320, 900],
}

/**
 * Margem vertical dos widgets de TEXTO, em px. Horizontal fica em zero: quem
 * precisa de recuo lateral usa a largura ou o padding do container.
 */
export const MARGEM_PADRAO: Caixa = { topo: 10, direita: 0, base: 10, esquerda: 0 }

export const CAIXA_ZERO: Caixa = { topo: 0, direita: 0, base: 0, esquerda: 0 }

/**
 * Quem recebe MARGEM_PADRAO. Midia, botao, container e os widgets compostos
 * ficam de fora: eles ja se separam pelo gap do pai, e margem neles empurraria
 * a secao inteira.
 */
const COM_MARGEM = new Set(['titulo', 'texto'])

/** Margem que o CSS base aplica ao no — o que o painel mostra como "padrao". */
export const margemPadraoDe = (tipo: string): Caixa =>
  COM_MARGEM.has(tipo) ? MARGEM_PADRAO : CAIXA_ZERO
