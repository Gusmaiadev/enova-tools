/**
 * Gera o corpo HTML da landing page a partir do documento. Todo texto passa
 * por esc() (conteudo vem do usuario/IA) e toda URL por urlSegura().
 *
 * No modo editor, cada elemento editavel recebe data-lp="<alvo>" — o runtime
 * do editor (lib/lp/editorRuntime.ts) usa esses alvos para selecao e edicao
 * inline; o modo export nao emite nada disso.
 */

import { renderElemento } from './arvore'
import {
  type Ctx,
  type MidiaColetada,
  type OpcoesHtml,
  alvo,
  atributosVideoFundo,
  href,
  htmlBotao,
  posterDe,
  quebras,
  urlMidia,
} from './comum'
import { svgIcone, svgRede } from '../icones'
import { PAGINAS_LEGAIS } from '../tipos'
import type { LpDocumento, LpSecao, PaginaLegal } from '../tipos'
import {
  esc,
  escCss,
  linkTelefone,
  normalizarBotoes,
  normalizarTelefones,
  slugificar,
  urlSegura,
} from '../util'
import { idHtmlSecao } from './css'

// Ctx, midia, botao e os mecanismos compartilhados vivem em comum.ts — ver o
// cabecalho daquele arquivo para o porque.
export type { Ctx, MidiaColetada, OpcoesHtml } from './comum'

/**
 * Posicao dos links legais no fim dos "Links uteis" do rodape. O catalogo ja
 * esta na ordem que sai na pagina (termos, depois privacidade); tudo que nao e
 * legal fica com -1 e portanto vem antes.
 *
 * Casa pelo arquivo gerado e, para quem escreveu o link a mao apontando para
 * fora, pelo rotulo — a mesma heuristica que sincronizarLinksPaginas usa para
 * nao deixar os dois conviverem.
 */
const ARQUIVO_LEGAL = new Map(PAGINAS_LEGAIS.map((p, i) => [p.arquivo, i]))
function ordemLegal(url: string, rotulo: string): number {
  const porArquivo = ARQUIVO_LEGAL.get(url)
  if (porArquivo !== undefined) return porArquivo
  const slug = slugificar(rotulo)
  if (slug.includes('termo')) return 0
  if (slug.includes('privacidade')) return 1
  return -1
}

/* ------------------------------ montagem --------------------------------- */

/**
 * A secao e a moldura: fundo, veu, espacamento e largura. O conteudo vem todo da
 * arvore — as 21 funcoes de layout que existiam aqui foram substituidas pelo
 * renderizador recursivo.
 */
function htmlSecao(ctx: Ctx, s: LpSecao, idHtml: string): string {
  const estilos: string[] = []
  if (s.espacamento) {
    estilos.push(`--pt:${s.espacamento.topo}px`, `--pb:${s.espacamento.base}px`)
  }
  if (s.fundo?.cor) estilos.push(`--fundo-secao:${escCss(s.fundo.cor)}`)

  const midiaFundo = s.fundo?.midia
  let fundo = ''
  if (midiaFundo) {
    const veu = s.fundo?.escurecer ?? 55
    estilos.push(`--veu:${(veu / 100).toFixed(2)}`)
    const urlFundo = urlMidia(ctx, midiaFundo)
    fundo = `<div class="lp-fundo-midia"${alvo(ctx, `sec:${s.id}:fundo`)}>${
      midiaFundo.tipo === 'video' && !urlFundo.startsWith('data:image')
        ? `<video src="${esc(urlFundo)}"${posterDe(ctx, midiaFundo)} ${atributosVideoFundo(midiaFundo)}></video>`
        : `<img src="${esc(urlFundo)}" alt="">`
    }</div><div class="lp-veu"></div>`
  }

  const classes = ['lp-secao']
  // Texto branco sobre a midia e o padrao (contraste); quem desmarcou fica com
  // as cores do tema — as que o usuario escolheu na Identidade.
  if (midiaFundo && s.fundo?.textoClaro !== false) classes.push('lp-sobre-midia')
  if (s.largura === 'full') classes.push('full')

  const estilo = estilos.length > 0 ? ` style="${estilos.join(';')}"` : ''
  const nomeEditor = ctx.modo === 'editor' ? ` data-lp-nome="${esc(s.nome)}"` : ''
  // Secao sem raiz sai como moldura vazia em vez de derrubar a pagina: todo
  // documento passa pela migracao ou pela geracao, entao isso nao deveria
  // acontecer — mas se acontecer, o resto da pagina continua de pe.
  const interno = s.raiz ? `<div class="lp-container">${renderElemento(ctx, s.raiz)}</div>` : ''
  return `<section id="${esc(idHtml)}" class="${classes.join(' ')}"${estilo}${alvo(ctx, `sec:${s.id}`)}${nomeEditor}>${fundo}${interno}</section>`
}

function htmlHeader(ctx: Ctx, doc: LpDocumento): string {
  const itens = doc.header.menu
    .map((m) => `<li><a href="${esc(href(ctx, m.alvo))}">${esc(m.rotulo)}</a></li>`)
    .join('')
  // Os botoes moram dentro do <nav>: no celular o menu vira gaveta, e assim eles
  // aparecem junto dos links em vez de sumir da tela. `header.botao` (um botao
  // so) e o formato antigo, de documentos salvos antes da lista.
  const legado = (doc.header as { botao?: unknown }).botao
  const acoes = normalizarBotoes(doc.header.botoes ?? legado)
    .map((b) => htmlBotao(ctx, b, `header:botao:${b.id}`))
    .join('')
  const nav =
    itens || acoes
      ? `<nav class="lp-nav" aria-label="Menu principal">${itens ? `<ul>${itens}</ul>` : ''}${
          acoes ? `<div class="lp-header-acoes">${acoes}</div>` : ''
        }</nav>`
      : ''
  // Sem nada no menu o hamburguer abriria uma gaveta vazia.
  const hamburger = nav
    ? `<button type="button" class="lp-menu-btn" aria-label="Abrir menu" aria-expanded="false">${svgIcone(
        doc.header.menuMobile?.icone ?? 'menu',
      )}</button>`
    : ''
  // Com imagem de logo o link deixa de ser texto editavel no canvas (nao daria
  // para digitar dentro de um <img>); o nome escrito vira o alt.
  const logo = doc.header.logo
  const marcaLogo = logo ? '' : alvo(ctx, 'header:logo')
  // Alt da logo e o nome da marca, nao o nome do arquivo que veio do upload.
  const conteudoLogo = logo
    ? `<img src="${esc(urlMidia(ctx, logo))}" alt="${esc(doc.header.logoTexto || logo.alt)}">`
    : esc(doc.header.logoTexto)
  return `<header class="lp-header" id="topo"${alvo(ctx, 'header')}><div class="lp-container"><a class="lp-logo${logo ? ' lp-logo-img' : ''}" href="${esc(href(ctx, '#topo'))}"${marcaLogo}>${conteudoLogo}</a>${nav}${hamburger}</div></header>`
}

function htmlFooter(ctx: Ctx, doc: LpDocumento): string {
  const f = doc.footer
  const redes = doc.redes
    .map(
      (r) => `<a href="${esc(urlSegura(r.url))}" target="_blank" rel="noopener" aria-label="${esc(r.rede)}">${svgRede(r.rede)}</a>`,
    )
    .join('')
  /**
   * "Links uteis" e a soma dos links do rodape com o menu do header, quando o
   * usuario pede para repeti-lo.
   *
   * Deduplicado por DESTINO: a IA costuma escrever em `linksUteis` os mesmos
   * itens que ja estao no menu, e sem isto ligar "repetir o menu" mostrava cada
   * um duas vezes. O mesmo destino aparecer duas vezes na mesma lista e sempre
   * erro, venha o par de onde vier.
   */
  const destinos = new Set<string>()
  const links = [
    ...f.linksUteis.map((l) => ({ rotulo: l.rotulo, url: l.url })),
    ...(f.menuSecundario
      ? doc.header.menu.map((m) => ({ rotulo: m.rotulo, url: m.alvo }))
      : []),
  ]
    .filter((l) => {
      const chave = href(ctx, l.url).trim().toLowerCase()
      if (chave === '' || destinos.has(chave)) return false
      destinos.add(chave)
      return true
    })
    // Termos e privacidade fecham a lista, nesta ordem — sao rodape legal, nao
    // navegacao. Ordenacao estavel: o resto fica como esta no documento.
    .sort((a, b) => ordemLegal(a.url, a.rotulo) - ordemLegal(b.url, b.rotulo))
    .map((l) => `<li><a href="${esc(href(ctx, l.url))}">${esc(l.rotulo)}</a></li>`)
    .join('')
  // Cada telefone e uma linha propria: com WhatsApp vira link do wa.me (icone da
  // rede, abre em outra aba), sem vira link tel:.
  const telefones = normalizarTelefones(f.telefones).map((t) => {
    const marca = alvo(ctx, `footer:telefone:${t.id}`)
    const link = linkTelefone(t.numero, t.whatsapp)
    // O icone e aria-hidden: sem o title, o link do WhatsApp soaria igual ao do
    // telefone comum para quem usa leitor de tela.
    const extra = t.whatsapp ? ' target="_blank" rel="noopener" title="Conversar no WhatsApp"' : ''
    const numero = link
      ? `<a href="${esc(urlSegura(link))}"${extra}${marca}>${esc(t.numero)}</a>`
      : `<span${marca}>${esc(t.numero)}</span>`
    return `<li>${t.whatsapp ? svgRede('whatsapp') : svgIcone('telefone')}${numero}</li>`
  })

  const contato = [
    f.endereco && `<li>${svgIcone('local')}<span${alvo(ctx, 'footer:endereco')}>${quebras(f.endereco)}</span></li>`,
    ...telefones,
    f.email && `<li>${svgIcone('email')}<a href="mailto:${esc(f.email)}"${alvo(ctx, 'footer:email')}>${esc(f.email)}</a></li>`,
  ]
    .filter(Boolean)
    .join('')

  const acoes = normalizarBotoes(f.botoes)
    .map((b) => htmlBotao(ctx, b, `footer:botao:${b.id}`))
    .join('')

  // Mesma logo do topo: quando o usuario sobe uma imagem, o rodape mostra a
  // imagem tambem — antes ele caia sempre no nome escrito. A classe e propria
  // para o tamanho do rodape nao ficar preso ao do header.
  const logo = doc.header.logo
  const conteudoLogo = logo
    ? `<img src="${esc(urlMidia(ctx, logo))}" alt="${esc(doc.header.logoTexto || logo.alt)}">`
    : esc(doc.header.logoTexto)

  const colunas = [
    `<div><h4 class="lp-logo-footer${logo ? ' lp-logo-footer-img' : ''}">${conteudoLogo}</h4>${
      f.textoInstitucional ? `<p${alvo(ctx, 'footer:institucional')}>${quebras(f.textoInstitucional)}</p>` : ''
    }${acoes ? `<div class="lp-footer-acoes">${acoes}</div>` : ''}${
      redes ? `<div class="lp-redes">${redes}</div>` : ''
    }</div>`,
    links ? `<div><h4>Links úteis</h4><ul>${links}</ul></div>` : '',
    contato ? `<div><h4>Contato</h4><ul class="lp-contato">${contato}</ul></div>` : '',
  ]
    .filter(Boolean)
    .join('')

  return `<footer class="lp-footer"${alvo(ctx, 'footer')}><div class="lp-container"><div class="lp-footer-grid">${colunas}</div><div class="lp-footer-base"><p${alvo(ctx, 'footer:direitos')}>${quebras(f.direitos || `© ${esc(doc.header.logoTexto)}. Todos os direitos reservados.`)}</p></div></div></footer>`
}

/**
 * Texto corrido em HTML: linha em branco separa paragrafo, "## " no inicio da
 * linha vira subtitulo e a quebra simples dentro do paragrafo vira <br>.
 */
function blocosDeTexto(texto: string): string {
  const partes: string[] = []
  let paragrafo: string[] = []
  const fechar = () => {
    if (paragrafo.length > 0) partes.push(`<p>${paragrafo.map(esc).join('<br>')}</p>`)
    paragrafo = []
  }
  for (const linha of texto.split('\n')) {
    const l = linha.trim()
    if (l === '') {
      fechar()
      continue
    }
    if (l.startsWith('## ')) {
      fechar()
      partes.push(`<h2>${esc(l.slice(3).trim())}</h2>`)
      continue
    }
    paragrafo.push(l)
  }
  fechar()
  return partes.join('')
}

/**
 * Corpo de uma pagina auxiliar (termos.html, privacidade.html): o mesmo header e
 * rodape da pagina principal, com o texto no meio. As ancoras do menu apontam
 * para o index — aqui nao existe #contato para rolar ate.
 */
export function compilarCorpoPagina(
  doc: LpDocumento,
  pagina: PaginaLegal,
  opcoes: OpcoesHtml,
): { corpo: string; midias: MidiaColetada[] } {
  const ctx: Ctx = {
    modo: opcoes.modo,
    urlLocal: opcoes.urlLocal,
    midias: [],
    base: 'index.html',
  }
  const conteudo = `<div class="lp-container"><h1>${esc(pagina.titulo)}</h1>${blocosDeTexto(
    pagina.conteudo,
  )}</div>`
  const corpo = `${htmlHeader(ctx, doc)}\n<main>\n<section class="lp-legal">${conteudo}</section>\n</main>\n${htmlFooter(ctx, doc)}`
  return { corpo, midias: ctx.midias }
}

export type ResultadoHtml = {
  corpo: string
  idsPorSecao: Map<string, string>
  midias: MidiaColetada[]
}

/** Gera o <body> da pagina (header + secoes + footer) e coleta as midias. */
export function compilarCorpo(doc: LpDocumento, opcoes: OpcoesHtml): ResultadoHtml {
  const ctx: Ctx = { modo: opcoes.modo, urlLocal: opcoes.urlLocal, midias: [] }
  const idsUsados = new Set<string>(['topo'])
  const idsPorSecao = new Map<string, string>()
  for (const s of doc.secoes) idsPorSecao.set(s.id, idHtmlSecao(s, idsUsados))

  const secoes = doc.secoes
    .map((s) => htmlSecao(ctx, s, idsPorSecao.get(s.id) as string))
    .join('\n')

  const corpo = `${htmlHeader(ctx, doc)}\n<main>\n${secoes}\n</main>\n${htmlFooter(ctx, doc)}`
  return { corpo, idsPorSecao, midias: ctx.midias }
}
