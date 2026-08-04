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
