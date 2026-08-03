/**
 * Coercao defensiva de um LpDocumento vindo de fora (resposta da IA ou PUT do
 * editor). Nunca lanca: campos invalidos caem em defaults, secoes de tipo
 * desconhecido sao descartadas. Puro (testavel; usado no server e no client).
 */

import { TEMA_PADRAO, temaDoBriefing } from './documento'
import { fontePorNome, pesoValido } from './fontes'
import { ICONES } from './icones'
import { LAYOUTS, periodoPreco, temLados } from './layouts'
import { placeholderMidia } from './placeholder'
import type {
  AjusteTexto,
  Alinhamento,
  AnimacaoBotao,
  BotaoComId,
  CampoTextoSecao,
  EstiloBarra,
  FonteMidia,
  HoverBotao,
  ItemBriefing,
  LpBotao,
  LpBriefing,
  LpDocumento,
  LpItem,
  LpMidia,
  LpSecao,
  LpTema,
  Orientacao,
  PaginaLegal,
  TipoPaginaLegal,
  PosicaoBotao,
  Rede,
  ReproducaoVideo,
  TipoLayout,
  TipoMidia,
} from './tipos'
import {
  ALINHAMENTOS,
  ANIMACOES_BOTAO,
  CAMPOS_TEXTO_SECAO,
  HOVERS_BOTAO,
  PAGINAS_LEGAIS,
  POSICOES_BOTAO,
  ROTULO_REDE,
  infoPagina,
} from './tipos'
import { clonar } from './documento'
import {
  ancoraSegura,
  corSegura,
  gerarId,
  limitar,
  normalizarBotoes,
  normalizarTelefones,
  normalizarUrl,
} from './util'

const TIPOS_LAYOUT = new Set<string>(LAYOUTS.map((l) => l.tipo))
const ORIENTACOES = new Set<string>(['paisagem', 'retrato', 'quadrado'])
const POSICOES = new Set<string>(POSICOES_BOTAO)
const HOVERS = new Set<string>(HOVERS_BOTAO)
const ANIMACOES = new Set<string>(ANIMACOES_BOTAO)
const FONTES_MIDIA = new Set<string>(['pexels', 'pixabay', 'envato'])
const REDES = new Set<string>(Object.keys(ROTULO_REDE))
const TIPOS_PAGINA = new Set<string>(PAGINAS_LEGAIS.map((p) => p.tipo))

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
  if (POSICOES.has(String(b.posicao))) botao.posicao = b.posicao as PosicaoBotao
  if (HOVERS.has(String(b.hover))) botao.hover = b.hover as HoverBotao
  if (ANIMACOES.has(String(b.animacao))) botao.animacao = b.animacao as AnimacaoBotao
  return botao
}

/**
 * Ajustes do header/rodape. O tamanho da logo tem teto: uma logo de 400px
 * empurraria o menu para fora da barra.
 */
function coergirEstiloBarra(v: unknown): EstiloBarra | undefined {
  const e = obj(v)
  const estilo: EstiloBarra = {}
  const menu = coergirAjuste(e.menu)
  if (menu) estilo.menu = menu
  if (typeof e.logo === 'number') estilo.logo = Math.round(limitar(e.logo, 12, 160, 44))
  if (ALINHAMENTOS.includes(e.alinhamento as Alinhamento)) {
    estilo.alinhamento = e.alinhamento as Alinhamento
  }
  return Object.keys(estilo).length > 0 ? estilo : undefined
}

/**
 * Paginas de termos/privacidade: uma de cada, no maximo, com o titulo padrao
 * quando o usuario apagou o campo. O texto e longo de proposito (documento
 * juridico inteiro), so limitado para nao estourar o registro no banco.
 */
function coergirPaginas(v: unknown): PaginaLegal[] {
  const vistos = new Set<string>()
  return lista(v)
    .map((p) => {
      const pagina = obj(p)
      const tipo = String(pagina.tipo ?? '')
      if (!TIPOS_PAGINA.has(tipo) || vistos.has(tipo)) return null
      vistos.add(tipo)
      const padrao = infoPagina(tipo as TipoPaginaLegal)
      return {
        tipo: tipo as TipoPaginaLegal,
        titulo: strOu(pagina.titulo, padrao.titulo, 80),
        conteudo: str(pagina.conteudo, 60000),
      }
    })
    .filter((p): p is PaginaLegal => p !== null)
}

/**
 * Botoes do header/rodape: mesma coercao dos botoes de secao, mais o id e o
 * limite de quantos cabem. `normalizarBotoes` ja aceita o formato antigo (um
 * botao so, em `header.botao`).
 */
function coergirBotoes(v: unknown): BotaoComId[] {
  return normalizarBotoes(v)
    .map((b) => {
      const limpo = coergirBotao(b)
      return limpo === null ? null : { ...limpo, id: idSeguro(b.id) }
    })
    .filter((b): b is BotaoComId => b !== null)
}

/**
 * URL auxiliar de mídia (poster, prévia). Ao contrário de `url`, que o
 * compilador passa por urlSegura, estas vão direto para `<img>`/`<video>` no
 * editor — o que não for http(s) ou data:image é descartado, não neutralizado.
 */
function urlDeMidia(v: unknown): string | undefined {
  const s = opcional(v, 2000)
  if (!s) return undefined
  return /^(https?:\/\/|data:image\/)/i.test(s) ? s : undefined
}

/**
 * Caminho de arquivo nosso no bucket (lp/TIME/PROJETO/uuid.ext). Vem do client
 * junto com o documento; qualquer outra forma e descartada, para o caminho nunca
 * virar chave de leitura/remocao de algo fora dessa arvore.
 */
function caminhoDeBucket(v: unknown): string | undefined {
  const s = opcional(v, 300)
  return s && /^lp\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(s) ? s : undefined
}

/**
 * Opcoes de reproducao, so para video: num slot de imagem elas nao significam
 * nada e sumiriam do documento na primeira gravacao de qualquer jeito.
 */
function coergirReproducao(m: Record<string, unknown>, tipo: TipoMidia): ReproducaoVideo {
  if (tipo !== 'video') return {}
  const r: ReproducaoVideo = {}
  for (const campo of ['controles', 'autoplay', 'loop'] as const) {
    if (typeof m[campo] === 'boolean') r[campo] = m[campo]
  }
  return r
}

function coergirMidia(v: unknown): LpMidia | null {
  const m = obj(v)
  const busca = str(m.busca, 200)
  const url = str(m.url, 2000)
  if (busca === '' && url === '') return null
  const tipo = m.tipo === 'video' ? 'video' : 'imagem'
  const orientacao = (ORIENTACOES.has(String(m.orientacao)) ? m.orientacao : 'paisagem') as Orientacao
  const reproducao = coergirReproducao(m, tipo)
  if (url === '') {
    // Placeholder, mas preserva o alt em português que a IA escreveu e as opções
    // de vídeo do slot (a busca em banco preenche a URL depois, sem mexer nelas).
    const ph = placeholderMidia(busca, orientacao, tipo)
    const alt = opcional(m.alt, 300)
    return { ...ph, ...(alt ? { alt } : {}), ...reproducao }
  }
  // Campos que vêm do banco de mídia (thumb/crédito/dimensões). A IA não os
  // inventa, mas o documento salvo passa por aqui de novo a cada gravação — sem
  // preservá-los, o poster do vídeo e o crédito ao autor se perderiam.
  const extras: Partial<LpMidia> = {}
  const caminho = caminhoDeBucket(m.caminho)
  if (caminho) extras.caminho = caminho
  const thumb = urlDeMidia(m.thumb)
  if (thumb) extras.thumb = thumb
  const previa = urlDeMidia(m.previa)
  if (previa) extras.previa = previa
  const autor = opcional(m.autor, 120)
  if (autor) extras.autor = autor
  const autorUrl = opcional(m.autorUrl, 600)
  if (autorUrl) extras.autorUrl = autorUrl
  if (FONTES_MIDIA.has(String(m.fonte))) extras.fonte = m.fonte as FonteMidia
  for (const campo of ['largura', 'altura', 'duracao'] as const) {
    const n = m[campo]
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) extras[campo] = Math.round(n)
  }

  return {
    tipo,
    url,
    alt: strOu(m.alt, busca || 'Imagem', 300),
    busca,
    orientacao,
    ...(opcional(m.origem, 600) ? { origem: opcional(m.origem, 600) } : {}),
    ...extras,
    ...reproducao,
  }
}

function coergirItem(v: unknown, tipo?: TipoLayout): LpItem {
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
  // Periodo do plano vem de um select: "por mês", "/mes" e afins viram a opcao
  // do catalogo. O que nao for reconhecido fica como o usuario (ou a IA) escreveu.
  if (tipo === 'precos' && item.detalhe) {
    item.detalhe = periodoPreco(item.detalhe) ?? item.detalhe
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
    const base = ancoraSegura(ancoraBruta)
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
    itens: lista(s.itens)
      .map((i) => coergirItem(i, tipo as TipoLayout))
      .slice(0, 24),
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
  if (fundoCor || fundoMidia || typeof fundo.escurecer === 'number' || fundo.textoClaro === false) {
    secao.fundo = {}
    if (fundoCor) secao.fundo.cor = corSegura(fundoCor, '#f1f5f9')
    if (fundoMidia) secao.fundo.midia = fundoMidia
    if (typeof fundo.escurecer === 'number') {
      secao.fundo.escurecer = limitar(fundo.escurecer, 0, 90, 55)
    }
    // So o `false` e guardado: ausente = branco automatico, o padrao.
    if (fundo.textoClaro === false) secao.fundo.textoClaro = false
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

  const logo = coergirMidia(b.logo)

  const menu = lista(b.menu)
    .map((m) => {
      const item = obj(m)
      const rotulo = str(item.rotulo, 40)
      if (rotulo === '') return null
      return { id: strOu(item.id, gerarId(), 24), rotulo, url: str(item.url, 600) }
    })
    .filter((m): m is { id: string; rotulo: string; url: string } => m !== null)
    .slice(0, 12)
  const idsMenu = new Set(menu.map((m) => m.id))
  const estiloHeader = coergirEstiloBarra(b.estiloHeader)
  const estiloFooter = coergirEstiloBarra(footerBruto.estilo)

  return {
    nome: strOu(b.nome, nomeAtual, 80),
    // Logo e sempre imagem: video no topo da pagina nao e logo nenhuma.
    ...(logo && logo.tipo === 'imagem' ? { logo } : {}),
    tipografia,
    cores,
    referencias: lista(b.referencias)
      .map((r) => normalizarUrl(str(r, 300)))
      .filter((r) => /^https?:\/\//i.test(r))
      .slice(0, 5),
    menu,
    footer: {
      textoInstitucional: str(footerBruto.textoInstitucional, 600),
      direitos: str(footerBruto.direitos, 200),
      endereco: str(footerBruto.endereco, 300),
      telefones: normalizarTelefones(footerBruto.telefones),
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
      ...(estiloFooter ? { estilo: estiloFooter } : {}),
    },
    ...(estiloHeader ? { estiloHeader } : {}),
    paginas: coergirPaginas(b.paginas),
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
        // Arquivo enviado pelo usuário: passa pela mesma coerção da mídia do
        // documento (url, dimensões, caminho no bucket).
        const arquivo = coergirMidia(midiaBruta.arquivo)
        const colunas: 2 | 3 | 4 | undefined =
          secao.colunas === 2 || secao.colunas === 3 || secao.colunas === 4
            ? secao.colunas
            : undefined
        // Com arquivo enviado, tipo e formato são os do arquivo real.
        const tipoMidia: TipoMidia =
          arquivo?.tipo ?? (midiaBruta.tipo === 'video' ? 'video' : 'imagem')
        // So vale apontar para um item que existe no menu deste briefing.
        const itemMenu = str(secao.itemMenu, 24)
        const botao = coergirBotao(secao.botao)
        const itens = lista(secao.itens)
          .map((it) => {
            const item = obj(it)
            const escrito: ItemBriefing = { id: strOu(item.id, gerarId(), 24) }
            for (const campo of ['titulo', 'extra', 'detalhe'] as const) {
              const valor = str(item[campo], 300)
              if (valor !== '') escrito[campo] = valor
            }
            const texto = str(item.texto, 2000)
            if (texto !== '') escrito.texto = texto
            const linhas = lista(item.lista)
              .map((l) => str(l, 200))
              .filter((l) => l !== '')
              .slice(0, 12)
            if (linhas.length > 0) escrito.lista = linhas
            const botaoItem = coergirBotao(item.botao)
            if (botaoItem) escrito.botao = botaoItem
            if (item.destaque === true) escrito.destaque = true
            return escrito
          })
          // Item em branco NAO e lixo: e o usuario pedindo mais um daquele tipo
          // para a IA escrever — "o que deixar em branco a IA preenche", como diz
          // a tela. Descartar aqui encolhia a secao, porque o prompt pede
          // exatamente o numero de itens do briefing: o card vazio nunca nascia.
          .slice(0, 12)
        const titulo = str(secao.titulo, 300)
        const subtitulo = str(secao.subtitulo, 500)
        const conteudo = str(secao.conteudo, 3000)
        // "A IA não escreve" só existe para campo em branco: preenchido, o texto
        // do usuário já é a resposta e a marcação não teria o que dispensar.
        const semIaBruto = obj(secao.semIa)
        const escrito: Record<CampoTextoSecao, string> = { titulo, subtitulo, conteudo }
        const semIa: Partial<Record<CampoTextoSecao, boolean>> = {}
        for (const campo of CAMPOS_TEXTO_SECAO) {
          if (semIaBruto[campo] === true && escrito[campo] === '') semIa[campo] = true
        }
        return {
          id: strOu(secao.id, gerarId(), 24),
          nome: strOu(secao.nome, 'Seção', 80),
          vincularMenu: secao.vincularMenu === true,
          ...(secao.vincularMenu === true && idsMenu.has(itemMenu) ? { itemMenu } : {}),
          titulo,
          ...(subtitulo !== '' ? { subtitulo } : {}),
          conteudo,
          ...(Object.keys(semIa).length > 0 ? { semIa } : {}),
          layout: layout as TipoLayout,
          ...(colunas ? { colunas } : {}),
          // Lado da mídia: só onde o layout põe conteúdo e mídia lado a lado.
          ...(secao.inverter === true && temLados(layout as TipoLayout)
            ? { inverter: true }
            : {}),
          ...(botao ? { botao } : {}),
          ...(itens.length > 0 ? { itens } : {}),
          midia:
            busca === '' && !arquivo
              ? null
              : {
                  busca,
                  tipo: tipoMidia,
                  orientacao: (arquivo?.orientacao ??
                    (ORIENTACOES.has(String(midiaBruta.orientacao))
                      ? midiaBruta.orientacao
                      : 'paisagem')) as Orientacao,
                  ...(arquivo ? { arquivo } : {}),
                  // Reprodução é do lugar na página, não do arquivo: vale também
                  // para a mídia que a busca em banco ainda vai trazer.
                  ...coergirReproducao(midiaBruta, tipoMidia),
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
  const logo = coergirMidia(header.logo)
  const estiloHeader = coergirEstiloBarra(header.estilo)
  const estiloFooter = coergirEstiloBarra(footer.estilo)

  return {
    seo: {
      titulo: strOu(seo.titulo, logoTexto, 90),
      descricao: strOu(seo.descricao, logoTexto, 200),
    },
    tema: coergirTema(d.tema, temaBase),
    header: {
      logoTexto,
      ...(logo && logo.tipo === 'imagem' ? { logo } : {}),
      menu,
      fixo: header.fixo !== false,
      // `header.botao` (um botao so) e o formato antigo, ainda vindo da IA.
      botoes: coergirBotoes(header.botoes ?? header.botao),
      ...(estiloHeader ? { estilo: estiloHeader } : {}),
    },
    secoes,
    footer: {
      textoInstitucional: opcional(footer.textoInstitucional, 600),
      direitos: opcional(footer.direitos, 200),
      endereco: opcional(footer.endereco, 300),
      telefones: normalizarTelefones(footer.telefones),
      email: opcional(footer.email, 120),
      linksUteis,
      botoes: coergirBotoes(footer.botoes),
      menuSecundario: footer.menuSecundario === true,
      ...(estiloFooter ? { estilo: estiloFooter } : {}),
    },
    redes,
    // Pagina sem texto continua guardada (o editor acabou de cria-la); quem
    // decide o que vira arquivo e link e `paginasGeradas`.
    paginas: coergirPaginas(d.paginas),
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
  // Telefone nao e escolha criativa: o rodape leva exatamente os numeros do
  // briefing, com as marcacoes de WhatsApp (a IA costuma reescrever a formatacao
  // e esquecer o "whatsapp": true).
  const telefones = normalizarTelefones(briefing.footer.telefones)
  if (telefones.length > 0) doc.footer.telefones = telefones
  return doc
}
