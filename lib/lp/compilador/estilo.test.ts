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

  it('o alinhamento do container alcança o botão e o ícone que ele segura', () => {
    // O CSS base prende os dois em `align-self:flex-start` para não esticarem —
    // e, sendo align-self, isso vencia o align-items do pai: era o que deixava o
    // botão à esquerda numa seção centralizada.
    const { desktop } = cssDaArvore(raiz([], { alinhar: { desktop: 'centro' } }))
    expect(desktop).toContain('.lp-e-r > .lp-btn,.lp-e-r > .lp-icone{align-self:center}')
  })

  it('container sem alinhamento não emite regra para o botão', () => {
    // Sem escolha no painel, quem manda continua sendo o CSS base.
    expect(cssDaArvore(raiz([]))?.desktop).not.toContain('align-self')
  })

  it('botões na base saem com margin-top:auto no botão de cada bloco', () => {
    const css = cssDaArvore(raiz([], { botoesNaBase: true }))
    expect(css.desktop).toContain('.lp-e-r > * > .lp-btn{margin-top:auto}')
    // Não é valor por dispositivo: repetir em cada breakpoint só encheria a
    // folha com a mesma regra.
    expect(css.celular).not.toContain('margin-top:auto')
  })

  it('sem a marcação, nenhum botão é empurrado para a base', () => {
    expect(cssDaArvore(raiz([])).desktop).not.toContain('margin-top:auto')
  })

  it('widget composto: cada parte tem regra própria, com a classe do nó na frente', () => {
    // A regressão que isto tranca: a folha base escreve cor, fonte, peso e
    // tamanho direto nos textos de dentro, e regra no filho vence herança — o
    // estilo do nó de fora não chegava em nenhum deles.
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'n1',
          tipo: 'numero',
          valor: '250',
          rotulo: 'Clientes',
          partes: { valor: { cor: { desktop: '#ff0000' } }, rotulo: { cor: { desktop: '#00ff00' } } },
        },
      ]),
    )
    // Uma classe a mais que a folha base: ganha por especificidade, sem
    // depender da ordem em que as duas saem.
    expect(desktop).toContain('.lp-e-n1 .lp-stat-valor{color:#ff0000}')
    expect(desktop).toContain('.lp-e-n1 .lp-stat-rotulo{color:#00ff00}')
  })

  it('margem lateral escrita sai como o atalho de quatro lados', () => {
    // Com valor nas laterais o usuário está mesmo mexendo no horizontal: aí o
    // atalho vale, inclusive por cima de uma centralização de fábrica.
    const { desktop } = cssDaArvore(
      raiz([], { estilo: { margem: { desktop: { topo: 8, direita: 24, base: 8, esquerda: 24 } } } }),
    )
    expect(desktop).toContain('margin:8px 24px 8px 24px')
  })

  it('largura escolhida vence o limite que o widget traz de fábrica', () => {
    // FAQ (760px) e depoimentos (820px) têm max-width próprio: sem soltá-lo, o
    // campo de largura não faria nada acima do limite.
    const { desktop } = cssDaArvore(raiz([], { estilo: { largura: { desktop: '960px' } } }))
    expect(desktop).toContain('width:960px;max-width:none')
  })

  it('imagem de parte: proporção no quadro e encaixe na imagem de dentro', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'c1',
          tipo: 'carrossel',
          slides: [],
          partes: { imagem: { proporcao: { desktop: '1/1' }, ajuste: { desktop: 'conter' } } },
        },
      ]),
    )
    expect(desktop).toContain('.lp-e-c1 .lp-midia{aspect-ratio:1/1}')
    // object-fit mora no <img>/<video>, não no quadro que os envolve.
    expect(desktop).toContain('.lp-e-c1 .lp-midia img,.lp-e-c1 .lp-midia video{object-fit:contain}')
  })

  it('foto de depoimento: o seletor já é a imagem, então o encaixe entra nela', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'd1',
          tipo: 'depoimentos',
          depoimentos: [],
          partes: { foto: { largura: { desktop: '96px' }, ajuste: { desktop: 'conter' } } },
        },
      ]),
    )
    expect(desktop).toContain('.lp-e-d1 .lp-depo-autor img{width:96px;max-width:none}')
    expect(desktop).toContain('.lp-e-d1 .lp-depo-autor img{object-fit:contain}')
  })

  it('parte com vários seletores prefixa cada um com a classe do nó', () => {
    // `.lp-e-x input,textarea` deixaria o segundo global, pintando todo campo
    // da página.
    const { desktop } = cssDaArvore(
      raiz([{ id: 'f1', tipo: 'formulario', partes: { campos: { cor: { desktop: '#ff0000' } } } }]),
    )
    expect(desktop).toContain('.lp-e-f1 input,.lp-e-f1 textarea{color:#ff0000}')
  })

  it('sem estilo de parte não sai regra descendente', () => {
    const { desktop } = cssDaArvore(
      raiz([{ id: 'n1', tipo: 'numero', valor: '250', rotulo: 'Clientes' }]),
    )
    expect(desktop).not.toContain('lp-stat-valor')
    expect(desktop).not.toContain('lp-stat-rotulo')
  })

  it('hover vira regra própria e traz a transição para o estado normal', () => {
    const css = cssDaArvore(
      raiz([], { estilo: { hover: { cor: '#ff0000', fundo: '#000000', sombra: 'media' } } }),
    )
    expect(css.desktop).toContain('.lp-e-r:hover{')
    expect(css.desktop).toContain('color:#ff0000')
    expect(css.desktop).toContain('box-shadow:')
    // Sem transição no estado normal o hover trocaria a cor de uma vez só.
    expect(css.desktop).toMatch(/\.lp-e-r\{[^}]*transition:/)
    // Hover não existe em tela de toque: a regra sai uma vez, no desktop.
    expect(css.celular).not.toContain(':hover')
  })

  it('subir e crescer saem no mesmo transform', () => {
    // Em duas declarações separadas a segunda apagaria a primeira.
    const { desktop } = cssDaArvore(raiz([], { estilo: { hover: { subir: 6, escala: 105 } } }))
    expect(desktop).toContain('transform:translateY(-6px) scale(1.05)')
  })

  it('hover desligado não sai na página, e os valores continuam no documento', () => {
    const estilo = { hover: { ativo: false as const, cor: '#ff0000', sombra: 'forte' as const } }
    const { desktop } = cssDaArvore(raiz([], { estilo }))
    expect(desktop).not.toContain(':hover')
    // Nem a transição: sem efeito para animar, ela só pesaria na folha.
    expect(desktop).not.toContain('transition:')
    // Desligar é o compilador ignorar, não o painel apagar — religar tem de
    // trazer a cor e a sombra de volta.
    expect(estilo.hover.cor).toBe('#ff0000')
  })

  it('hover sem `ativo` continua ligado — é o que documento antigo tem', () => {
    const { desktop } = cssDaArvore(raiz([], { estilo: { hover: { cor: '#ff0000' } } }))
    expect(desktop).toContain('.lp-e-r:hover{color:#ff0000}')
  })

  it('sem hover não sai regra nem transição', () => {
    const { desktop } = cssDaArvore(raiz([], { estilo: { cor: { desktop: '#111111' } } }))
    expect(desktop).not.toContain(':hover')
    expect(desktop).not.toContain('transition:')
  })

  it('a sombra do catálogo vira box-shadow de verdade, no normal e no hover', () => {
    const { desktop } = cssDaArvore(
      raiz([], { estilo: { sombra: { desktop: 'suave' }, hover: { sombra: 'forte' } } }),
    )
    // O nome do degrau é o que fica no documento; quem traduz é o compilador.
    expect(desktop).not.toContain('box-shadow:suave')
    expect(desktop).toMatch(/\.lp-e-r\{[^}]*box-shadow:0 4px 12px/)
    expect(desktop).toMatch(/\.lp-e-r:hover\{[^}]*box-shadow:0 26px 50px/)
  })

  it('alinhamento do container sai como text-align, que herda para os filhos', () => {
    // No container `alinhamento` não posiciona um bloco (é o que margin-inline
    // faz no botão e na mídia): ele alinha o TEXTO, e text-align herda — é o que
    // deixa a cabeça inteira da seção no meio com uma propriedade só.
    const css = cssDaArvore(raiz([], { estilo: { alinhamento: { desktop: 'center' } } }))
    expect(css.desktop).toContain('text-align:center')
    expect(css.desktop).not.toContain('margin-inline')
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
    // Sai como `margin-block`, a mesma propriedade que o padrão da árvore usa
    // — e sem o atalho de quatro lados, que apagaria o `margin-inline:auto` de
    // quem se centraliza sozinho (FAQ e depoimentos).
    expect(desktop).toContain('.lp-e-w{margin-block:0px 0px}')
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

describe('cssDaArvore — estilo, transformação e decoração', () => {
  const titulo = (estilo: Record<string, unknown>) =>
    cssDaArvore(
      raiz([
        {
          id: 't1',
          tipo: 'titulo',
          texto: 'Oi',
          nivel: 'h2',
          estilo: estilo as never,
        },
      ]),
    )

  it('emite as três propriedades no dispositivo em que foram definidas', () => {
    const css = titulo({
      estiloFonte: { desktop: 'italic' },
      transformacao: { desktop: 'uppercase' },
      decoracao: { desktop: 'line-through' },
    })
    expect(css.desktop).toContain('font-style:italic')
    expect(css.desktop).toContain('text-transform:uppercase')
    expect(css.desktop).toContain('text-decoration-line:line-through')
    // Sem valor próprio no celular, a herança sai da cascata: nada emitido.
    expect(css.celular).toBe('')
  })

  it('cada dispositivo pode ter o seu', () => {
    const css = titulo({
      transformacao: { desktop: 'uppercase', celular: 'none' },
    })
    expect(css.desktop).toContain('text-transform:uppercase')
    expect(css.celular).toContain('text-transform:none')
  })

  it('valor fora do catálogo não vira CSS', () => {
    // Defesa em profundidade: a coerção já filtra, mas o compilador não confia.
    const css = titulo({
      estiloFonte: { desktop: 'italic;}body{display:none' },
      decoracao: { desktop: 'underline overline' },
    })
    expect(css.desktop).not.toContain('display:none')
    expect(css.desktop).not.toContain('overline')
  })
})
