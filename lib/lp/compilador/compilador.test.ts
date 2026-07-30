import { describe, expect, it } from 'vitest'
import { compilar, compilarEditor } from './index'
import { documentoBase } from '../documento'
import { novaSecao } from '../layouts'
import type { LpBriefing, LpDocumento, TipoLayout } from '../tipos'
import { briefingVazio } from '../tipos'
import { LAYOUTS } from '../layouts'
import { coergirDocumento } from '../validar'

function briefing(parcial: Partial<LpBriefing> = {}): LpBriefing {
  return { ...briefingVazio('Teste'), ...parcial }
}

/** Documento com uma seção de cada layout — cobre todos os geradores. */
function documentoCompleto(): LpDocumento {
  const doc = documentoBase(
    briefing({
      secoes: [
        {
          id: 'a1',
          nome: 'Início',
          vincularMenu: true,
          titulo: 'Bem-vindo',
          conteudo: 'Texto de abertura',
          layout: 'hero',
          midia: { busca: 'office', tipo: 'imagem', orientacao: 'paisagem' },
        },
      ],
      menu: [{ id: 'm1', rotulo: 'Início', url: '' }],
      redes: [{ id: 'r1', rede: 'instagram', url: 'https://instagram.com/teste' }],
      footer: {
        textoInstitucional: 'Empresa de teste',
        direitos: '© 2026 Teste',
        endereco: 'Rua Um, 1',
        telefones: '(11) 90000-0000',
        email: 'oi@teste.com',
        linksUteis: [{ id: 'l1', rotulo: 'Privacidade', url: '#' }],
        menuSecundario: true,
      },
    }),
  )
  doc.secoes.push(...LAYOUTS.map((l) => novaSecao(l.tipo)))
  return doc
}

describe('compilador', () => {
  it('gera HTML, CSS e JS para todos os layouts sem quebrar', () => {
    const doc = documentoCompleto()
    const saida = compilar(doc)

    expect(saida.html).toContain('<!doctype html>')
    expect(saida.html).toContain('lang="pt-BR"')
    expect(saida.html).toContain('<link rel="stylesheet" href="style.css">')
    expect(saida.html).toContain('<script src="script.js"></script>')
    expect(saida.css.length).toBeGreaterThan(1000)
    expect(saida.js).toContain("'use strict'")
    // O arquivo único não referencia arquivos externos de CSS/JS.
    expect(saida.unico).not.toContain('href="style.css"')
    expect(saida.unico).not.toContain('src="script.js"')
    expect(saida.unico).toContain('<style>')
  })

  it('emite uma tag de abertura por seção do documento', () => {
    const doc = documentoCompleto()
    const { html } = compilar(doc)
    const secoes = html.match(/<section /g) ?? []
    expect(secoes).toHaveLength(doc.secoes.length)
  })

  it('só inclui o CSS e o JS dos layouts usados', () => {
    const doc = documentoBase(
      briefing({
        secoes: [
          {
            id: 's1',
            nome: 'Dúvidas',
            vincularMenu: false,
            titulo: 'FAQ',
            conteudo: '',
            layout: 'faq',
            midia: null,
          },
        ],
      }),
    )
    const saida = compilar(doc)
    expect(saida.css).toContain('.lp-faq')
    expect(saida.css).not.toContain('.lp-precos')
    // Sem slider/tabs/estatísticas/formulário, esses módulos JS ficam de fora.
    expect(saida.js).not.toContain('lp-slider-trilho')
    expect(saida.js).not.toContain('data-contar')
  })

  it('escapa HTML vindo do conteúdo do usuário', () => {
    const doc = documentoBase(briefing())
    doc.secoes = [
      {
        ...novaSecao('texto-centralizado'),
        titulo: '<img src=x onerror="alert(1)">',
        texto: 'Fim & <script>alert(2)</script>',
      },
    ]
    const { html } = compilar(doc)
    expect(html).not.toContain('<script>alert(2)</script>')
    expect(html).not.toContain('onerror="alert(1)"')
    expect(html).toContain('&lt;img src=x')
    expect(html).toContain('Fim &amp;')
  })

  it('neutraliza URLs perigosas em botões e links', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('cta')
    secao.botao = { texto: 'Clique', url: 'javascript:alert(1)' }
    doc.secoes = [secao]
    const { html } = compilar(doc)
    expect(html).not.toContain('javascript:')
    expect(html).toContain('href="#"')
  })

  it('não deixa id de seção malicioso quebrar o HTML nem o CSS', () => {
    const bruto = {
      secoes: [
        {
          id: '" onclick=alert(1) x',
          tipo: 'hero',
          nome: 'X',
          titulo: 'Oi',
          ajustes: { titulo: { cor: '#ff0000' } },
        },
      ],
    }
    const doc = coergirDocumento(bruto)!
    const saida = compilar(doc)
    expect(saida.html).not.toContain('onclick=alert')
    expect(saida.html).not.toContain('id="s-"')
    // A regra de ajuste da seção precisa ser um seletor válido (id sem aspas/espaço).
    expect(saida.css).not.toContain('</style>')
    expect(saida.unico).not.toContain('onclick=alert')
  })

  it('não emite data-lp cru a partir de id de item malicioso (modo editor)', () => {
    const doc = coergirDocumento({
      secoes: [
        { id: 'a', tipo: 'cards', nome: 'X', itens: [{ id: '" onclick=alert(1) x', titulo: 'T' }] },
      ],
    })!
    const editor = compilarEditor(doc)
    expect(editor).not.toContain('onclick=alert')
  })

  it('pinta a cor própria de cada botão inline, sem vazar para os itens', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('precos')
    secao.itens[0].botao = { texto: 'Assinar', url: '#', corFundo: '#16a34a' }
    secao.itens[1].botao = { texto: 'Assinar', url: '#', corFundo: '#2563eb' }
    doc.secoes = [secao]
    const { html } = compilar(doc)
    expect(html).toContain('background:#16a34a')
    expect(html).toContain('background:#2563eb')
    // A classe .proprio deixou de existir (regra por seção pintaria todos juntos).
    expect(html).not.toContain('proprio')
  })

  it('escolhe texto legível no header claro escrito em hex curto', () => {
    const doc = documentoBase(briefing())
    doc.tema.cores.header = '#fff'
    doc.tema.cores.footer = 'rgb(20, 20, 20)'
    const { css } = compilar(doc)
    expect(css).toContain('--texto-header: #111318')
    expect(css).toContain('--texto-footer: #ffffff')
  })

  it('gera âncoras únicas mesmo com seções de mesmo nome', () => {
    const doc = documentoBase(briefing())
    const a = novaSecao('cards')
    const b = novaSecao('cards')
    a.ancora = 'servicos'
    b.ancora = 'servicos'
    doc.secoes = [a, b]
    const { html } = compilar(doc)
    expect(html).toContain('id="servicos"')
    expect(html).toContain('id="servicos-2"')
  })

  it('reescreve as URLs de mídia para caminhos locais na exportação', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('texto-midia')
    secao.midia = {
      tipo: 'imagem',
      url: 'https://cdn.exemplo.com/foto.jpg',
      alt: 'Foto',
      busca: 'foto',
      orientacao: 'paisagem',
    }
    doc.secoes = [secao]

    const previa = compilar(doc)
    expect(previa.midias).toHaveLength(1)
    expect(previa.midias[0].url).toBe('https://cdn.exemplo.com/foto.jpg')

    const local = compilar(doc, {
      urlLocal: new Map([['https://cdn.exemplo.com/foto.jpg', 'assets/images/foto-1.jpg']]),
    })
    expect(local.html).toContain('assets/images/foto-1.jpg')
    expect(local.html).not.toContain('cdn.exemplo.com')
  })

  it('põe o poster no <video> e coleta a miniatura para a exportação', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('texto-midia')
    secao.midia = {
      tipo: 'video',
      url: 'https://cdn.exemplo.com/filme.mp4',
      thumb: 'https://cdn.exemplo.com/poster.jpg',
      alt: 'Filme',
      busca: 'filme',
      orientacao: 'paisagem',
    }
    doc.secoes = [secao]

    const previa = compilar(doc)
    expect(previa.html).toContain('poster="https://cdn.exemplo.com/poster.jpg"')
    // O poster entra na coleta como imagem, senão o ZIP exportado fica sem ele.
    expect(previa.midias.map((m) => [m.tipo, m.url])).toEqual([
      ['video', 'https://cdn.exemplo.com/filme.mp4'],
      ['imagem', 'https://cdn.exemplo.com/poster.jpg'],
    ])
  })

  it('omite o poster quando a miniatura não passa pelo saneamento de URL', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('texto-midia')
    secao.midia = {
      tipo: 'video',
      url: 'https://cdn.exemplo.com/filme.mp4',
      thumb: 'javascript:alert(1)',
      alt: 'Filme',
      busca: 'filme',
      orientacao: 'paisagem',
    }
    doc.secoes = [secao]

    expect(compilar(doc).html).not.toContain('poster=')
  })

  it('libera o container nas seções de largura total', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('cta')
    secao.largura = 'full'
    doc.secoes = [secao]
    const { html, css } = compilar(doc)
    expect(html).toMatch(/class="[^"]*\bfull\b[^"]*"/)
    // Sem esta regra a classe `full` não teria efeito nenhum.
    expect(css).toMatch(/\.full\s*>\s*\.lp-container\{[^}]*max-width:\s*none/)
  })

  it('põe o conteúdo do banner num wrapper dentro do container', () => {
    const doc = documentoBase(briefing())
    doc.secoes = [novaSecao('banner')]
    const { html, css } = compilar(doc)
    // lp-banner precisa ser filho de lp-container: como seletor descendente de
    // si mesmo (.lp-banner .lp-container) a largura nunca se aplicaria.
    expect(html).toContain('<div class="lp-container"><div class="lp-banner">')
    expect(css).toMatch(/\.lp-banner\{[^}]*max-width/)
  })

  it('marca os elementos editáveis apenas no modo editor', () => {
    const doc = documentoCompleto()
    expect(compilarEditor(doc)).toContain('data-lp="sec:')
    expect(compilar(doc).html).not.toContain('data-lp')
  })

  it('mantém o placeholder de vídeo como imagem (data URI SVG)', () => {
    const doc = documentoBase(
      briefing({
        secoes: [
          {
            id: 'v1',
            nome: 'Vídeo',
            vincularMenu: false,
            titulo: 'Assista',
            conteudo: '',
            layout: 'texto-midia',
            midia: { busca: 'people working', tipo: 'video', orientacao: 'paisagem' },
          },
        ],
      }),
    )
    const { html } = compilar(doc)
    expect(html).toContain('data:image/svg+xml')
    expect(html).not.toContain('<video')
  })
})

describe('documentoBase', () => {
  it('liga os itens do menu às âncoras das seções', () => {
    const doc = documentoBase(
      briefing({
        menu: [{ id: 'm1', rotulo: 'Serviços', url: '' }],
        secoes: [
          {
            id: 's1',
            nome: 'Serviços',
            vincularMenu: true,
            titulo: 'O que fazemos',
            conteudo: '',
            layout: 'cards',
            colunas: 3,
            midia: null,
          },
        ],
      }),
    )
    expect(doc.secoes[0].ancora).toBe('servicos')
    expect(doc.header.menu[0].alvo).toBe('#servicos')
  })

  it('respeita cores e fontes definidas no briefing', () => {
    const doc = documentoBase(
      briefing({
        cores: { principal: '#ff0000' },
        tipografia: { titulos: { fonte: 'Poppins', peso: 800 } },
      }),
    )
    expect(doc.tema.cores.principal).toBe('#ff0000')
    expect(doc.tema.tipografia.titulos.fonte).toBe('Poppins')
    expect(doc.tema.tipografia.titulos.peso).toBe(800)
  })

  it('descarta cor inválida em vez de escrevê-la no CSS', () => {
    const doc = documentoBase(briefing({ cores: { principal: 'red; } body { display:none' } }))
    // Cai no padrão em vez de vazar a injeção para dentro do CSS.
    expect(doc.tema.cores.principal).toBe('#2563eb')
    expect(compilar(doc).css).not.toContain('body {')
    expect(compilar(doc).css).toContain('--cor-principal: #2563eb')
  })
})

describe('catálogo de layouts', () => {
  it('cria seção de exemplo válida para cada layout', () => {
    for (const layout of LAYOUTS) {
      const secao = novaSecao(layout.tipo as TipoLayout)
      expect(secao.tipo).toBe(layout.tipo)
      if (layout.itens) expect(secao.itens.length).toBeGreaterThan(0)
      else expect(secao.itens).toHaveLength(0)
    }
  })
})
