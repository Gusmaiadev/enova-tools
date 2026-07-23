/**
 * Monta os artefatos finais da landing page: index.html, style.css, script.js,
 * o arquivo unico (tudo inline) e a versao de editor (com runtime de edicao).
 * Puro — roda no client (editor ao vivo) e no server (geracao/export).
 */

import { urlGoogleFonts } from '../fontes'
import { CSS_EDITOR, EDITOR_RUNTIME } from '../editorRuntime'
import type { LpDocumento } from '../tipos'
import { esc } from '../util'
import { compilarCss } from './css'
import { compilarCorpo, type MidiaColetada } from './html'
import { compilarJs } from './js'

export type Compilado = {
  /** index.html com <link href="style.css"> e <script src="script.js">. */
  html: string
  css: string
  js: string
  /** Pagina completa em um unico arquivo (CSS e JS inline). */
  unico: string
  midias: MidiaColetada[]
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
  return { html, css, js, unico, midias }
}

/** Compila a pagina do canvas do editor (marcas data-lp + runtime de edicao). */
export function compilarEditor(doc: LpDocumento): string {
  const { corpo, idsPorSecao } = compilarCorpo(doc, { modo: 'editor' })
  const css = compilarCss(doc, idsPorSecao)
  const js = compilarJs(doc, 'editor')
  const head = `${cabecalho(doc, {})}\n<style>\n${css}</style>\n<style>${CSS_EDITOR}</style>`
  return pagina(head, `${corpo}\n<script>\n${js}</script>\n<script>${EDITOR_RUNTIME}</script>`)
}
