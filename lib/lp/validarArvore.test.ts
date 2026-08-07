import { describe, expect, it } from 'vitest'
import { coergirElemento, coergirRaiz } from './validarArvore'
import { coergirDocumento } from './validar'
import type { LpBotao, LpContainer, LpMidia } from './tipos'

/** Stubs: aqui só interessa como a árvore trata o que eles devolvem. */
const midiaDe = (v: unknown): LpMidia | null =>
  v && typeof v === 'object'
    ? { tipo: 'imagem', url: 'x.jpg', alt: '', busca: '', orientacao: 'paisagem' }
    : null
const botaoDe = (v: unknown): LpBotao | null =>
  v && typeof v === 'object' ? { texto: 'B', url: '#' } : null

const coagir = (bruto: unknown) => coergirElemento(bruto, midiaDe, botaoDe)

describe('coergirElemento — o que entra', () => {
  it('aceita container e remonta os campos conhecidos', () => {
    const el = coagir({
      tipo: 'container',
      id: 'abc',
      direcao: { desktop: 'linha' },
      colunas: { desktop: 3 },
      aparencia: 'card',
      filhos: [{ tipo: 'titulo', id: 't1', texto: 'Oi', nivel: 'h1' }],
    })
    expect(el).toMatchObject({
      tipo: 'container',
      id: 'abc',
      direcao: { desktop: 'linha' },
      colunas: { desktop: 3 },
      aparencia: 'card',
    })
    expect((el as LpContainer).filhos).toHaveLength(1)
  })

  it('aceita todos os widgets do catálogo', () => {
    const tipos = [
      { tipo: 'titulo', texto: 'T' },
      { tipo: 'texto', texto: 'T' },
      { tipo: 'imagem', midia: {} },
      { tipo: 'botao', botao: {} },
      { tipo: 'icone', nome: 'check' },
      { tipo: 'numero', valor: '10', rotulo: 'Anos' },
      { tipo: 'lista', itens: [{ texto: 'a' }] },
      { tipo: 'espacador' },
      { tipo: 'divisor' },
      { tipo: 'faq', perguntas: [{ pergunta: 'P', resposta: 'R' }] },
      { tipo: 'abas', abas: [{ titulo: 'A', texto: 'x' }] },
      { tipo: 'carrossel', slides: [{}] },
      { tipo: 'depoimentos', depoimentos: [{ texto: 'x', nome: 'A' }] },
      { tipo: 'comparacao', rotulos: ['a'], colunas: [{ titulo: 'C', celulas: ['x'] }] },
      { tipo: 'formulario' },
    ]
    for (const t of tipos) {
      expect(coagir(t), `widget ${t.tipo} recusado`).not.toBeNull()
    }
  })
})

describe('coergirElemento — o que não entra', () => {
  it('recusa tipo desconhecido', () => {
    expect(coagir({ tipo: 'script' })).toBeNull()
    expect(coagir({ tipo: '' })).toBeNull()
    expect(coagir(null)).toBeNull()
    expect(coagir('texto solto')).toBeNull()
  })

  it('recusa imagem sem mídia válida e botão sem botão válido', () => {
    expect(coagir({ tipo: 'imagem' })).toBeNull()
    expect(coagir({ tipo: 'botao' })).toBeNull()
  })

  it('corta a árvore no teto de profundidade', () => {
    // 40 níveis: bem além do teto de 12.
    let fundo: Record<string, unknown> = { tipo: 'titulo', texto: 'fundo' }
    for (let i = 0; i < 40; i++) fundo = { tipo: 'container', filhos: [fundo] }

    let el = coagir(fundo) as LpContainer | null
    let niveis = 0
    while (el?.tipo === 'container' && el.filhos[0]) {
      niveis++
      el = el.filhos[0] as LpContainer
    }
    expect(niveis).toBeLessThanOrEqual(13)
  })

  it('corta a lista de filhos no teto', () => {
    const filhos = Array.from({ length: 500 }, () => ({ tipo: 'divisor' }))
    const el = coagir({ tipo: 'container', filhos }) as LpContainer
    expect(el.filhos.length).toBeLessThanOrEqual(60)
  })

  it('descarta chave de dispositivo desconhecida', () => {
    const el = coagir({ tipo: 'container', direcao: { desktop: 'linha', relogio: 'linha' } })
    expect(el).toMatchObject({ direcao: { desktop: 'linha' } })
    expect(Object.keys((el as LpContainer).direcao)).toEqual(['desktop'])
  })

  it('recusa valor fora do conjunto e cai no padrão', () => {
    expect(coagir({ tipo: 'titulo', texto: 'T', nivel: 'h9' })).toMatchObject({ nivel: 'h2' })
    expect(coagir({ tipo: 'texto', texto: 'T', papel: 'inventado' })).toMatchObject({
      papel: 'corpo',
    })
    expect(coagir({ tipo: 'container', aparencia: 'hacker' })).not.toHaveProperty('aparencia')
  })

  it('sanitiza cor com injeção de CSS', () => {
    const el = coagir({
      tipo: 'divisor',
      estilo: { cor: { desktop: 'red;}body{display:none' } },
    })
    expect(JSON.stringify(el)).not.toContain('display:none')
  })

  it('limpa id com caractere fora de [A-Za-z0-9_-]', () => {
    const el = coagir({ tipo: 'divisor', id: 'a"><script>' })
    expect(el?.id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('raiz que não é container é recusada', () => {
    expect(coergirRaiz({ tipo: 'titulo', texto: 'T' }, midiaDe, botaoDe)).toBeUndefined()
    expect(coergirRaiz({ tipo: 'container' }, midiaDe, botaoDe)).toBeDefined()
  })
})

describe('coergirDocumento preserva a árvore', () => {
  const bruto = {
    secoes: [
      {
        id: 's1',
        tipo: 'cta',
        nome: 'CTA',
        ancora: 'cta',
        titulo: 'Oi',
        preset: 'cta',
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 'w', tipo: 'titulo', nivel: 'h2', texto: 'Da árvore' }],
        },
      },
    ],
  }

  it('a raiz sobrevive ao salvamento — sem isto cada PUT desfazia a migração', () => {
    const doc = coergirDocumento(bruto)
    expect(doc?.secoes[0].raiz).toBeDefined()
    expect(doc?.secoes[0].raiz?.filhos[0]).toMatchObject({ tipo: 'titulo', texto: 'Da árvore' })
  })

  it('o preset de origem sobrevive', () => {
    expect(coergirDocumento(bruto)?.secoes[0].preset).toBe('cta')
  })

  it('versão é derivada da árvore, não copiada do payload', () => {
    expect(coergirDocumento(bruto)?.versao).toBe(2)
    // Alegar versão 2 sem árvore não engana: o documento continua por migrar.
    const mentiroso = {
      versao: 2,
      secoes: [{ id: 's1', tipo: 'cta', nome: 'CTA', ancora: 'cta', titulo: 'Oi' }],
    }
    expect(coergirDocumento(mentiroso)?.versao).toBeUndefined()
  })
})

describe('proporção das colunas', () => {
  it('aceita valor do catálogo', () => {
    const el = coagir({ tipo: 'container', colunas: { desktop: 2 }, proporcaoColunas: { desktop: '2fr 1fr' } })
    expect(el).toMatchObject({ proporcaoColunas: { desktop: '2fr 1fr' } })
  })

  it('recusa qualquer coisa fora dele — isto vira grid-template-columns', () => {
    for (const veneno of ['1fr;}body{display:none', 'repeat(99,1fr)', '1fr 1fr 1fr 1fr 1fr']) {
      const el = coagir({ tipo: 'container', proporcaoColunas: { desktop: veneno } })
      expect(el).not.toHaveProperty('proporcaoColunas')
    }
  })
})

describe('estilo das partes dos widgets compostos', () => {
  const numero = (extra: Record<string, unknown>) => {
    const el = coagir({ tipo: 'numero', valor: '250', rotulo: 'Clientes', ...extra })
    if (el?.tipo !== 'numero') throw new Error('esperava numero')
    return el
  }

  it('guarda o estilo de cada parte do catálogo', () => {
    expect(
      numero({ partes: { valor: { cor: { desktop: '#ff0000' } }, rotulo: { peso: { desktop: 700 } } } }),
    ).toMatchObject({
      partes: { valor: { cor: { desktop: '#ff0000' } }, rotulo: { peso: { desktop: 700 } } },
    })
  })

  it('parte fora do catálogo não entra — não viraria seletor nenhum', () => {
    expect(numero({ partes: { inventada: { cor: { desktop: '#ff0000' } } } })).not.toHaveProperty(
      'partes',
    )
    // Nem parte de outro widget: cada tipo tem a lista dele.
    expect(numero({ partes: { pergunta: { cor: { desktop: '#ff0000' } } } })).not.toHaveProperty(
      'partes',
    )
  })

  it('campo novo não é porta de entrada: passa pela coerção do estilo do nó', () => {
    const el = numero({
      partes: { rotulo: { cor: { desktop: 'javascript:alert(1)' }, peso: { desktop: 9999 } } },
    })
    // Cor que não é cor vira cor segura, e o peso fora da faixa é preso — o
    // mesmo que acontece em qualquer outro estilo da árvore.
    expect(el.partes?.rotulo?.cor?.desktop).not.toContain('javascript')
    expect(el.partes?.rotulo?.peso?.desktop).toBe(900)
  })

  it('parte sem nada dentro não fica no documento', () => {
    expect(numero({ partes: { valor: {} } })).not.toHaveProperty('partes')
    expect(numero({ partes: 'nem objeto é' })).not.toHaveProperty('partes')
  })

  it('widget sem partes no catálogo ignora o campo', () => {
    expect(coagir({ tipo: 'titulo', texto: 'T', partes: { valor: { cor: { desktop: '#ff0000' } } } }))
      .not.toHaveProperty('partes')
  })

  it('o formato antigo do big number continua abrindo com o que foi ajustado', () => {
    // `estiloValor`/`estiloRotulo` foi a primeira forma, antes do catálogo:
    // documento gravado nesse meio-tempo não pode voltar em branco.
    expect(numero({ estiloValor: { cor: { desktop: '#ff0000' } } })).toMatchObject({
      partes: { valor: { cor: { desktop: '#ff0000' } } },
    })
  })
})

describe('estilo de hover', () => {
  const hoverDe = (hover: unknown) =>
    coagir({ tipo: 'titulo', texto: 'T', estilo: { hover } })?.estilo?.hover

  it('aceita cor, sombra do catálogo e movimento dentro da faixa', () => {
    expect(hoverDe({ cor: '#ff0000', fundo: '#000000', sombra: 'forte', subir: 8, escala: 105 })).toEqual(
      { cor: '#ff0000', fundo: '#000000', sombra: 'forte', subir: 8, escala: 105 },
    )
  })

  it('recusa sombra fora do catálogo — isto vira box-shadow', () => {
    expect(hoverDe({ sombra: '0 0 9px red;}body{display:none' })).toBeUndefined()
  })

  it('prende o movimento na faixa e joga fora o que não muda nada', () => {
    // subir 0 e escala 100 são "não faz nada": guardar seria encher o documento.
    expect(hoverDe({ subir: 0, escala: 100 })).toBeUndefined()
    expect(hoverDe({ subir: 9999 })?.subir).toBe(40)
    expect(hoverDe({ escala: 400 })?.escala).toBe(150)
  })

  it('hover vazio some do estilo', () => {
    expect(hoverDe({})).toBeUndefined()
    expect(hoverDe('não é objeto')).toBeUndefined()
  })

  it('guarda o desligado com os valores dentro', () => {
    // Desligar não é apagar: o PUT tem de devolver `ativo: false` junto com o
    // que foi ajustado, senão religar no editor viria em branco.
    expect(hoverDe({ ativo: false, cor: '#ff0000' })).toEqual({ ativo: false, cor: '#ff0000' })
    // `ativo: true` sozinho segura o bloco enquanto nada foi preenchido.
    expect(hoverDe({ ativo: true })).toEqual({ ativo: true })
    expect(hoverDe({ ativo: 'sim', cor: '#ff0000' })).toEqual({ cor: '#ff0000' })
  })
})

describe('botões na base', () => {
  it('guarda só o `true` — a marcação sobrevive à gravação', () => {
    expect(coagir({ tipo: 'container', botoesNaBase: true })).toMatchObject({
      botoesNaBase: true,
    })
  })

  it('qualquer outra coisa some do documento', () => {
    // Ausente = os botões seguem o texto de cada bloco. Guardar `false` ou uma
    // string encheria o documento de campo que não muda nada.
    for (const valor of [false, 'sim', 1, null]) {
      expect(coagir({ tipo: 'container', botoesNaBase: valor })).not.toHaveProperty('botoesNaBase')
    }
  })
})

describe('estilo, transformação e decoração', () => {
  it('aceita os valores do catálogo', () => {
    const el = coagir({
      tipo: 'titulo',
      texto: 'T',
      estilo: {
        estiloFonte: { desktop: 'oblique' },
        transformacao: { celular: 'capitalize' },
        decoracao: { desktop: 'overline' },
      },
    })
    expect(el?.estilo?.estiloFonte).toEqual({ desktop: 'oblique' })
    expect(el?.estilo?.transformacao).toEqual({ celular: 'capitalize' })
    expect(el?.estilo?.decoracao).toEqual({ desktop: 'overline' })
  })

  it('descarta valor fora do catálogo', () => {
    const el = coagir({
      tipo: 'titulo',
      texto: 'T',
      estilo: {
        estiloFonte: { desktop: 'italic;}body{}' },
        transformacao: { desktop: 'UPPERCASE' },
        decoracao: { desktop: 'blink' },
      },
    })
    expect(el?.estilo?.estiloFonte).toBeUndefined()
    expect(el?.estilo?.transformacao).toBeUndefined()
    expect(el?.estilo?.decoracao).toBeUndefined()
  })
})

describe('animação de entrada', () => {
  it('aceita tipo do catálogo com duração e atraso', () => {
    const el = coagir({
      tipo: 'titulo',
      texto: 'T',
      animacao: { tipo: 'zoom', duracao: 1200, atraso: 300 },
    })
    expect(el?.animacao).toEqual({ tipo: 'zoom', duracao: 1200, atraso: 300 })
  })

  it('tipo fora do catálogo derruba a animação inteira', () => {
    // Sem isto o CSS receberia `animation-name: lp-k-<lixo>` e a duração de uma
    // animação que não existe.
    const el = coagir({
      tipo: 'titulo',
      texto: 'T',
      animacao: { tipo: 'x;}body{display:none', duracao: 500 },
    })
    expect(el?.animacao).toBeUndefined()
  })

  it('tempo absurdo é preso na faixa em vez de derrubar a animação', () => {
    const el = coagir({
      tipo: 'titulo',
      texto: 'T',
      animacao: { tipo: 'fade', duracao: 999999, atraso: -5 },
    })
    expect(el?.animacao).toEqual({ tipo: 'fade', duracao: 3000 })
  })
})
