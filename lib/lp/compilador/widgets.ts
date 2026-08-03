/**
 * HTML de cada widget da arvore. As classes reaproveitam o CSS que a pagina ja
 * usa (.lp-subtitulo, .lp-midia, .lp-btn, .lp-icone, .lp-stat-*) — mudar o
 * modelo de dados nao pode mudar a aparencia da pagina.
 */

import { svgIcone } from '../icones'
import type { LpWidget } from '../tipos'
import { type Ctx, alvo, htmlBotao, htmlMidia, quebras } from './html'

/** Classe de um no: a fixa do widget mais a do id, para o CSS gerado alcancar. */
const cls = (fixa: string, id: string) => `${fixa} lp-e-${id}`.trim()

export function renderWidget(ctx: Ctx, w: LpWidget): string {
  const marca = alvo(ctx, `el:${w.id}`)
  switch (w.tipo) {
    case 'titulo':
      return `<${w.nivel} class="${cls('lp-el-titulo', w.id)}"${marca}>${quebras(w.texto)}</${w.nivel}>`
    case 'texto': {
      const base = w.papel === 'subtitulo' ? 'lp-subtitulo lp-el-subtitulo' : 'lp-texto lp-el-texto'
      return `<p class="${cls(base, w.id)}"${marca}>${quebras(w.texto)}</p>`
    }
    case 'imagem':
    case 'video':
      // htmlMidia ja emite .lp-midia e trata img/video, poster e autoplay.
      return htmlMidia(ctx, w.midia, `el:${w.id}`)
    case 'botao':
      return htmlBotao(ctx, w.botao, `el:${w.id}`, `lp-e-${w.id}`)
    case 'icone':
      return `<span class="${cls('lp-icone', w.id)}"${marca}>${svgIcone(w.nome)}</span>`
    case 'numero':
      return (
        `<div class="${cls('lp-stat', w.id)}"${marca}>` +
        `<div class="lp-stat-valor" data-contar>${quebras(w.valor)}</div>` +
        `<div class="lp-stat-rotulo">${quebras(w.rotulo)}</div>` +
        `</div>`
      )
    case 'lista': {
      const itens = w.itens
        .map((i) => `<li>${svgIcone(i.icone ?? 'check')}<span>${quebras(i.texto)}</span></li>`)
        .join('')
      return `<ul class="${cls('lp-lista', w.id)}"${marca}>${itens}</ul>`
    }
    case 'espacador':
      return `<div class="${cls('lp-espacador', w.id)}"${marca}></div>`
    case 'divisor':
      return `<hr class="${cls('lp-divisor', w.id)}"${marca}>`
    default:
      // Widgets compostos entram na proxima task.
      return ''
  }
}
