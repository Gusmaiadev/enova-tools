/**
 * Pecas compartilhadas do compilador de HTML: contexto, marcacao do editor,
 * midia, botao e os mecanismos de slider e de celula de tabela.
 *
 * Existe para quebrar o ciclo html.ts <-> arvore.ts: os dois precisam destas
 * funcoes, e nenhum dos dois pode importar o outro.
 */

import { classeAnimacao } from '../animacoes'
import type { LpAnimacao } from '../animacoes'
import { svgIcone } from '../icones'
import type { LpBotao, LpMidia, TipoMidia } from '../tipos'
import { corSegura, esc, escCss, urlSegura } from '../util'

export type MidiaColetada = { url: string; tipo: TipoMidia; busca: string }

export type OpcoesHtml = {
  modo: 'editor' | 'export'
  /** Reescrita de URL remota -> caminho local (export "projeto separado"). */
  urlLocal?: Map<string, string>
}

export type Ctx = {
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
export function href(ctx: Ctx, url: string): string {
  const segura = urlSegura(url)
  return ctx.base && segura.startsWith('#') ? `${ctx.base}${segura}` : segura
}

/**
 * Classe da animacao de entrada — so na pagina final. No canvas do editor o
 * elemento ficaria invisivel ate rolar ate ele, e a animacao recomecaria a cada
 * tecla digitada: e o mesmo motivo pelo qual o Elementor nao anima no editor.
 */
export const animacaoDe = (ctx: Ctx, a: LpAnimacao | undefined) =>
  ctx.modo === 'export' ? classeAnimacao(a) : ''

/** data-lp="<alvo>" so no modo editor (escapado por defesa em profundidade). */
export const alvo = (ctx: Ctx, caminho: string) =>
  ctx.modo === 'editor' ? ` data-lp="${esc(caminho)}"` : ''

export function urlMidia(ctx: Ctx, midia: LpMidia): string {
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
export function posterDe(ctx: Ctx, midia: LpMidia): string {
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
export function atributosVideo(m: LpMidia): string {
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
export function atributosVideoFundo(m: LpMidia): string {
  const atrs: string[] = []
  if (m.autoplay !== false) atrs.push('autoplay')
  atrs.push('muted')
  if (m.loop !== false) atrs.push('loop')
  atrs.push('playsinline')
  return atrs.join(' ')
}

/**
 * <img> ou <video> dentro de .lp-midia.
 *
 * `extraClasse` e o que liga o no ao CSS gerado (.lp-e-<id>): sem ela, todo
 * ajuste de estilo feito numa imagem pelo painel nao casava com nenhum seletor
 * e era descartado em silencio.
 */
export function htmlMidia(
  ctx: Ctx,
  midia: LpMidia,
  caminho: string,
  extraClasse = '',
): string {
  const url = urlMidia(ctx, midia)
  const marca = alvo(ctx, caminho)
  const classes = extraClasse ? `lp-midia ${extraClasse}` : 'lp-midia'
  // Placeholder de video e um SVG (data:image) — rende como imagem.
  if (midia.tipo === 'video' && !url.startsWith('data:image')) {
    return `<div class="${classes}"${marca}><video src="${esc(url)}"${posterDe(ctx, midia)} ${atributosVideo(midia)}></video></div>`
  }
  return `<div class="${classes}"${marca}><img src="${esc(url)}" alt="${esc(midia.alt)}" loading="lazy"></div>`
}

export function htmlBotao(
  ctx: Ctx,
  botao: LpBotao,
  caminho: string,
  extra = '',
  /** Atributos avulsos no <a> (o editor usa para marcar o texto editavel). */
  atributos = '',
): string {
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
  return `<a class="${classes.join(' ')}" href="${esc(href(ctx, botao.url))}"${estilo}${alvo(ctx, caminho)}${atributos}>${esc(botao.texto)}</a>`
}

export const quebras = (texto: string) => esc(texto).replace(/\n/g, '<br>')

export function slider(conteudo: string[], rotulo: string): string {
  const slides = conteudo.map((c) => `<div class="lp-slide">${c}</div>`).join('')
  const pontos = conteudo
    .map((_, n) => `<button type="button" class="${n === 0 ? 'ativo' : ''}" aria-label="Ir para ${rotulo} ${n + 1}"></button>`)
    .join('')
  return `<div class="lp-slider"><div class="lp-slider-janela"><div class="lp-slider-trilho">${slides}</div></div><div class="lp-slider-nav"><button type="button" class="lp-ant" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button><div class="lp-pontos">${pontos}</div><button type="button" class="lp-prox" aria-label="Próximo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button></div></div>`
}

export function celula(valor: string): string {
  const v = valor.trim().toLowerCase()
  if (v === 'sim' || v === 'yes' || v === '✓') return `<span class="sim">${svgIcone('check')}</span>`
  if (v === 'não' || v === 'nao' || v === 'no' || v === '✗' || v === '-') {
    return '<span class="nao">—</span>'
  }
  return esc(valor)
}
