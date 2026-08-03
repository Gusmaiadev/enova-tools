import { describe, expect, it } from 'vitest'
import { renderElemento } from './arvore'
import type { Ctx } from './html'
import type { LpContainer, LpMidia } from '../tipos'

const ctx = (): Ctx => ({ modo: 'export', midias: [] })
const ctxEditor = (): Ctx => ({ modo: 'editor', midias: [] })

const midia: LpMidia = {
  tipo: 'imagem',
  url: 'https://x/foto.jpg',
  alt: 'Alt',
  busca: '',
  orientacao: 'paisagem',
}

describe('renderElemento — widgets simples', () => {
  it('titulo sai na tag do nivel, com a classe do elemento', () => {
    const html = renderElemento(ctx(), { id: 'a', tipo: 'titulo', nivel: 'h1', texto: 'Oi' })
    expect(html).toBe('<h1 class="lp-el-titulo lp-e-a">Oi</h1>')
  })

  it('texto de subtitulo e de corpo usam classes diferentes', () => {
    const sub = renderElemento(ctx(), { id: 'b', tipo: 'texto', papel: 'subtitulo', texto: 'S' })
    const corpo = renderElemento(ctx(), { id: 'c', tipo: 'texto', papel: 'corpo', texto: 'C' })
    expect(sub).toContain('lp-subtitulo')
    expect(corpo).toContain('lp-texto')
  })

  it('escapa o texto do usuario e converte quebra de linha', () => {
    const html = renderElemento(ctx(), {
      id: 'd',
      tipo: 'titulo',
      nivel: 'h2',
      texto: '<script>x</script>\nlinha2',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<br>')
  })

  it('imagem sai dentro de .lp-midia', () => {
    const html = renderElemento(ctx(), { id: 'e', tipo: 'imagem', midia })
    expect(html).toContain('class="lp-midia')
    expect(html).toContain('src="https://x/foto.jpg"')
    expect(html).toContain('alt="Alt"')
  })

  it('numero traz o contador e o rotulo', () => {
    const html = renderElemento(ctx(), {
      id: 'f',
      tipo: 'numero',
      valor: '100+',
      rotulo: 'Clientes',
    })
    expect(html).toContain('data-contar')
    expect(html).toContain('100+')
    expect(html).toContain('Clientes')
  })

  it('divisor e espacador saem sem conteudo', () => {
    expect(renderElemento(ctx(), { id: 'g', tipo: 'divisor' })).toBe(
      '<hr class="lp-divisor lp-e-g">',
    )
    expect(
      renderElemento(ctx(), { id: 'h', tipo: 'espacador', altura: { desktop: 40 } }),
    ).toBe('<div class="lp-espacador lp-e-h"></div>')
  })
})

describe('renderElemento — container', () => {
  const arvore: LpContainer = {
    id: 'r',
    tipo: 'container',
    direcao: { desktop: 'coluna' },
    aparencia: 'card',
    filhos: [
      { id: 't', tipo: 'titulo', nivel: 'h3', texto: 'T' },
      { id: 'p', tipo: 'texto', papel: 'corpo', texto: 'P' },
    ],
  }

  it('emite a classe do container, a da aparencia e a do elemento', () => {
    expect(renderElemento(ctx(), arvore)).toContain('class="lp-c lp-ap-card lp-e-r"')
  })

  it('renderiza os filhos na ordem', () => {
    const html = renderElemento(ctx(), arvore)
    expect(html.indexOf('<h3')).toBeLessThan(html.indexOf('lp-texto'))
  })

  it('container vazio nao quebra', () => {
    const html = renderElemento(ctx(), {
      id: 'v',
      tipo: 'container',
      direcao: { desktop: 'coluna' },
      filhos: [],
    })
    expect(html).toBe('<div class="lp-c lp-e-v"></div>')
  })
})

describe('renderElemento — widgets compostos', () => {
  it('faq usa details/summary, com o primeiro aberto', () => {
    const html = renderElemento(ctx(), {
      id: 'f1',
      tipo: 'faq',
      perguntas: [
        { id: 'p1', pergunta: 'Um?', resposta: 'R1' },
        { id: 'p2', pergunta: 'Dois?', resposta: 'R2' },
      ],
    })
    expect(html).toContain('<details open>')
    expect((html.match(/<details/g) ?? []).length).toBe(2)
    expect(html).toContain('<summary>')
    expect(html).toContain('Um?')
  })

  it('abas emitem nav e paineis casados por indice', () => {
    const html = renderElemento(ctx(), {
      id: 'a1',
      tipo: 'abas',
      abas: [
        { id: 't1', titulo: 'A', texto: 'TA' },
        { id: 't2', titulo: 'B', texto: 'TB' },
      ],
    })
    expect(html).toContain('data-tab="0"')
    expect(html).toContain('data-painel="0"')
    expect(html).toContain('class="lp-tabs-nav"')
  })

  it('comparacao sai como tabela com cabecalho e linhas', () => {
    const html = renderElemento(ctx(), {
      id: 'c1',
      tipo: 'comparacao',
      rotulos: ['Preco'],
      colunas: [{ id: 'x', titulo: 'Pro', celulas: ['R$ 9'], destaque: true }],
    })
    expect(html).toContain('<table>')
    expect(html).toContain('<th class="destaque"')
    expect(html).toContain('R$ 9')
  })

  it('celula "sim" vira check e "nao" vira travessao', () => {
    const html = renderElemento(ctx(), {
      id: 'c2',
      tipo: 'comparacao',
      rotulos: ['A', 'B'],
      colunas: [{ id: 'x', titulo: 'P', celulas: ['sim', 'nao'] }],
    })
    expect(html).toContain('class="sim"')
    expect(html).toContain('class="nao"')
  })

  it('formulario emite honeypot e so confirma com destino', () => {
    const comDestino = renderElemento(ctx(), {
      id: 'fo',
      tipo: 'formulario',
      destino: 'https://x/y',
    })
    expect(comDestino).toContain('lp-mel')
    expect(comDestino).toContain('data-destino="https://x/y"')
    expect(comDestino).toContain('lp-form-ok')

    const sem = renderElemento(ctx(), { id: 'fo2', tipo: 'formulario' })
    expect(sem).not.toContain('data-destino')
    expect(sem).not.toContain('lp-form-ok')
  })

  it('depoimentos e carrossel usam o mesmo mecanismo de slider', () => {
    const dep = renderElemento(ctx(), {
      id: 'd1',
      tipo: 'depoimentos',
      depoimentos: [
        { id: '1', texto: 'Otimo', nome: 'Ana', cargo: 'CEO' },
        { id: '2', texto: 'Bom', nome: 'Beto' },
      ],
    })
    expect(dep).toContain('lp-slider-trilho')
    expect(dep).toContain('Ana')

    const car = renderElemento(ctx(), {
      id: 'k1',
      tipo: 'carrossel',
      slides: [
        { id: '1', titulo: 'Um' },
        { id: '2', titulo: 'Dois' },
      ],
    })
    expect(car).toContain('lp-slider-trilho')
  })
})

describe('renderElemento — modo editor', () => {
  it('emite data-lp com o id do no so no editor', () => {
    const el = { id: 'x1', tipo: 'titulo', nivel: 'h2', texto: 'T' } as const
    expect(renderElemento(ctxEditor(), el)).toContain('data-lp="el:x1"')
    expect(renderElemento(ctx(), el)).not.toContain('data-lp')
  })
})
