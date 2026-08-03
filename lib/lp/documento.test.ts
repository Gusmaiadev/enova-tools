import { describe, expect, it } from 'vitest'
import { arquivosUsados } from './documento'
import type { LpDocumento, LpMidia, LpSecao } from './tipos'

const enviada = (caminho: string): LpMidia => ({
  tipo: 'imagem',
  url: `https://bucket/${caminho}`,
  alt: '',
  busca: '',
  orientacao: 'paisagem',
  caminho,
})

const docBase = (secoes: LpSecao[]): LpDocumento => ({
  seo: { titulo: '', descricao: '' },
  tema: { tipografia: {}, cores: {}, raio: 8 } as LpDocumento['tema'],
  header: { logoTexto: 'X', menu: [], fixo: false, botoes: [] },
  secoes,
  footer: { linksUteis: [], menuSecundario: false },
  redes: [],
})

const secao = (extra: Partial<LpSecao>): LpSecao => ({
  id: 's1',
  tipo: 'hero',
  nome: 'Hero',
  ancora: null,
  itens: [],
  largura: 'boxed',
  ...extra,
})

describe('arquivosUsados', () => {
  it('acha midia nos campos antigos da secao', () => {
    const doc = docBase([
      secao({
        midia: enviada('lp/1/a.jpg'),
        fundo: { midia: enviada('lp/1/b.jpg') },
        itens: [{ id: 'i1', imagem: enviada('lp/1/c.jpg') }],
      }),
    ])
    expect([...arquivosUsados({ documento: doc })].sort()).toEqual([
      'lp/1/a.jpg',
      'lp/1/b.jpg',
      'lp/1/c.jpg',
    ])
  })

  it('acha midia em qualquer profundidade da arvore', () => {
    const doc = docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            {
              id: 'c',
              tipo: 'container',
              direcao: { desktop: 'linha' },
              filhos: [{ id: 'i', tipo: 'imagem', midia: enviada('lp/1/fundo.jpg') }],
            },
          ],
        },
      }),
    ])
    expect([...arquivosUsados({ documento: doc })]).toEqual(['lp/1/fundo.jpg'])
  })

  it('acha midia dentro de widget composto', () => {
    const doc = docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            {
              id: 'd',
              tipo: 'depoimentos',
              depoimentos: [{ id: '1', texto: 'oi', nome: 'A', foto: enviada('lp/1/foto.jpg') }],
            },
          ],
        },
      }),
    ])
    expect([...arquivosUsados({ documento: doc })]).toEqual(['lp/1/foto.jpg'])
  })

  it('ignora midia de banco (sem caminho no bucket)', () => {
    const doc = docBase([
      secao({
        midia: {
          tipo: 'imagem',
          url: 'https://pexels/x.jpg',
          alt: '',
          busca: '',
          orientacao: 'paisagem',
        },
      }),
    ])
    expect(arquivosUsados({ documento: doc }).size).toBe(0)
  })
})
