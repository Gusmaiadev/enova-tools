import 'server-only'

/**
 * Analise leve dos sites de referencia do briefing: baixa o HTML e extrai
 * sinais de estilo (titulo, descricao, fontes, paleta de cores, headings)
 * para dar contexto de INSPIRACAO a IA — nunca copia de conteudo.
 */

import { fetchExternoSeguro } from './rede'

export type ResumoReferencia = {
  url: string
  resumo: string
}

const LIMITE_HTML = 400_000

function extrairEntre(html: string, regex: RegExp): string[] {
  const achados: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null && achados.length < 12) {
    const texto = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (texto !== '') achados.push(texto.slice(0, 120))
  }
  return achados
}

function analisarHtml(url: string, html: string): ResumoReferencia {
  const doc = html.slice(0, LIMITE_HTML)

  const titulo = extrairEntre(doc, /<title[^>]*>([\s\S]*?)<\/title>/gi)[0] ?? ''
  const descricao =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})["']/i.exec(doc)?.[1] ??
    /<meta[^>]+content=["']([^"']{0,300})["'][^>]+name=["']description["']/i.exec(doc)?.[1] ??
    ''

  const headings = [
    ...extrairEntre(doc, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
    ...extrairEntre(doc, /<h2[^>]*>([\s\S]*?)<\/h2>/gi),
  ].slice(0, 8)

  // Fontes: declaracoes font-family + links do Google Fonts.
  const fontes = new Set<string>()
  let m: RegExpExecArray | null
  const reFont = /font-family\s*:\s*["']?([A-Za-z0-9 \-]{3,40})/g
  while ((m = reFont.exec(doc)) !== null && fontes.size < 6) {
    const nome = m[1].trim()
    if (!/^(inherit|initial|sans|serif|monospace|system)/i.test(nome)) fontes.add(nome)
  }
  const reGoogle = /fonts\.googleapis\.com\/css2?\?[^"']*family=([A-Za-z+%0-9|:;,@.]+)/g
  while ((m = reGoogle.exec(doc)) !== null && fontes.size < 8) {
    for (const parte of m[1].split(/[|&]/)) {
      const nome = decodeURIComponent(parte.split(':')[0]).replace(/\+/g, ' ').replace(/^family=/, '')
      if (nome.length > 2) fontes.add(nome)
    }
  }

  // Paleta: hex mais frequentes fora de branco/preto puros.
  const contagem = new Map<string, number>()
  const reCor = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
  while ((m = reCor.exec(doc)) !== null) {
    let hex = m[1].toLowerCase()
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    if (['ffffff', '000000', 'fff', '000'].includes(hex)) continue
    contagem.set(hex, (contagem.get(hex) ?? 0) + 1)
  }
  const cores = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex]) => `#${hex}`)

  const partes = [
    titulo && `título: ${titulo}`,
    descricao && `descrição: ${descricao}`,
    headings.length > 0 && `headings: ${headings.join(' | ')}`,
    fontes.size > 0 && `fontes: ${[...fontes].join(', ')}`,
    cores.length > 0 && `cores frequentes: ${cores.join(', ')}`,
  ].filter(Boolean)

  return {
    url,
    resumo: partes.length > 0 ? partes.join('\n') : 'sem sinais aproveitáveis',
  }
}

/** Analisa ate 5 referencias em paralelo; falhas viram nota e nao erro. */
export async function analisarReferencias(urls: string[]): Promise<ResumoReferencia[]> {
  const validas = urls
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 5)

  const resultados = await Promise.allSettled(
    validas.map(async (url) => {
      const resp = await fetchExternoSeguro(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; E-novaTools/1.0; analise de referencia visual a pedido do usuario)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!resp.ok) throw new Error(String(resp.status))
      const html = await resp.text()
      return analisarHtml(url, html)
    }),
  )

  return resultados.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { url: validas[i], resumo: 'não foi possível acessar o site' },
  )
}
