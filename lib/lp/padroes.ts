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
 * Margem vertical de cada elemento, em px. Horizontal fica em zero: quem
 * precisa de recuo lateral usa a largura ou o padding do container.
 */
export const MARGEM_PADRAO: Caixa = { topo: 10, direita: 0, base: 10, esquerda: 0 }
