import { describe, expect, it } from 'vitest'
import { compilarCorpo } from './html'
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

/** Os dois caminhos de render do mesmo preset. */
function ambos(tipo: Parameters<typeof novaSecao>[0]) {
  const tipada = novaSecao(tipo)
  const { raiz, secao } = expandirPreset(tipada)
  return {
    tipado: compilarCorpo(docCom(tipada), { modo: 'export' }),
    arvore: compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }),
  }
}

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
