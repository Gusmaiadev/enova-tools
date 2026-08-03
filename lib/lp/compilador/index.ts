/**
 * Monta os artefatos finais da landing page: index.html, style.css, script.js,
 * o arquivo unico (tudo inline) e a versao de editor (com runtime de edicao).
 * Puro — roda no client (editor ao vivo) e no server (geracao/export).
 */

import { paginasGeradas } from '../documento'
import { urlGoogleFonts } from '../fontes'
import { CSS_EDITOR, EDITOR_RUNTIME } from '../editorRuntime'
import type { LpDocumento, PaginaLegal } from '../tipos'
import { infoPagina } from '../tipos'
import { esc } from '../util'
import { compilarCss } from './css'
import { compilarCorpo, compilarCorpoPagina, type MidiaColetada } from './html'
import { compilarJs } from './js'

/** Pagina auxiliar compilada (termos.html, privacidade.html). */
export type PaginaCompilada = {
  arquivo: string
  titulo: string
  /** Versao com <link href="style.css"> — divide a folha com o index. */
  html: string
  /** Versao com CSS e JS embutidos, para o export de arquivo unico. */
  unico: string
}

export type Compilado = {
  /** index.html com <link href="style.css"> e <script src="script.js">. */
  html: string
  css: string
  js: string
  /** Pagina completa em um unico arquivo (CSS e JS inline). */
  unico: string
  midias: MidiaColetada[]
  /** Termos de uso / politica de privacidade, quando o projeto tem. */
  paginas: PaginaCompilada[]
}

export type OpcoesCompilar = {
  /** Reescreve URLs de midia para caminhos locais (export "projeto separado"). */
  urlLocal?: Map<string, string>
  /** Usa assets/fonts/fontes.css no lugar do CDN do Google Fonts. */
  fontesLocais?: boolean
}

function fontesUsadas(doc: LpDocumento): string[] {
  const t = doc.tema.tipografia
  const familias = [t.titulos.fonte, t.subtitulos.fonte, t.textos.fonte, t.botoes.fonte]
  for (const s of doc.secoes) {
    for (const a of Object.values(s.ajustes ?? {})) {
      if (a?.fonte) familias.push(a.fonte)
    }
  }
  // Fonte propria do menu do header/rodape — sem isso a familia nao e carregada
  // e a barra cai no fallback generico.
  for (const estilo of [doc.header.estilo, doc.footer.estilo]) {
    if (estilo?.menu?.fonte) familias.push(estilo.menu.fonte)
  }
  return [...new Set(familias)]
}

function cabecalho(doc: LpDocumento, opcoes: OpcoesCompilar): string {
  const urlFontes = urlGoogleFonts(fontesUsadas(doc))
  const fontes = opcoes.fontesLocais
    ? '<link rel="stylesheet" href="assets/fonts/fontes.css">'
    : urlFontes
      ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${urlFontes}">`
      : ''
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.seo.titulo)}</title>
<meta name="description" content="${esc(doc.seo.descricao)}">
<meta property="og:title" content="${esc(doc.seo.titulo)}">
<meta property="og:description" content="${esc(doc.seo.descricao)}">
<meta property="og:type" content="website">
${fontes}`
}

/**
 * Head de uma pagina auxiliar: titulo proprio ("Termos de Uso — Marca") e
 * noindex — o que o Google deve ranquear e a landing page, nao os termos.
 */
function cabecalhoPagina(doc: LpDocumento, p: PaginaLegal, opcoes: OpcoesCompilar): string {
  const titulo = `${p.titulo} — ${doc.header.logoTexto || doc.seo.titulo}`
  return cabecalho(doc, opcoes)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(titulo)}">`)
    .replace('<meta name="description"', '<meta name="robots" content="noindex">\n<meta name="description"')
}

function pagina(head: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
${head}
</head>
<body>
${corpo}
</body>
</html>
`
}

/** Compila para export (sem marcas de editor). */
export function compilar(doc: LpDocumento, opcoes: OpcoesCompilar = {}): Compilado {
  const { corpo, idsPorSecao, midias } = compilarCorpo(doc, {
    modo: 'export',
    urlLocal: opcoes.urlLocal,
  })
  const css = compilarCss(doc, idsPorSecao)
  const js = compilarJs(doc)
  const head = cabecalho(doc, opcoes)

  const html = pagina(
    `${head}\n<link rel="stylesheet" href="style.css">`,
    `${corpo}\n<script src="script.js"></script>`,
  )
  const unico = pagina(
    `${head}\n<style>\n${css}</style>`,
    `${corpo}\n<script>\n${js}</script>`,
  )

  // Paginas de texto: mesmo CSS e mesmo script (menu do header), so o corpo muda.
  const paginas: PaginaCompilada[] = paginasGeradas(doc).map((p) => {
    const saida = compilarCorpoPagina(doc, p, { modo: 'export', urlLocal: opcoes.urlLocal })
    for (const m of saida.midias) {
      if (!midias.some((x) => x.url === m.url)) midias.push(m)
    }
    const cabeca = `${cabecalhoPagina(doc, p, opcoes)}`
    return {
      arquivo: infoPagina(p.tipo).arquivo,
      titulo: p.titulo,
      html: pagina(
        `${cabeca}\n<link rel="stylesheet" href="style.css">`,
        `${saida.corpo}\n<script src="script.js"></script>`,
      ),
      unico: pagina(`${cabeca}\n<style>\n${css}</style>`, `${saida.corpo}\n<script>\n${js}</script>`),
    }
  })

  return { html, css, js, unico, midias, paginas }
}

/** Compila a pagina do canvas do editor (marcas data-lp + runtime de edicao). */
export function compilarEditor(doc: LpDocumento): string {
  const { corpo, idsPorSecao } = compilarCorpo(doc, { modo: 'editor' })
  const css = compilarCss(doc, idsPorSecao)
  const js = compilarJs(doc, 'editor')
  const head = `${cabecalho(doc, {})}\n<style>\n${css}</style>\n<style>${CSS_EDITOR}</style>`
  return pagina(head, `${corpo}\n<script>\n${js}</script>\n<script>${EDITOR_RUNTIME}</script>`)
}
