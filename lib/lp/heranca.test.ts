import { describe, expect, it } from 'vitest'
import { categoriaDoNo, estiloHerdado } from './heranca'
import { TEMA_PADRAO } from './documento'
import type { LpElemento, LpTema } from './tipos'

const tema: LpTema = {
  ...TEMA_PADRAO,
  tipografia: {
    ...TEMA_PADRAO.tipografia,
    titulos: {
      fonte: 'Sora',
      peso: 800,
      tamanho: '48px',
      alturaLinha: '1.1',
      espacamentoLetras: '-0.02em',
    },
    subtitulos: { ...TEMA_PADRAO.tipografia.subtitulos, fonte: 'Lora', tamanho: '22px' },
    textos: { ...TEMA_PADRAO.tipografia.textos, fonte: 'Inter', tamanho: '17px' },
  },
  cores: {
    ...TEMA_PADRAO.cores,
    titulos: '#101828',
    subtitulos: '#334155',
    textos: '#475569',
    botoes: '#ffffff',
    fundoBotoes: '#2563eb',
  },
}

describe('categoriaDoNo', () => {
  it('mapeia cada tipo de texto para a categoria do tema', () => {
    expect(categoriaDoNo({ id: 'a', tipo: 'titulo', nivel: 'h2', texto: 'T' })).toBe('titulos')
    expect(categoriaDoNo({ id: 'b', tipo: 'texto', papel: 'subtitulo', texto: 'S' })).toBe(
      'subtitulos',
    )
    expect(categoriaDoNo({ id: 'c', tipo: 'texto', papel: 'corpo', texto: 'C' })).toBe('textos')
    expect(categoriaDoNo({ id: 'd', tipo: 'botao', botao: { texto: 'B', url: '#' } })).toBe(
      'botoes',
    )
    // O número grande usa a família de títulos no CSS.
    expect(categoriaDoNo({ id: 'e', tipo: 'numero', valor: '10', rotulo: 'x' })).toBe('titulos')
  })

  it('devolve null para o que não herda tipografia', () => {
    expect(categoriaDoNo({ id: 'f', tipo: 'divisor' })).toBeNull()
    expect(
      categoriaDoNo({ id: 'g', tipo: 'container', direcao: { desktop: 'coluna' }, filhos: [] }),
    ).toBeNull()
  })
})

describe('estiloHerdado', () => {
  const titulo: LpElemento = { id: 't', tipo: 'titulo', nivel: 'h1', texto: 'T' }

  it('traz a tipografia e a cor que o tema aplica ao nó', () => {
    expect(estiloHerdado(titulo, tema)).toMatchObject({
      fonte: 'Sora',
      tamanho: '48px',
      peso: 800,
      alturaLinha: '1.1',
      espacamentoLetras: '-0.02em',
      cor: '#101828',
    })
  })

  it('subtítulo e corpo puxam categorias diferentes', () => {
    const sub = estiloHerdado({ id: 's', tipo: 'texto', papel: 'subtitulo', texto: 'S' }, tema)
    const corpo = estiloHerdado({ id: 'c', tipo: 'texto', papel: 'corpo', texto: 'C' }, tema)
    expect(sub.fonte).toBe('Lora')
    expect(sub.tamanho).toBe('22px')
    expect(corpo.fonte).toBe('Inter')
    expect(corpo.tamanho).toBe('17px')
  })

  it('no botão a cor do tema é a do texto, e o fundo tem chave própria', () => {
    const b = estiloHerdado({ id: 'b', tipo: 'botao', botao: { texto: 'B', url: '#' } }, tema)
    expect(b.cor).toBe('#ffffff')
    expect(b.fundo).toBe('#2563eb')
  })

  it('só o botão tem fundo herdado — os outros não pintam fundo por tema', () => {
    expect(estiloHerdado(titulo, tema).fundo).toBeUndefined()
  })

  it('nó sem tipografia devolve vazio', () => {
    expect(estiloHerdado({ id: 'd', tipo: 'divisor' }, tema)).toEqual({})
  })
})
