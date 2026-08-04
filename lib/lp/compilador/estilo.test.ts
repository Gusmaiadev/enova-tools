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
    // A margem mira as classes de TEXTO, não todo filho do container.
    expect(css).toContain(
      '.lp-el-titulo,.lp-el-subtitulo,.lp-el-texto{margin-block:10px 10px}',
    )
    expect(css).not.toContain('.lp-c > *{margin-block')
    // E não sobra nas bordas do container, senão a seção cresce sozinha.
    expect(css).toContain('.lp-c > :first-child{margin-top:0}')
    expect(css).toContain('.lp-c > :last-child{margin-bottom:0}')
  })

  it('só texto tem margem padrão; mídia e container têm zero', async () => {
    const { margemPadraoDe, MARGEM_PADRAO, CAIXA_ZERO } = await import('../padroes')
    expect(margemPadraoDe('titulo')).toEqual(MARGEM_PADRAO)
    expect(margemPadraoDe('texto')).toEqual(MARGEM_PADRAO)
    expect(margemPadraoDe('imagem')).toEqual(CAIXA_ZERO)
    expect(margemPadraoDe('video')).toEqual(CAIXA_ZERO)
    expect(margemPadraoDe('container')).toEqual(CAIXA_ZERO)
    expect(margemPadraoDe('botao')).toEqual(CAIXA_ZERO)
  })

  it('o padrão do CSS e o mostrado no painel vêm da mesma constante', async () => {
    const { GAP_PADRAO, MARGEM_PADRAO } = await import('../padroes')
    const { compilarCss } = await import('./css')
    const { documentoBase } = await import('../documento')
    const { briefingVazio } = await import('../tipos')
    const css = compilarCss(documentoBase(briefingVazio('Teste')), new Map())
    // Se alguém mudar a constante e esquecer o CSS (ou o contrário), quebra.
    expect(css).toContain(`gap:${GAP_PADRAO}px`)
    expect(css).toContain(`margin-block:${MARGEM_PADRAO.topo}px ${MARGEM_PADRAO.base}px`)
  })

  it('margem zerada no nó grava zero — não volta ao padrão', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'titulo',
          nivel: 'h2',
          texto: 'T',
          estilo: { margem: { desktop: { topo: 0, direita: 0, base: 0, esquerda: 0 } } },
        },
      ]),
    )
    expect(desktop).toContain('.lp-e-w{margin:0px 0px 0px 0px}')
  })

  it('gap zero no container grava zero', () => {
    const { desktop } = cssDaArvore(raiz([], { gap: { desktop: 0 } }))
    expect(desktop).toContain('gap:0px')
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

describe('estilo de mídia', () => {
  const midia = { tipo: 'imagem' as const, url: 'x.jpg', alt: '', busca: '', orientacao: 'paisagem' as const }

  it('proporção e altura viram aspect-ratio e height no quadro', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'm',
          tipo: 'imagem',
          midia,
          estilo: { proporcao: { desktop: '16/9' }, altura: { desktop: '320px' } },
        },
      ]),
    )
    expect(desktop).toContain('aspect-ratio:16/9')
    expect(desktop).toContain('height:320px')
  })

  it('encaixe vira object-fit no <img>/<video>, não no quadro', () => {
    const { desktop } = cssDaArvore(
      raiz([{ id: 'm', tipo: 'imagem', midia, estilo: { ajuste: { desktop: 'conter' } } }]),
    )
    expect(desktop).toContain('.lp-e-m img,.lp-e-m video{object-fit:contain}')
  })

  it('alinhamento posiciona o bloco; em texto continua sendo text-align', () => {
    const alinhado = (el: Parameters<typeof raiz>[0][number]) => cssDaArvore(raiz([el])).desktop
    const est = { alinhamento: { desktop: 'right' as const } }

    // Bloco: margin-inline move o elemento. `text-align` não moveria — num
    // botão ele só centraliza o rótulo dentro do próprio botão.
    expect(alinhado({ id: 'm', tipo: 'imagem', midia, estilo: est })).toContain(
      'margin-inline:auto 0',
    )
    expect(alinhado({ id: 'b', tipo: 'botao', botao: { texto: 'B', url: '#' }, estilo: est })).toContain(
      'margin-inline:auto 0',
    )
    expect(alinhado({ id: 'i', tipo: 'icone', nome: 'check', estilo: est })).toContain(
      'margin-inline:auto 0',
    )

    // Texto continua com text-align: ali o alinhamento é do conteúdo mesmo.
    const doTexto = alinhado({ id: 't', tipo: 'titulo', nivel: 'h2', texto: 'T', estilo: est })
    expect(doTexto).toContain('text-align:right')
    expect(doTexto).not.toContain('margin-inline')
  })

  it('centralizar o botão vale em qualquer container — coluna, linha ou grade', () => {
    const { desktop } = cssDaArvore(
      raiz([{ id: 'b', tipo: 'botao', botao: { texto: 'B', url: '#' }, estilo: { alinhamento: { desktop: 'center' } } }]),
    )
    // `margin-inline:auto` funciona nos três; align-self só na coluna e
    // justify-self só na grade — daí a escolha.
    expect(desktop).toContain('margin-inline:auto')
  })

  it('alinhamento sai depois da margem, senão a margem o apagaria', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'b',
          tipo: 'botao',
          botao: { texto: 'B', url: '#' },
          estilo: {
            margem: { desktop: { topo: 8, direita: 0, base: 8, esquerda: 0 } },
            alinhamento: { desktop: 'center' },
          },
        },
      ]),
    )
    expect(desktop.indexOf('margin:8px')).toBeLessThan(desktop.indexOf('margin-inline'))
  })

  it('encaixe fora do conjunto não vira CSS', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'm',
          tipo: 'imagem',
          midia,
          estilo: { ajuste: { desktop: 'sei-la' as unknown as 'cobrir' } },
        },
      ]),
    )
    expect(desktop).not.toContain('object-fit')
  })
})

describe('largura do projeto', () => {
  const docCom = async (largura?: Record<string, number>) => {
    const { documentoBase } = await import('../documento')
    const { briefingVazio } = await import('../tipos')
    const base = documentoBase(briefingVazio('Teste'))
    return { ...base, tema: { ...base.tema, ...(largura ? { largura } : {}) } }
  }

  it('sem definir, mantém a largura de sempre', async () => {
    const { compilarCss } = await import('./css')
    const { LARGURA_PADRAO } = await import('../padroes')
    const css = compilarCss(await docCom(), new Map())
    expect(css).toContain(`--largura: ${LARGURA_PADRAO}px`)
    // Nada de media query redefinindo a variável enquanto o usuário não pedir.
    expect(css).not.toContain('{:root{--largura')
  })

  it('cada dispositivo redefine a variável que header, rodapé e seções leem', async () => {
    const { compilarCss } = await import('./css')
    const css = compilarCss(await docCom({ desktop: 1440, tablet: 820, celular: 380 }), new Map())
    expect(css).toContain('--largura: 1440px')
    expect(css).toContain('@media (max-width:900px){:root{--largura:820px}}')
    expect(css).toContain('@media (max-width:640px){:root{--largura:380px}}')
  })

  it('dispositivo não definido não emite media query', async () => {
    const { compilarCss } = await import('./css')
    const css = compilarCss(await docCom({ desktop: 1440 }), new Map())
    expect(css).toContain('--largura: 1440px')
    expect(css).not.toContain('--largura:820px')
    expect(css).not.toContain('@media (max-width:640px){:root')
  })

  it('valor absurdo é limitado antes de virar CSS', async () => {
    const { compilarCss } = await import('./css')
    const css = compilarCss(await docCom({ desktop: 999999, celular: -50 }), new Map())
    expect(css).toContain('--largura: 2560px')
    expect(css).toContain('--largura:280px')
  })
})

describe('largura das colunas do container', () => {
  it('sem proporção, as colunas saem iguais', () => {
    const { desktop } = cssDaArvore(
      raiz([], { direcao: { desktop: 'linha' }, colunas: { desktop: 2 } }),
    )
    expect(desktop).toContain('grid-template-columns:repeat(2,1fr)')
  })

  it('proporção do catálogo vira as trilhas do grid', () => {
    const { desktop } = cssDaArvore(
      raiz([], {
        direcao: { desktop: 'linha' },
        colunas: { desktop: 2 },
        proporcaoColunas: { desktop: '2fr 1fr' },
      }),
    )
    expect(desktop).toContain('grid-template-columns:2fr 1fr')
    expect(desktop).not.toContain('repeat(2,1fr)')
  })

  it('proporção fora do catálogo é ignorada e cai em colunas iguais', () => {
    const { desktop } = cssDaArvore(
      raiz([], {
        direcao: { desktop: 'linha' },
        colunas: { desktop: 2 },
        proporcaoColunas: { desktop: '1fr;}body{display:none' },
      }),
    )
    expect(desktop).toContain('grid-template-columns:repeat(2,1fr)')
    expect(desktop).not.toContain('display:none')
  })

  it('a proporção pode mudar por dispositivo', () => {
    const { desktop, celular } = cssDaArvore(
      raiz([], {
        direcao: { desktop: 'linha' },
        colunas: { desktop: 2, celular: 1 },
        proporcaoColunas: { desktop: '3fr 1fr' },
      }),
    )
    expect(desktop).toContain('3fr 1fr')
    expect(celular).toContain('repeat(1,1fr)')
  })
})

describe('os seis breakpoints', () => {
  it('as bandas não se cruzam e vão do mais largo ao mais estreito', async () => {
    const { DISPOSITIVOS, BREAKPOINT } = await import('../padroes')
    expect(DISPOSITIVOS).toHaveLength(6)
    expect(BREAKPOINT.desktop).toBeNull()
    // Se duas bandas se cruzarem, uma nunca é alcançada.
    const larguras = DISPOSITIVOS.slice(1).map((d) => BREAKPOINT[d] as number)
    for (let i = 1; i < larguras.length; i++) {
      expect(larguras[i], `${DISPOSITIVOS[i + 1]} não é mais estreito que o anterior`).toBeLessThan(
        larguras[i - 1],
      )
    }
  })

  it('tablet e celular seguem em 900 e 640 — documento salvo não muda', async () => {
    const { BREAKPOINT } = await import('../padroes')
    expect(BREAKPOINT.tablet).toBe(900)
    expect(BREAKPOINT.celular).toBe(640)
  })

  it('cada dispositivo emite o seu bloco, na ordem da cascata', () => {
    const porDisp = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'titulo',
          nivel: 'h2',
          texto: 'T',
          estilo: {
            tamanho: {
              desktop: '48px',
              notebook: '40px',
              tabletDeitado: '34px',
              tablet: '30px',
              celularDeitado: '26px',
              celular: '22px',
            },
          },
        },
      ]),
    )
    expect(porDisp.notebook).toContain('font-size:40px')
    expect(porDisp.tabletDeitado).toContain('font-size:34px')
    expect(porDisp.celularDeitado).toContain('font-size:26px')
  })

  it('valor num breakpoint largo vale nos estreitos até alguém sobrepor', async () => {
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
            filhos: [
              {
                id: 'w',
                tipo: 'titulo' as const,
                nivel: 'h2' as const,
                texto: 'T',
                estilo: { tamanho: { notebook: '40px', celular: '22px' } },
              },
            ],
          },
        },
      ],
    }
    const css = compilarCss(doc, new Map([['s1', 'x']]))
    // O de 1440 vem antes do de 640: numa tela de 500px os dois valem e o
    // último ganha, que é como a herança acontece sem código nenhum.
    //
    // `lastIndexOf` porque 640px também aparece antes, no bloco de aparências
    // (.lp-ap-caixa-cta) — o que interessa aqui é o bloco gerado, no fim.
    expect(css.lastIndexOf('max-width:1440px')).toBeLessThan(css.lastIndexOf('max-width:640px'))
    // Nenhum valor em tabletDeitado, então aquele bloco não sai.
    expect(css).not.toContain('max-width:1200px')
  })
})
