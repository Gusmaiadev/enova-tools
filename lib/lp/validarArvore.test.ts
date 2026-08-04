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
