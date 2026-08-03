/**
 * Presets que viram composicao livre: uma grade de containers, um por item.
 * Cada card/plano/produto passa a ser montavel elemento a elemento, e a grade
 * ja nasce com os valores de tablet e celular que as media queries do
 * compilador atual aplicam (css.ts:228 e vizinhas).
 */

import type { LpContainer, LpElemento, LpItem, LpSecao } from '../tipos'
import { gerarId } from '../util'
import {
  COL,
  LINHA,
  botaoSecao,
  cabeca,
  container,
  wBotao,
  wIcone,
  wMidia,
  wTexto,
  wTitulo,
} from './comum'

/** Colunas da grade com o mesmo escalonamento das media queries de hoje. */
const colunasDe = (n: number | undefined, padrao: number) => {
  const desktop = n ?? padrao
  return { desktop, tablet: Math.min(2, desktop), celular: 1 }
}

/** cabeca + grade + botao da secao — o esqueleto de quase todos os presets. */
function comGrade(s: LpSecao, grade: LpContainer): LpContainer {
  return container([...cabeca(s), grade, ...botaoSecao(s)])
}

function grade(filhos: LpElemento[], colunas: LpContainer['colunas']): LpContainer {
  return container(filhos, { direcao: LINHA, colunas, gap: { desktop: 24 } })
}

export function pCards(s: LpSecao): LpContainer {
  const cards = s.itens.map((i) =>
    container([
      ...(i.icone ? [wIcone(i.icone)] : []),
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ]),
  )
  return comGrade(s, grade(cards, colunasDe(s.colunas, 3)))
}

export function pPrecos(s: LpSecao): LpContainer {
  const planos = s.itens.map((i) =>
    container([
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.detalhe ? [wTexto(i.detalhe, 'corpo')] : []),
      ...(i.lista && i.lista.length > 0
        ? [
            {
              id: gerarId(),
              tipo: 'lista' as const,
              itens: i.lista.map((t) => ({ id: gerarId(), icone: 'check', texto: t })),
            },
          ]
        : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ]),
  )
  return comGrade(s, grade(planos, colunasDe(s.colunas, Math.min(3, Math.max(2, s.itens.length)))))
}

export function pGridProdutos(s: LpSecao): LpContainer {
  const produtos = s.itens.map((i) =>
    container([
      ...(i.imagem ? [wMidia(i.imagem)] : []),
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ]),
  )
  return comGrade(s, grade(produtos, colunasDe(s.colunas, 3)))
}

/** Galeria e masonry: um container por imagem, legenda abaixo. */
function galeriaOuMasonry(s: LpSecao): LpContainer {
  const figuras = s.itens
    .filter((i) => i.imagem)
    .map((i) =>
      container([
        wMidia(i.imagem as NonNullable<LpItem['imagem']>),
        ...(i.titulo ? [wTexto(i.titulo, 'corpo')] : []),
      ]),
    )
  return comGrade(s, grade(figuras, colunasDe(s.colunas, 3)))
}

export const pGaleria = galeriaOuMasonry
export const pMasonry = galeriaOuMasonry

export function pLogos(s: LpSecao): LpContainer {
  const logos = s.itens.map((i) =>
    container(i.imagem ? [wMidia(i.imagem)] : i.titulo ? [wTitulo(i.titulo, 'h4')] : []),
  )
  return comGrade(
    s,
    grade(logos, { desktop: Math.min(5, Math.max(2, s.itens.length)), tablet: 3, celular: 2 }),
  )
}

export function pTimeline(s: LpSecao): LpContainer {
  const marcos = s.itens.map((i) =>
    container([
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
    ]),
  )
  return comGrade(s, container(marcos, { direcao: COL, gap: { desktop: 32 } }))
}

export function pEstatisticas(s: LpSecao): LpContainer {
  const numeros: LpElemento[] = s.itens.map((i) => ({
    id: gerarId(),
    tipo: 'numero',
    valor: i.extra ?? '0',
    rotulo: i.titulo ?? '',
  }))
  return comGrade(s, grade(numeros, colunasDe(s.colunas, Math.min(4, Math.max(2, s.itens.length)))))
}

export function pBlocosAlternados(s: LpSecao): LpContainer {
  const blocos = s.itens.map((i, n) => {
    const texto = container([
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ])
    const img = i.imagem ? [wMidia(i.imagem)] : []
    // `inverter` dizia por qual lado a alternancia comeca; agora e a ordem.
    const comecaInvertido = Boolean(s.inverter)
    const invertido = n % 2 === (comecaInvertido ? 0 : 1)
    const filhos = invertido && img.length > 0 ? [...img, texto] : [texto, ...img]
    return container(filhos, {
      direcao: img.length > 0 ? LINHA : COL,
      colunas: img.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
      alinhar: { desktop: 'centro' },
    })
  })
  return comGrade(s, container(blocos, { direcao: COL, gap: { desktop: 48 } }))
}

export function pListaBeneficios(s: LpSecao): LpContainer {
  const beneficios = s.itens.map((i) =>
    container(
      [
        ...(i.icone ? [wIcone(i.icone)] : []),
        ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
        ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
      ],
      { direcao: LINHA, alinhar: { desktop: 'inicio' } },
    ),
  )
  const coluna = container([
    ...cabeca(s),
    container(beneficios, { direcao: COL, gap: { desktop: 20 } }),
    ...botaoSecao(s),
  ])
  const midia = s.midia ? [wMidia(s.midia)] : []
  return container([coluna, ...midia], {
    direcao: midia.length > 0 ? LINHA : COL,
    colunas: midia.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
    alinhar: { desktop: 'centro' },
  })
}
