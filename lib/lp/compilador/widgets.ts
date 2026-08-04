/**
 * HTML de cada widget da arvore. As classes reaproveitam o CSS que a pagina ja
 * usa (.lp-subtitulo, .lp-midia, .lp-btn, .lp-icone, .lp-stat-*) — mudar o
 * modelo de dados nao pode mudar a aparencia da pagina.
 */

import { svgIcone } from '../icones'
import type { LpWidget } from '../tipos'
import { esc, urlSegura } from '../util'
import {
  type Ctx,
  alvo,
  animacaoDe,
  celula,
  htmlBotao,
  htmlMidia,
  quebras,
  slider,
  urlMidia,
} from './comum'

/**
 * Classe de um no: a fixa do widget, a do id (para o CSS gerado alcancar) e a
 * da animacao de entrada. Passa o no inteiro, e nao so o id, justamente para a
 * animacao entrar aqui — em um lugar so, valendo para todo widget.
 */
const cls = (ctx: Ctx, fixa: string, w: LpWidget) =>
  `${fixa} lp-e-${w.id} ${animacaoDe(ctx, w.animacao)}`.trim().replace(/\s+/g, ' ')

/**
 * Widgets cujo texto pode ser digitado direto no canvas. O runtime do editor
 * pergunta por este atributo em vez de deduzir pelo alvo — sem ele, o duplo
 * clique abriria contenteditable numa imagem ou num formulario.
 *
 * `numero` fica de fora de proposito: o widget e valor + rotulo no mesmo no, e
 * editar inline apagaria o rotulo junto. Ele se edita pelo painel.
 */
const TEXTO_EDITAVEL = new Set(['titulo', 'texto', 'botao'])

export function renderWidget(ctx: Ctx, w: LpWidget): string {
  const editavel =
    ctx.modo === 'editor' && TEXTO_EDITAVEL.has(w.tipo) ? ' data-lp-editavel' : ''
  const marca = alvo(ctx, `el:${w.id}`) + editavel
  switch (w.tipo) {
    case 'titulo':
      return `<${w.nivel} class="${cls(ctx, 'lp-el-titulo', w)}"${marca}>${quebras(w.texto)}</${w.nivel}>`
    case 'texto': {
      const base = w.papel === 'subtitulo' ? 'lp-subtitulo lp-el-subtitulo' : 'lp-texto lp-el-texto'
      return `<p class="${cls(ctx, base, w)}"${marca}>${quebras(w.texto)}</p>`
    }
    case 'imagem':
    case 'video':
      // htmlMidia ja emite .lp-midia e trata img/video, poster e autoplay; a
      // classe do no vai junto para o CSS gerado alcancar a midia.
      return htmlMidia(ctx, w.midia, `el:${w.id}`, cls(ctx, '', w))
    case 'botao':
      return htmlBotao(ctx, w.botao, `el:${w.id}`, cls(ctx, '', w), editavel)
    case 'icone':
      return `<span class="${cls(ctx, 'lp-icone', w)}"${marca}>${svgIcone(w.nome)}</span>`
    case 'numero':
      return (
        `<div class="${cls(ctx, 'lp-stat', w)}"${marca}>` +
        `<div class="lp-stat-valor" data-contar>${quebras(w.valor)}</div>` +
        `<div class="lp-stat-rotulo">${quebras(w.rotulo)}</div>` +
        `</div>`
      )
    case 'lista': {
      const itens = w.itens
        .map((i) => `<li>${svgIcone(i.icone ?? 'check')}<span>${quebras(i.texto)}</span></li>`)
        .join('')
      return `<ul class="${cls(ctx, 'lp-lista', w)}"${marca}>${itens}</ul>`
    }
    case 'espacador':
      return `<div class="${cls(ctx, 'lp-espacador', w)}"${marca}></div>`
    case 'divisor':
      return `<hr class="${cls(ctx, 'lp-divisor', w)}"${marca}>`
    case 'faq': {
      const chevron = svgIcone('chevron-baixo')
      const itens = w.perguntas
        .map(
          (p, n) =>
            `<details${n === 0 ? ' open' : ''}><summary><span>${quebras(p.pergunta)}</span>${chevron}</summary>` +
            `<div class="lp-faq-corpo"><p class="lp-faq-resposta">${quebras(p.resposta)}</p></div></details>`,
        )
        .join('')
      return `<div class="${cls(ctx, 'lp-faq', w)}"${marca}>${itens}</div>`
    }
    case 'abas': {
      const nav = w.abas
        .map(
          (a, n) =>
            `<button type="button" class="${n === 0 ? 'ativo' : ''}" data-tab="${n}">${quebras(a.titulo)}</button>`,
        )
        .join('')
      const paineis = w.abas
        .map((a, n) => {
          const img = a.imagem ? htmlMidia(ctx, a.imagem, `el:${w.id}:aba:${a.id}`) : ''
          return (
            `<div class="lp-tab-painel${n === 0 ? ' ativo' : ''}${img ? '' : ' sozinho'}" data-painel="${n}">` +
            `<div><p class="lp-tab-texto">${quebras(a.texto)}</p></div>${img}</div>`
          )
        })
        .join('')
      return `<div class="${cls(ctx, 'lp-tabs', w)}"${marca}><div class="lp-tabs-nav">${nav}</div>${paineis}</div>`
    }
    case 'carrossel': {
      const slides = w.slides.map((s) => {
        const img = s.imagem ? htmlMidia(ctx, s.imagem, `el:${w.id}:slide:${s.id}`) : ''
        const t = s.titulo ? `<h3 class="lp-slide-titulo">${quebras(s.titulo)}</h3>` : ''
        const p = s.texto ? `<p class="lp-slide-texto">${quebras(s.texto)}</p>` : ''
        return `<div>${img}${t}${p}</div>`
      })
      return `<div class="${cls(ctx, 'lp-carrossel', w)}"${marca}>${slider(slides, 'slide')}</div>`
    }
    case 'depoimentos': {
      const slides = w.depoimentos.map((d) => {
        const foto = d.foto
          ? `<img src="${esc(urlMidia(ctx, d.foto))}" alt="${esc(d.foto.alt)}" loading="lazy">`
          : ''
        const cargo = d.cargo ? `<div class="lp-depo-cargo">${quebras(d.cargo)}</div>` : ''
        return (
          `<div><blockquote>${svgIcone('aspas')}<p class="lp-depo-fala">${quebras(d.texto)}</p></blockquote>` +
          `<div class="lp-depo-autor">${foto}<div class="lp-depo-nome">${quebras(d.nome)}</div>${cargo}</div></div>`
        )
      })
      return `<div class="${cls(ctx, 'lp-depo', w)}"${marca}>${slider(slides, 'depoimento')}</div>`
    }
    case 'comparacao': {
      const cabecalho = w.colunas
        .map((c) => `<th${c.destaque ? ' class="destaque"' : ''}>${quebras(c.titulo)}</th>`)
        .join('')
      const linhas = w.rotulos
        .map((rotulo, n) => {
          const celulas = w.colunas
            .map(
              (c) => `<td${c.destaque ? ' class="destaque"' : ''}>${celula(c.celulas[n] ?? '')}</td>`,
            )
            .join('')
          return `<tr><td>${esc(rotulo)}</td>${celulas}</tr>`
        })
        .join('')
      return (
        `<div class="${cls(ctx, 'lp-comp', w)}"${marca}><table><thead><tr><th></th>${cabecalho}</tr></thead>` +
        `<tbody>${linhas}</tbody></table></div>`
      )
    }
    case 'formulario': {
      const destino = w.destino ? ` data-destino="${esc(urlSegura(w.destino))}"` : ''
      const confirmacao = w.destino
        ? '<div class="lp-form-ok">Mensagem enviada com sucesso! Retornaremos em breve.</div>'
        : ''
      return (
        `<form class="${cls(ctx, 'lp-form', w)}" novalidate${destino}${marca}>` +
        `<input class="lp-mel" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">` +
        `<label>Nome<input type="text" name="nome" required placeholder="Seu nome"></label>` +
        `<label>E-mail<input type="email" name="email" required placeholder="voce@email.com"></label>` +
        `<label>Telefone<input type="tel" name="telefone" placeholder="(00) 00000-0000"></label>` +
        `<label>Mensagem<textarea name="mensagem" required placeholder="Como podemos ajudar?"></textarea></label>` +
        `${confirmacao}<button class="lp-btn" type="submit">Enviar mensagem</button></form>`
      )
    }
  }
}
