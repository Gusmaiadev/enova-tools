import 'server-only'

/**
 * Monta o pacote .zip da landing page pronta.
 *
 * - 'unico': index.html com CSS e JS embutidos + assets/ com as mídias.
 * - 'projeto': index.html, style.css, script.js, assets/images, assets/videos,
 *   assets/fonts (com as fontes baixadas e o CSS reescrito para local).
 *
 * Mídias que não puderem ser baixadas continuam apontando para a URL remota —
 * a página não quebra, e o aviso volta para a tela.
 */

import { compilar } from './compilador'
import { urlGoogleFonts } from './fontes'
import { fetchExternoSeguro } from './rede'
import type { LpDocumento } from './tipos'
import { slugificar } from './util'
import { gerarZip, type ArquivoZip } from './zip'

export type FormatoExport = 'unico' | 'projeto'

const LIMITE_ARQUIVO = 12 * 1024 * 1024
const LIMITE_TOTAL = 60 * 1024 * 1024

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
  'font/ttf': 'ttf',
}

function extensaoDe(url: string, contentType: string | null, padrao: string): string {
  const tipo = (contentType ?? '').split(';')[0].trim().toLowerCase()
  if (EXTENSOES[tipo]) return EXTENSOES[tipo]
  const naUrl = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase()
  if (naUrl && Object.values(EXTENSOES).includes(naUrl)) return naUrl
  return padrao
}

async function baixar(url: string): Promise<{ dados: Uint8Array; tipo: string | null } | null> {
  if (!/^https?:\/\//i.test(url)) return null
  try {
    const resp = await fetchExternoSeguro(url, {
      headers: { 'User-Agent': 'E-nova Tools (export de landing page)' },
      signal: AbortSignal.timeout(30000),
    })
    if (!resp.ok) return null
    const tamanho = Number(resp.headers.get('content-length') ?? '0')
    if (tamanho > LIMITE_ARQUIVO) return null
    const buffer = await resp.arrayBuffer()
    if (buffer.byteLength > LIMITE_ARQUIVO) return null
    return { dados: new Uint8Array(buffer), tipo: resp.headers.get('content-type') }
  } catch {
    return null
  }
}

async function emLotes<T>(tarefas: (() => Promise<T>)[], limite: number): Promise<T[]> {
  const resultados: T[] = []
  for (let i = 0; i < tarefas.length; i += limite) {
    const lote = tarefas.slice(i, i + limite)
    resultados.push(...(await Promise.all(lote.map((t) => t()))))
  }
  return resultados
}

/** Baixa as fontes do Google e devolve o CSS reescrito + os arquivos. */
async function baixarFontes(
  doc: LpDocumento,
): Promise<{ arquivos: ArquivoZip[]; ok: boolean }> {
  const familias = new Set<string>()
  const t = doc.tema.tipografia
  for (const cat of ['titulos', 'subtitulos', 'textos', 'botoes'] as const) {
    familias.add(t[cat].fonte)
  }
  for (const s of doc.secoes) {
    for (const a of Object.values(s.ajustes ?? {})) {
      if (a?.fonte) familias.add(a.fonte)
    }
  }
  const url = urlGoogleFonts([...familias])
  if (!url) return { arquivos: [], ok: true }

  try {
    // UA de navegador moderno: sem isso o Google devolve TTF em vez de woff2.
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!resp.ok) return { arquivos: [], ok: false }
    let css = await resp.text()

    const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))]
    const arquivos: ArquivoZip[] = []
    const mapa = new Map<string, string>()

    const baixados = await emLotes(
      urls.slice(0, 40).map((u) => async () => ({ u, r: await baixar(u) })),
      6,
    )
    for (const { u, r } of baixados) {
      if (!r) continue
      const nome = `f${arquivos.length + 1}.${extensaoDe(u, r.tipo, 'woff2')}`
      arquivos.push({ caminho: `assets/fonts/${nome}`, dados: r.dados })
      mapa.set(u, nome)
    }
    if (arquivos.length === 0) return { arquivos: [], ok: false }

    for (const [remota, local] of mapa) {
      css = css.split(remota).join(local)
    }
    arquivos.push({
      caminho: 'assets/fonts/fontes.css',
      dados: new TextEncoder().encode(css),
    })
    return { arquivos, ok: true }
  } catch {
    return { arquivos: [], ok: false }
  }
}

export type Pacote = {
  zip: Uint8Array
  nomeArquivo: string
  avisos: string[]
}

/** Compila, baixa os assets e devolve o .zip pronto para download. */
export async function montarPacote(
  doc: LpDocumento,
  nomeProjeto: string,
  formato: FormatoExport,
): Promise<Pacote> {
  const avisos: string[] = []

  // 1ª compilação: só para descobrir quais mídias a página usa.
  const previa = compilar(doc)
  const remotas = previa.midias.filter((m) => /^https?:\/\//i.test(m.url))

  const urlLocal = new Map<string, string>()
  const arquivos: ArquivoZip[] = []
  let total = 0
  let falhas = 0

  const baixadas = await emLotes(
    remotas.map((m) => async () => ({ midia: m, resposta: await baixar(m.url) })),
    4,
  )

  for (const { midia, resposta } of baixadas) {
    if (!resposta || total + resposta.dados.length > LIMITE_TOTAL) {
      falhas++
      continue
    }
    const pasta = midia.tipo === 'video' ? 'videos' : 'images'
    const ext = extensaoDe(midia.url, resposta.tipo, midia.tipo === 'video' ? 'mp4' : 'jpg')
    const base = slugificar(midia.busca || midia.tipo) || midia.tipo
    const nome = `${base}-${arquivos.length + 1}.${ext}`
    const caminho = `assets/${pasta}/${nome}`
    arquivos.push({ caminho, dados: resposta.dados })
    urlLocal.set(midia.url, caminho)
    total += resposta.dados.length
  }

  if (falhas > 0) {
    avisos.push(
      `${falhas} ${falhas === 1 ? 'mídia continuou apontando' : 'mídias continuaram apontando'} para a URL original (não foi possível baixar).`,
    )
  }

  const codificador = new TextEncoder()

  if (formato === 'projeto') {
    const fontes = await baixarFontes(doc)
    if (!fontes.ok) {
      avisos.push('Não consegui baixar as fontes: a página vai carregá-las do Google Fonts.')
    }
    arquivos.push(...fontes.arquivos)

    const final = compilar(doc, { urlLocal, fontesLocais: fontes.arquivos.length > 0 })
    arquivos.unshift(
      { caminho: 'index.html', dados: codificador.encode(final.html) },
      { caminho: 'style.css', dados: codificador.encode(final.css) },
      { caminho: 'script.js', dados: codificador.encode(final.js) },
      { caminho: 'README.txt', dados: codificador.encode(leiaMe(nomeProjeto, 'projeto')) },
    )
  } else {
    const final = compilar(doc, { urlLocal })
    arquivos.unshift(
      { caminho: 'index.html', dados: codificador.encode(final.unico) },
      { caminho: 'README.txt', dados: codificador.encode(leiaMe(nomeProjeto, 'unico')) },
    )
  }

  const base = slugificar(nomeProjeto) || 'landing-page'
  return {
    zip: gerarZip(arquivos),
    nomeArquivo: `${base}-${formato === 'unico' ? 'arquivo-unico' : 'projeto'}.zip`,
    avisos,
  }
}

function leiaMe(nome: string, formato: FormatoExport): string {
  const estrutura =
    formato === 'unico'
      ? `- index.html ....... a página inteira (HTML + CSS + JavaScript juntos)
- assets/images .... imagens usadas
- assets/videos .... vídeos usados`
      : `- index.html ....... estrutura da página
- style.css ........ estilos
- script.js ........ interações (menu, slider, abas, formulário)
- assets/images .... imagens usadas
- assets/videos .... vídeos usados
- assets/fonts ..... fontes + fontes.css`

  return `${nome}
${'='.repeat(nome.length)}

Landing page gerada com o Criador de Landing Pages da E-nova Tools.

ESTRUTURA
${estrutura}

COMO PUBLICAR
Envie todos os arquivos e pastas (mantendo a estrutura) para a hospedagem.
Para testar no computador, abra o index.html no navegador.

FORMULÁRIO DE CONTATO
O formulário valida os campos e mostra a confirmação, mas ainda não envia os
dados para lugar nenhum. Para receber as mensagens, ligue o envio no final do
script (procure por "lp-form") a um serviço de formulários ou ao seu backend.

MÍDIAS
As imagens e vídeos são PRÉVIAS do banco de mídias. Antes de publicar,
baixe as versões licenciadas na sua conta e substitua os arquivos em assets/,
mantendo os mesmos nomes.
`
}
