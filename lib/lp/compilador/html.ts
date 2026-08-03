/**
 * Gera o corpo HTML da landing page a partir do documento. Todo texto passa
 * por esc() (conteudo vem do usuario/IA) e toda URL por urlSegura().
 *
 * No modo editor, cada elemento editavel recebe data-lp="<alvo>" — o runtime
 * do editor (lib/lp/editorRuntime.ts) usa esses alvos para selecao e edicao
 * inline; o modo export nao emite nada disso.
 */

import { svgIcone, svgRede } from '../icones'
import type {
  LpBotao,
  LpDocumento,
  LpMidia,
  LpSecao,
  PaginaLegal,
  PosicaoBotao,
  TipoMidia,
} from '../tipos'
import {
  corSegura,
  esc,
  escCss,
  linkTelefone,
  normalizarBotoes,
  normalizarTelefones,
  urlSegura,
} from '../util'
import { idHtmlSecao } from './css'

export type MidiaColetada = { url: string; tipo: TipoMidia; busca: string }

export type OpcoesHtml = {
  modo: 'editor' | 'export'
  /** Reescrita de URL remota -> caminho local (export "projeto separado"). */
  urlLocal?: Map<string, string>
}

type Ctx = {
  modo: 'editor' | 'export'
  urlLocal?: Map<string, string>
  midias: MidiaColetada[]
  /**
   * Arquivo a que as ancoras se referem, quando a pagina compilada nao e o
   * index (termos.html e afins): la nao existe #contato para rolar ate.
   */
  base?: string
}

/** Link de navegacao: nas paginas auxiliares a ancora volta para o index. */
function href(ctx: Ctx, url: string): string {
  const segura = urlSegura(url)
  return ctx.base && segura.startsWith('#') ? `${ctx.base}${segura}` : segura
}

/** data-lp="<alvo>" so no modo editor (escapado por defesa em profundidade). */
const alvo = (ctx: Ctx, caminho: string) =>
  ctx.modo === 'editor' ? ` data-lp="${esc(caminho)}"` : ''

function urlMidia(ctx: Ctx, midia: LpMidia): string {
  const segura = urlSegura(midia.url)
  if (!midia.url.startsWith('data:')) {
    if (!ctx.midias.some((m) => m.url === midia.url)) {
      ctx.midias.push({ url: midia.url, tipo: midia.tipo, busca: midia.busca })
    }
    const local = ctx.urlLocal?.get(midia.url)
    if (local) return local
  }
  return segura
}

/**
 * `poster` do <video>: sem ele o navegador mostra um retangulo preto ate o
 * primeiro quadro carregar. Entra na coleta como imagem para o export baixar.
 */
function posterDe(ctx: Ctx, midia: LpMidia): string {
  if (!midia.thumb) return ''
  const url = urlMidia(ctx, { ...midia, url: midia.thumb, tipo: 'imagem' })
  // urlSegura devolve '#' para o que nao passa: melhor sem poster do que com um
  // poster que dispara uma requisicao para a propria pagina.
  if (url === '#') return ''
  return ` poster="${esc(url)}"`
}

/**
 * Atributos de reproducao do <video> na pagina, conforme o que o usuario marcou
 * (ver ReproducaoVideo). Sem escolha nenhuma sai o padrao de sempre: com
 * controles, parado e sem repetir. Autoplay so vai junto com `muted` porque o
 * navegador bloqueia video com som sem gesto do usuario — e sem `preload` para
 * nao brigar com o autoplay.
 */
function atributosVideo(m: LpMidia): string {
  const atrs: string[] = []
  if (m.controles !== false) atrs.push('controls')
  if (m.autoplay) atrs.push('autoplay', 'muted')
  else atrs.push('preload="metadata"')
  if (m.loop) atrs.push('loop')
  atrs.push('playsinline')
  return atrs.join(' ')
}

/**
 * Video decorativo atras do conteudo (banner e hero com fundo): sem controles e
 * sem som sempre — mas quem desmarcou autoplay/loop no editor manda.
 */
function atributosVideoFundo(m: LpMidia): string {
  const atrs: string[] = []
  if (m.autoplay !== false) atrs.push('autoplay')
  atrs.push('muted')
  if (m.loop !== false) atrs.push('loop')
  atrs.push('playsinline')
  return atrs.join(' ')
}

/** <img> ou <video> dentro de .lp-midia. */
function htmlMidia(ctx: Ctx, midia: LpMidia, caminho: string): string {
  const url = urlMidia(ctx, midia)
  const marca = alvo(ctx, caminho)
  // Placeholder de video e um SVG (data:image) — rende como imagem.
  if (midia.tipo === 'video' && !url.startsWith('data:image')) {
    return `<div class="lp-midia"${marca}><video src="${esc(url)}"${posterDe(ctx, midia)} ${atributosVideo(midia)}></video></div>`
  }
  return `<div class="lp-midia"${marca}><img src="${esc(url)}" alt="${esc(midia.alt)}" loading="lazy"></div>`
}

function htmlBotao(ctx: Ctx, botao: LpBotao, caminho: string, extra = ''): string {
  const classes = ['lp-btn']
  if (botao.estilo === 'contorno') classes.push('contorno')
  // Ausente = o comportamento de sempre (subir um pouco, sem animacao).
  if (botao.hover && botao.hover !== 'elevar') classes.push(`hover-${botao.hover}`)
  if (botao.animacao && botao.animacao !== 'nenhuma') classes.push(`anim-${botao.animacao}`)
  if (extra) classes.push(extra)
  // Cores próprias vão inline: cada botão (seção, item, header) tem as suas —
  // uma regra por seção pintaria junto os botões dos itens.
  const estilos: string[] = []
  if (botao.corFundo) {
    const fundo = escCss(corSegura(botao.corFundo, 'inherit'))
    estilos.push(`background:${fundo}`, `border-color:${fundo}`)
  }
  if (botao.corTexto) estilos.push(`color:${escCss(corSegura(botao.corTexto, 'inherit'))}`)
  const estilo = estilos.length > 0 ? ` style="${estilos.join(';')}"` : ''
  return `<a class="${classes.join(' ')}" href="${esc(href(ctx, botao.url))}"${estilo}${alvo(ctx, caminho)}>${esc(botao.texto)}</a>`
}

/**
 * Bloco do botao da secao, alinhado conforme `posicao`. `padrao` e o alinhamento
 * natural daquele layout (texto a esquerda, grade centralizada), usado enquanto
 * o usuario nao escolhe um. Vale para qualquer layout: botao nao e privilegio de
 * hero e CTA.
 */
function acaoSecao(
  ctx: Ctx,
  s: LpSecao,
  padrao: PosicaoBotao = 'esquerda',
  extra = '',
): string {
  if (!s.botao) return ''
  const classes = ['lp-acao', `pos-${s.botao.posicao ?? padrao}`]
  if (extra) classes.push(extra)
  return `<div class="${classes.join(' ')}">${htmlBotao(ctx, s.botao, `sec:${s.id}:botao`)}</div>`
}

const quebras = (texto: string) => esc(texto).replace(/\n/g, '<br>')

function tituloEl(ctx: Ctx, s: LpSecao, tag: 'h1' | 'h2' | 'h3' = 'h2'): string {
  if (!s.titulo) return ''
  return `<${tag} class="lp-el-titulo"${alvo(ctx, `sec:${s.id}:titulo`)}>${quebras(s.titulo)}</${tag}>`
}

function subtituloEl(ctx: Ctx, s: LpSecao): string {
  if (!s.subtitulo) return ''
  return `<p class="lp-subtitulo lp-el-subtitulo"${alvo(ctx, `sec:${s.id}:subtitulo`)}>${quebras(s.subtitulo)}</p>`
}

function textoEl(ctx: Ctx, s: LpSecao): string {
  if (!s.texto) return ''
  return `<p class="lp-texto lp-el-texto"${alvo(ctx, `sec:${s.id}:texto`)}>${quebras(s.texto)}</p>`
}

/**
 * Cabecalho centralizado padrao das secoes de lista/grade. Inclui o texto da
 * secao: sem isso o que o usuario escrevia em "Conteudo" num layout de grade
 * (cards, FAQ, big numbers) nao aparecia em lugar nenhum da pagina.
 */
function cabeca(ctx: Ctx, s: LpSecao): string {
  if (!s.titulo && !s.subtitulo && !s.texto) return ''
  return `<div class="lp-cabeca">${tituloEl(ctx, s)}${subtituloEl(ctx, s)}${textoEl(ctx, s)}</div>`
}

const itemAlvo = (s: LpSecao, itemId: string, campo: string) =>
  `sec:${s.id}:item:${itemId}:${campo}`

function textoItem(
  ctx: Ctx,
  s: LpSecao,
  itemId: string,
  campo: 'titulo' | 'texto' | 'extra' | 'detalhe',
  valor: string | undefined,
  tag: string,
  classe: string,
): string {
  if (!valor) return ''
  return `<${tag} class="${classe}"${alvo(ctx, itemAlvo(s, itemId, campo))}>${quebras(valor)}</${tag}>`
}

/* --------------------------- layouts de secao ---------------------------- */

function lHero(ctx: Ctx, s: LpSecao): string {
  const comFundo = Boolean(s.fundo?.midia)
  const lateral = !comFundo && s.midia ? htmlMidia(ctx, s.midia, `sec:${s.id}:midia`) : ''
  // Hero centralizado (sobre mídia ou sem mídia lateral) pede botão no centro.
  const acoes = acaoSecao(ctx, s, comFundo || !s.midia ? 'centro' : 'esquerda', 'lp-hero-acoes')
  return `<div class="lp-container"><div class="lp-hero-texto">${tituloEl(ctx, s, 'h1')}${subtituloEl(ctx, s)}${textoEl(ctx, s)}${acoes}</div>${lateral}</div>`
}

function lTextoMidia(ctx: Ctx, s: LpSecao): string {
  const midia = s.midia ? htmlMidia(ctx, s.midia, `sec:${s.id}:midia`) : ''
  return `<div class="lp-container"><div class="lp-tm${s.inverter ? ' inv' : ''}"><div class="lp-tm-texto">${tituloEl(ctx, s)}${subtituloEl(ctx, s)}${textoEl(ctx, s)}${acaoSecao(ctx, s)}</div>${midia}</div></div>`
}

function lTextoCentralizado(ctx: Ctx, s: LpSecao): string {
  return `<div class="lp-container"><div class="lp-central">${tituloEl(ctx, s)}${subtituloEl(ctx, s)}${textoEl(ctx, s)}${acaoSecao(ctx, s, 'centro')}</div></div>`
}

function lCards(ctx: Ctx, s: LpSecao): string {
  const cards = s.itens
    .map((i) => {
      const botao = i.botao
        ? `<div class="lp-card-acao">${htmlBotao(ctx, i.botao, itemAlvo(s, i.id, 'botao'))}</div>`
        : ''
      return `<div class="lp-card lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}>${
        i.icone ? `<span class="lp-icone">${svgIcone(i.icone)}</span>` : ''
      }${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'h3', 'lp-card-titulo')}${textoItem(ctx, s, i.id, 'extra', i.extra, 'p', 'lp-card-subtitulo')}${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-card-texto')}${botao}</div>`
    })
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-cards" style="--cols:${s.colunas ?? 3}">${cards}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lGaleria(ctx: Ctx, s: LpSecao, masonry = false): string {
  const figuras = s.itens
    .filter((i) => i.imagem)
    .map((i) => {
      const legenda = i.titulo
        ? `<figcaption${alvo(ctx, itemAlvo(s, i.id, 'titulo'))}>${quebras(i.titulo)}</figcaption>`
        : ''
      const img = i.imagem as LpMidia
      return `<figure class="lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}><img src="${esc(urlMidia(ctx, img))}" alt="${esc(img.alt)}" loading="lazy">${legenda}</figure>`
    })
    .join('')
  const classe = masonry ? 'lp-masonry' : 'lp-galeria'
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="${classe}" style="--cols:${s.colunas ?? 3}">${figuras}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lTimeline(ctx: Ctx, s: LpSecao): string {
  const itens = s.itens
    .map(
      (i) => `<div class="lp-tl-item lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}>${textoItem(ctx, s, i.id, 'extra', i.extra, 'div', 'lp-tl-data')}${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'h3', 'lp-tl-titulo')}${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-tl-texto')}</div>`,
    )
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-timeline">${itens}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lFaq(ctx: Ctx, s: LpSecao): string {
  const chevron = svgIcone('chevron-baixo')
  const itens = s.itens
    .map(
      (i, n) => `<details${n === 0 ? ' open' : ''}${alvo(ctx, itemAlvo(s, i.id, 'sel'))}><summary><span${alvo(ctx, itemAlvo(s, i.id, 'titulo'))}>${quebras(i.titulo ?? '')}</span>${chevron}</summary><div class="lp-faq-corpo">${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-faq-resposta')}</div></details>`,
    )
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-faq">${itens}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function slider(conteudo: string[], rotulo: string): string {
  const slides = conteudo.map((c) => `<div class="lp-slide">${c}</div>`).join('')
  const pontos = conteudo
    .map((_, n) => `<button type="button" class="${n === 0 ? 'ativo' : ''}" aria-label="Ir para ${rotulo} ${n + 1}"></button>`)
    .join('')
  return `<div class="lp-slider"><div class="lp-slider-janela"><div class="lp-slider-trilho">${slides}</div></div><div class="lp-slider-nav"><button type="button" class="lp-ant" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button><div class="lp-pontos">${pontos}</div><button type="button" class="lp-prox" aria-label="Próximo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button></div></div>`
}

function lDepoimentos(ctx: Ctx, s: LpSecao): string {
  const slides = s.itens.map((i) => {
    const foto = i.imagem
      ? `<img src="${esc(urlMidia(ctx, i.imagem))}" alt="${esc(i.imagem.alt)}" loading="lazy">`
      : ''
    return `<div${alvo(ctx, itemAlvo(s, i.id, 'sel'))}><blockquote>${svgIcone('aspas')}${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-depo-fala')}</blockquote><div class="lp-depo-autor">${foto}${textoItem(ctx, s, i.id, 'extra', i.extra, 'div', 'lp-depo-nome')}${textoItem(ctx, s, i.id, 'detalhe', i.detalhe, 'div', 'lp-depo-cargo')}</div></div>`
  })
  return `<div class="lp-container lp-depo">${cabeca(ctx, s)}${slider(slides, 'depoimento')}${acaoSecao(ctx, s, 'centro')}</div>`
}

function lLogos(ctx: Ctx, s: LpSecao): string {
  const logos = s.itens
    .map((i) => {
      const interno = i.imagem
        ? `<img src="${esc(urlMidia(ctx, i.imagem))}" alt="${esc(i.titulo ?? i.imagem.alt)}" loading="lazy">`
        : `<span class="lp-logo-nome"${alvo(ctx, itemAlvo(s, i.id, 'titulo'))}>${quebras(i.titulo ?? '')}</span>`
      const li = `<li${alvo(ctx, itemAlvo(s, i.id, 'sel'))}>${
        i.url ? `<a href="${esc(urlSegura(i.url))}" target="_blank" rel="noopener">${interno}</a>` : interno
      }</li>`
      return li
    })
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-logos"><ul>${logos}</ul></div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lEstatisticas(ctx: Ctx, s: LpSecao): string {
  const stats = s.itens
    .map(
      (i) => `<div class="lp-stat lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}><div class="lp-stat-valor" data-contar${alvo(ctx, itemAlvo(s, i.id, 'extra'))}>${esc(i.extra ?? '0')}</div>${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'div', 'lp-stat-rotulo')}</div>`,
    )
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-stats" style="--cols:${s.colunas ?? Math.min(4, Math.max(2, s.itens.length))}">${stats}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lCta(ctx: Ctx, s: LpSecao): string {
  return `<div class="lp-container"><div class="lp-cta-caixa lp-reveal">${tituloEl(ctx, s)}${subtituloEl(ctx, s)}${textoEl(ctx, s)}${acaoSecao(ctx, s, 'centro')}</div></div>`
}

function lBanner(ctx: Ctx, s: LpSecao): string {
  return `<div class="lp-container"><div class="lp-banner">${tituloEl(ctx, s)}${subtituloEl(ctx, s)}${acaoSecao(ctx, s, 'centro')}</div></div>`
}

function lFormulario(ctx: Ctx, s: LpSecao): string {
  const lado = s.titulo || s.texto || s.subtitulo || s.midia || s.botao
  const texto = `<div class="lp-form-texto">${tituloEl(ctx, s)}${subtituloEl(ctx, s)}${textoEl(ctx, s)}${
    s.midia ? htmlMidia(ctx, s.midia, `sec:${s.id}:midia`) : ''
  }${acaoSecao(ctx, s)}</div>`
  // Sem destino não emite a confirmação — o script não finge que enviou.
  const destino = s.destinoForm ? ` data-destino="${esc(urlSegura(s.destinoForm))}"` : ''
  const confirmacao = s.destinoForm
    ? '<div class="lp-form-ok">Mensagem enviada com sucesso! Retornaremos em breve.</div>'
    : ''
  const form = `<form class="lp-form" novalidate${destino}><input class="lp-mel" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true"><label>Nome<input type="text" name="nome" required placeholder="Seu nome"></label><label>E-mail<input type="email" name="email" required placeholder="voce@email.com"></label><label>Telefone<input type="tel" name="telefone" placeholder="(00) 00000-0000"></label><label>Mensagem<textarea name="mensagem" required placeholder="Como podemos ajudar?"></textarea></label>${confirmacao}<button class="lp-btn" type="submit">Enviar mensagem</button></form>`
  return `<div class="lp-container"><div class="lp-form-grid${lado ? '' : ' sozinho'}">${lado ? texto : ''}${form}</div></div>`
}

function lPrecos(ctx: Ctx, s: LpSecao): string {
  const check = svgIcone('check')
  const planos = s.itens
    .map((i) => {
      const linhas = (i.lista ?? [])
        .map((v) => `<li>${check}<span>${esc(v)}</span></li>`)
        .join('')
      const botao = i.botao ? htmlBotao(ctx, i.botao, itemAlvo(s, i.id, 'botao'), '') : ''
      return `<div class="lp-preco${i.destaque ? ' destaque' : ''} lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}>${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'h3', 'lp-preco-nome')}<div><span class="lp-preco-valor"${alvo(ctx, itemAlvo(s, i.id, 'extra'))}>${esc(i.extra ?? '')}</span><span class="lp-preco-periodo"${alvo(ctx, itemAlvo(s, i.id, 'detalhe'))}>${esc(i.detalhe ?? '')}</span></div><ul>${linhas}</ul>${botao}</div>`
    })
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-precos" style="--cols:${s.colunas ?? Math.min(3, Math.max(2, s.itens.length))}">${planos}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function celula(valor: string): string {
  const v = valor.trim().toLowerCase()
  if (v === 'sim' || v === 'yes' || v === '✓') return `<span class="sim">${svgIcone('check')}</span>`
  if (v === 'não' || v === 'nao' || v === 'no' || v === '✗' || v === '-') {
    return '<span class="nao">—</span>'
  }
  return esc(valor)
}

function lComparacao(ctx: Ctx, s: LpSecao): string {
  const cabecalho = s.itens
    .map((i) => `<th${i.destaque ? ' class="destaque"' : ''}${alvo(ctx, itemAlvo(s, i.id, 'titulo'))}>${quebras(i.titulo ?? '')}</th>`)
    .join('')
  const linhas = (s.rotulos ?? [])
    .map((rotulo, n) => {
      const celulas = s.itens
        .map((i) => `<td${i.destaque ? ' class="destaque"' : ''}>${celula(i.lista?.[n] ?? '')}</td>`)
        .join('')
      return `<tr><td>${esc(rotulo)}</td>${celulas}</tr>`
    })
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-comp"><table><thead><tr><th></th>${cabecalho}</tr></thead><tbody>${linhas}</tbody></table></div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lGridProdutos(ctx: Ctx, s: LpSecao): string {
  const produtos = s.itens
    .map((i) => {
      const img = i.imagem ? htmlMidia(ctx, i.imagem, itemAlvo(s, i.id, 'imagem')) : ''
      const botao = i.botao ? htmlBotao(ctx, i.botao, itemAlvo(s, i.id, 'botao')) : ''
      return `<div class="lp-produto lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}>${img}<div class="lp-produto-corpo">${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'h3', 'lp-produto-nome')}${textoItem(ctx, s, i.id, 'extra', i.extra, 'div', 'lp-produto-preco')}${botao}</div></div>`
    })
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-produtos" style="--cols:${s.colunas ?? 3}">${produtos}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lListaBeneficios(ctx: Ctx, s: LpSecao): string {
  const itens = s.itens
    .map(
      (i) => `<li class="lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}><span class="lp-icone">${svgIcone(i.icone ?? 'check')}</span><div>${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'h3', 'lp-benef-titulo')}${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-benef-texto')}</div></li>`,
    )
    .join('')
  const texto = `<div class="lp-benef-texto-col">${tituloEl(ctx, s)}${subtituloEl(ctx, s)}${textoEl(ctx, s)}<ul>${itens}</ul>${acaoSecao(ctx, s)}</div>`
  const midia = s.midia ? htmlMidia(ctx, s.midia, `sec:${s.id}:midia`) : ''
  return `<div class="lp-container"><div class="lp-benef${midia ? '' : ' sozinho'}">${texto}${midia}</div></div>`
}

function lBlocosAlternados(ctx: Ctx, s: LpSecao): string {
  const blocos = s.itens
    .map((i) => {
      const img = i.imagem ? htmlMidia(ctx, i.imagem, itemAlvo(s, i.id, 'imagem')) : ''
      const botao = i.botao ? htmlBotao(ctx, i.botao, itemAlvo(s, i.id, 'botao')) : ''
      return `<div class="lp-bloco lp-reveal"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}><div class="lp-bloco-texto">${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'h3', 'lp-bloco-titulo')}${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-bloco-corpo')}${botao}</div>${img}</div>`
    })
    .join('')
  // `inv` troca de qual lado a alternancia comeca (1o bloco com a midia a esquerda).
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-blocos${s.inverter ? ' inv' : ''}">${blocos}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lTabs(ctx: Ctx, s: LpSecao): string {
  const nav = s.itens
    .map(
      (i, n) => `<button type="button" class="${n === 0 ? 'ativo' : ''}" data-tab="${n}"${alvo(ctx, itemAlvo(s, i.id, 'titulo'))}>${quebras(i.titulo ?? `Aba ${n + 1}`)}</button>`,
    )
    .join('')
  const paineis = s.itens
    .map((i, n) => {
      const img = i.imagem ? htmlMidia(ctx, i.imagem, itemAlvo(s, i.id, 'imagem')) : ''
      return `<div class="lp-tab-painel${n === 0 ? ' ativo' : ''}${img ? '' : ' sozinho'}" data-painel="${n}"${alvo(ctx, itemAlvo(s, i.id, 'sel'))}><div>${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-tab-texto')}</div>${img}</div>`
    })
    .join('')
  return `<div class="lp-container">${cabeca(ctx, s)}<div class="lp-tabs"><div class="lp-tabs-nav">${nav}</div>${paineis}</div>${acaoSecao(ctx, s, 'centro')}</div>`
}

function lCarrossel(ctx: Ctx, s: LpSecao): string {
  const slides = s.itens.map((i) => {
    const img = i.imagem ? htmlMidia(ctx, i.imagem, itemAlvo(s, i.id, 'imagem')) : ''
    return `<div${alvo(ctx, itemAlvo(s, i.id, 'sel'))}>${img}${textoItem(ctx, s, i.id, 'titulo', i.titulo, 'h3', 'lp-slide-titulo')}${textoItem(ctx, s, i.id, 'texto', i.texto, 'p', 'lp-slide-texto')}</div>`
  })
  return `<div class="lp-container lp-carrossel">${cabeca(ctx, s)}${slider(slides, 'slide')}${acaoSecao(ctx, s, 'centro')}</div>`
}

/* ------------------------------ montagem --------------------------------- */

function htmlSecao(ctx: Ctx, s: LpSecao, idHtml: string): string {
  const corpo: Record<string, () => string> = {
    hero: () => lHero(ctx, s),
    'texto-midia': () => lTextoMidia(ctx, s),
    'texto-centralizado': () => lTextoCentralizado(ctx, s),
    cards: () => lCards(ctx, s),
    galeria: () => lGaleria(ctx, s),
    masonry: () => lGaleria(ctx, s, true),
    timeline: () => lTimeline(ctx, s),
    faq: () => lFaq(ctx, s),
    depoimentos: () => lDepoimentos(ctx, s),
    logos: () => lLogos(ctx, s),
    estatisticas: () => lEstatisticas(ctx, s),
    cta: () => lCta(ctx, s),
    banner: () => lBanner(ctx, s),
    formulario: () => lFormulario(ctx, s),
    precos: () => lPrecos(ctx, s),
    comparacao: () => lComparacao(ctx, s),
    'grid-produtos': () => lGridProdutos(ctx, s),
    'lista-beneficios': () => lListaBeneficios(ctx, s),
    'blocos-alternados': () => lBlocosAlternados(ctx, s),
    tabs: () => lTabs(ctx, s),
    carrossel: () => lCarrossel(ctx, s),
  }

  const estilos: string[] = []
  if (s.espacamento) {
    estilos.push(`--pt:${s.espacamento.topo}px`, `--pb:${s.espacamento.base}px`)
  }
  if (s.fundo?.cor) estilos.push(`--fundo-secao:${escCss(s.fundo.cor)}`)

  // Banner usa a midia da secao como fundo; hero tambem aceita fundo.midia.
  const midiaFundo = s.tipo === 'banner' ? (s.midia ?? s.fundo?.midia) : s.fundo?.midia
  let fundo = ''
  if (midiaFundo) {
    const veu = s.fundo?.escurecer ?? 55
    estilos.push(`--veu:${(veu / 100).toFixed(2)}`)
    const urlFundo = urlMidia(ctx, midiaFundo)
    fundo = `<div class="lp-fundo-midia"${alvo(ctx, s.tipo === 'banner' && s.midia ? `sec:${s.id}:midia` : `sec:${s.id}:fundo`)}>${
      midiaFundo.tipo === 'video' && !urlFundo.startsWith('data:image')
        ? `<video src="${esc(urlFundo)}"${posterDe(ctx, midiaFundo)} ${atributosVideoFundo(midiaFundo)}></video>`
        : `<img src="${esc(urlFundo)}" alt="">`
    }</div><div class="lp-veu"></div>`
  }

  const classes = ['lp-secao', `lp-sec-${s.tipo}`]
  if (s.tipo === 'hero') classes.push('lp-hero')
  if (s.tipo === 'hero' && (s.fundo?.midia || !s.midia)) classes.push('centrado')
  // Hero com midia ao lado: `inv` troca os lados (no centrado nao ha o que trocar).
  if (s.tipo === 'hero' && s.inverter) classes.push('inv')
  // Texto branco sobre a midia e o padrao (contraste); quem desmarcou fica com
  // as cores do tema — as que o usuario escolheu na Identidade.
  if (midiaFundo && s.fundo?.textoClaro !== false) classes.push('lp-sobre-midia')
  if (s.largura === 'full') classes.push('full')

  const estilo = estilos.length > 0 ? ` style="${estilos.join(';')}"` : ''
  const nomeEditor = ctx.modo === 'editor' ? ` data-lp-nome="${esc(s.nome)}"` : ''
  return `<section id="${esc(idHtml)}" class="${classes.join(' ')}"${estilo}${alvo(ctx, `sec:${s.id}`)}${nomeEditor}>${fundo}${corpo[s.tipo]?.() ?? ''}</section>`
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
    ? '<button type="button" class="lp-menu-btn" aria-label="Abrir menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>'
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
  const links = f.linksUteis
    .map((l) => `<li><a href="${esc(href(ctx, l.url))}">${esc(l.rotulo)}</a></li>`)
    .join('')
  const menuSec = f.menuSecundario
    ? doc.header.menu.map((m) => `<li><a href="${esc(href(ctx, m.alvo))}">${esc(m.rotulo)}</a></li>`).join('')
    : ''
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

  const colunas = [
    `<div><h4 class="lp-logo-footer">${esc(doc.header.logoTexto)}</h4>${
      f.textoInstitucional ? `<p${alvo(ctx, 'footer:institucional')}>${quebras(f.textoInstitucional)}</p>` : ''
    }${acoes ? `<div class="lp-footer-acoes">${acoes}</div>` : ''}${
      redes ? `<div class="lp-redes">${redes}</div>` : ''
    }</div>`,
    links || menuSec
      ? `<div><h4>Links úteis</h4><ul>${links}${menuSec}</ul></div>`
      : '',
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
