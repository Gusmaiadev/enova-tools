import { describe, expect, it } from 'vitest'
import {
  acharNo,
  atualizarNo,
  caminharElementos,
  duplicarNo,
  midiasDoElemento,
  regerarIds,
  removerNo,
} from './arvore'
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

describe('operações de árvore', () => {
  const base = (): LpContainer => ({
    id: 'r',
    tipo: 'container',
    direcao: { desktop: 'coluna' },
    filhos: [
      { id: 't1', tipo: 'titulo', nivel: 'h2', texto: 'A' },
      {
        id: 'c1',
        tipo: 'container',
        direcao: { desktop: 'linha' },
        filhos: [{ id: 't2', tipo: 'titulo', nivel: 'h3', texto: 'B' }],
      },
    ],
  })

  it('acha nó em qualquer profundidade e devolve null quando não existe', () => {
    expect(acharNo(base(), 't2')?.id).toBe('t2')
    expect(acharNo(base(), 'r')?.id).toBe('r')
    expect(acharNo(base(), 'nada')).toBeNull()
  })

  it('atualizarNo muda só o nó pedido e não toca na entrada', () => {
    const antes = base()
    const depois = atualizarNo(antes, 't2', (el) => {
      if (el.tipo === 'titulo') el.texto = 'MUDOU'
    })
    const alvo = acharNo(depois, 't2')
    expect(alvo?.tipo === 'titulo' && alvo.texto).toBe('MUDOU')
    const original = acharNo(antes, 't2')
    expect(original?.tipo === 'titulo' && original.texto).toBe('B')
  })

  it('removerNo tira o nó e mantém os irmãos', () => {
    const depois = removerNo(base(), 't1')
    expect(acharNo(depois, 't1')).toBeNull()
    expect(acharNo(depois, 'c1')).not.toBeNull()
  })

  it('removerNo alcança nó aninhado', () => {
    const depois = removerNo(base(), 't2')
    expect(acharNo(depois, 't2')).toBeNull()
    expect(acharNo(depois, 'c1')).not.toBeNull()
  })

  it('removerNo na raiz não faz nada', () => {
    expect(acharNo(removerNo(base(), 'r'), 'r')).not.toBeNull()
  })

  it('duplicarNo insere a cópia logo depois, com ids novos', () => {
    const depois = duplicarNo(base(), 'c1')
    expect(depois.filhos).toHaveLength(3)
    const copia = depois.filhos[2]
    expect(copia.id).not.toBe('c1')
    if (copia.tipo !== 'container') throw new Error('esperava container')
    expect(copia.filhos[0].id).not.toBe('t2')
  })

  it('regerarIds troca todos os ids da subárvore sem tocar na entrada', () => {
    const antes = base()
    const depois = regerarIds(antes)
    expect(depois.id).not.toBe('r')
    expect(depois.filhos[0].id).not.toBe('t1')
    expect(antes.id).toBe('r')
  })
})
