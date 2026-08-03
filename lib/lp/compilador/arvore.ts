/**
 * Render recursivo da arvore de elementos da secao. Substitui as 21 funcoes de
 * layout: a estrutura agora e dado, nao codigo.
 */

import type { Aparencia, LpElemento } from '../tipos'
import { type Ctx, alvo } from './comum'
import { renderWidget } from './widgets'

/** Classe CSS da aparencia do container (ver o bloco APARENCIAS em css.ts). */
const CLASSE_APARENCIA: Record<Aparencia, string> = {
  card: 'lp-ap-card',
  plano: 'lp-ap-plano',
  'plano-destaque': 'lp-ap-plano lp-ap-destaque',
  produto: 'lp-ap-produto',
  bloco: 'lp-ap-bloco',
  figura: 'lp-ap-figura',
  beneficio: 'lp-ap-beneficio',
  marco: 'lp-ap-marco',
  'caixa-cta': 'lp-ap-caixa-cta',
}

export function renderElemento(ctx: Ctx, el: LpElemento): string {
  if (el.tipo !== 'container') return renderWidget(ctx, el)
  const classes = ['lp-c', el.aparencia ? CLASSE_APARENCIA[el.aparencia] : '', `lp-e-${el.id}`]
    .filter(Boolean)
    .join(' ')
  const filhos = el.filhos.map((f) => renderElemento(ctx, f)).join('')
  return `<div class="${classes}"${alvo(ctx, `el:${el.id}`)}>${filhos}</div>`
}
