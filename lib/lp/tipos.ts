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

/** Banco de midia de onde o item veio (usado para o credito obrigatorio). */
export type FonteMidia = 'pexels' | 'pixabay' | 'envato'

export const ROTULO_FONTE: Record<FonteMidia, string> = {
  pexels: 'Pexels',
  pixabay: 'Pixabay',
  envato: 'Envato',
}

/**
 * Reproducao do video na pagina. Campo ausente = padrao de hoje: com controles,
 * parado e sem repetir. Autoplay entra sempre junto com `muted` — navegador
 * nenhum toca video com som sem um gesto do usuario.
 *
 * Video de FUNDO (banner e hero com fundo) e decorativo: nunca ganha controles
 * nem som, e comeca sozinho em loop a menos que estes campos digam o contrario.
 */
export type ReproducaoVideo = {
  /** false esconde a barra de play/volume/tela cheia. */
  controles?: boolean
  /** Comeca sozinho ao abrir a pagina (sempre mudo). */
  autoplay?: boolean
  /** Repete sem parar. */
  loop?: boolean
}

export type LpMidia = ReproducaoVideo & {
  tipo: TipoMidia
  /**
   * Arquivo que vai para a pagina: imagem grande (~1920px) ou mp4 em Full HD.
   * Tambem aceita data URI de placeholder SVG.
   */
  url: string
  alt: string
  /** Descricao usada na busca de midia (editavel no editor). */
  busca: string
  orientacao: Orientacao
  /**
   * Caminho no nosso bucket, presente so quando o arquivo foi enviado pelo
   * usuario (nao veio de banco de imagem). E a chave para apagar o arquivo.
   */
  caminho?: string
  /** Pagina do item na fonte, para credito/licenciamento. */
  origem?: string
  /** Imagem estatica: miniatura no seletor e `poster` do <video> na pagina. */
  thumb?: string
  /** MP4 leve, so para a previa ao passar o mouse no seletor (nunca vai ao HTML). */
  previa?: string
  /** Dimensoes do arquivo em `url`, quando a fonte informa. */
  largura?: number
  altura?: number
  /** Duracao do video em segundos. */
  duracao?: number
  /** Credito ao autor — exigido pelos termos do Pexels e do Pixabay. */
  autor?: string
  autorUrl?: string
  fonte?: FonteMidia
}

/** Alinhamento horizontal: botao da secao, menu do header, coluna do rodape. */
export type Alinhamento = 'esquerda' | 'centro' | 'direita'

export const ALINHAMENTOS: Alinhamento[] = ['esquerda', 'centro', 'direita']

export const ROTULO_ALINHAMENTO: Record<Alinhamento, string> = {
  esquerda: 'À esquerda',
  centro: 'Centralizado',
  direita: 'À direita',
}

/** Alinhamento do botao dentro da secao. */
export type PosicaoBotao = Alinhamento

/**
 * Efeito ao passar o mouse. Todos mexem so em transform/filter/sombra — cor de
 * botao personalizada vai inline no HTML e venceria qualquer regra de :hover.
 */
export type HoverBotao = 'elevar' | 'brilho' | 'crescer' | 'sombra' | 'nenhum'

/** Animacao continua, para o botao chamar atencao sozinho. */
export type AnimacaoBotao = 'nenhuma' | 'pulsar' | 'flutuar' | 'brilho'

export const POSICOES_BOTAO: PosicaoBotao[] = ['esquerda', 'centro', 'direita']
export const HOVERS_BOTAO: HoverBotao[] = ['elevar', 'brilho', 'crescer', 'sombra', 'nenhum']
export const ANIMACOES_BOTAO: AnimacaoBotao[] = ['nenhuma', 'pulsar', 'flutuar', 'brilho']

export const ROTULO_HOVER: Record<HoverBotao, string> = {
  elevar: 'Subir um pouco',
  brilho: 'Clarear',
  crescer: 'Aumentar',
  sombra: 'Ganhar sombra',
  nenhum: 'Sem efeito',
}

export const ROTULO_ANIMACAO: Record<AnimacaoBotao, string> = {
  nenhuma: 'Nenhuma',
  pulsar: 'Pulsar',
  flutuar: 'Flutuar',
  brilho: 'Onda de brilho',
}

export type LpBotao = {
  texto: string
  url: string
  corFundo?: string
  corTexto?: string
  estilo?: 'solido' | 'contorno'
  /** Ausente = o alinhamento natural do layout. */
  posicao?: PosicaoBotao
  /** Ausente = 'elevar', o efeito que a pagina sempre teve. */
  hover?: HoverBotao
  /** Ausente = 'nenhuma'. */
  animacao?: AnimacaoBotao
}

/**
 * Botao do header ou do rodape. Igual ao das secoes, so que com id: como sao
 * varios, o editor precisa saber a qual deles o data-lp se refere.
 */
export type BotaoComId = LpBotao & { id: string }

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
  /**
   * Conteudo da secao em arvore. Opcional enquanto houver documento pre-arvore
   * salvo: o expansor produz na migracao e na geracao.
   */
  raiz?: LpContainer
  /**
   * Preset que semeou a arvore. Vira rotulo no painel e continua sendo o que a
   * IA escolhe — mas nao manda mais no render.
   */
  preset?: TipoLayout
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
  /**
   * Midia antes do texto (imagem+texto em vez de texto+imagem). Vale nos layouts
   * de LAYOUTS_COM_LADOS; em blocos-alternados diz por qual lado a alternancia
   * comeca.
   */
  inverter?: boolean
  largura: 'boxed' | 'full'
  /**
   * `escurecer` e o veu escuro por cima da midia (0-90%). `textoClaro` false faz
   * a secao manter as cores do tema em vez do branco automatico — o branco e o
   * padrao porque texto sobre foto/video precisa de contraste, mas quem escolheu
   * as cores na Identidade tem de poder recuperar elas.
   */
  fundo?: { cor?: string; midia?: LpMidia | null; escurecer?: number; textoClaro?: boolean }
  /** Padding vertical em px. */
  espacamento?: { topo: number; base: number }
  /** Rotulos de linha (layout comparacao). */
  rotulos?: string[]
  /** Sobreposicoes de estilo por elemento de texto. */
  ajustes?: Partial<Record<ElementoTexto, AjusteTexto>>
  /** Endpoint que recebe o formulario (layout formulario). Vazio = sem envio. */
  destinoForm?: string
}

/* ------------------------------- Arvore ---------------------------------- */

/**
 * Breakpoints do CSS, do mais largo para o mais estreito. `desktop` e a base
 * (sem media query); os outros sao max-width, definidos em BREAKPOINT
 * (lib/lp/padroes.ts).
 *
 * `tablet` e `celular` continuam valendo 900px e 640px, os mesmos de antes —
 * documento salvo com valor nessas chaves nao muda de aparencia.
 */
export type Dispositivo =
  | 'desktop'
  | 'notebook'
  | 'tabletDeitado'
  | 'tablet'
  | 'celularDeitado'
  | 'celular'

/**
 * Valor de estilo por dispositivo. `desktop` e a base (sem media query); tablet
 * e celular so emitem CSS quando presentes. A heranca sai da cascata: sendo
 * max-width, numa tela de 500px os dois blocos valem e o de 640 vence por vir
 * depois — celular herda de tablet, que herda de desktop.
 */
export type PorDisp<T> = Partial<Record<Dispositivo, T>>

export type Caixa = { topo: number; direita: number; base: number; esquerda: number }

/** Sobreposicoes visuais de um no. Ausente = herda do tema. */
export type LpEstilo = {
  cor?: PorDisp<string>
  fundo?: PorDisp<string>
  fonte?: PorDisp<string>
  tamanho?: PorDisp<string>
  peso?: PorDisp<number>
  alturaLinha?: PorDisp<string>
  espacamentoLetras?: PorDisp<string>
  alinhamento?: PorDisp<'left' | 'center' | 'right'>
  margem?: PorDisp<Caixa>
  padding?: PorDisp<Caixa>
  largura?: PorDisp<string>
  raio?: PorDisp<number>
  sombra?: PorDisp<string>
  /* --- so fazem sentido em midia (imagem/video) --- */
  altura?: PorDisp<string>
  /** `aspect-ratio` do quadro: '16/9', '4/3', '1/1'… */
  proporcao?: PorDisp<string>
  /** `object-fit` do <img>/<video> dentro do quadro. */
  ajuste?: PorDisp<'cobrir' | 'conter' | 'preencher'>
}

/** Comum a todo no da arvore. */
type NoBase = {
  id: string
  estilo?: LpEstilo
  /** Esconde o no no dispositivo marcado. */
  oculto?: PorDisp<boolean>
}

/**
 * Identidade visual pronta de um container. Vira uma classe no HTML e carrega o
 * que LpEstilo nao alcanca: hover, transicao e pseudo-elemento (o selo "Mais
 * popular" do plano em destaque e um ::before). Sem isto, migrar uma secao de
 * cards produziria colunas de texto cru, sem borda, sem fundo e sem hover.
 * `estilo` sobrepoe por cima.
 */
export type Aparencia =
  | 'card'
  | 'plano'
  | 'plano-destaque'
  | 'produto'
  | 'bloco'
  | 'figura'
  | 'beneficio'
  | 'marco'
  | 'caixa-cta'

export type LpContainer = NoBase & {
  tipo: 'container'
  /** Ausente = container sem identidade visual propria. */
  aparencia?: Aparencia
  direcao: PorDisp<'linha' | 'coluna'>
  colunas?: PorDisp<number>
  /**
   * Larguras relativas das colunas (ex.: '2fr 1fr'), quando `colunas` >= 2.
   * Ausente = todas iguais. So aceita valor do catalogo PROPORCOES_COLUNAS:
   * isto vira grid-template-columns e o documento nao e confiavel.
   */
  proporcaoColunas?: PorDisp<string>
  gap?: PorDisp<number>
  alinhar?: PorDisp<'inicio' | 'centro' | 'fim' | 'esticar'>
  justificar?: PorDisp<'inicio' | 'centro' | 'fim' | 'entre'>
  filhos: LpElemento[]
}

export type LpWidget = NoBase &
  (
    | { tipo: 'titulo'; nivel: 'h1' | 'h2' | 'h3' | 'h4'; texto: string }
    /** `papel` escolhe a categoria de tipografia do tema (subtitulos/textos). */
    | { tipo: 'texto'; papel: 'subtitulo' | 'corpo'; texto: string }
    | { tipo: 'imagem'; midia: LpMidia }
    | { tipo: 'video'; midia: LpMidia }
    | { tipo: 'botao'; botao: LpBotao }
    | { tipo: 'icone'; nome: string }
    | { tipo: 'numero'; valor: string; rotulo: string }
    | { tipo: 'lista'; itens: { id: string; icone?: string; texto: string }[] }
    | { tipo: 'espacador'; altura: PorDisp<number> }
    | { tipo: 'divisor' }
    | { tipo: 'faq'; perguntas: { id: string; pergunta: string; resposta: string }[] }
    | {
        tipo: 'abas'
        abas: { id: string; titulo: string; texto: string; imagem?: LpMidia | null }[]
      }
    | {
        tipo: 'carrossel'
        slides: { id: string; imagem?: LpMidia | null; titulo?: string; texto?: string }[]
      }
    | {
        tipo: 'depoimentos'
        depoimentos: {
          id: string
          texto: string
          nome: string
          cargo?: string
          foto?: LpMidia | null
        }[]
      }
    | {
        tipo: 'comparacao'
        rotulos: string[]
        colunas: { id: string; titulo: string; celulas: string[]; destaque?: boolean }[]
      }
    | { tipo: 'formulario'; destino?: string }
  )

export type LpElemento = LpContainer | LpWidget

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
  /**
   * Largura maxima do conteudo em px, por dispositivo. Vale para o header, o
   * rodape e todas as secoes — os tres usam .lp-container, que le --largura.
   * Ausente = LARGURA_PADRAO, a largura que a pagina sempre teve.
   */
  largura?: PorDisp<number>
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
  /**
   * Imagem da logo enviada pelo usuario. Quando existe, ela ocupa o lugar do
   * nome escrito no topo — `logoTexto` continua valendo como texto alternativo,
   * no rodape e no titulo da aba.
   */
  logo?: LpMidia | null
  menu: ItemMenu[]
  fixo: boolean
  /** Botoes de acao ao lado do menu (vazio = nenhum). */
  botoes: BotaoComId[]
  estilo?: EstiloBarra
}

/**
 * Ajustes visuais de uma barra (header ou rodape), por cima do tema global.
 * Campo ausente = o padrao do tema, entao pagina antiga nao muda de aparencia.
 */
export type EstiloBarra = {
  /** Fonte, tamanho, peso e cor dos links do menu. */
  menu?: AjusteTexto
  /**
   * Tamanho da logo em px: altura maxima da imagem no header; corpo do nome
   * escrito quando nao ha imagem (e sempre no rodape, que mostra o nome).
   */
  logo?: number
  /** Onde os links ficam na barra. */
  alinhamento?: Alinhamento
}

export type LinkFooter = { id: string; rotulo: string; url: string }

/**
 * Telefone do rodape. Com `whatsapp` o numero vira link do wa.me (e ganha o
 * icone da rede); sem, vira link `tel:`. Sao varios porque uma empresa costuma
 * publicar fixo e celular — ver `normalizarTelefones` (formato antigo: uma
 * string unica com todos os numeros).
 */
export type TelefoneFooter = { id: string; numero: string; whatsapp: boolean }

export type LpFooter = {
  textoInstitucional?: string
  direitos?: string
  endereco?: string
  telefones?: TelefoneFooter[]
  email?: string
  linksUteis: LinkFooter[]
  /** Botoes de acao no rodape, abaixo do texto institucional. */
  botoes?: BotaoComId[]
  /** Repete o menu do header como menu secundario. */
  menuSecundario: boolean
  estilo?: EstiloBarra
}

/* --------------------------- Paginas auxiliares -------------------------- */

/** Paginas de texto corrido que acompanham a landing page. */
export type TipoPaginaLegal = 'termos' | 'privacidade'

export const PAGINAS_LEGAIS: {
  tipo: TipoPaginaLegal
  titulo: string
  /** Nome do arquivo ao lado do index.html — tambem e o link no rodape. */
  arquivo: string
  descricao: string
}[] = [
  {
    tipo: 'termos',
    titulo: 'Termos de Uso',
    arquivo: 'termos.html',
    descricao: 'Regras de uso do site e dos serviços.',
  },
  {
    tipo: 'privacidade',
    titulo: 'Política de Privacidade',
    arquivo: 'privacidade.html',
    descricao: 'Como os dados de quem visita são tratados (LGPD).',
  },
]

export const infoPagina = (tipo: TipoPaginaLegal) =>
  PAGINAS_LEGAIS.find((p) => p.tipo === tipo) as (typeof PAGINAS_LEGAIS)[number]

/**
 * Pagina de texto gerada junto com a landing page (termos.html,
 * privacidade.html): mesmo header e rodape, o texto no meio. O link dela entra
 * sozinho nos "Links uteis" do rodape.
 */
export type PaginaLegal = {
  tipo: TipoPaginaLegal
  titulo: string
  /** Linha em branco separa paragrafo; "## " no inicio da linha vira subtitulo. */
  conteudo: string
}

export type LpDocumento = {
  /** Ausente = formato de secoes tipadas (pre-arvore). */
  versao?: 2
  seo: { titulo: string; descricao: string }
  tema: LpTema
  header: LpHeader
  secoes: LpSecao[]
  footer: LpFooter
  redes: RedeSocial[]
  /** Termos de uso / politica de privacidade (vazio = so a pagina principal). */
  paginas?: PaginaLegal[]
}

/* ------------------------------- Briefing -------------------------------- */

export type MidiaBriefing = ReproducaoVideo & {
  tipo: TipoMidia
  busca: string
  orientacao: Orientacao
  /**
   * Midia que o usuario definiu a mao: arquivo enviado por ele (fica no nosso
   * bucket, tem `caminho`) ou item escolhido no banco de imagens (tem `fonte`).
   * Quando existe, ela manda: a IA nao descreve a midia e a busca automatica nao
   * roda para essa secao. `busca` passa a ser so o texto alternativo da imagem.
   * O nome do campo vem de quando so havia envio de arquivo — briefings ja
   * salvos usam essa chave.
   */
  arquivo?: LpMidia | null
}

/**
 * Item que o usuario escreveu no briefing (card, plano, depoimento…). Espelha o
 * LpItem, menos icone e imagem: icone a IA escolhe e imagem se resolve na
 * geracao ou no editor. Campo em branco = a IA escreve aquele pedaco.
 */
export type ItemBriefing = {
  id: string
  titulo?: string
  /** Depende do layout, como no LpItem: subtitulo do card, preco, data, nome… */
  extra?: string
  detalhe?: string
  texto?: string
  lista?: string[]
  botao?: LpBotao | null
  destaque?: boolean
}

/**
 * Campos de texto da secao que a IA escreve sozinha quando o usuario deixa em
 * branco — e que ele pode dispensar um a um (ver SecaoBriefing.semIa).
 */
export type CampoTextoSecao = 'titulo' | 'subtitulo' | 'conteudo'

export const CAMPOS_TEXTO_SECAO: CampoTextoSecao[] = ['titulo', 'subtitulo', 'conteudo']

export type SecaoBriefing = {
  id: string
  nome: string
  vincularMenu: boolean
  /**
   * Id do ItemMenuBriefing que esta secao representa — e o que faz o clique no
   * menu do header cair nesta secao. Vazio: a geracao liga pelo nome (item
   * "Quem Somos" acha a secao "Quem Somos") e, nao achando, cria um item novo
   * com o nome da secao.
   */
  itemMenu?: string | null
  titulo: string
  /** Linha de apoio abaixo do titulo. Vazio = a IA escreve (ou nao usa). */
  subtitulo?: string
  conteudo: string
  layout: TipoLayout
  colunas?: 2 | 3 | 4
  /**
   * Midia do lado esquerdo e conteudo do direito (ver LpSecao.inverter). So os
   * layouts de LAYOUTS_COM_LADOS usam; a escolha do usuario vence a da IA.
   */
  inverter?: boolean
  midia: MidiaBriefing | null
  /**
   * Botao que o usuario definiu para a secao. Quando existe, ele vence o que a
   * IA escrever — qualquer layout aceita um, nao so os que a IA propoe.
   */
  botao?: LpBotao | null
  /**
   * Itens escritos pelo usuario. A lista dele define quais e quantos; o que
   * ficar em branco a IA preenche. Vazia = a IA cria os itens sozinha.
   */
  itens?: ItemBriefing[]
  /**
   * Campos em branco que a IA NAO deve escrever: a secao sai sem eles. Ausente
   * = o padrao de sempre (campo vazio e a IA preenche). So vale enquanto o
   * campo esta em branco — texto escrito pelo usuario manda em qualquer caso, e
   * a marcacao sai do briefing na coercao.
   */
  semIa?: Partial<Record<CampoTextoSecao, boolean>>
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
  telefones: TelefoneFooter[]
  email: string
  linksUteis: { id: string; rotulo: string; url: string }[]
  menuSecundario: boolean
  /** Aparencia do rodape (fonte do menu, tamanho do nome, alinhamento). */
  estilo?: EstiloBarra
}

export type LpBriefing = {
  nome: string
  /** Logo enviada na etapa Identidade — vai para o header da pagina gerada. */
  logo?: LpMidia | null
  tipografia: Partial<Record<CategoriaTexto, Partial<EstiloTipografia>>>
  cores: Partial<CoresTema>
  /** Ate 5 URLs de inspiracao (estilo, nunca copia). */
  referencias: string[]
  menu: ItemMenuBriefing[]
  /** Aparencia do topo (fonte do menu, tamanho da logo, alinhamento). */
  estiloHeader?: EstiloBarra
  footer: FooterBriefing
  redes: RedeSocial[]
  secoes: SecaoBriefing[]
  /**
   * Paginas de termos/privacidade que o projeto vai ter. Estar na lista = a
   * pagina existe; o texto e escrito na etapa "Páginas" do assistente.
   */
  paginas: PaginaLegal[]
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
      telefones: [],
      email: '',
      linksUteis: [],
      menuSecundario: false,
    },
    redes: [],
    secoes: [],
    paginas: [],
  }
}
