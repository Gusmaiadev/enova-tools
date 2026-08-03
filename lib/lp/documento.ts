/**
 * Operacoes puras sobre o LpDocumento: tema padrao, documento base a partir do
 * briefing (fallback deterministico quando a IA nao esta configurada) e as
 * mutacoes imutaveis usadas pelo reducer do editor.
 */

import { caminharElementos, midiasDoElemento } from './arvore'
import { pesoValido } from './fontes'
import { infoLayout, novoItem, temLados } from './layouts'
import { placeholderMidia } from './placeholder'
import type {
  CategoriaTexto,
  EstiloTipografia,
  ItemBriefing,
  ItemMenu,
  LpBriefing,
  LpItem,
  LpDocumento,
  LpMidia,
  LpSecao,
  LpTema,
  MidiaBriefing,
  PaginaLegal,
  ReproducaoVideo,
  SecaoBriefing,
} from './tipos'
import { PAGINAS_LEGAIS, infoPagina } from './tipos'
import {
  ancoraSegura,
  corSegura,
  gerarId,
  limitar,
  normalizarTelefones,
  slugificar,
} from './util'

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
 * Midia de uma secao a partir do briefing: a que o usuario definiu (arquivo
 * enviado ou escolhida no banco de imagens), quando existe, ou um placeholder
 * que a busca em banco preenche depois. `busca` do briefing e o texto
 * alternativo da midia definida.
 */
/**
 * Midia da secao do briefing com o patch aplicado por cima do que ja existe.
 *
 * Enumerar os campos a preservar (era o que a etapa fazia) quebra em silencio a
 * cada campo novo: as opcoes de reproducao do video ficaram de fora da lista e
 * cada clique apagava a escolha anterior, entao so uma delas parava em pe.
 */
export function mesclarMidiaBriefing(
  atual: MidiaBriefing | null | undefined,
  patch: Partial<MidiaBriefing>,
): MidiaBriefing {
  return { busca: '', tipo: 'imagem', orientacao: 'paisagem', ...atual, ...patch }
}

export function midiaDoBriefing(mb: MidiaBriefing): LpMidia {
  const base = mb.arquivo
    ? { ...mb.arquivo, busca: mb.busca, alt: mb.busca || mb.arquivo.alt }
    : placeholderMidia(mb.busca, mb.orientacao, mb.tipo)
  return { ...base, ...opcoesVideo(mb) }
}

/**
 * So as opcoes de reproducao que foram definidas — para levar as escolhas do
 * usuario de um slot para a midia nova sem inventar valor nenhum.
 */
export function opcoesVideo(m: ReproducaoVideo): ReproducaoVideo {
  const o: ReproducaoVideo = {}
  if (m.controles !== undefined) o.controles = m.controles
  if (m.autoplay !== undefined) o.autoplay = m.autoplay
  if (m.loop !== undefined) o.loop = m.loop
  return o
}

/**
 * Onde a midia definida pelo usuario entra na secao: no fundo (hero/banner que a
 * IA montou com imagem de fundo), no campo de midia do layout ou — nos layouts
 * em que so os itens tem imagem (galeria, carrossel, blocos alternados…) — a
 * imagem do primeiro item, o unico lugar em que ela apareceria na pagina.
 *
 * O alvo e decidido uma vez: escrever muda a secao e mudaria a resposta.
 */
function alvoDeMidia(secao: LpSecao): {
  ler: () => LpMidia | null | undefined
  escrever: (m: LpMidia) => void
} {
  const info = infoLayout(secao.tipo)
  if (!info.campos.midia && info.itens?.campos.includes('imagem')) {
    return {
      ler: () => secao.itens[0]?.imagem,
      escrever: (m) => {
        if (secao.itens.length === 0) secao.itens.push(novoItem(secao.tipo))
        secao.itens[0].imagem = m
      },
    }
  }
  // Hero/banner em que a IA usou a midia como fundo: a escolha do usuario vai
  // para o fundo, senao a imagem dele apareceria fora do lugar previsto.
  if (secao.fundo?.midia && !secao.midia) {
    return {
      ler: () => secao.fundo?.midia,
      escrever: (m) => {
        if (secao.fundo) secao.fundo.midia = m
      },
    }
  }
  return { ler: () => secao.midia, escrever: (m) => { secao.midia = m } }
}

function aplicarMidiaNaSecao(secao: LpSecao, midia: LpMidia): void {
  alvoDeMidia(secao).escrever(midia)
}

/**
 * Reimpoe no documento o que o usuario definiu para a midia de cada secao no
 * briefing: o arquivo enviado ou a foto escolhida no banco (a IA descreve a
 * midia e a busca preencheria por cima — a escolha do usuario vence sempre) e as
 * opcoes de reproducao do video, que valem tambem para a midia que ainda vai ser
 * buscada. Casa por id (a IA mantem os ids do briefing) e, quando nao acha, pela
 * posicao, so se o layout confere. Muta no lugar, como preencherMidias.
 *
 * `perdidas` conta so midia definida que nao achou secao — e o que vira aviso.
 */
/**
 * Secao do documento que corresponde a uma secao do briefing: casa por id (a IA
 * mantem os ids que mandamos) e, quando nao acha, pela posicao — so se o layout
 * confere, senao estariamos escrevendo numa secao que nao e aquela.
 */
function secaoCorrespondente(
  doc: LpDocumento,
  sb: SecaoBriefing,
  i: number,
): LpSecao | undefined {
  const naPosicao = doc.secoes[i]?.tipo === sb.layout ? doc.secoes[i] : undefined
  return doc.secoes.find((s) => s.id === sb.id) ?? naPosicao
}

/**
 * Ancora da secao, criando uma a partir do nome se ainda nao houver — sempre
 * unica no documento, senao dois itens do menu levariam ao mesmo lugar.
 */
export function garantirAncora(doc: LpDocumento, secao: LpSecao): string {
  if (secao.ancora) return secao.ancora
  const usadas = new Set(doc.secoes.map((s) => s.ancora).filter((a): a is string => Boolean(a)))
  const base = ancoraSegura(secao.nome)
  let ancora = base
  let n = 2
  while (usadas.has(ancora)) ancora = `${base}-${n++}`
  secao.ancora = ancora
  return ancora
}

/**
 * Menu do header a partir do briefing. Cada item vira uma ancora de verdade:
 * 1. a secao que o usuario marcou como sendo aquele item (SecaoBriefing.itemMenu);
 * 2. senao, a secao de nome parecido (era o unico criterio antes);
 * 3. senao, '#topo' — o item existe, mas nao tem secao para onde levar.
 * Item com URL externa mantem a URL. Secao marcada para o menu que nenhum item
 * reivindicou entra no fim, para nao ficar inalcancavel.
 *
 * `atual` e o menu ja montado (o que a IA devolveu): so vale quando o briefing
 * nao definiu item nenhum.
 */
export function montarMenu(
  doc: LpDocumento,
  briefing: LpBriefing,
  atual: ItemMenu[] = [],
): ItemMenu[] {
  const itens: ItemMenu[] =
    briefing.menu.length === 0
      ? [...atual]
      : briefing.menu.map((m) => {
          if (m.url.trim() !== '') return { id: m.id, rotulo: m.rotulo, alvo: m.url }
          let secao: LpSecao | undefined
          briefing.secoes.forEach((sb, i) => {
            if (secao || !sb.vincularMenu || sb.itemMenu !== m.id) return
            secao = secaoCorrespondente(doc, sb, i)
          })
          secao ??= doc.secoes.find(
            (s) =>
              s.ancora !== null &&
              (s.nome.toLowerCase() === m.rotulo.toLowerCase() ||
                s.ancora === slugificar(m.rotulo)),
          )
          return {
            id: m.id,
            rotulo: m.rotulo,
            alvo: secao ? `#${garantirAncora(doc, secao)}` : '#topo',
          }
        })

  for (const s of doc.secoes) {
    if (s.ancora && !itens.some((m) => m.alvo === `#${s.ancora}`)) {
      itens.push({ id: gerarId(), rotulo: s.nome, alvo: `#${s.ancora}` })
    }
  }
  return itens
}

/**
 * Reimpoe o menu do briefing no documento da IA: os rotulos e a ordem sao os que
 * o usuario escreveu, e cada um aponta para a secao que ele escolheu. Sem itens
 * no briefing, o menu que a IA montou fica (so ganha as secoes que ela ancorou e
 * deixou de fora).
 */
export function aplicarMenu(doc: LpDocumento, briefing: LpBriefing): void {
  doc.header.menu = montarMenu(doc, briefing, doc.header.menu)
}

/**
 * Paginas de termos/privacidade do briefing e os links delas nos "Links uteis"
 * do rodape. Pagina sem texto escrito nao e gerada — sairia uma pagina em branco
 * no ar. Idempotente: roda tanto no documento novo quanto no que a IA devolveu
 * (que costuma inventar um "Política de Privacidade" apontando para "#").
 */
export function aplicarPaginas(doc: LpDocumento, briefing: LpBriefing): void {
  doc.paginas = (briefing.paginas ?? []).map((p) => ({ ...p }))
  sincronizarLinksPaginas(doc)
}

/**
 * Paginas que viram arquivo de verdade. As outras sao rascunho: o assistente e
 * o editor guardam a pagina marcada antes de o texto existir.
 */
export const paginasGeradas = (doc: LpDocumento): PaginaLegal[] =>
  (doc.paginas ?? []).filter((p) => p.conteudo.trim() !== '')

/**
 * Acerta os "Links uteis" do rodape conforme as paginas que o documento tem
 * agora: tira o link de pagina que saiu e recoloca as atuais, com o titulo em
 * vigor. So mexe no que e desta feature — link escrito pelo usuario fica onde
 * esta. Chamar sempre que `doc.paginas` mudar (briefing ou editor).
 */
export function sincronizarLinksPaginas(doc: LpDocumento): void {
  // Pagina sem texto ainda nao existe: fica no documento como rascunho, mas nao
  // vira arquivo nem link para lugar nenhum.
  const paginas = paginasGeradas(doc)
  const arquivos = new Set(PAGINAS_LEGAIS.map((p) => p.arquivo))
  const tipos = new Set(paginas.map((p) => p.tipo))
  // Reaproveita o id do link que ja existia: renomear a pagina nao precisa
  // trocar a identidade do item no rodape.
  const idPorArquivo = new Map(
    doc.footer.linksUteis.filter((l) => arquivos.has(l.url)).map((l) => [l.url, l.id]),
  )
  doc.footer.linksUteis = doc.footer.linksUteis.filter((l) => {
    if (arquivos.has(l.url)) return false
    const slug = slugificar(l.rotulo)
    if (tipos.has('termos') && slug.includes('termo')) return false
    if (tipos.has('privacidade') && slug.includes('privacidade')) return false
    return true
  })
  for (const p of paginas) {
    const arquivo = infoPagina(p.tipo).arquivo
    doc.footer.linksUteis.push({
      id: idPorArquivo.get(arquivo) ?? gerarId(),
      rotulo: p.titulo,
      url: arquivo,
    })
  }
}

/**
 * Item da pagina a partir do que o usuario escreveu, por cima do que a IA fez
 * para a mesma posicao (`base`): campo preenchido no briefing manda, campo em
 * branco fica com o texto da IA. Icone e imagem nunca vem do briefing, entao
 * seguem os da base — e por isso a galeria nao perde as fotos.
 */
function mesclarItem(base: LpItem | undefined, escrito: ItemBriefing): LpItem {
  const item: LpItem = base ? { ...base } : { id: gerarId() }
  for (const campo of ['titulo', 'extra', 'detalhe', 'texto'] as const) {
    const valor = escrito[campo]?.trim()
    if (valor) item[campo] = valor
  }
  if (escrito.lista && escrito.lista.length > 0) item.lista = [...escrito.lista]
  if (escrito.botao) item.botao = { ...escrito.botao }
  // Destaque e uma escolha de lista inteira (qual plano se sobressai): com itens
  // do usuario, quem manda e a marcacao dele, inclusive a ausencia dela.
  if (escrito.destaque === true) item.destaque = true
  else delete item.destaque
  return item
}

/** Nem o usuario nem a IA escreveram nada: viraria um card em branco na pagina. */
function itemSemConteudo(it: LpItem): boolean {
  return (
    !it.titulo && !it.extra && !it.detalhe && !it.texto && !it.imagem && !it.lista?.length
  )
}

/**
 * Itens escritos no briefing: a lista do usuario define quais e quantos, na
 * ordem dele. O que a IA escreveu para a mesma posicao preenche os buracos —
 * inclusive a posicao que ele deixou inteira em branco de proposito.
 *
 * Devolve quantos sobraram sem conteudo nenhum (a IA gerou menos itens do que o
 * briefing pediu), para a rota avisar em vez de a secao encolher em silencio.
 */
export function aplicarItens(doc: LpDocumento, briefing: LpBriefing): number {
  let vazios = 0
  briefing.secoes.forEach((sb, i) => {
    const escritos = sb.itens ?? []
    if (escritos.length === 0) return
    const secao = secaoCorrespondente(doc, sb, i)
    if (!secao) return
    const mesclados = escritos.map((escrito, j) => mesclarItem(secao.itens[j], escrito))
    secao.itens = mesclados.filter((it) => !itemSemConteudo(it))
    vazios += mesclados.length - secao.itens.length
  })
  return vazios
}

/**
 * Titulo, subtitulo e texto de cada secao conforme o briefing: o que o usuario
 * escreveu vence o da IA (preenchido tem de aparecer na pagina como foi escrito)
 * e o campo que ele deixou em branco pedindo para a IA nao escrever sai da
 * pagina — a IA costuma escrever assim mesmo, e ai a marcacao dele nao valeria
 * nada. "Conteudo" do briefing e o texto de apoio da secao (LpSecao.texto).
 */
export function aplicarTextos(doc: LpDocumento, briefing: LpBriefing): void {
  briefing.secoes.forEach((sb, i) => {
    const titulo = sb.titulo.trim()
    const subtitulo = (sb.subtitulo ?? '').trim()
    const semIa = sb.semIa ?? {}
    const dispensado = semIa.titulo || semIa.subtitulo || semIa.conteudo
    if (titulo === '' && subtitulo === '' && !dispensado) return
    const secao = secaoCorrespondente(doc, sb, i)
    if (!secao) return
    if (titulo !== '') secao.titulo = titulo
    else if (semIa.titulo) delete secao.titulo
    if (subtitulo !== '') secao.subtitulo = subtitulo
    else if (semIa.subtitulo) delete secao.subtitulo
    if (sb.conteudo.trim() === '' && semIa.conteudo) delete secao.texto
  })
}

/**
 * Botao que o usuario definiu para a secao vence o que a IA escreveu — inclusive
 * em layout que a IA nem propoe botao (cards, galeria, FAQ…), porque quem monta
 * a pagina decide onde quer a chamada para acao.
 */
export function aplicarBotoes(doc: LpDocumento, briefing: LpBriefing): void {
  briefing.secoes.forEach((sb, i) => {
    if (!sb.botao) return
    const secao = secaoCorrespondente(doc, sb, i)
    if (secao) secao.botao = { ...sb.botao }
  })
}

/**
 * Aparencia do header e do rodape escolhida no briefing (fonte do menu, tamanho
 * da logo, alinhamento). A IA nao escreve esses campos — sem reimpor, a escolha
 * do usuario sumiria no documento gerado por ela.
 */
export function aplicarEstiloBarras(doc: LpDocumento, briefing: LpBriefing): void {
  if (briefing.estiloHeader) doc.header.estilo = { ...briefing.estiloHeader }
  if (briefing.footer.estilo) doc.footer.estilo = { ...briefing.footer.estilo }
}

/**
 * Lado da midia escolhido no briefing. E decisao de layout, nao de conteudo: a
 * IA nao tem o que opinar, entao o valor do briefing vale sempre (inclusive o
 * "conteudo a esquerda", que e o padrao).
 */
export function aplicarLados(doc: LpDocumento, briefing: LpBriefing): void {
  briefing.secoes.forEach((sb, i) => {
    if (!temLados(sb.layout)) return
    const secao = secaoCorrespondente(doc, sb, i)
    if (!secao) return
    if (sb.inverter) secao.inverter = true
    else delete secao.inverter
  })
}

export function aplicarArquivos(
  doc: LpDocumento,
  briefing: LpBriefing,
): { aplicadas: number; perdidas: number } {
  let aplicadas = 0
  let perdidas = 0
  // A IA nao sabe da logo (ela nao entra no prompt): quem manda e o briefing.
  if (briefing.logo) doc.header.logo = briefing.logo
  briefing.secoes.forEach((sb, i) => {
    const mb = sb.midia
    if (!mb) return
    const video = opcoesVideo(mb)
    if (!mb.arquivo && Object.keys(video).length === 0) return
    const secao = secaoCorrespondente(doc, sb, i)
    if (!secao) {
      if (mb.arquivo) perdidas++
      return
    }
    const alvo = alvoDeMidia(secao)
    if (mb.arquivo) {
      alvo.escrever(midiaDoBriefing(mb))
      aplicadas++
    }
    const atual = alvo.ler()
    if (atual?.tipo === 'video') alvo.escrever({ ...atual, ...video })
  })
  return { aplicadas, perdidas }
}

/**
 * Caminhos de arquivo nosso (no bucket) que o projeto ainda cita — no documento
 * e no briefing. O que estiver na pasta do projeto e nao aparecer aqui nao serve
 * mais a ninguem: e o que a limpeza de orfaos apaga.
 */
export function arquivosUsados(projeto: {
  documento?: LpDocumento | null
  briefing?: LpBriefing | null
}): Set<string> {
  const usados = new Set<string>()
  const anotar = (m: LpMidia | null | undefined) => {
    if (m?.caminho) usados.add(m.caminho)
  }
  anotar(projeto.documento?.header.logo)
  anotar(projeto.briefing?.logo)
  for (const secao of projeto.documento?.secoes ?? []) {
    // Campos tipados: valem enquanto houver documento pre-arvore salvo.
    anotar(secao.midia)
    anotar(secao.fundo?.midia)
    for (const item of secao.itens ?? []) anotar(item.imagem)
    // Arvore: o que a Entrega 2 em diante produz. Os dois formatos convivem de
    // proposito — na transicao um mesmo projeto pode ter secao migrada e nao
    // migrada, e apagar arquivo do bucket e irreversivel.
    if (secao.raiz) {
      for (const el of caminharElementos(secao.raiz)) midiasDoElemento(el).forEach(anotar)
    }
  }
  for (const secao of projeto.briefing?.secoes ?? []) anotar(secao.midia?.arquivo)
  return usados
}

/**
 * Documento deterministico construido so com o briefing (sem IA): usado como
 * fallback quando nao ha chave de IA configurada e como base que a IA enriquece.
 * Midia sem arquivo enviado vira placeholder ate a busca em banco preencher.
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
      // Campo em branco que o usuario dispensou fica em branco tambem aqui: sem
      // IA nao ha quem escrevesse, e o nome da secao nao e um titulo dele.
      titulo: sb.semIa?.titulo ? undefined : sb.titulo || sb.nome,
      subtitulo: sb.semIa?.subtitulo ? undefined : sb.subtitulo || undefined,
      texto: sb.semIa?.conteudo ? undefined : sb.conteudo || undefined,
      itens: [],
      largura: sb.layout === 'banner' ? 'full' : 'boxed',
      espacamento: { topo: 88, base: 88 },
    }
    if (sb.colunas) secao.colunas = sb.colunas
    if (sb.inverter && temLados(sb.layout)) secao.inverter = true
    const modelo = novoItem(sb.layout)
    if (Object.keys(modelo).length > 1) {
      secao.itens = [novoItem(sb.layout), novoItem(sb.layout), novoItem(sb.layout)]
      if (sb.layout === 'comparacao') {
        secao.itens = secao.itens.slice(0, 2)
        secao.rotulos = ['Característica um', 'Característica dois', 'Característica três']
      }
      // Escreveu os itens no briefing: a lista dele é a da página, e o item de
      // exemplo entra só como base (ícone, imagem de exemplo).
      if (sb.itens && sb.itens.length > 0) {
        secao.itens = sb.itens.map((escrito) => mesclarItem(novoItem(sb.layout), escrito))
      }
    }
    // Depois dos itens: em galeria e afins a midia do briefing e a imagem do
    // primeiro item, que so existe a partir daqui.
    if (sb.midia?.busca || sb.midia?.arquivo) {
      aplicarMidiaNaSecao(secao, midiaDoBriefing(sb.midia))
    }
    if (sb.layout === 'hero' || sb.layout === 'cta') {
      secao.botao = { texto: 'Fale conosco', url: '#' }
      secao.subtitulo = secao.subtitulo ?? ''
    }
    // O botao do briefing manda, inclusive por cima do padrao de hero/cta.
    if (sb.botao) secao.botao = { ...sb.botao }
    return secao
  })

  const doc: LpDocumento = {
    seo: {
      titulo: briefing.nome,
      descricao: briefing.secoes[0]?.conteudo?.slice(0, 155) ?? briefing.nome,
    },
    tema,
    header: {
      logoTexto: briefing.nome,
      ...(briefing.logo ? { logo: briefing.logo } : {}),
      menu: [],
      fixo: true,
      botoes: [{ id: gerarId(), texto: 'Fale conosco', url: '#' }],
      ...(briefing.estiloHeader ? { estilo: { ...briefing.estiloHeader } } : {}),
    },
    secoes,
    footer: {
      textoInstitucional: briefing.footer.textoInstitucional || undefined,
      direitos: briefing.footer.direitos || undefined,
      endereco: briefing.footer.endereco || undefined,
      telefones: normalizarTelefones(briefing.footer.telefones),
      email: briefing.footer.email || undefined,
      linksUteis: briefing.footer.linksUteis.map((l) => ({ ...l })),
      menuSecundario: briefing.footer.menuSecundario,
      ...(briefing.footer.estilo ? { estilo: { ...briefing.footer.estilo } } : {}),
    },
    redes: briefing.redes.map((r) => ({ ...r })),
  }

  // Depois das seções: o menu precisa das âncoras delas para apontar.
  doc.header.menu = montarMenu(doc, briefing)
  aplicarPaginas(doc, briefing)
  return doc
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
 * header:logo | footer:institucional|direitos|endereco|email |
 * footer:telefone:TID | header:botao:BID | footer:botao:BID |
 * sec:ID:titulo|subtitulo|texto|botao | sec:ID:item:IID:titulo|texto|extra|detalhe|botao
 */
export function aplicarTexto(doc: LpDocumento, alvo: string, valor: string): LpDocumento {
  return alterarDoc(doc, (d) => {
    const texto = valor.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
    if (alvo === 'header:logo') {
      d.header.logoTexto = texto
      return
    }
    const botao = /^(header|footer):botao:(.+)$/.exec(alvo)
    if (botao) {
      const lista = botao[1] === 'header' ? d.header.botoes : d.footer.botoes
      const alvoBotao = lista?.find((b) => b.id === botao[2])
      // Texto vazio apagaria o botao da pagina sem jeito de clicar nele de volta.
      if (alvoBotao && texto !== '') alvoBotao.texto = texto
      return
    }
    if (alvo.startsWith('footer:')) {
      const campo = alvo.slice('footer:'.length)
      const tel = /^telefone:(.+)$/.exec(campo)
      if (tel) {
        const telefone = d.footer.telefones?.find((t) => t.id === tel[1])
        // Numero em branco sairia do rodape sem jeito de voltar: mantem o antigo.
        if (telefone && texto !== '') telefone.numero = texto
        return
      }
      if (campo === 'institucional') d.footer.textoInstitucional = texto
      if (campo === 'direitos') d.footer.direitos = texto
      if (campo === 'endereco') d.footer.endereco = texto
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
