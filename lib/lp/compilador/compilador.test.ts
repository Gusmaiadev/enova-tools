import { describe, expect, it } from 'vitest'
import { compilar, compilarEditor } from './index'
import { migrarDocumentoParaArvore } from '../migrar'
import { compilarCorpo } from './html'
import { compilarJs } from './js'
import { compilarCss, idHtmlSecao } from './css'
import { documentoBase } from '../documento'
import { novaSecao } from '../layouts'
import type { LpBriefing, LpDocumento, LpMidia, LpSecao, TipoLayout } from '../tipos'
import { briefingVazio } from '../tipos'
import { LAYOUTS } from '../layouts'
import { coergirDocumento } from '../validar'

/**
 * Compila como a aplicação faz: o documento é expandido para árvore antes de
 * virar página — migração na leitura, expansão na geração. Os testes montam o
 * formato tipado porque é o que `documentoBase` e a IA produzem.
 */
const comArvore = (d: LpDocumento) => migrarDocumentoParaArvore(d)
const compilarDoc = (d: LpDocumento, o?: Parameters<typeof compilar>[1]) =>
  compilar(comArvore(d), o)
const compilarEditorDoc = (d: LpDocumento) => compilarEditor(comArvore(d))

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
        telefones: [
          { id: 't1', numero: '(11) 90000-0000', whatsapp: true },
          { id: 't2', numero: '(11) 3000-0000', whatsapp: false },
        ],
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
    const saida = compilarDoc(doc)

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

  it('executa o script sem erro com todos os módulos juntos', () => {
    // Regressão: sem ponto e vírgula entre os módulos, a inserção automática do
    // JS lê `'use strict'\n(function(){…})()` como chamada da string e o script
    // inteiro morre na primeira linha — a página abre com as seções invisíveis
    // (.lp-reveal nunca vira .lp-vis) e nenhum slider funcionando.
    const { js } = compilarDoc(documentoCompleto())
    const doc = { querySelector: () => null, querySelectorAll: () => [] }
    const win = { addEventListener: () => {} }
    expect(() => new Function('document', 'window', js)(doc, win)).not.toThrow()
  })

  it('a âncora coagida serve como id de seção no HTML', () => {
    // A IA às vezes devolve o id cru da seção no lugar da âncora. Começando por
    // dígito, o compilador recusa e emite outro id — enquanto o menu e os botões
    // já receberam "#ancora" e passam a apontar para um id que não existe.
    const doc = documentoCompleto()
    doc.secoes[1].ancora = '9d1aa5d4'
    const coagido = coergirDocumento(doc, doc.tema) as LpDocumento
    const usados = new Set<string>()
    for (const s of coagido.secoes) {
      const id = idHtmlSecao(s, usados)
      if (s.ancora) expect(id).toBe(s.ancora)
    }
  })

  it('emite uma tag de abertura por seção do documento', () => {
    const doc = documentoCompleto()
    const { html } = compilarDoc(doc)
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
    const saida = compilarDoc(doc)
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
    const { html } = compilarDoc(doc)
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
    const { html } = compilarDoc(doc)
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
    const saida = compilarDoc(doc)
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
    const editor = compilarEditorDoc(doc)
    expect(editor).not.toContain('onclick=alert')
  })

  it('pinta a cor própria de cada botão inline, sem vazar para os itens', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('precos')
    secao.itens[0].botao = { texto: 'Assinar', url: '#', corFundo: '#16a34a' }
    secao.itens[1].botao = { texto: 'Assinar', url: '#', corFundo: '#2563eb' }
    doc.secoes = [secao]
    const { html } = compilarDoc(doc)
    expect(html).toContain('background:#16a34a')
    expect(html).toContain('background:#2563eb')
    // A classe .proprio deixou de existir (regra por seção pintaria todos juntos).
    expect(html).not.toContain('proprio')
  })

  it('escolhe texto legível no header claro escrito em hex curto', () => {
    const doc = documentoBase(briefing())
    doc.tema.cores.header = '#fff'
    doc.tema.cores.footer = 'rgb(20, 20, 20)'
    const { css } = compilarDoc(doc)
    expect(css).toContain('--texto-header: #111318')
    expect(css).toContain('--texto-footer: #ffffff')
  })

  it('liga cada telefone do rodapé: wa.me quando é WhatsApp, tel: quando não', () => {
    const { html } = compilarDoc(documentoCompleto())
    expect(html).toContain(
      '<a href="https://wa.me/5511900000000" target="_blank" rel="noopener" title="Conversar no WhatsApp">(11) 90000-0000</a>',
    )
    expect(html).toContain('<a href="tel:+551130000000">(11) 3000-0000</a>')
    // O ícone da linha é o do WhatsApp (nenhuma rede social do teste usa esse path).
    expect(html).toContain('M12 2a10 10 0 0 0-8.6 15L2 22l5-1.4A10 10 0 1 0 12 2z')
  })

  it('cada telefone tem seu alvo de edição no modo editor', () => {
    const html = compilarEditorDoc(documentoCompleto())
    expect(html).toContain('data-lp="footer:telefone:t1"')
    expect(html).toContain('data-lp="footer:telefone:t2"')
    // Na exportação nenhum data-lp sobra.
    expect(compilarDoc(documentoCompleto()).html).not.toContain('data-lp')
  })

  it('rodapé de projeto antigo (telefones em uma string só) continua compilando', () => {
    const doc = documentoCompleto()
    // Documento salvo antes de os telefones virarem lista.
    ;(doc.footer as { telefones: unknown }).telefones = '(11) 3000-0000 / (11) 90000-0000'
    const { html } = compilarDoc(doc)
    expect(html).toContain('tel:+551130000000')
    expect(html).toContain('tel:+5511900000000')
  })

  it('põe os botões do header dentro do nav (para aparecerem na gaveta do celular)', () => {
    const doc = documentoCompleto()
    doc.header.botoes = [
      { id: 'b1', texto: 'Fale conosco', url: '#contato' },
      { id: 'b2', texto: 'Orçamento', url: 'https://exemplo.com', estilo: 'contorno' },
    ]
    const { html } = compilarDoc(doc)
    const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'))
    expect(nav).toContain('<div class="lp-header-acoes">')
    expect(nav).toContain('href="#contato"')
    expect(nav).toContain('class="lp-btn contorno"')
  })

  it('sem menu e sem botão o header não emite nav nem hambúrguer', () => {
    const doc = documentoCompleto()
    doc.header.menu = []
    doc.header.botoes = []
    doc.footer.menuSecundario = false
    const { html } = compilarDoc(doc)
    expect(html).not.toContain('<nav')
    expect(html).not.toContain('lp-menu-btn')
  })

  it('botões do rodapé saem entre o texto institucional e as redes', () => {
    const doc = documentoCompleto()
    doc.footer.botoes = [{ id: 'f1', texto: 'Peça um orçamento', url: '#contato' }]
    const rodape = compilarDoc(doc).html.slice(compilarDoc(doc).html.indexOf('<footer'))
    expect(rodape).toContain('<div class="lp-footer-acoes">')
    expect(rodape.indexOf('lp-footer-acoes')).toBeLessThan(rodape.indexOf('lp-redes'))
  })

  it('cada botão de header e rodapé tem seu alvo de edição', () => {
    const doc = documentoCompleto()
    doc.header.botoes = [{ id: 'b1', texto: 'Fale conosco', url: '#' }]
    doc.footer.botoes = [{ id: 'f1', texto: 'Orçamento', url: '#' }]
    const html = compilarEditorDoc(doc)
    expect(html).toContain('data-lp="header:botao:b1"')
    expect(html).toContain('data-lp="footer:botao:f1"')
  })

  it('documento antigo (header.botao, um botão só) continua compilando', () => {
    const doc = documentoCompleto()
    delete (doc.header as { botoes?: unknown }).botoes
    ;(doc.header as { botao?: unknown }).botao = { texto: 'Fale conosco', url: '#contato' }
    const { html } = compilarDoc(doc)
    expect(html).toContain('<div class="lp-header-acoes">')
    expect(html).toContain('>Fale conosco</a>')
  })

  it('gera a página de texto com o header, o rodapé e o CSS da landing page', () => {
    const doc = documentoCompleto()
    doc.paginas = [
      {
        tipo: 'termos',
        titulo: 'Termos de Uso',
        conteudo: '## 1. Objeto\nO uso do site.\nSegunda linha.\n\nOutro parágrafo.',
      },
    ]
    const { paginas, css } = compilarDoc(doc)
    expect(paginas.map((p) => p.arquivo)).toEqual(['termos.html'])

    const html = paginas[0].html
    expect(html).toContain('<title>Termos de Uso — Teste</title>')
    expect(html).toContain('<meta name="robots" content="noindex">')
    expect(html).toContain('<h1>Termos de Uso</h1>')
    expect(html).toContain('<h2>1. Objeto</h2>')
    expect(html).toContain('<p>O uso do site.<br>Segunda linha.</p>')
    expect(html).toContain('<p>Outro parágrafo.</p>')
    expect(html).toContain('<header class="lp-header"')
    expect(html).toContain('<footer class="lp-footer"')
    expect(html).toContain('<link rel="stylesheet" href="style.css">')
    expect(css).toContain('.lp-legal')
  })

  it('na página de texto as âncoras voltam para o index', () => {
    const doc = documentoCompleto()
    doc.header.botoes = [{ id: 'b1', texto: 'Fale conosco', url: '#contato' }]
    doc.paginas = [{ tipo: 'termos', titulo: 'Termos de Uso', conteudo: 'Texto.' }]
    const html = compilarDoc(doc).paginas[0].html
    expect(html).toContain('href="index.html#topo"')
    expect(html).toContain('href="index.html#contato"')
    // O index continua com a âncora pura.
    expect(compilarDoc(doc).html).toContain('href="#contato"')
  })

  it('o texto da página passa por escape', () => {
    const doc = documentoCompleto()
    doc.paginas = [
      { tipo: 'privacidade', titulo: '<img src=x onerror=1>', conteudo: '<script>alert(1)</script>' },
    ]
    const html = compilarDoc(doc).paginas[0].html
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
  })

  it('sem páginas no documento o pacote não muda', () => {
    const { paginas, css } = compilarDoc(documentoCompleto())
    expect(paginas).toEqual([])
    expect(css).not.toContain('.lp-legal')
  })

  it('página ainda sem texto (recém-criada no editor) não vira arquivo', () => {
    const doc = documentoCompleto()
    doc.paginas = [{ tipo: 'termos', titulo: 'Termos de Uso', conteudo: '   ' }]
    const { paginas, css } = compilarDoc(doc)
    expect(paginas).toEqual([])
    expect(css).not.toContain('.lp-legal')
  })

  it('inverter vira ordem dos elementos, não classe CSS', () => {
    // Antes era a classe `.inv` mudando o `order` no CSS. Na árvore o lado é a
    // posição do filho, então a inversão se lê na ordem do HTML.
    const doc = documentoBase(briefing())
    const tm = novaSecao('texto-midia')
    tm.midia = {
      tipo: 'imagem',
      url: 'https://ex.com/a.jpg',
      alt: 'A',
      busca: 'a',
      orientacao: 'paisagem',
    }
    doc.secoes = [tm]

    const normal = compilarDoc(doc).html
    expect(normal.indexOf('lp-el-titulo')).toBeLessThan(normal.indexOf('lp-midia'))

    tm.inverter = true
    const invertido = compilarDoc(doc).html
    expect(invertido.indexOf('lp-midia')).toBeLessThan(invertido.indexOf('lp-el-titulo'))

    // A classe do CSS antigo não existe mais em lugar nenhum.
    expect(invertido).not.toContain('lp-tm')
  })

  it('leva os ajustes de header e rodapé para o CSS (e a fonte para o <head>)', () => {
    const doc = documentoCompleto()
    doc.header.estilo = {
      menu: { fonte: 'Poppins', tamanho: '18px', peso: 700 },
      logo: 64,
      alinhamento: 'centro',
    }
    doc.footer.estilo = { menu: { fonte: 'Lora' }, logo: 30, alinhamento: 'centro' }
    const { css, html } = compilarDoc(doc)

    expect(css).toContain("'Poppins'")
    // A coluna de contato não é menu: fica de fora da fonte escolhida.
    expect(css).toContain(".lp-footer ul:not(.lp-contato) a{font-family:'Lora'")
    expect(css).toContain('font-size:18px')
    expect(css).toContain('.lp-nav ul{margin-inline:auto}')
    // Sem imagem de logo, o tamanho é o corpo do nome escrito.
    expect(css).toContain('.lp-logo{font-size:64px}')
    expect(css).toContain('.lp-logo-footer{font-size:30px}')
    expect(css).toContain('.lp-footer-grid{text-align:center}')
    // Fonte só do menu também precisa ser carregada.
    expect(html).toContain('Poppins')
  })

  it('logo em imagem cresce pela altura, com a largura acompanhando', () => {
    const doc = documentoCompleto()
    doc.header.logo = {
      tipo: 'imagem',
      url: 'https://ex.com/logo.png',
      alt: 'Logo',
      busca: 'logo',
      orientacao: 'paisagem',
    }
    doc.header.estilo = { logo: 60 }
    expect(compilarDoc(doc).css).toContain('.lp-logo-img img{max-height:60px;max-width:300px}')
  })

  it('sem ajuste nenhum nas barras, o CSS continua o de antes', () => {
    const { css } = compilarDoc(documentoCompleto())
    expect(css).not.toContain('.lp-nav ul{margin')
    expect(css).not.toContain('.lp-logo{font-size')
    expect(css).not.toContain('.lp-logo-footer{font-size')
  })

  it('gera âncoras únicas mesmo com seções de mesmo nome', () => {
    const doc = documentoBase(briefing())
    const a = novaSecao('cards')
    const b = novaSecao('cards')
    a.ancora = 'servicos'
    b.ancora = 'servicos'
    doc.secoes = [a, b]
    const { html } = compilarDoc(doc)
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

    const previa = compilarDoc(doc)
    expect(previa.midias).toHaveLength(1)
    expect(previa.midias[0].url).toBe('https://cdn.exemplo.com/foto.jpg')

    const local = compilarDoc(doc, {
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

    const previa = compilarDoc(doc)
    expect(previa.html).toContain('poster="https://cdn.exemplo.com/poster.jpg"')
    // O poster entra na coleta como imagem, senão o ZIP exportado fica sem ele.
    expect(previa.midias.map((m) => [m.tipo, m.url])).toEqual([
      ['video', 'https://cdn.exemplo.com/filme.mp4'],
      ['imagem', 'https://cdn.exemplo.com/poster.jpg'],
    ])
  })

  /** Só a tag do <video>: 'loop'/'controls' soltos no HTML dariam falso positivo. */
  const tagVideo = (html: string) => /<video[^>]*>/.exec(html)?.[0] ?? ''

  const comVideo = (tipo: 'texto-midia' | 'banner', extra: Partial<LpMidia> = {}) => {
    const doc = documentoBase(briefing())
    const secao = novaSecao(tipo)
    secao.midia = {
      tipo: 'video',
      url: 'https://cdn.exemplo.com/filme.mp4',
      alt: 'Filme',
      busca: 'filme',
      orientacao: 'paisagem',
      ...extra,
    }
    doc.secoes = [secao]
    return tagVideo(compilarDoc(doc).html)
  }

  it('vídeo sai com controles, parado e sem repetir quando nada foi escolhido', () => {
    const tag = comVideo('texto-midia')
    expect(tag).toContain('controls')
    expect(tag).toContain('preload="metadata"')
    expect(tag).not.toContain('autoplay')
    expect(tag).not.toContain('loop')
  })

  it('respeita controles/loop/autoplay — e autoplay entra sempre mudo', () => {
    const tag = comVideo('texto-midia', { controles: false, autoplay: true, loop: true })
    expect(tag).toContain('autoplay')
    expect(tag).toContain('muted')
    expect(tag).toContain('loop')
    expect(tag).not.toContain('controls')
    // Autoplay e preload="metadata" brigam: quem começa sozinho carrega sozinho.
    expect(tag).not.toContain('preload')
  })

  it('vídeo de fundo ignora controles, mas obedece quem desligou o loop', () => {
    const tag = comVideo('banner', { controles: true, loop: false })
    expect(tag).toContain('autoplay')
    expect(tag).toContain('muted')
    expect(tag).not.toContain('loop')
    expect(tag).not.toContain('controls')
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

    expect(compilarDoc(doc).html).not.toContain('poster=')
  })

  it('big numbers sai com título, subtítulo, conteúdo e os números escritos', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('estatisticas')
    secao.titulo = 'Nossos números'
    secao.subtitulo = 'Vinte anos construindo'
    secao.texto = 'Cada número aqui é obra entregue, não promessa.'
    secao.itens = [
      { id: 'n1', extra: '+500', titulo: 'Obras entregues' },
      { id: 'n2', extra: '20 anos', titulo: 'De mercado' },
    ]
    doc.secoes = [secao]
    const { html, js } = compilarDoc(doc)

    expect(html).toContain('>Nossos números<')
    expect(html).toContain('>Vinte anos construindo<')
    // O conteúdo da seção some da página se o cabeçalho não o emitir.
    expect(html).toContain('Cada número aqui é obra entregue')
    expect(html).toContain('>+500<')
    expect(html).toContain('>Obras entregues<')
    // O valor é o que a contagem animada anima.
    expect(html).toContain('data-contar')
    expect(js).toContain('data-contar')
  })

  it('cada card sai com título, subtítulo, texto e botão próprios', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('cards')
    secao.itens = [
      {
        id: 'c1',
        icone: 'check',
        titulo: 'Reforma completa',
        extra: 'a partir de 30 dias',
        texto: 'Cuidamos do projeto à entrega.',
        botao: { texto: 'Quero esta', url: '#contato', hover: 'crescer' },
      },
      { id: 'c2', titulo: 'Manutenção', texto: 'Time fixo para o prédio.' },
    ]
    doc.secoes = [secao]
    const { html, css } = compilarDoc(doc)

    expect(html).toContain('>a partir de 30 dias<')
    expect(html).toContain('>Quero esta<')
    expect(html).toContain('hover-crescer')
    // Cada card é um container com a aparência de card — é ela que carrega
    // borda, fundo e o hover que sobe 6px, coisas que LpEstilo não alcança.
    expect((html.match(/lp-ap-card/g) ?? []).length).toBe(2)
    // Card sem subtítulo/botão não emite os blocos vazios. Conta pelo texto do
    // botão, não por `lp-btn`: o header da página também tem um.
    expect((html.match(/lp-subtitulo/g) ?? []).length).toBe(1)
    expect((html.match(/>Quero esta</g) ?? []).length).toBe(1)
    expect(css).toMatch(/\.lp-ap-card\{[^}]*flex-direction:column/)
    expect(css).toContain('.lp-ap-card:hover')
  })

  it('botão sai em qualquer layout, com posição, hover e animação', () => {
    const doc = documentoCompleto()
    for (const s of doc.secoes) {
      s.botao = {
        texto: 'Quero saber',
        url: '#contato',
        posicao: 'centro',
        hover: 'crescer',
        animacao: 'pulsar',
      }
    }
    const { html, css } = compilarDoc(doc)

    expect(doc.secoes.length).toBeGreaterThan(15)
    expect((html.match(/>Quero saber</g) ?? []).length).toBe(doc.secoes.length)
    expect(html).toContain('hover-crescer')
    expect(html).toContain('anim-pulsar')
    expect(css).toContain('@keyframes lp-pulsar')
    // `posicao` deixou de existir no botão: alinhar é papel do container que o
    // contém, e o painel dele tem o controle.
    expect(html).not.toContain('lp-acao')
    // Fecha tudo que abre: o bloco do botão entra dentro do container de cada
    // layout, não solto depois dele.
    expect((html.match(/<div/g) ?? []).length).toBe((html.match(/<\/div>/g) ?? []).length)
  })

  it('o botão da seção vira um widget dentro da árvore', () => {
    const doc = documentoBase(briefing())
    const tm = novaSecao('texto-midia')
    const cards = novaSecao('cards')
    tm.botao = { texto: 'Ver', url: '#' }
    cards.botao = { texto: 'Ver', url: '#' }
    doc.secoes = [tm, cards]
    const { html } = compilarDoc(doc)
    // Um botão por seção, cada um dentro do container da sua seção.
    expect((html.match(/>Ver</g) ?? []).length).toBe(2)
    expect((html.match(/<div/g) ?? []).length).toBe((html.match(/<\/div>/g) ?? []).length)
  })

  it('põe a logo enviada no topo e a coleta para a exportação', () => {
    const doc = documentoBase(briefing())
    doc.header.logoTexto = 'Felix Construtora'
    doc.header.logo = {
      tipo: 'imagem',
      url: 'https://cdn.exemplo.com/logo.png',
      caminho: 'lp/t1/lp1/logo.png',
      alt: 'Felix',
      busca: '',
      orientacao: 'quadrado',
    }

    const { html, midias } = compilarDoc(doc)
    expect(html).toContain('class="lp-logo lp-logo-img"')
    // Alt é o nome da marca, não o nome do arquivo enviado ("Felix", aqui).
    expect(html).toContain(
      '<img src="https://cdn.exemplo.com/logo.png" alt="Felix Construtora">',
    )
    // Sem entrar na coleta, o ZIP exportado sairia sem o arquivo da logo.
    expect(midias.map((m) => m.url)).toContain('https://cdn.exemplo.com/logo.png')
    // No canvas o link com imagem não é texto editável (não dá para digitar num <img>).
    expect(compilarEditorDoc(doc)).not.toContain('data-lp="header:logo"')

    doc.header.logo = null
    expect(compilarDoc(doc).html).toContain('>Felix Construtora</a>')
    expect(compilarEditorDoc(doc)).toContain('data-lp="header:logo"')
  })

  it('usa o tamanho de título escolhido, sem piso fixo que o anule', () => {
    const doc = documentoBase(
      briefing({ tipografia: { titulos: { fonte: 'Poppins', peso: 800, tamanho: '20px' } } }),
    )
    doc.secoes = [novaSecao('hero')]
    const { css } = compilarDoc(doc)
    expect(css).toContain('--tamanho-titulos: 20px')
    // Piso fixo (ex.: 2rem) vence o teto quando o usuário escolhe um tamanho
    // pequeno — clamp devolve o mínimo — e a página sai no tamanho padrão.
    const pisos = [...css.matchAll(/font-size:clamp\(([^,]+),/g)].map((m) => m[1].trim())
    expect(pisos.length).toBeGreaterThan(0)
    expect(pisos.filter((p) => !p.includes('var(--tamanho-titulos)'))).toEqual([])
  })

  it('mídia de fundo põe texto branco, e dá para voltar às cores do tema', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('texto-midia')
    secao.fundo = {
      midia: {
        tipo: 'imagem',
        url: 'https://cdn.exemplo.com/fundo.jpg',
        alt: 'Fundo',
        busca: 'fundo',
        orientacao: 'paisagem',
      },
      escurecer: 60,
    }
    doc.secoes = [secao]
    expect(compilarDoc(doc).html).toContain('lp-sobre-midia')

    secao.fundo.textoClaro = false
    const { html, css } = compilarDoc(doc)
    expect(html).not.toContain('lp-sobre-midia')
    // A regra continua no CSS (outras seções podem usar), só não se aplica aqui.
    expect(css).toContain('.lp-sobre-midia h1')
  })

  it('libera o container nas seções de largura total', () => {
    const doc = documentoBase(briefing())
    const secao = novaSecao('cta')
    secao.largura = 'full'
    doc.secoes = [secao]
    const { html, css } = compilarDoc(doc)
    expect(html).toMatch(/class="[^"]*\bfull\b[^"]*"/)
    // Sem esta regra a classe `full` não teria efeito nenhum.
    expect(css).toMatch(/\.full\s*>\s*\.lp-container\{[^}]*max-width:\s*none/)
  })

  it('a mídia do banner vira fundo da seção, não elemento da página', () => {
    const doc = documentoBase(briefing())
    const banner = novaSecao('banner')
    banner.midia = {
      tipo: 'imagem',
      url: 'https://ex.com/faixa.jpg',
      alt: 'Faixa',
      busca: 'faixa',
      orientacao: 'paisagem',
    }
    doc.secoes = [banner]
    const { html } = compilarDoc(doc)
    // Sai atrás do conteúdo, com o véu por cima — não como <img> no meio do texto.
    expect(html).toContain('lp-fundo-midia')
    expect(html).toContain('lp-veu')
    expect(html).not.toContain('class="lp-midia"')
  })

  it('marca os elementos editáveis apenas no modo editor', () => {
    const doc = documentoCompleto()
    expect(compilarEditorDoc(doc)).toContain('data-lp="sec:')
    expect(compilarDoc(doc).html).not.toContain('data-lp')
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
    const { html } = compilarDoc(doc)
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
    expect(compilarDoc(doc).css).not.toContain('body {')
    expect(compilarDoc(doc).css).toContain('--cor-principal: #2563eb')
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

/** Documento com as seções dadas, para isolar o caso no teste. */
function docCom(secoes: LpSecao[]): LpDocumento {
  return { ...documentoBase(briefingVazio('Teste')), secoes }
}

describe('compilador com árvore', () => {
  it('seção com raiz usa a árvore e ignora os campos tipados', () => {
    const doc = docCom([
      {
        ...novaSecao('cta'),
        titulo: 'IGNORADO',
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 't', tipo: 'titulo', nivel: 'h2', texto: 'DA ARVORE' }],
        },
      },
    ])
    const { corpo } = compilarCorpo(doc, { modo: 'export' })
    expect(corpo).toContain('DA ARVORE')
    expect(corpo).not.toContain('IGNORADO')
  })

  it('seção sem raiz sai como moldura vazia, sem derrubar a página', () => {
    // Não deveria acontecer — todo documento passa pela migração ou pela
    // geração. Se acontecer, o resto da página continua de pé.
    const doc = docCom([
      { ...novaSecao('cta'), titulo: 'IGNORADO' },
      {
        ...novaSecao('cta'),
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 't', tipo: 'titulo', nivel: 'h2', texto: 'DEPOIS' }],
        },
      },
    ])
    const { corpo } = compilarCorpo(doc, { modo: 'export' })
    expect(corpo).not.toContain('IGNORADO')
    expect(corpo).toContain('DEPOIS')
    expect((corpo.match(/<section /g) ?? []).length).toBe(2)
  })

  it('CSS traz as regras geradas dos elementos da árvore', () => {
    const doc = docCom([
      {
        ...novaSecao('cta'),
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            {
              id: 'w',
              tipo: 'titulo',
              nivel: 'h2',
              texto: 'T',
              estilo: { cor: { celular: '#123456' } },
            },
          ],
        },
      },
    ])
    const css = compilarCss(doc, new Map([[doc.secoes[0].id, 'cta']]))
    expect(css).toContain('.lp-e-r{display:flex')
    expect(css).toContain('@media (max-width:640px)')
    expect(css).toContain('#123456')
  })

  it('JS do slider entra quando há widget de carrossel na árvore', () => {
    const doc = docCom([
      {
        ...novaSecao('cta'),
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 'k', tipo: 'carrossel', slides: [{ id: '1' }, { id: '2' }] }],
        },
      },
    ])
    expect(compilarJs(doc, 'export')).toContain('lp-slider-trilho')
  })
})

describe('menu hambúrguer', () => {
  const comMenu = (menuMobile?: LpDocumento['header']['menuMobile']) => {
    const doc = docCom([novaSecao('cta')])
    doc.header.menu = [{ id: 'm1', rotulo: 'Início', alvo: '#topo' }]
    if (menuMobile) doc.header.menuMobile = menuMobile
    return doc
  }

  it('sem ajuste, vira hambúrguer no tablet — como sempre foi', () => {
    const { css, html } = compilarDoc(comMenu())
    expect(css).toContain('@media (max-width:900px){\n.lp-menu-btn{display:block}')
    expect(html).toContain('class="lp-menu-btn"')
  })

  it('o breakpoint escolhido manda', () => {
    const { css } = compilarDoc(comMenu({ apartirDe: 'tabletDeitado' }))
    expect(css).toContain('@media (max-width:1200px){\n.lp-menu-btn{display:block}')
    expect(css).not.toContain('@media (max-width:900px){\n.lp-menu-btn')
  })

  it('o ícone escolhido sai no botão', () => {
    const { html } = compilarDoc(comMenu({ icone: 'menu-duplo' }))
    // menu-duplo tem duas linhas; o padrão tem três.
    expect((html.match(/<line[^>]*y1="9"/g) ?? []).length).toBeGreaterThan(0)
  })

  /** coergirDocumento devolve null sem nenhuma seção válida — daí a seção aqui. */
  const coagirCom = (menuMobile: Record<string, unknown>) =>
    coergirDocumento({
      header: { logoTexto: 'X', menu: [], menuMobile },
      secoes: [{ id: 's1', tipo: 'cta', nome: 'X', titulo: 'Oi' }],
    })

  it('ícone fora do catálogo não vira SVG arbitrário', () => {
    expect(coagirCom({ icone: '"><script>' })?.header.menuMobile?.icone).toBeUndefined()
    // E um do catálogo passa — senão o teste acima passaria por vacuidade.
    expect(coagirCom({ icone: 'menu-duplo' })?.header.menuMobile?.icone).toBe('menu-duplo')
  })

  it('cor e fundo passam por corSegura', () => {
    const doc = coagirCom({ cor: 'red;}body{display:none', fundo: '#101828' })
    expect(doc?.header.menuMobile?.cor).toBe('#111318')
    expect(doc?.header.menuMobile?.fundo).toBe('#101828')
  })

  it('breakpoint fora da lista é descartado', () => {
    expect(coagirCom({ apartirDe: 'relogio' })?.header.menuMobile?.apartirDe).toBeUndefined()
    expect(coagirCom({ apartirDe: 'celular' })?.header.menuMobile?.apartirDe).toBe('celular')
  })

  it('alinhamento da gaveta vira align-items', () => {
    const { css } = compilarDoc(comMenu({ alinhamento: 'centro' }))
    expect(css).toContain('.lp-nav ul{flex-direction:column;align-items:center')
  })
})

describe('links úteis do rodapé', () => {
  const comRodape = (
    linksUteis: { id: string; rotulo: string; url: string }[],
    menuSecundario: boolean,
  ) => {
    const doc = docCom([novaSecao('cta')])
    doc.header.menu = [
      { id: 'm1', rotulo: 'Início', alvo: '#topo' },
      { id: 'm2', rotulo: 'Contato', alvo: '#contato' },
    ]
    doc.footer.linksUteis = linksUteis
    doc.footer.menuSecundario = menuSecundario
    return doc
  }

  it('repetir o menu não duplica o que já está nos links úteis', () => {
    // A IA costuma escrever em linksUteis os mesmos itens do menu.
    const { html } = compilarDoc(
      comRodape(
        [
          { id: 'l1', rotulo: 'Início', url: '#topo' },
          { id: 'l2', rotulo: 'Contato', url: '#contato' },
        ],
        true,
      ),
    )
    // Contado só no rodapé: o menu do header emite os mesmos href.
    const rodape = html.slice(html.indexOf('lp-footer'))
    expect((rodape.match(/href="#topo"/g) ?? []).length).toBe(1)
    expect((rodape.match(/href="#contato"/g) ?? []).length).toBe(1)
  })

  it('o que só existe no menu entra quando a opção está ligada', () => {
    const { html } = compilarDoc(comRodape([{ id: 'l1', rotulo: 'Blog', url: '/blog' }], true))
    expect(html).toContain('>Blog<')
    expect(html).toContain('>Contato<')
  })

  it('sem a opção, o menu não aparece no rodapé', () => {
    const { html } = compilarDoc(comRodape([{ id: 'l1', rotulo: 'Blog', url: '/blog' }], false))
    const rodape = html.slice(html.indexOf('lp-footer'))
    expect(rodape).toContain('>Blog<')
    expect(rodape).not.toContain('>Contato<')
  })

  it('links úteis repetidos entre si também saem uma vez só', () => {
    const { html } = compilarDoc(
      comRodape(
        [
          { id: 'l1', rotulo: 'Contato', url: '#contato' },
          { id: 'l2', rotulo: 'Fale conosco', url: '#contato' },
        ],
        false,
      ),
    )
    const rodape = html.slice(html.indexOf('lp-footer'))
    expect((rodape.match(/href="#contato"/g) ?? []).length).toBe(1)
  })
})
