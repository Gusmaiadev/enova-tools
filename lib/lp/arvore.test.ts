import { describe, expect, it } from 'vitest'
import {
  acharNo,
  atualizarNo,
  caminharElementos,
  definirQuantidadeFilhos,
  duplicarNo,
  midiasDoElemento,
  paiDe,
  quantoLeva,
  regerarIds,
  removerNo,
} from './arvore'
import type { LpContainer, LpElemento, LpMidia } from './tipos'

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

describe('quantoLeva', () => {
  it('no container, conta a subárvore inteira e não só os filhos diretos', () => {
    // A árvore tem 4 nós além da raiz: t1, c1 e os dois filhos de c1.
    expect(quantoLeva(arvore)).toBe(4)
  })

  it('conta a lista própria de cada widget composto', () => {
    // Um composto esquecido aqui é uma lista inteira apagada sem o editor
    // perguntar nada — o mesmo risco que midiasDoElemento tem.
    const compostos: LpElemento[] = [
      { id: 'f', tipo: 'faq', perguntas: [{ id: 'p1', pergunta: 'a', resposta: 'b' }] },
      { id: 'a', tipo: 'abas', abas: [{ id: 'a1', titulo: 'a', texto: 'b' }] },
      { id: 'c', tipo: 'carrossel', slides: [{ id: 's1' }, { id: 's2' }] },
      {
        id: 'd',
        tipo: 'depoimentos',
        depoimentos: [{ id: 'd1', texto: 'x', nome: 'y' }],
      },
      {
        id: 'k',
        tipo: 'comparacao',
        rotulos: ['r'],
        colunas: [{ id: 'k1', titulo: 'A', celulas: ['x'] }],
      },
      { id: 'l', tipo: 'lista', itens: [{ id: 'i1', texto: 'um' }, { id: 'i2', texto: 'dois' }] },
    ]
    expect(compostos.map(quantoLeva)).toEqual([1, 1, 2, 1, 1, 2])
  })

  it('widget simples não leva nada junto', () => {
    expect(quantoLeva({ id: 't', tipo: 'titulo', nivel: 'h2', texto: 'A' })).toBe(0)
    expect(quantoLeva({ id: 'i', tipo: 'imagem', midia: midia('a.jpg') })).toBe(0)
    // Container vazio também: sem filhos, remover não surpreende ninguém.
    expect(quantoLeva({ id: 'c', tipo: 'container', direcao: {}, filhos: [] })).toBe(0)
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

  it('paiDe acha quem segura o nó, em qualquer profundidade', () => {
    expect(paiDe(base(), 't1')?.id).toBe('r')
    expect(paiDe(base(), 't2')?.id).toBe('c1')
  })

  it('paiDe devolve null para a raiz e para quem não está na árvore', () => {
    // É por este null que o editor sabe que não há para onde subir a seleção
    // depois de remover — e que a raiz não se remove por ali.
    expect(paiDe(base(), 'r')).toBeNull()
    expect(paiDe(base(), 'nada')).toBeNull()
  })

  it('definirQuantidadeFilhos cresce copiando o último, com ids novos', () => {
    const c = base()
    definirQuantidadeFilhos(c, 4)
    expect(c.filhos).toHaveLength(4)
    // As duas cópias saem do MESMO modelo (o 'c1' de antes), e não uma da
    // outra: assim os blocos novos nascem iguais entre si.
    for (const copia of c.filhos.slice(2)) {
      expect(copia.tipo).toBe('container')
      expect(copia.id).not.toBe('c1')
    }
    expect(new Set(caminharElementos(c).map((e) => e.id)).size).toBe(
      caminharElementos(c).length,
    )
  })

  it('definirQuantidadeFilhos encolhe cortando do fim', () => {
    const c = base()
    definirQuantidadeFilhos(c, 1)
    expect(c.filhos.map((f) => f.id)).toEqual(['t1'])
  })

  it('definirQuantidadeFilhos não inventa filho em container vazio', () => {
    // Sem um bloco de modelo não há o que multiplicar — inventar um widget aqui
    // seria adivinhar o que o usuário quer.
    const c: LpContainer = { id: 'v', tipo: 'container', direcao: {}, filhos: [] }
    definirQuantidadeFilhos(c, 3)
    expect(c.filhos).toHaveLength(0)
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
