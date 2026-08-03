import { describe, expect, it } from 'vitest'
import { expandirPreset } from './expandir'
import { LAYOUTS } from '../layouts'
import type { LpElemento, LpMidia, LpSecao, TipoLayout } from '../tipos'

/** So a raiz: quase todo teste ignora a secao ajustada (so o banner mexe nela). */
const expandir = (s: LpSecao) => expandirPreset(s).raiz

const midia: LpMidia = {
  tipo: 'imagem',
  url: 'foto.jpg',
  alt: 'alt',
  busca: 'busca',
  orientacao: 'paisagem',
}

const secao = (tipo: TipoLayout, extra: Partial<LpSecao> = {}): LpSecao => ({
  id: 's1',
  tipo,
  nome: 'Seção',
  ancora: null,
  itens: [],
  largura: 'boxed',
  ...extra,
})

/** Tipos dos nos em profundidade, para afirmar a forma sem depender de id. */
function forma(el: LpElemento): unknown {
  return el.tipo === 'container' ? { container: el.filhos.map(forma) } : el.tipo
}

describe('expandirPreset — presets sem itens', () => {
  it('hero: titulo h1, subtitulo, texto e botao na coluna, midia ao lado', () => {
    const raiz = expandir(
      secao('hero', {
        titulo: 'T',
        subtitulo: 'S',
        texto: 'C',
        botao: { texto: 'B', url: '#' },
        midia,
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: ['titulo', 'texto', 'texto', 'botao'] }, 'imagem'],
    })
    const col = raiz.filhos[0]
    if (col.tipo !== 'container') throw new Error('esperava container')
    const t = col.filhos[0]
    if (t.tipo !== 'titulo') throw new Error('esperava titulo')
    expect(t.nivel).toBe('h1')
  })

  it('hero sem midia nao cria a coluna vazia', () => {
    const raiz = expandir(secao('hero', { titulo: 'T' }))
    expect(forma(raiz)).toEqual({ container: [{ container: ['titulo'] }] })
  })

  it('texto-midia poe a midia depois do texto e inverte quando pedido', () => {
    const normal = expandir(secao('texto-midia', { titulo: 'T', midia }))
    expect(forma(normal)).toEqual({ container: [{ container: ['titulo'] }, 'imagem'] })

    const invertido = expandir(secao('texto-midia', { titulo: 'T', midia, inverter: true }))
    expect(forma(invertido)).toEqual({ container: ['imagem', { container: ['titulo'] }] })
  })

  it('texto-centralizado empilha tudo numa coluna centralizada', () => {
    const raiz = expandir(
      secao('texto-centralizado', { titulo: 'T', texto: 'C', botao: { texto: 'B', url: '#' } }),
    )
    expect(forma(raiz)).toEqual({ container: ['titulo', 'texto', 'botao'] })
    expect(raiz.alinhar).toEqual({ desktop: 'centro' })
  })

  it('cta empilha e centraliza como o texto-centralizado', () => {
    const raiz = expandir(secao('cta', { titulo: 'T', botao: { texto: 'B', url: '#' } }))
    expect(forma(raiz)).toEqual({ container: ['titulo', 'botao'] })
  })

  it('banner move a midia para o fundo da secao devolvida, sem virar widget', () => {
    const s = secao('banner', { titulo: 'T', midia })
    const { raiz, secao: ajustada } = expandirPreset(s)
    expect(forma(raiz)).toEqual({ container: ['titulo'] })
    expect(ajustada.fundo?.midia).toBe(midia)
    expect(ajustada.midia).toBeNull()
  })

  it('banner nao muta a secao recebida', () => {
    const s = secao('banner', { titulo: 'T', midia })
    expandirPreset(s)
    expect(s.midia).toBe(midia)
    expect(s.fundo).toBeUndefined()
  })

  it('preset que nao ajusta nada devolve a mesma secao, pela mesma referencia', () => {
    const s = secao('cta', { titulo: 'T' })
    expect(expandirPreset(s).secao).toBe(s)
  })

  it('formulario poe o texto de um lado e o widget de formulario do outro', () => {
    const raiz = expandir(secao('formulario', { titulo: 'T', destinoForm: 'https://x/y' }))
    expect(forma(raiz)).toEqual({ container: [{ container: ['titulo'] }, 'formulario'] })
    const form = raiz.filhos[1]
    if (form.tipo !== 'formulario') throw new Error('esperava formulario')
    expect(form.destino).toBe('https://x/y')
  })

  it('formulario sem texto nenhum sai so com o formulario', () => {
    const raiz = expandir(secao('formulario'))
    expect(forma(raiz)).toEqual({ container: ['formulario'] })
  })
})

describe('expandirPreset — composicao livre', () => {
  it('cards: cabeca, grade de containers por item, botao no fim', () => {
    const raiz = expandir(
      secao('cards', {
        titulo: 'T',
        colunas: 3,
        botao: { texto: 'B', url: '#' },
        itens: [
          {
            id: 'i1',
            icone: 'check',
            titulo: 'C1',
            extra: 'Sub',
            texto: 'Txt',
            botao: { texto: 'x', url: '#' },
          },
          { id: 'i2', titulo: 'C2' },
        ],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [
        'titulo',
        {
          container: [
            { container: ['icone', 'titulo', 'texto', 'texto', 'botao'] },
            { container: ['titulo'] },
          ],
        },
        'botao',
      ],
    })
    const grade = raiz.filhos[1]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    expect(grade.colunas).toEqual({ desktop: 3, tablet: 2, celular: 1 })
  })

  it('galeria e masonry sem itens com imagem saem com a grade vazia', () => {
    const raiz = expandir(secao('galeria', { itens: [{ id: 'i1' }] }))
    expect(forma(raiz)).toEqual({ container: [{ container: [] }] })
  })

  it('galeria monta um container por imagem, com a legenda depois', () => {
    const raiz = expandir(
      secao('galeria', { colunas: 2, itens: [{ id: 'i1', imagem: midia, titulo: 'Legenda' }] }),
    )
    expect(forma(raiz)).toEqual({ container: [{ container: [{ container: ['imagem', 'texto'] }] }] })
  })

  it('estatisticas viram widget numero, valor de extra e rotulo de titulo', () => {
    const raiz = expandir(
      secao('estatisticas', { itens: [{ id: 'i1', extra: '100+', titulo: 'Clientes' }] }),
    )
    const grade = raiz.filhos[0]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    const num = grade.filhos[0]
    if (num.tipo !== 'numero') throw new Error('esperava numero')
    expect(num).toMatchObject({ valor: '100+', rotulo: 'Clientes' })
  })

  it('precos monta nome, preco, periodo, lista de vantagens e botao', () => {
    const raiz = expandir(
      secao('precos', {
        itens: [
          {
            id: 'i1',
            titulo: 'Pro',
            extra: 'R$ 99',
            detalhe: '/mês',
            lista: ['Um', 'Dois'],
            botao: { texto: 'Assinar', url: '#' },
          },
        ],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['titulo', 'texto', 'texto', 'lista', 'botao'] }] }],
    })
  })

  it('timeline usa extra como data antes do titulo', () => {
    const raiz = expandir(
      secao('timeline', { itens: [{ id: 'i1', extra: '2020', titulo: 'Marco', texto: 'Txt' }] }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['texto', 'titulo', 'texto'] }] }],
    })
  })

  it('logos usa a imagem quando existe e o nome quando nao', () => {
    const raiz = expandir(
      secao('logos', { itens: [{ id: 'i1', imagem: midia }, { id: 'i2', titulo: 'Marca' }] }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['imagem'] }, { container: ['titulo'] }] }],
    })
  })

  it('blocos-alternados monta texto e imagem por bloco', () => {
    const raiz = expandir(
      secao('blocos-alternados', {
        itens: [{ id: 'i1', titulo: 'B', texto: 'T', imagem: midia }],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: [{ container: ['titulo', 'texto'] }, 'imagem'] }] }],
    })
  })

  it('lista-beneficios poe a coluna de texto e a midia lado a lado', () => {
    const raiz = expandir(
      secao('lista-beneficios', {
        titulo: 'T',
        midia,
        itens: [{ id: 'i1', icone: 'check', titulo: 'B', texto: 'D' }],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [
        { container: ['titulo', { container: [{ container: ['icone', 'titulo', 'texto'] }] }] },
        'imagem',
      ],
    })
  })

  it('grid-produtos monta foto, nome, preco e botao', () => {
    const raiz = expandir(
      secao('grid-produtos', {
        itens: [
          { id: 'i1', imagem: midia, titulo: 'P', extra: 'R$ 9', botao: { texto: 'Ver', url: '#' } },
        ],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['imagem', 'titulo', 'texto', 'botao'] }] }],
    })
  })

  it('cards recebem aparencia de card', () => {
    const raiz = expandir(secao('cards', { itens: [{ id: 'i1', titulo: 'C' }] }))
    const grade = raiz.filhos[0]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    const card = grade.filhos[0]
    if (card.tipo !== 'container') throw new Error('esperava container')
    expect(card.aparencia).toBe('card')
  })

  it('plano em destaque recebe aparencia propria', () => {
    const raiz = expandir(
      secao('precos', {
        itens: [
          { id: 'p1', titulo: 'Basico' },
          { id: 'p2', titulo: 'Pro', destaque: true },
        ],
      }),
    )
    const grade = raiz.filhos[0]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    const [normal, destaque] = grade.filhos
    if (normal.tipo !== 'container' || destaque.tipo !== 'container') {
      throw new Error('esperava containers')
    }
    expect(normal.aparencia).toBe('plano')
    expect(destaque.aparencia).toBe('plano-destaque')
  })

  it('produtos, blocos e figuras recebem a aparencia correspondente', () => {
    const prod = expandir(secao('grid-produtos', { itens: [{ id: 'i1', titulo: 'P' }] }))
    const gradeProd = prod.filhos[0]
    if (gradeProd.tipo !== 'container') throw new Error('esperava container')
    expect((gradeProd.filhos[0] as { aparencia?: string }).aparencia).toBe('produto')

    const gal = expandir(secao('galeria', { itens: [{ id: 'i1', imagem: midia }] }))
    const gradeGal = gal.filhos[0]
    if (gradeGal.tipo !== 'container') throw new Error('esperava container')
    expect((gradeGal.filhos[0] as { aparencia?: string }).aparencia).toBe('figura')

    const blocos = expandir(
      secao('blocos-alternados', { itens: [{ id: 'i1', titulo: 'B', imagem: midia }] }),
    )
    const gradeBlocos = blocos.filhos[0]
    if (gradeBlocos.tipo !== 'container') throw new Error('esperava container')
    expect((gradeBlocos.filhos[0] as { aparencia?: string }).aparencia).toBe('bloco')
  })

  it('container sem identidade visual nao ganha aparencia', () => {
    const raiz = expandir(secao('texto-centralizado', { titulo: 'T' }))
    expect(raiz.aparencia).toBeUndefined()
  })

  it('cta ganha a caixa em gradiente que o layout tinha', () => {
    const raiz = expandir(secao('cta', { titulo: 'T' }))
    expect(raiz.aparencia).toBe('caixa-cta')
  })
})

describe('expandirPreset — widgets compostos', () => {
  it('faq vira um widget so, com as perguntas dentro', () => {
    const raiz = expandir(
      secao('faq', {
        titulo: 'Dúvidas',
        itens: [
          { id: 'i1', titulo: 'Pergunta?', texto: 'Resposta.' },
          { id: 'i2', titulo: 'Outra?' },
        ],
      }),
    )
    expect(forma(raiz)).toEqual({ container: ['titulo', 'faq'] })
    const faq = raiz.filhos[1]
    if (faq.tipo !== 'faq') throw new Error('esperava faq')
    expect(faq.perguntas).toEqual([
      { id: 'i1', pergunta: 'Pergunta?', resposta: 'Resposta.' },
      { id: 'i2', pergunta: 'Outra?', resposta: '' },
    ])
  })

  it('tabs vira widget de abas preservando titulo, texto e imagem', () => {
    const raiz = expandir(
      secao('tabs', { itens: [{ id: 'a1', titulo: 'Aba', texto: 'Txt', imagem: midia }] }),
    )
    const abas = raiz.filhos[0]
    if (abas.tipo !== 'abas') throw new Error('esperava abas')
    expect(abas.abas).toEqual([{ id: 'a1', titulo: 'Aba', texto: 'Txt', imagem: midia }])
  })

  it('carrossel preserva a ordem dos slides', () => {
    const raiz = expandir(
      secao('carrossel', {
        itens: [
          { id: 's1', imagem: midia, titulo: 'Um' },
          { id: 's2', titulo: 'Dois' },
        ],
      }),
    )
    const car = raiz.filhos[0]
    if (car.tipo !== 'carrossel') throw new Error('esperava carrossel')
    expect(car.slides.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('depoimentos mapeia extra para nome e detalhe para cargo', () => {
    const raiz = expandir(
      secao('depoimentos', {
        itens: [{ id: 'd1', texto: 'Ótimo', extra: 'Ana', detalhe: 'CEO', imagem: midia }],
      }),
    )
    const dep = raiz.filhos[0]
    if (dep.tipo !== 'depoimentos') throw new Error('esperava depoimentos')
    expect(dep.depoimentos).toEqual([
      { id: 'd1', texto: 'Ótimo', nome: 'Ana', cargo: 'CEO', foto: midia },
    ])
  })

  it('comparacao leva rotulos da secao e celulas de cada coluna', () => {
    const raiz = expandir(
      secao('comparacao', {
        rotulos: ['Preço', 'Suporte'],
        itens: [
          { id: 'c1', titulo: 'Básico', lista: ['R$ 9', 'Não'], destaque: false },
          { id: 'c2', titulo: 'Pro', lista: ['R$ 99', 'Sim'], destaque: true },
        ],
      }),
    )
    const comp = raiz.filhos[0]
    if (comp.tipo !== 'comparacao') throw new Error('esperava comparacao')
    expect(comp.rotulos).toEqual(['Preço', 'Suporte'])
    expect(comp.colunas).toEqual([
      { id: 'c1', titulo: 'Básico', celulas: ['R$ 9', 'Não'], destaque: false },
      { id: 'c2', titulo: 'Pro', celulas: ['R$ 99', 'Sim'], destaque: true },
    ])
  })

  it('todo preset do catalogo tem expansor', () => {
    for (const info of LAYOUTS) {
      const raiz = expandir(secao(info.tipo, { titulo: 'T' }))
      expect(raiz.filhos.length, `preset ${info.tipo} sem expansor`).toBeGreaterThan(0)
    }
  })
})
