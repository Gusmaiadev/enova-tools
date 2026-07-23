/**
 * Operacoes puras sobre o LpDocumento: tema padrao, documento base a partir do
 * briefing (fallback deterministico quando a IA nao esta configurada) e as
 * mutacoes imutaveis usadas pelo reducer do editor.
 */

import { pesoValido } from './fontes'
import { novoItem } from './layouts'
import { placeholderMidia } from './placeholder'
import type {
  CategoriaTexto,
  EstiloTipografia,
  LpBriefing,
  LpDocumento,
  LpSecao,
  LpTema,
} from './tipos'
import { corSegura, gerarId, limitar, slugificar } from './util'

export const TEMA_PADRAO: LpTema = {
  tipografia: {
    titulos: { fonte: 'Sora', peso: 700, tamanho: '42px', alturaLinha: '1.15', espacamentoLetras: '-0.01em' },
    subtitulos: { fonte: 'Inter', peso: 500, tamanho: '20px', alturaLinha: '1.5', espacamentoLetras: '0' },
    textos: { fonte: 'Inter', peso: 400, tamanho: '16px', alturaLinha: '1.7', espacamentoLetras: '0' },
    botoes: { fonte: 'Inter', peso: 600, tamanho: '16px', alturaLinha: '1.2', espacamentoLetras: '0.01em' },
  },
  cores: {
    principal: '#2563eb',
    secundaria: '#7c3aed',
    titulos: '#0f172a',
    subtitulos: '#334155',
    textos: '#475569',
    botoes: '#ffffff',
    fundoBotoes: '#2563eb',
    header: '#ffffff',
    footer: '#0f172a',
    fundoPagina: '#ffffff',
  },
  raio: 12,
}

/** Tema resolvido: preferencias do briefing por cima do padrao, normalizadas. */
export function temaDoBriefing(briefing: LpBriefing): LpTema {
  const tema: LpTema = clonar(TEMA_PADRAO)
  const cats: CategoriaTexto[] = ['titulos', 'subtitulos', 'textos', 'botoes']
  for (const cat of cats) {
    const pref = briefing.tipografia[cat]
    if (!pref) continue
    const alvo: EstiloTipografia = tema.tipografia[cat]
    if (pref.fonte) alvo.fonte = pref.fonte
    if (pref.peso) alvo.peso = pesoValido(alvo.fonte, limitar(pref.peso, 100, 900, alvo.peso))
    if (pref.tamanho) alvo.tamanho = pref.tamanho
    if (pref.alturaLinha) alvo.alturaLinha = pref.alturaLinha
    if (pref.espacamentoLetras) alvo.espacamentoLetras = pref.espacamentoLetras
  }
  for (const chave of Object.keys(tema.cores) as (keyof LpTema['cores'])[]) {
    const cor = briefing.cores[chave]
    if (cor) tema.cores[chave] = corSegura(cor, tema.cores[chave])
  }
  return tema
}

/** Clone estrutural (o documento e JSON puro). */
export function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}

/**
 * Documento deterministico construido so com o briefing (sem IA): usado como
 * fallback quando GEMINI_API_KEY nao esta configurada e como base que a IA
 * enriquece. Midias viram placeholders ate a busca no Envato preencher.
 */
export function documentoBase(briefing: LpBriefing): LpDocumento {
  const tema = temaDoBriefing(briefing)
  const ancoras = new Set<string>()

  const secoes: LpSecao[] = briefing.secoes.map((sb) => {
    let ancora: string | null = null
    if (sb.vincularMenu) {
      const base = slugificar(sb.nome || sb.titulo || 'secao')
      let n = 2
      ancora = base
      while (ancoras.has(ancora)) ancora = `${base}-${n++}`
      ancoras.add(ancora)
    }
    const secao: LpSecao = {
      id: gerarId(),
      tipo: sb.layout,
      nome: sb.nome || sb.titulo || 'Seção',
      ancora,
      titulo: sb.titulo || sb.nome,
      texto: sb.conteudo || undefined,
      itens: [],
      largura: sb.layout === 'banner' ? 'full' : 'boxed',
      espacamento: { topo: 88, base: 88 },
    }
    if (sb.colunas) secao.colunas = sb.colunas
    if (sb.midia?.busca) {
      secao.midia = placeholderMidia(sb.midia.busca, sb.midia.orientacao, sb.midia.tipo)
    }
    const modelo = novoItem(sb.layout)
    if (Object.keys(modelo).length > 1) {
      secao.itens = [novoItem(sb.layout), novoItem(sb.layout), novoItem(sb.layout)]
      if (sb.layout === 'comparacao') {
        secao.itens = secao.itens.slice(0, 2)
        secao.rotulos = ['Característica um', 'Característica dois', 'Característica três']
      }
    }
    if (sb.layout === 'hero' || sb.layout === 'cta') {
      secao.botao = { texto: 'Fale conosco', url: '#' }
      secao.subtitulo = secao.subtitulo ?? ''
    }
    return secao
  })

  // Menu: itens do briefing com URL, senao ligados a secao de nome parecido.
  const menu = briefing.menu.map((m) => {
    if (m.url.trim() !== '') return { id: m.id, rotulo: m.rotulo, alvo: m.url }
    const alvoSecao = secoes.find(
      (s) => s.ancora && (s.nome.toLowerCase() === m.rotulo.toLowerCase() || s.ancora === slugificar(m.rotulo)),
    )
    return { id: m.id, rotulo: m.rotulo, alvo: alvoSecao ? `#${alvoSecao.ancora}` : '#topo' }
  })
  // Secoes vinculadas ao menu que o usuario nao listou entram no fim.
  for (const s of secoes) {
    if (s.ancora && !menu.some((m) => m.alvo === `#${s.ancora}`)) {
      menu.push({ id: gerarId(), rotulo: s.nome, alvo: `#${s.ancora}` })
    }
  }

  return {
    seo: {
      titulo: briefing.nome,
      descricao: briefing.secoes[0]?.conteudo?.slice(0, 155) ?? briefing.nome,
    },
    tema,
    header: {
      logoTexto: briefing.nome,
      menu,
      fixo: true,
      botao: { texto: 'Fale conosco', url: '#' },
    },
    secoes,
    footer: {
      textoInstitucional: briefing.footer.textoInstitucional || undefined,
      direitos: briefing.footer.direitos || undefined,
      endereco: briefing.footer.endereco || undefined,
      telefones: briefing.footer.telefones || undefined,
      email: briefing.footer.email || undefined,
      linksUteis: briefing.footer.linksUteis.map((l) => ({ ...l })),
      menuSecundario: briefing.footer.menuSecundario,
    },
    redes: briefing.redes.map((r) => ({ ...r })),
  }
}

/* --------------------- mutacoes imutaveis do editor ---------------------- */

/** Aplica uma mutacao arbitraria numa copia do documento. */
export function alterarDoc(doc: LpDocumento, mut: (d: LpDocumento) => void): LpDocumento {
  const copia = clonar(doc)
  mut(copia)
  return copia
}

function secaoPorId(doc: LpDocumento, id: string): LpSecao | undefined {
  return doc.secoes.find((s) => s.id === id)
}

/**
 * Atualiza o texto apontado por um alvo do editor (data-lp). Alvos:
 * header:logo | footer:institucional|direitos|endereco|telefones|email |
 * sec:ID:titulo|subtitulo|texto|botao | sec:ID:item:IID:titulo|texto|extra|detalhe|botao
 */
export function aplicarTexto(doc: LpDocumento, alvo: string, valor: string): LpDocumento {
  return alterarDoc(doc, (d) => {
    const texto = valor.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
    if (alvo === 'header:logo') {
      d.header.logoTexto = texto
      return
    }
    if (alvo === 'header:botao') {
      if (d.header.botao) d.header.botao.texto = texto
      return
    }
    if (alvo.startsWith('footer:')) {
      const campo = alvo.slice('footer:'.length)
      if (campo === 'institucional') d.footer.textoInstitucional = texto
      if (campo === 'direitos') d.footer.direitos = texto
      if (campo === 'endereco') d.footer.endereco = texto
      if (campo === 'telefones') d.footer.telefones = texto
      if (campo === 'email') d.footer.email = texto
      return
    }
    const m = /^sec:([^:]+)(?::(.+))?$/.exec(alvo)
    if (!m) return
    const secao = secaoPorId(d, m[1])
    if (!secao || !m[2]) return
    const resto = m[2]
    const itemM = /^item:([^:]+):(.+)$/.exec(resto)
    if (itemM) {
      const item = secao.itens.find((i) => i.id === itemM[1])
      if (!item) return
      const campo = itemM[2]
      if (campo === 'titulo') item.titulo = texto
      if (campo === 'texto') item.texto = texto
      if (campo === 'extra') item.extra = texto
      if (campo === 'detalhe') item.detalhe = texto
      if (campo === 'botao' && item.botao) item.botao.texto = texto
      return
    }
    if (resto === 'titulo') secao.titulo = texto
    if (resto === 'subtitulo') secao.subtitulo = texto
    if (resto === 'texto') secao.texto = texto
    if (resto === 'botao' && secao.botao) secao.botao.texto = texto
  })
}

export function moverSecao(doc: LpDocumento, id: string, direcao: -1 | 1): LpDocumento {
  return alterarDoc(doc, (d) => {
    const i = d.secoes.findIndex((s) => s.id === id)
    const j = i + direcao
    if (i === -1 || j < 0 || j >= d.secoes.length) return
    const [secao] = d.secoes.splice(i, 1)
    d.secoes.splice(j, 0, secao)
  })
}

export function moverSecaoPara(doc: LpDocumento, id: string, indice: number): LpDocumento {
  return alterarDoc(doc, (d) => {
    const i = d.secoes.findIndex((s) => s.id === id)
    if (i === -1) return
    const [secao] = d.secoes.splice(i, 1)
    d.secoes.splice(Math.max(0, Math.min(indice, d.secoes.length)), 0, secao)
  })
}

export function duplicarSecao(doc: LpDocumento, id: string): LpDocumento {
  return alterarDoc(doc, (d) => {
    const i = d.secoes.findIndex((s) => s.id === id)
    if (i === -1) return
    const copia = clonar(d.secoes[i])
    copia.id = gerarId()
    copia.nome = `${copia.nome} (cópia)`
    if (copia.ancora) copia.ancora = `${copia.ancora}-copia`
    copia.itens = copia.itens.map((item) => ({ ...item, id: gerarId() }))
    d.secoes.splice(i + 1, 0, copia)
  })
}

export function removerSecao(doc: LpDocumento, id: string): LpDocumento {
  return alterarDoc(doc, (d) => {
    const secao = secaoPorId(d, id)
    d.secoes = d.secoes.filter((s) => s.id !== id)
    if (secao?.ancora) {
      d.header.menu = d.header.menu.filter((m) => m.alvo !== `#${secao.ancora}`)
    }
  })
}

export function inserirSecao(doc: LpDocumento, secao: LpSecao, aposId?: string): LpDocumento {
  return alterarDoc(doc, (d) => {
    const i = aposId ? d.secoes.findIndex((s) => s.id === aposId) : d.secoes.length - 1
    d.secoes.splice((i === -1 ? d.secoes.length - 1 : i) + 1, 0, secao)
  })
}

/** Atualiza campos de uma secao; se a ancora mudar, corrige o menu junto. */
export function atualizarSecao(
  doc: LpDocumento,
  id: string,
  patch: Partial<LpSecao>,
): LpDocumento {
  return alterarDoc(doc, (d) => {
    const i = d.secoes.findIndex((s) => s.id === id)
    if (i === -1) return
    const antiga = d.secoes[i].ancora
    d.secoes[i] = { ...d.secoes[i], ...patch, id }
    const nova = d.secoes[i].ancora
    if (antiga && nova && antiga !== nova) {
      for (const m of d.header.menu) {
        if (m.alvo === `#${antiga}`) m.alvo = `#${nova}`
      }
    }
  })
}
