import { describe, expect, it } from 'vitest'
import { caminharElementos, midiasDoElemento } from './arvore'
import type { LpContainer, LpMidia } from './tipos'

const midia = (url: string): LpMidia => ({
  tipo: 'imagem',
  url,
  alt: '',
  busca: '',
  orientacao: 'paisagem',
})

const arvore: LpContainer = {
  id: 'raiz',
  tipo: 'container',
  direcao: { desktop: 'coluna' },
  filhos: [
    { id: 't1', tipo: 'titulo', nivel: 'h2', texto: 'Olá' },
    {
      id: 'c1',
      tipo: 'container',
      direcao: { desktop: 'linha' },
      filhos: [
        { id: 'i1', tipo: 'imagem', midia: midia('a.jpg') },
        { id: 'p1', tipo: 'texto', papel: 'corpo', texto: 'corpo' },
      ],
    },
  ],
}

describe('caminharElementos', () => {
  it('devolve todos os nos, inclusive a raiz, em profundidade', () => {
    expect(caminharElementos(arvore).map((e) => e.id)).toEqual([
      'raiz',
      't1',
      'c1',
      'i1',
      'p1',
    ])
  })

  it('devolve so a raiz quando nao ha filhos', () => {
    const vazia: LpContainer = {
      id: 'r',
      tipo: 'container',
      direcao: { desktop: 'coluna' },
      filhos: [],
    }
    expect(caminharElementos(vazia).map((e) => e.id)).toEqual(['r'])
  })
})

describe('midiasDoElemento', () => {
  it('acha a midia do widget de imagem', () => {
    expect(midiasDoElemento({ id: 'i', tipo: 'imagem', midia: midia('x.jpg') })).toHaveLength(1)
  })

  it('acha as midias de dentro dos widgets compostos', () => {
    const urls = midiasDoElemento({
      id: 'a',
      tipo: 'abas',
      abas: [
        { id: '1', titulo: 'A', texto: '', imagem: midia('aba.jpg') },
        { id: '2', titulo: 'B', texto: '', imagem: null },
      ],
    }).map((m) => m.url)
    expect(urls).toEqual(['aba.jpg'])
  })

  it('devolve vazio para widget sem midia', () => {
    expect(midiasDoElemento({ id: 't', tipo: 'titulo', nivel: 'h2', texto: 'x' })).toEqual([])
  })
})
