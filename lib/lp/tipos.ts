/**
 * Tipos do Criador de Landing Pages. Modulo puro (sem 'server-only'): usado no
 * server (IA/persistencia) e no client (assistente/editor/compilador).
 *
 * Fonte da verdade e o LpDocumento (JSON estruturado). O HTML/CSS/JS nunca e
 * editado a mao: o compilador (lib/lp/compilador) deriva o codigo do documento,
 * entao editor visual e codigo ficam sincronizados por construcao.
 */

export type TipoLayout =
  | 'hero'
  | 'texto-midia'
  | 'texto-centralizado'
  | 'cards'
  | 'galeria'
  | 'masonry'
  | 'timeline'
  | 'faq'
  | 'depoimentos'
  | 'logos'
  | 'estatisticas'
  | 'cta'
  | 'banner'
  | 'formulario'
  | 'precos'
  | 'comparacao'
  | 'grid-produtos'
  | 'lista-beneficios'
  | 'blocos-alternados'
  | 'tabs'
  | 'carrossel'

export type Orientacao = 'paisagem' | 'retrato' | 'quadrado'
export type TipoMidia = 'imagem' | 'video'

export type LpMidia = {
  tipo: TipoMidia
  /** URL do preview (Envato) ou data URI de placeholder SVG. */
  url: string
  alt: string
  /** Descricao usada na busca de midia (editavel no editor). */
  busca: string
  orientacao: Orientacao
  /** Pagina do item no Envato, para licenciamento/download final. */
  origem?: string
}

export type LpBotao = {
  texto: string
  url: string
  corFundo?: string
  corTexto?: string
  estilo?: 'solido' | 'contorno'
}

/**
 * Item generico de secao — o significado dos campos depende do layout:
 * card (icone/titulo/texto), depoimento (texto/extra=nome/detalhe=cargo),
 * estatistica (extra=valor/titulo=rotulo), preco (extra=preco/detalhe=periodo/
 * lista=vantagens), timeline (extra=data), comparacao (titulo=coluna/lista=celulas),
 * logo (imagem/url), aba (titulo/texto/imagem)…
 */
export type LpItem = {
  id: string
  icone?: string | null
  imagem?: LpMidia | null
  titulo?: string
  texto?: string
  extra?: string
  detalhe?: string
  lista?: string[]
  botao?: LpBotao | null
  destaque?: boolean
  url?: string
}

/** Ajustes finos de um elemento de texto, sobrepondo o tema global. */
export type AjusteTexto = {
  cor?: string
  fonte?: string
  tamanho?: string
  peso?: number
  alturaLinha?: string
  espacamentoLetras?: string
  alinhamento?: 'left' | 'center' | 'right'
}

export type ElementoTexto = 'titulo' | 'subtitulo' | 'texto'

export type LpSecao = {
  id: string
  tipo: TipoLayout
  /** Nome interno (aparece no painel de estrutura e vira ancora). */
  nome: string
  /** Slug da ancora para navegacao pelo menu (null = fora do menu). */
  ancora: string | null
  titulo?: string
  subtitulo?: string
  texto?: string
  botao?: LpBotao | null
  midia?: LpMidia | null
  itens: LpItem[]
  colunas?: 2 | 3 | 4
  /** Midia antes do texto (imagem+texto em vez de texto+imagem). */
  inverter?: boolean
  largura: 'boxed' | 'full'
  fundo?: { cor?: string; midia?: LpMidia | null; escurecer?: number }
  /** Padding vertical em px. */
  espacamento?: { topo: number; base: number }
  /** Rotulos de linha (layout comparacao). */
  rotulos?: string[]
  /** Sobreposicoes de estilo por elemento de texto. */
  ajustes?: Partial<Record<ElementoTexto, AjusteTexto>>
  /** Endpoint que recebe o formulario (layout formulario). Vazio = sem envio. */
  destinoForm?: string
}

export type CategoriaTexto = 'titulos' | 'subtitulos' | 'textos' | 'botoes'

export type EstiloTipografia = {
  /** Nome da familia no Google Fonts (ex.: 'Inter'). */
  fonte: string
  peso: number
  /** Tamanho base em px (titulos usam escala a partir dele). */
  tamanho: string
  alturaLinha: string
  espacamentoLetras: string
}

export type CoresTema = {
  principal: string
  secundaria: string
  titulos: string
  subtitulos: string
  textos: string
  botoes: string
  fundoBotoes: string
  header: string
  footer: string
  fundoPagina: string
}

export type LpTema = {
  tipografia: Record<CategoriaTexto, EstiloTipografia>
  cores: CoresTema
  /** Raio de borda base em px (cards, botoes, imagens). */
  raio: number
}

export type ItemMenu = {
  id: string
  rotulo: string
  /** '#ancora' de uma secao ou URL externa. */
  alvo: string
}

export type Rede =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'x'
  | 'pinterest'
  | 'whatsapp'

export const ROTULO_REDE: Record<Rede, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X (Twitter)',
  pinterest: 'Pinterest',
  whatsapp: 'WhatsApp',
}

export type RedeSocial = { id: string; rede: Rede; url: string }

export type LpHeader = {
  logoTexto: string
  menu: ItemMenu[]
  fixo: boolean
  botao?: LpBotao | null
}

export type LinkFooter = { id: string; rotulo: string; url: string }

export type LpFooter = {
  textoInstitucional?: string
  direitos?: string
  endereco?: string
  telefones?: string
  email?: string
  linksUteis: LinkFooter[]
  /** Repete o menu do header como menu secundario. */
  menuSecundario: boolean
}

export type LpDocumento = {
  seo: { titulo: string; descricao: string }
  tema: LpTema
  header: LpHeader
  secoes: LpSecao[]
  footer: LpFooter
  redes: RedeSocial[]
}

/* ------------------------------- Briefing -------------------------------- */

export type MidiaBriefing = {
  tipo: TipoMidia
  busca: string
  orientacao: Orientacao
}

export type SecaoBriefing = {
  id: string
  nome: string
  vincularMenu: boolean
  titulo: string
  conteudo: string
  layout: TipoLayout
  colunas?: 2 | 3 | 4
  midia: MidiaBriefing | null
}

export type ItemMenuBriefing = {
  id: string
  rotulo: string
  /** URL externa opcional — vazio deixa a IA ligar a uma secao com o mesmo nome. */
  url: string
}

export type FooterBriefing = {
  textoInstitucional: string
  direitos: string
  endereco: string
  telefones: string
  email: string
  linksUteis: { id: string; rotulo: string; url: string }[]
  menuSecundario: boolean
}

export type LpBriefing = {
  nome: string
  tipografia: Partial<Record<CategoriaTexto, Partial<EstiloTipografia>>>
  cores: Partial<CoresTema>
  /** Ate 5 URLs de inspiracao (estilo, nunca copia). */
  referencias: string[]
  menu: ItemMenuBriefing[]
  footer: FooterBriefing
  redes: RedeSocial[]
  secoes: SecaoBriefing[]
}

export type LpProjeto = {
  id: string
  nome: string
  teamId: string
  criadoPor: string
  createdAt: number
  atualizadoEm: number
  briefing: LpBriefing
  /** null ate a primeira geracao pela IA. */
  documento: LpDocumento | null
}

/** Resumo para a listagem (sem briefing/documento, que podem ser grandes). */
export type LpProjetoResumo = {
  id: string
  nome: string
  createdAt: number
  atualizadoEm: number
  gerada: boolean
}

export function briefingVazio(nome: string): LpBriefing {
  return {
    nome,
    tipografia: {},
    cores: {},
    referencias: [],
    menu: [],
    footer: {
      textoInstitucional: '',
      direitos: '',
      endereco: '',
      telefones: '',
      email: '',
      linksUteis: [],
      menuSecundario: false,
    },
    redes: [],
    secoes: [],
  }
}
