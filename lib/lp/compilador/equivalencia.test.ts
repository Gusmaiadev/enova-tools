/**
 * Prova que migrar para a arvore nao muda a pagina.
 *
 * Duas referencias, de proposito:
 *  - `fixtures.json` congela o HTML que o compilador TIPADO produzia. Ele
 *    sobrevive a exclusao daquele caminho e continua sendo a resposta a
 *    pergunta "a pagina ainda e o que sempre foi?".
 *  - a comparacao arvore x tipado vale enquanto os dois caminhos existirem, e
 *    sai junto com o caminho tipado.
 *
 * Para regerar as fixtures (so faz sentido enquanto o caminho tipado existir):
 * criar um teste temporario que percorre LAYOUTS, chama compilarCorpo com a
 * secao de `novaSecao(tipo)` e grava o JSON.
 */

import { describe, expect, it } from 'vitest'
import { compilarCorpo } from './html'
import fixtures from './fixtures.json'
import { expandirPreset } from '../presets/expandir'
import { LAYOUTS, novaSecao } from '../layouts'
import { documentoBase } from '../documento'
import { briefingVazio } from '../tipos'
import type { LpDocumento, LpSecao } from '../tipos'

/** Documento com uma secao so, para isolar o layout no teste. */
function docCom(secao: LpSecao): LpDocumento {
  return { ...documentoBase(briefingVazio('Teste')), secoes: [secao] }
}

/** Texto visivel do HTML, sem tag nem atributo — o que o visitante le. */
const textoVisivel = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Palavras visiveis, ordenadas: compara conteudo sem depender de wrapper. */
const palavras = (html: string) => textoVisivel(html).split(' ').filter(Boolean).sort()

/** URLs citadas no HTML. */
const urls = (html: string) =>
  [...html.matchAll(/(?:src|href)="([^"]*)"/g)].map((m) => m[1]).sort()

/** HTML de referencia congelado do preset. */
const referencia = (tipo: string) => (fixtures as Record<string, string>)[tipo]

/** Os dois caminhos de render do mesmo preset. */
function ambos(tipo: Parameters<typeof novaSecao>[0]) {
  const tipada = novaSecao(tipo)
  const { raiz, secao } = expandirPreset(tipada)
  return {
    tipado: compilarCorpo(docCom(tipada), { modo: 'export' }),
    arvore: compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }),
  }
}

describe('equivalência com o HTML congelado', () => {
  for (const info of LAYOUTS) {
    it(`${info.tipo}: mesmo texto visível do compilador original`, () => {
      const tipada = novaSecao(info.tipo)
      const { raiz, secao } = expandirPreset(tipada)
      const arvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).corpo
      expect(palavras(arvore)).toEqual(palavras(referencia(info.tipo)))
    })

    it(`${info.tipo}: mesmas mídias e links do compilador original`, () => {
      const tipada = novaSecao(info.tipo)
      const { raiz, secao } = expandirPreset(tipada)
      const arvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).corpo
      expect(urls(arvore)).toEqual(urls(referencia(info.tipo)))
    })
  }
})

describe('equivalência árvore x layout tipado', () => {
  for (const info of LAYOUTS) {
    it(`${info.tipo}: mesmo texto visível nos dois caminhos`, () => {
      const { tipado, arvore } = ambos(info.tipo)
      expect(palavras(arvore.corpo)).toEqual(palavras(tipado.corpo))
    })

    it(`${info.tipo}: mesmas mídias e links`, () => {
      const { tipado, arvore } = ambos(info.tipo)
      expect(urls(arvore.corpo)).toEqual(urls(tipado.corpo))
    })
  }

  it('as fixtures cobrem todos os presets do catálogo', () => {
    expect(Object.keys(fixtures).sort()).toEqual(LAYOUTS.map((l) => l.tipo).sort())
  })

  it('a âncora da seção não muda com a migração', () => {
    const tipada = novaSecao('cards')
    const { raiz, secao } = expandirPreset(tipada)
    const idTipado = compilarCorpo(docCom(tipada), { modo: 'export' }).idsPorSecao.get(tipada.id)
    const idArvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).idsPorSecao.get(
      tipada.id,
    )
    expect(idArvore).toBe(idTipado)
  })
})
