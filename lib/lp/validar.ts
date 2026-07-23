/**
 * Coercao defensiva de um LpDocumento vindo de fora (resposta da IA ou PUT do
 * editor). Nunca lanca: campos invalidos caem em defaults, secoes de tipo
 * desconhecido sao descartadas. Puro (testavel; usado no server e no client).
 */

import { TEMA_PADRAO, temaDoBriefing } from './documento'
import { fontePorNome, pesoValido } from './fontes'
import { ICONES } from './icones'
import { LAYOUTS } from './layouts'
import { placeholderMidia } from './placeholder'
import type {
  AjusteTexto,
  LpBotao,
  LpBriefing,
  LpDocumento,
  LpItem,
  LpMidia,
  LpSecao,
  LpTema,
  Orientacao,
  Rede,
  TipoLayout,
} from './tipos'
import { ROTULO_REDE } from './tipos'
import { clonar } from './documento'
import { corSegura, gerarId, limitar, normalizarUrl, slugificar } from './util'

const TIPOS_LAYOUT = new Set<string>(LAYOUTS.map((l) => l.tipo))
const ORIENTACOES = new Set<string>(['paisagem', 'retrato', 'quadrado'])
const REDES = new Set<string>(Object.keys(ROTULO_REDE))

const str = (v: unknown, max = 4000): string =>
  typeof v === 'string' ? v.slice(0, max).trim() : ''

const strOu = (v: unknown, fallback: string, max = 4000): string => {
  const s = str(v, max)
  return s === '' ? fallback : s
}

const opcional = (v: unknown, max = 4000): string | undefined => {
  const s = str(v, max)
  return s === '' ? undefined : s
}

const obj = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/**
 * Id de seção/item vira id de HTML, seletor de CSS e valor de data-lp — só pode
 * conter [A-Za-z0-9_-]. Qualquer outro caractere é removido (fecha o XSS por id
 * na origem, antes de chegar ao compilador).
 */
const idSeguro = (v: unknown): string => {
  const limpo = str(v, 24).replace(/[^A-Za-z0-9_-]/g, '')
  return limpo === '' ? gerarId() : limpo
}

function coergirBotao(v: unknown): LpBotao | null {
  const b = obj(v)
  const texto = str(b.texto, 80)
  if (texto === '') return null
  const botao: LpBotao = { texto, url: strOu(b.url, '#', 600) }
  if (b.estilo === 'contorno') botao.estilo = 'contorno'
  const corFundo = opcional(b.corFundo, 40)
  const corTexto = opcional(b.corTexto, 40)
  if (corFundo) botao.corFundo = corSegura(corFundo, '#2563eb')
  if (corTexto) botao.corTexto = corSegura(corTexto, '#ffffff')
  return botao
}

function coergirMidia(v: unknown): LpMidia | null {
  const m = obj(v)
  const busca = str(m.busca, 200)
  const url = str(m.url, 2000)
  if (busca === '' && url === '') return null
  const tipo = m.tipo === 'video' ? 'video' : 'imagem'
  const orientacao = (ORIENTACOES.has(String(m.orientacao)) ? m.orientacao : 'paisagem') as Orientacao
  if (url === '') {
    // Placeholder, mas preserva o alt em português que a IA escreveu.
    const ph = placeholderMidia(busca, orientacao, tipo)
    const alt = opcional(m.alt, 300)
    return alt ? { ...ph, alt } : ph
  }
  return {
    tipo,
    url,
    alt: strOu(m.alt, busca || 'Imagem', 300),
    busca,
    orientacao,
    ...(opcional(m.origem, 600) ? { origem: opcional(m.origem, 600) } : {}),
  }
}

function coergirItem(v: unknown): LpItem {
  const i = obj(v)
  const item: LpItem = { id: idSeguro(i.id) }
  const icone = str(i.icone, 40)
  if (icone !== '' && ICONES[icone]) item.icone = icone
  const imagem = coergirMidia(i.imagem)
  if (imagem) item.imagem = imagem
  const campos = ['titulo', 'texto', 'extra', 'detalhe', 'url'] as const
  for (const campo of campos) {
    const valor = opcional(i[campo], campo === 'texto' ? 2000 : 300)
    if (valor) item[campo] = valor
  }
  const linhas = lista(i.lista)
    .map((l) => str(l, 200))
    .filter((l) => l !== '')
    .slice(0, 12)
  if (linhas.length > 0) item.lista = linhas
  const botao = coergirBotao(i.botao)
  if (botao) item.botao = botao
  if (i.destaque === true) item.destaque = true
  return item
}

function coergirAjuste(v: unknown): AjusteTexto | undefined {
  const a = obj(v)
  const ajuste: AjusteTexto = {}
  const cor = opcional(a.cor, 40)
  if (cor) ajuste.cor = corSegura(cor, '#0f172a')
  const fonte = str(a.fonte, 60)
  if (fonte && fontePorNome(fonte)) ajuste.fonte = fonte
  const tamanho = opcional(a.tamanho, 20)
  if (tamanho && /^\d{1,3}(\.\d+)?(px|rem|em)$/.test(tamanho)) ajuste.tamanho = tamanho
  if (typeof a.peso === 'number') ajuste.peso = limitar(a.peso, 100, 900, 400)
  const altura = opcional(a.alturaLinha, 12)
  if (altura && /^\d(\.\d+)?$/.test(altura)) ajuste.alturaLinha = altura
  const espaco = opcional(a.espacamentoLetras, 12)
  if (espaco && /^-?\d(\.\d+)?(px|em)$/.test(espaco)) ajuste.espacamentoLetras = espaco
  if (a.alinhamento === 'left' || a.alinhamento === 'center' || a.alinhamento === 'right') {
    ajuste.alinhamento = a.alinhamento
  }
  return Object.keys(ajuste).length > 0 ? ajuste : undefined
}

function coergirSecao(v: unknown, ancoras: Set<string>): LpSecao | null {
  const s = obj(v)
  const tipo = String(s.tipo ?? '')
  if (!TIPOS_LAYOUT.has(tipo)) return null

  const nome = strOu(s.nome, strOu(s.titulo, 'Seção', 80), 80)
  let ancora: string | null = null
  const ancoraBruta = str(s.ancora, 60)
  if (ancoraBruta !== '') {
    const base = slugificar(ancoraBruta)
    let candidata = base
    let n = 2
    while (ancoras.has(candidata)) candidata = `${base}-${n++}`
    ancoras.add(candidata)
    ancora = candidata
  }

  const secao: LpSecao = {
    id: idSeguro(s.id),
    tipo: tipo as TipoLayout,
    nome,
    ancora,
    itens: lista(s.itens).map(coergirItem).slice(0, 24),
    largura: s.largura === 'full' ? 'full' : 'boxed',
  }
  const titulo = opcional(s.titulo, 300)
  if (titulo) secao.titulo = titulo
  const subtitulo = opcional(s.subtitulo, 500)
  if (subtitulo) secao.subtitulo = subtitulo
  const texto = opcional(s.texto, 4000)
  if (texto) secao.texto = texto
  const botao = coergirBotao(s.botao)
  if (botao) secao.botao = botao
  const midia = coergirMidia(s.midia)
  if (midia) secao.midia = midia
  if (s.colunas === 2 || s.colunas === 3 || s.colunas === 4) secao.colunas = s.colunas
  if (s.inverter === true) secao.inverter = true

  const fundo = obj(s.fundo)
  const fundoCor = opcional(fundo.cor, 40)
  const fundoMidia = coergirMidia(fundo.midia)
  if (fundoCor || fundoMidia || typeof fundo.escurecer === 'number') {
    secao.fundo = {}
    if (fundoCor) secao.fundo.cor = corSegura(fundoCor, '#f1f5f9')
    if (fundoMidia) secao.fundo.midia = fundoMidia
    if (typeof fundo.escurecer === 'number') {
      secao.fundo.escurecer = limitar(fundo.escurecer, 0, 90, 55)
    }
  }

  const esp = obj(s.espacamento)
  secao.espacamento = {
    topo: limitar(esp.topo, 0, 240, 88),
    base: limitar(esp.base, 0, 240, 88),
  }

  const rotulos = lista(s.rotulos)
    .map((r) => str(r, 120))
    .filter((r) => r !== '')
    .slice(0, 16)
  if (rotulos.length > 0) secao.rotulos = rotulos

  const destinoForm = opcional(s.destinoForm, 600)
  if (destinoForm) secao.destinoForm = destinoForm

  const ajustes = obj(s.ajustes)
  const coletados: LpSecao['ajustes'] = {}
  for (const el of ['titulo', 'subtitulo', 'texto'] as const) {
    const a = coergirAjuste(ajustes[el])
    if (a) coletados[el] = a
  }
  if (Object.keys(coletados).length > 0) secao.ajustes = coletados

  return secao
}

function coergirTema(v: unknown, base: LpTema): LpTema {
  const tema = clonar(base)
  const t = obj(v)
  const tipografia = obj(t.tipografia)
  for (const cat of ['titulos', 'subtitulos', 'textos', 'botoes'] as const) {
    const e = obj(tipografia[cat])
    const alvo = tema.tipografia[cat]
    const fonte = str(e.fonte, 60)
    if (fonte && fontePorNome(fonte)) alvo.fonte = fonte
    if (typeof e.peso === 'number') {
      alvo.peso = pesoValido(alvo.fonte, limitar(e.peso, 100, 900, alvo.peso))
    }
    const tamanho = str(e.tamanho, 20)
    if (/^\d{1,3}(\.\d+)?px$/.test(tamanho)) alvo.tamanho = tamanho
    const altura = str(e.alturaLinha, 12)
    if (/^\d(\.\d+)?$/.test(altura)) alvo.alturaLinha = altura
    const espaco = str(e.espacamentoLetras, 12)
    if (/^-?\d(\.\d+)?(px|em)$/.test(espaco)) alvo.espacamentoLetras = espaco
  }
  const cores = obj(t.cores)
  for (const chave of Object.keys(tema.cores) as (keyof LpTema['cores'])[]) {
    const cor = str(cores[chave], 40)
    if (cor !== '') tema.cores[chave] = corSegura(cor, tema.cores[chave])
  }
  if (typeof t.raio === 'number') tema.raio = limitar(t.raio, 0, 32, tema.raio)
  return tema
}

/** Coage o briefing vindo do assistente (client) — nunca lanca. */
export function coergirBriefing(bruto: unknown, nomeAtual: string): LpBriefing {
  const b = obj(bruto)

  const tipografia: LpBriefing['tipografia'] = {}
  const tipoBruto = obj(b.tipografia)
  for (const cat of ['titulos', 'subtitulos', 'textos', 'botoes'] as const) {
    const e = obj(tipoBruto[cat])
    const pref: Partial<import('./tipos').EstiloTipografia> = {}
    const fonte = str(e.fonte, 60)
    if (fonte && fontePorNome(fonte)) pref.fonte = fonte
    if (typeof e.peso === 'number') pref.peso = limitar(e.peso, 100, 900, 400)
    const tamanho = str(e.tamanho, 20)
    if (/^\d{1,3}(\.\d+)?px$/.test(tamanho)) pref.tamanho = tamanho
    const altura = str(e.alturaLinha, 12)
    if (/^\d(\.\d+)?$/.test(altura)) pref.alturaLinha = altura
    const espaco = str(e.espacamentoLetras, 12)
    if (/^-?\d(\.\d+)?(px|em)$/.test(espaco)) pref.espacamentoLetras = espaco
    if (Object.keys(pref).length > 0) tipografia[cat] = pref
  }

  const cores: LpBriefing['cores'] = {}
  const coresBrutas = obj(b.cores)
  for (const chave of Object.keys(TEMA_PADRAO.cores) as (keyof LpTema['cores'])[]) {
    const cor = str(coresBrutas[chave], 40)
    if (cor !== '') cores[chave] = corSegura(cor, TEMA_PADRAO.cores[chave])
  }

  const footerBruto = obj(b.footer)

  return {
    nome: strOu(b.nome, nomeAtual, 80),
    tipografia,
    cores,
    referencias: lista(b.referencias)
      .map((r) => normalizarUrl(str(r, 300)))
      .filter((r) => /^https?:\/\//i.test(r))
      .slice(0, 5),
    menu: lista(b.menu)
      .map((m) => {
        const item = obj(m)
        const rotulo = str(item.rotulo, 40)
        if (rotulo === '') return null
        return { id: strOu(item.id, gerarId(), 24), rotulo, url: str(item.url, 600) }
      })
      .filter((m): m is { id: string; rotulo: string; url: string } => m !== null)
      .slice(0, 12),
    footer: {
      textoInstitucional: str(footerBruto.textoInstitucional, 600),
      direitos: str(footerBruto.direitos, 200),
      endereco: str(footerBruto.endereco, 300),
      telefones: str(footerBruto.telefones, 120),
      email: str(footerBruto.email, 120),
      linksUteis: lista(footerBruto.linksUteis)
        .map((l) => {
          const link = obj(l)
          const rotulo = str(link.rotulo, 60)
          if (rotulo === '') return null
          return { id: strOu(link.id, gerarId(), 24), rotulo, url: str(link.url, 600) }
        })
        .filter((l): l is { id: string; rotulo: string; url: string } => l !== null)
        .slice(0, 12),
      menuSecundario: footerBruto.menuSecundario === true,
    },
    redes: lista(b.redes)
      .map((r) => {
        const rede = obj(r)
        const nome = String(rede.rede ?? '')
        const url = str(rede.url, 600)
        if (!REDES.has(nome) || url === '') return null
        return { id: strOu(rede.id, gerarId(), 24), rede: nome as Rede, url }
      })
      .filter((r): r is { id: string; rede: Rede; url: string } => r !== null)
      .slice(0, 8),
    secoes: lista(b.secoes)
      .map((s) => {
        const secao = obj(s)
        const layout = String(secao.layout ?? '')
        if (!TIPOS_LAYOUT.has(layout)) return null
        const midiaBruta = obj(secao.midia)
        const busca = str(midiaBruta.busca, 200)
        const colunas: 2 | 3 | 4 | undefined =
          secao.colunas === 2 || secao.colunas === 3 || secao.colunas === 4
            ? secao.colunas
            : undefined
        return {
          id: strOu(secao.id, gerarId(), 24),
          nome: strOu(secao.nome, 'Seção', 80),
          vincularMenu: secao.vincularMenu === true,
          titulo: str(secao.titulo, 300),
          conteudo: str(secao.conteudo, 3000),
          layout: layout as TipoLayout,
          ...(colunas ? { colunas } : {}),
          midia:
            busca === ''
              ? null
              : {
                  busca,
                  tipo: midiaBruta.tipo === 'video' ? ('video' as const) : ('imagem' as const),
                  orientacao: (ORIENTACOES.has(String(midiaBruta.orientacao))
                    ? midiaBruta.orientacao
                    : 'paisagem') as Orientacao,
                },
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .slice(0, 30),
  }
}

/**
 * Coage um documento bruto (IA ou PUT do editor) num LpDocumento valido.
 * Devolve null so quando nao ha nada aproveitavel (sem secoes validas).
 */
export function coergirDocumento(bruto: unknown, temaBase: LpTema = TEMA_PADRAO): LpDocumento | null {
  const d = obj(bruto)
  const ancoras = new Set<string>()
  const secoes = lista(d.secoes)
    .map((s) => coergirSecao(s, ancoras))
    .filter((s): s is LpSecao => s !== null)
    .slice(0, 40)
  if (secoes.length === 0) return null

  const seo = obj(d.seo)
  const header = obj(d.header)
  const footer = obj(d.footer)

  const menu = lista(header.menu)
    .map((m) => {
      const item = obj(m)
      const rotulo = str(item.rotulo, 40)
      if (rotulo === '') return null
      return {
        id: strOu(item.id, gerarId(), 24),
        rotulo,
        alvo: strOu(item.alvo, '#topo', 600),
      }
    })
    .filter((m): m is { id: string; rotulo: string; alvo: string } => m !== null)
    .slice(0, 12)

  const redes = lista(d.redes)
    .map((r) => {
      const rede = obj(r)
      const nome = String(rede.rede ?? '')
      const url = str(rede.url, 600)
      if (!REDES.has(nome) || url === '') return null
      return { id: strOu(rede.id, gerarId(), 24), rede: nome as Rede, url }
    })
    .filter((r): r is { id: string; rede: Rede; url: string } => r !== null)
    .slice(0, 8)

  const linksUteis = lista(footer.linksUteis)
    .map((l) => {
      const link = obj(l)
      const rotulo = str(link.rotulo, 60)
      if (rotulo === '') return null
      return {
        id: strOu(link.id, gerarId(), 24),
        rotulo,
        url: strOu(link.url, '#', 600),
      }
    })
    .filter((l): l is { id: string; rotulo: string; url: string } => l !== null)
    .slice(0, 12)

  const logoTexto = strOu(header.logoTexto, 'Minha marca', 60)

  return {
    seo: {
      titulo: strOu(seo.titulo, logoTexto, 90),
      descricao: strOu(seo.descricao, logoTexto, 200),
    },
    tema: coergirTema(d.tema, temaBase),
    header: {
      logoTexto,
      menu,
      fixo: header.fixo !== false,
      botao: coergirBotao(header.botao),
    },
    secoes,
    footer: {
      textoInstitucional: opcional(footer.textoInstitucional, 600),
      direitos: opcional(footer.direitos, 200),
      endereco: opcional(footer.endereco, 300),
      telefones: opcional(footer.telefones, 120),
      email: opcional(footer.email, 120),
      linksUteis,
      menuSecundario: footer.menuSecundario === true,
    },
    redes,
  }
}

/**
 * Variante para a resposta da IA: coage e depois reimpoe as preferencias
 * explicitas do briefing (tipografia/cores que o usuario definiu vencem a IA).
 */
export function coergirDocumentoIA(bruto: unknown, briefing: LpBriefing): LpDocumento | null {
  const temaBriefing = temaDoBriefing(briefing)
  const doc = coergirDocumento(bruto, temaBriefing)
  if (!doc) return null
  for (const chave of Object.keys(doc.tema.cores) as (keyof LpTema['cores'])[]) {
    if (briefing.cores[chave]) doc.tema.cores[chave] = temaBriefing.cores[chave]
  }
  for (const cat of ['titulos', 'subtitulos', 'textos', 'botoes'] as const) {
    const pref = briefing.tipografia[cat]
    if (!pref) continue
    const alvo = doc.tema.tipografia[cat]
    const escolhido = temaBriefing.tipografia[cat]
    if (pref.fonte) alvo.fonte = escolhido.fonte
    if (pref.peso) alvo.peso = escolhido.peso
    if (pref.tamanho) alvo.tamanho = escolhido.tamanho
    if (pref.alturaLinha) alvo.alturaLinha = escolhido.alturaLinha
    if (pref.espacamentoLetras) alvo.espacamentoLetras = escolhido.espacamentoLetras
  }
  return doc
}
