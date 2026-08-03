/**
 * Converte uma secao tipada (documento salvo ou saida da IA) na arvore de
 * elementos. Usado em tres lugares — migracao na leitura, "Nova secao" no
 * editor e coercao da IA —, entao preset certo aqui e preset certo nos tres.
 */

import type { LpContainer, LpSecao, TipoLayout } from '../tipos'
import { container } from './comum'
import {
  pBlocosAlternados,
  pCards,
  pEstatisticas,
  pGaleria,
  pGridProdutos,
  pListaBeneficios,
  pLogos,
  pMasonry,
  pPrecos,
  pTimeline,
} from './grades'
import { pBanner, pCta, pFormulario, pHero, pTextoCentralizado, pTextoMidia } from './simples'

type Expansor = (s: LpSecao) => LpContainer

const EXPANSORES: Partial<Record<TipoLayout, Expansor>> = {
  hero: pHero,
  'texto-midia': pTextoMidia,
  'texto-centralizado': pTextoCentralizado,
  cta: pCta,
  banner: pBanner,
  formulario: pFormulario,
  cards: pCards,
  precos: pPrecos,
  'grid-produtos': pGridProdutos,
  'lista-beneficios': pListaBeneficios,
  galeria: pGaleria,
  masonry: pMasonry,
  logos: pLogos,
  timeline: pTimeline,
  'blocos-alternados': pBlocosAlternados,
  estatisticas: pEstatisticas,
}

/**
 * Secao ajustada antes de expandir. So o banner precisa: nele a midia da secao
 * e FUNDO, nao elemento da pagina (html.ts:466). Sem isto a faixa perde o fundo
 * e ganha uma foto solta no meio do texto.
 *
 * Devolve a MESMA referencia quando nao ha o que ajustar, para o chamador poder
 * comparar por identidade.
 */
function ajustarSecao(s: LpSecao): LpSecao {
  if (s.tipo !== 'banner' || !s.midia) return s
  return { ...s, fundo: { ...s.fundo, midia: s.midia }, midia: null }
}

/**
 * Devolve a arvore e a secao que corresponde a ela. Os dois vem juntos de
 * proposito: o banner muda a secao, e uma assinatura que so devolvesse a raiz
 * deixaria o chamador esquecer disso sem nenhum aviso.
 */
export function expandirPreset(s: LpSecao): { raiz: LpContainer; secao: LpSecao } {
  const secao = ajustarSecao(s)
  const expansor = EXPANSORES[secao.tipo]
  // Preset ainda sem expansor cai num container vazio em vez de lancar: melhor
  // uma secao vazia para o usuario preencher do que um projeto que nao abre.
  return { raiz: expansor ? expansor(secao) : container([]), secao }
}
