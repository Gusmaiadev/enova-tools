/**
 * Utilitarios puros compartilhados pelos bancos de midia. Sem 'server-only'
 * para ficarem testaveis sem stub.
 */

import type { Orientacao } from '../tipos'

/**
 * Dimensoes do arquivo depois de reduzido para `larguraMax`, preservando a
 * proporcao. Serve para o consumidor saber a proporcao real da midia — a fonte
 * informa o tamanho do ORIGINAL, mas entregamos uma versao redimensionada.
 */
export function escalar(
  largura: number | undefined,
  altura: number | undefined,
  larguraMax: number,
): { largura?: number; altura?: number } {
  if (!largura || !altura) return {}
  if (largura <= larguraMax) return { largura, altura }
  const fator = larguraMax / largura
  return { largura: larguraMax, altura: Math.round(altura * fator) }
}

/**
 * Como `escalar`, mas o teto vale para o LADO MAIOR. É assim que o Pixabay
 * monta o largeImageURL ("max 1280px"): uma foto em pé sai 853x1280, não
 * 1280x1920.
 */
export function escalarLadoMaior(
  largura: number | undefined,
  altura: number | undefined,
  ladoMax: number,
): { largura?: number; altura?: number } {
  if (!largura || !altura) return {}
  const maior = Math.max(largura, altura)
  if (maior <= ladoMax) return { largura, altura }
  const fator = ladoMax / maior
  return { largura: Math.round(largura * fator), altura: Math.round(altura * fator) }
}

/**
 * Classifica pela proporcao. As faixas sao largas de proposito: quase nada no
 * acervo e exatamente 1:1, e um 5:4 ainda le como "quadrado" na pagina.
 */
export function orientacaoDe(
  largura: number | undefined,
  altura: number | undefined,
): Orientacao | null {
  if (!largura || !altura) return null
  const razao = largura / altura
  if (razao >= 1.2) return 'paisagem'
  if (razao <= 0.83) return 'retrato'
  return 'quadrado'
}
