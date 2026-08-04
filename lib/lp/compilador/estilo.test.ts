import { describe, expect, it } from 'vitest'
import { cssDaArvore } from './estilo'
import type { LpContainer } from '../tipos'

const raiz = (filhos: LpContainer['filhos'], extra: Partial<LpContainer> = {}): LpContainer => ({
  id: 'r',
  tipo: 'container',
  direcao: { desktop: 'coluna' },
  filhos,
  ...extra,
})

describe('cssDaArvore — container', () => {
  it('coluna vira flex column', () => {
    const { desktop } = cssDaArvore(raiz([]))
    expect(desktop).toContain('.lp-e-r{display:flex;flex-direction:column}')
  })

  it('linha com colunas vira grid', () => {
    const { desktop } = cssDaArvore(
      raiz([], { direcao: { desktop: 'linha' }, colunas: { desktop: 3 } }),
    )
    expect(desktop).toContain('display:grid')
    expect(desktop).toContain('grid-template-columns:repeat(3,1fr)')
  })

  it('linha sem colunas vira flex row com wrap', () => {
    const { desktop } = cssDaArvore(raiz([], { direcao: { desktop: 'linha' } }))
    expect(desktop).toContain('flex-direction:row')
    expect(desktop).toContain('flex-wrap:wrap')
  })

  it('gap, alinhar e justificar viram as propriedades de flex/grid', () => {
    const { desktop } = cssDaArvore(
      raiz([], {
        gap: { desktop: 24 },
        alinhar: { desktop: 'centro' },
        justificar: { desktop: 'entre' },
      }),
    )
    expect(desktop).toContain('gap:24px')
    expect(desktop).toContain('align-items:center')
    expect(desktop).toContain('justify-content:space-between')
  })
})

describe('cssDaArvore — breakpoints', () => {
  it('valor so de celular nao aparece na base', () => {
    const { desktop, tablet, celular } = cssDaArvore(
      raiz([], { direcao: { desktop: 'linha' }, colunas: { desktop: 3, celular: 1 } }),
    )
    expect(desktop).toContain('repeat(3,1fr)')
    expect(tablet).toBe('')
    expect(celular).toContain('repeat(1,1fr)')
  })

  it('os tres dispositivos saem cada um no seu bloco', () => {
    const { desktop, tablet, celular } = cssDaArvore(
      raiz([], { direcao: { desktop: 'linha' }, colunas: { desktop: 4, tablet: 2, celular: 1 } }),
    )
    expect(desktop).toContain('repeat(4,1fr)')
    expect(tablet).toContain('repeat(2,1fr)')
    expect(celular).toContain('repeat(1,1fr)')
  })

  it('oculto vira display:none no dispositivo marcado', () => {
    const { desktop, celular } = cssDaArvore(
      raiz([{ id: 'w', tipo: 'divisor', oculto: { celular: true } }]),
    )
    expect(desktop).not.toContain('.lp-e-w{display:none}')
    expect(celular).toContain('.lp-e-w{display:none}')
  })
})

describe('cssDaArvore — estilo', () => {
  it('traduz cor, fonte, tamanho e alinhamento', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'titulo',
          nivel: 'h2',
          texto: 'T',
          estilo: {
            cor: { desktop: '#ff0000' },
            tamanho: { desktop: '32px' },
            peso: { desktop: 700 },
            alinhamento: { desktop: 'center' },
          },
        },
      ]),
    )
    expect(desktop).toContain('color:#ff0000')
    expect(desktop).toContain('font-size:32px')
    expect(desktop).toContain('font-weight:700')
    expect(desktop).toContain('text-align:center')
  })

  it('margem e padding viram as quatro medidas', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'divisor',
          estilo: { padding: { desktop: { topo: 1, direita: 2, base: 3, esquerda: 4 } } },
        },
      ]),
    )
    expect(desktop).toContain('padding:1px 2px 3px 4px')
  })

  it('recusa injecao em cor e em valor livre', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'divisor',
          estilo: {
            cor: { desktop: 'red;}body{display:none' },
            tamanho: { desktop: '10px;}body{display:none' },
          },
        },
      ]),
    )
    expect(desktop).not.toContain('body{display:none')
  })

  it('elemento sem estilo nao gera regra nenhuma', () => {
    const { desktop } = cssDaArvore(raiz([{ id: 'w', tipo: 'divisor' }]))
    expect(desktop).not.toContain('.lp-e-w{')
  })

  it('espacador vira altura no dispositivo certo', () => {
    const { desktop, celular } = cssDaArvore(
      raiz([{ id: 'w', tipo: 'espacador', altura: { desktop: 40, celular: 16 } }]),
    )
    expect(desktop).toContain('.lp-e-w{height:40px}')
    expect(celular).toContain('.lp-e-w{height:16px}')
  })

  it('desce a arvore inteira', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'c',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 'neto', tipo: 'divisor', estilo: { cor: { desktop: '#00ff00' } } }],
        },
      ]),
    )
    expect(desktop).toContain('.lp-e-neto{color:#00ff00}')
  })
})

describe('espaçamento padrão da árvore', () => {
  it('o CSS base dá gap ao container e margem vertical aos elementos', async () => {
    const { compilarCss } = await import('./css')
    const { documentoBase } = await import('../documento')
    const { briefingVazio } = await import('../tipos')
    const css = compilarCss(documentoBase(briefingVazio('Teste')), new Map())
    expect(css).toContain('.lp-c{min-width:0;gap:15px}')
    expect(css).toContain('.lp-c > *{margin-block:10px}')
  })

  it('gap do container vence o padrão, porque sai depois', async () => {
    const { compilarCss } = await import('./css')
    const { documentoBase } = await import('../documento')
    const { briefingVazio } = await import('../tipos')
    const base = documentoBase(briefingVazio('Teste'))
    const doc = {
      ...base,
      secoes: [
        {
          id: 's1',
          tipo: 'cta' as const,
          nome: 'X',
          ancora: null,
          itens: [],
          largura: 'boxed' as const,
          raiz: {
            id: 'r',
            tipo: 'container' as const,
            direcao: { desktop: 'coluna' as const },
            gap: { desktop: 40 },
            filhos: [],
          },
        },
      ],
    }
    const css = compilarCss(doc, new Map([['s1', 'x']]))
    expect(css.indexOf('.lp-c{min-width:0;gap:15px}')).toBeLessThan(css.indexOf('gap:40px'))
  })
})
