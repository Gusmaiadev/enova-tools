/**
 * Converte uma secao tipada (documento salvo ou saida da IA) na arvore de
 * elementos. Usado em tres lugares — migracao na leitura, "Nova secao" no
 * editor e coercao da IA —, entao preset certo aqui e preset certo nos tres.
 */

import type { LpContainer, LpSecao, TipoLayout } from '../tipos'
import { container } from './comum'
import { pAbas, pCarrossel, pComparacao, pDepoimentos, pFaq } from './compostos'
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

const EXPANSORES: Record<TipoLayout, Expansor> = {
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
  faq: pFaq,
  tabs: pAbas,
  carrossel: pCarrossel,
  depoimentos: pDepoimentos,
  comparacao: pComparacao,
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
  // O cast e proposital: `tipo` vem do Firestore e da IA, entao em tempo de
  // execucao pode ser um valor fora do catalogo, por mais que o tipo estatico
  // diga que nao. Ja o Record completo faz o build recusar um preset novo em
  // TipoLayout que ninguem tenha ensinado a expandir.
  const expansor = EXPANSORES[secao.tipo] as Expansor | undefined
  // Tipo fora do catalogo cai num container vazio: melhor uma secao para o
  // usuario preencher do que um projeto que nao abre.
  return { raiz: expansor ? expansor(secao) : container([]), secao }
}
