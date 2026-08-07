/**
 * Catalogo de layouts de secao. Guia tres consumidores: o assistente (seletor
 * de layout), o editor (campos visiveis no painel, nova secao/novo item) e a
 * IA (descricao de cada layout no prompt).
 */

import { placeholderMidia } from './placeholder'
import { expandirPreset } from './presets/expandir'
import type { LpItem, LpSecao, LpTema, Orientacao, TipoLayout } from './tipos'
import { gerarId, slugificar } from './util'

export type CampoItem = 'icone' | 'imagem' | 'titulo' | 'texto' | 'extra' | 'detalhe' | 'lista' | 'botao' | 'url' | 'destaque'

export type InfoLayout = {
  tipo: TipoLayout
  rotulo: string
  descricao: string
  grupo: 'Conteúdo' | 'Cards e listas' | 'Mídia' | 'Prova social' | 'Conversão' | 'Avançado'
  campos: { subtitulo: boolean; texto: boolean; botao: boolean; midia: boolean }
  /** null = secao sem itens repetiveis. */
  itens: { rotulo: string; campos: CampoItem[] } | null
  temColunas: boolean
}

export const LAYOUTS: InfoLayout[] = [
  {
    tipo: 'hero',
    rotulo: 'Hero Section',
    descricao: 'Abertura de impacto com título grande, subtítulo, botão e mídia de fundo ou lateral.',
    grupo: 'Conteúdo',
    campos: { subtitulo: true, texto: true, botao: true, midia: true },
    itens: null,
    temColunas: false,
  },
  {
    tipo: 'texto-midia',
    rotulo: 'Texto + Mídia',
    descricao: 'Duas colunas: texto de um lado, imagem ou vídeo do outro (ordem invertível).',
    grupo: 'Conteúdo',
    campos: { subtitulo: true, texto: true, botao: true, midia: true },
    itens: null,
    temColunas: false,
  },
  {
    tipo: 'texto-centralizado',
    rotulo: 'Texto centralizado',
    descricao: 'Bloco de texto centralizado, ideal para apresentações e manifestos.',
    grupo: 'Conteúdo',
    campos: { subtitulo: true, texto: true, botao: true, midia: false },
    itens: null,
    temColunas: false,
  },
  {
    tipo: 'blocos-alternados',
    rotulo: 'Blocos alternados',
    descricao: 'Sequência de blocos texto/imagem alternando os lados a cada bloco.',
    grupo: 'Conteúdo',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Bloco', campos: ['imagem', 'titulo', 'texto', 'botao'] },
    temColunas: false,
  },
  {
    tipo: 'cards',
    rotulo: 'Cards',
    descricao:
      'Grade de cards em 2, 3 ou 4 colunas. Cada card tem ícone, título, subtítulo, texto e botão próprios.',
    grupo: 'Cards e listas',
    campos: { subtitulo: true, texto: true, botao: false, midia: false },
    itens: { rotulo: 'Card', campos: ['icone', 'titulo', 'extra', 'texto', 'botao'] },
    temColunas: true,
  },
  {
    tipo: 'lista-beneficios',
    rotulo: 'Lista de benefícios',
    descricao: 'Lista vertical de benefícios com ícone de check e descrição.',
    grupo: 'Cards e listas',
    campos: { subtitulo: true, texto: true, botao: true, midia: true },
    itens: { rotulo: 'Benefício', campos: ['icone', 'titulo', 'texto'] },
    temColunas: false,
  },
  {
    tipo: 'estatisticas',
    rotulo: 'Big Numbers',
    descricao:
      'Números grandes com contagem animada: você escreve o valor e a informação de cada um (clientes, obras, anos…).',
    grupo: 'Cards e listas',
    campos: { subtitulo: true, texto: true, botao: false, midia: false },
    itens: { rotulo: 'Número', campos: ['extra', 'titulo'] },
    temColunas: true,
  },
  {
    tipo: 'timeline',
    rotulo: 'Timeline',
    descricao: 'Linha do tempo vertical com marcos, datas e descrições.',
    grupo: 'Cards e listas',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Marco', campos: ['extra', 'titulo', 'texto'] },
    temColunas: false,
  },
  {
    tipo: 'tabs',
    rotulo: 'Tabs',
    descricao: 'Conteúdo organizado em abas clicáveis, cada uma com texto e imagem.',
    grupo: 'Avançado',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Aba', campos: ['titulo', 'texto', 'imagem'] },
    temColunas: false,
  },
  {
    tipo: 'galeria',
    rotulo: 'Galeria',
    descricao: 'Grade regular de imagens com legendas opcionais.',
    grupo: 'Mídia',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Imagem', campos: ['imagem', 'titulo'] },
    temColunas: true,
  },
  {
    tipo: 'masonry',
    rotulo: 'Masonry',
    descricao: 'Mosaico de imagens em alturas variadas, estilo Pinterest.',
    grupo: 'Mídia',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Imagem', campos: ['imagem', 'titulo'] },
    temColunas: true,
  },
  {
    tipo: 'carrossel',
    rotulo: 'Carrossel',
    descricao: 'Slides de imagem com título e texto, navegação por setas e bolinhas.',
    grupo: 'Mídia',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Slide', campos: ['imagem', 'titulo', 'texto'] },
    temColunas: false,
  },
  {
    tipo: 'banner',
    rotulo: 'Banner',
    descricao: 'Faixa de largura total com imagem de fundo, frase forte e botão.',
    grupo: 'Mídia',
    campos: { subtitulo: true, texto: false, botao: true, midia: true },
    itens: null,
    temColunas: false,
  },
  {
    tipo: 'depoimentos',
    rotulo: 'Depoimentos',
    descricao: 'Slider de depoimentos com citação, nome e cargo do cliente.',
    grupo: 'Prova social',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Depoimento', campos: ['texto', 'extra', 'detalhe', 'imagem'] },
    temColunas: false,
  },
  {
    tipo: 'logos',
    rotulo: 'Logos de clientes',
    descricao: 'Fileira de logos de clientes ou parceiros, em tons neutros.',
    grupo: 'Prova social',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Logo', campos: ['imagem', 'titulo', 'url'] },
    temColunas: false,
  },
  {
    tipo: 'faq',
    rotulo: 'FAQ em Accordion',
    descricao: 'Perguntas frequentes que abrem e fecham ao clique.',
    grupo: 'Prova social',
    campos: { subtitulo: true, texto: true, botao: false, midia: false },
    itens: { rotulo: 'Pergunta', campos: ['titulo', 'texto'] },
    temColunas: false,
  },
  {
    tipo: 'cta',
    rotulo: 'Call to Action',
    descricao: 'Chamada final para ação com frase curta e botão em destaque.',
    grupo: 'Conversão',
    campos: { subtitulo: true, texto: true, botao: true, midia: false },
    itens: null,
    temColunas: false,
  },
  {
    tipo: 'formulario',
    rotulo: 'Formulário',
    descricao: 'Formulário de contato com nome, e-mail, telefone e mensagem.',
    grupo: 'Conversão',
    campos: { subtitulo: true, texto: true, botao: false, midia: true },
    itens: null,
    temColunas: false,
  },
  {
    tipo: 'precos',
    rotulo: 'Pricing Table',
    descricao: 'Planos com preço, lista de vantagens e um plano em destaque.',
    grupo: 'Conversão',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Plano', campos: ['titulo', 'extra', 'detalhe', 'lista', 'botao', 'destaque'] },
    temColunas: true,
  },
  {
    tipo: 'comparacao',
    rotulo: 'Comparação',
    descricao: 'Tabela comparando colunas (planos ou produtos) por características.',
    grupo: 'Conversão',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Coluna', campos: ['titulo', 'lista', 'destaque'] },
    temColunas: false,
  },
  {
    tipo: 'grid-produtos',
    rotulo: 'Grid de produtos',
    descricao: 'Vitrine de produtos com foto, nome, preço e botão.',
    grupo: 'Conversão',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Produto', campos: ['imagem', 'titulo', 'extra', 'botao'] },
    temColunas: true,
  },
]

export const GRUPOS_LAYOUT = ['Conteúdo', 'Cards e listas', 'Mídia', 'Prova social', 'Conversão', 'Avançado'] as const

export function infoLayout(tipo: TipoLayout): InfoLayout {
  return LAYOUTS.find((l) => l.tipo === tipo) ?? LAYOUTS[0]
}

/**
 * Layouts em que o conteudo e a midia dividem a linha — os unicos em que trocar
 * os lados significa alguma coisa. Nos demais a midia e fundo (banner), e de
 * cada item (galeria, cards) ou nao existe.
 */
export const LAYOUTS_COM_LADOS = new Set<TipoLayout>([
  'hero',
  'texto-midia',
  'blocos-alternados',
])

export const temLados = (tipo: TipoLayout): boolean => LAYOUTS_COM_LADOS.has(tipo)

/** Campos do item cujo nome muda conforme o layout (ver LpItem). */
export type CampoRotulavel = 'titulo' | 'extra' | 'detalhe'

/**
 * `titulo`, `extra` e `detalhe` do item mudam de sentido conforme o layout. O
 * rotulo sai daqui no briefing e no editor, para os dois falarem igual.
 */
const ROTULO_ITEM: Partial<Record<TipoLayout, Partial<Record<CampoRotulavel, string>>>> = {
  cards: { extra: 'Subtítulo' },
  estatisticas: { extra: 'Número', titulo: 'Informação' },
  precos: { extra: 'Preço', detalhe: 'Período' },
  'grid-produtos': { extra: 'Preço' },
  timeline: { extra: 'Data' },
  depoimentos: { extra: 'Nome', detalhe: 'Cargo ou empresa' },
}

/**
 * Periodos do Pricing Table (campo `detalhe` do plano). O valor e o que sai na
 * pagina colado no preco — "R$ 99" + "/mês"; '' mostra so o preco.
 */
export const PERIODOS_PRECO: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Sem período' },
  { valor: '/semana', rotulo: 'Por semana' },
  { valor: '/mês', rotulo: 'Por mês' },
  { valor: '/bimestre', rotulo: 'Por bimestre' },
  { valor: '/trimestre', rotulo: 'Por trimestre' },
  { valor: '/semestre', rotulo: 'Por semestre' },
  { valor: '/ano', rotulo: 'Por ano' },
]

/**
 * Sinonimos aceitos, por slug (sem acento, minusculo, sem o "por" na frente).
 * A comparacao e exata de proposito: "trimestre" e "semestre" contem "mes" e
 * virariam mensal numa busca por pedaco — trocar o periodo de um plano e mudar
 * o preco dele.
 */
const SINONIMO_PERIODO: Record<string, string> = {
  semana: '/semana',
  semanal: '/semana',
  week: '/semana',
  mes: '/mês',
  mensal: '/mês',
  month: '/mês',
  bimestre: '/bimestre',
  bimestral: '/bimestre',
  trimestre: '/trimestre',
  trimestral: '/trimestre',
  quarter: '/trimestre',
  semestre: '/semestre',
  semestral: '/semestre',
  ano: '/ano',
  anual: '/ano',
  year: '/ano',
}

/**
 * Encaixa no catalogo o periodo escrito de outro jeito ("/mes", "por mês",
 * "mensal"). Devolve null quando nao reconhece — ai o texto continua como esta,
 * so nao vira uma opcao do select.
 */
export function periodoPreco(valor: string): string | null {
  const slug = slugificar(valor).replace(/^por-/, '')
  return SINONIMO_PERIODO[slug] ?? null
}

const ROTULO_PADRAO: Record<CampoRotulavel, string> = {
  titulo: 'Título',
  extra: 'Destaque',
  detalhe: 'Complemento',
}

export function rotuloItem(tipo: TipoLayout, campo: CampoRotulavel): string {
  return ROTULO_ITEM[tipo]?.[campo] ?? ROTULO_PADRAO[campo]
}

/* -------------------- conteudo com que a secao nova nasce ------------------ */

/**
 * Item de exemplo. Os nomes seguem LpItem; o que o layout nao declarar em
 * `itens.campos` nao entra no item, mesmo escrito aqui.
 */
type ExemploItem = {
  icone?: string
  /** Descricao da imagem: vira o alt, o rotulo do placeholder e a busca no banco. */
  imagem?: string
  orientacao?: Orientacao
  titulo?: string
  texto?: string
  extra?: string
  detalhe?: string
  lista?: string[]
  botao?: string
  destaque?: boolean
}

type ExemploSecao = {
  titulo: string
  subtitulo?: string
  texto?: string
  botao?: string
  /** Midia da secao. No banner o expansor a leva para o fundo. */
  imagem?: string
  orientacao?: Orientacao
  colunas?: 2 | 3 | 4
  /** Rotulos das linhas (layout comparacao) — um por celula de cada coluna. */
  rotulos?: string[]
  /** Um por item da secao nova; tambem alimenta o item avulso, por indice. */
  itens?: ExemploItem[]
}

/**
 * Conteudo de exemplo de cada preset. Nao e enfeite: o painel so edita o que ja
 * existe na arvore (inserir e remover widget ainda nao existem), entao o que a
 * secao nova NAO trouxer o usuario nao tem como colocar depois. Por isso cada
 * layout nasce com tudo o que sabe mostrar — o que `campos` e `itens.campos`
 * declaram —, com texto de exemplo no lugar de campo em branco.
 */
const EXEMPLO_SECAO: Record<TipoLayout, ExemploSecao> = {
  hero: {
    titulo: 'O que você faz, em uma frase clara',
    subtitulo: 'Uma linha de apoio dizendo para quem é e qual é o resultado.',
    texto: 'Troque este texto pelo seu: duas ou três linhas bastam para o visitante entender onde chegou.',
    botao: 'Fale conosco',
    imagem: 'equipe trabalhando em escritório',
  },
  'texto-midia': {
    titulo: 'Conte a sua história',
    subtitulo: 'A frase que abre o assunto.',
    texto: 'Use este espaço para explicar o que você faz, como faz e por que isso importa para quem está lendo. Parágrafos curtos funcionam melhor do que um bloco longo.',
    botao: 'Saiba mais',
    imagem: 'time reunido em mesa de trabalho',
  },
  'texto-centralizado': {
    titulo: 'Uma ideia por seção',
    subtitulo: 'A linha de apoio que prepara o texto abaixo.',
    texto: 'Escreva aqui o parágrafo central. Texto centralizado funciona melhor curto: três ou quatro linhas, uma ideia só.',
    botao: 'Saiba mais',
  },
  'blocos-alternados': {
    titulo: 'Como funciona',
    subtitulo: 'Cada bloco explica uma etapa e inverte o lado da imagem.',
    itens: [
      {
        imagem: 'conversa com cliente em escritório',
        titulo: 'Entendemos o seu cenário',
        texto: 'Descreva a primeira etapa em duas ou três linhas: o que acontece e o que o cliente precisa fazer.',
        botao: 'Saiba mais',
      },
      {
        imagem: 'planejamento em quadro branco',
        titulo: 'Montamos o plano',
        texto: 'A segunda etapa. Manter o mesmo tamanho de texto em todos os blocos deixa a leitura ritmada.',
        botao: 'Saiba mais',
      },
      {
        imagem: 'equipe comemorando entrega de projeto',
        titulo: 'Colocamos no ar',
        texto: 'A etapa final, com o resultado que o cliente recebe quando o trabalho termina.',
        botao: 'Saiba mais',
      },
    ],
  },
  cards: {
    titulo: 'O que oferecemos',
    subtitulo: 'Uma linha apresentando o conjunto.',
    texto: 'Um parágrafo curto de introdução, se fizer falta. São os cards abaixo que carregam o conteúdo.',
    colunas: 3,
    itens: [
      {
        icone: 'raio',
        titulo: 'Primeiro serviço',
        extra: 'Do diagnóstico à entrega',
        texto: 'Explique em duas linhas o que está incluído e para quem serve.',
        botao: 'Saiba mais',
      },
      {
        icone: 'escudo',
        titulo: 'Segundo serviço',
        extra: 'Com acompanhamento mensal',
        texto: 'Repita a mesma estrutura em todos os cards: a grade fica alinhada e a leitura, mais fácil.',
        botao: 'Saiba mais',
      },
      {
        icone: 'alvo',
        titulo: 'Terceiro serviço',
        extra: 'Sob medida para o seu porte',
        texto: 'Se um serviço precisa de mais espaço do que os outros, ele provavelmente merece uma seção só dele.',
        botao: 'Saiba mais',
      },
    ],
  },
  'lista-beneficios': {
    titulo: 'Por que trabalhar com a gente',
    subtitulo: 'Os pontos que mais pesam na decisão.',
    texto: 'Um parágrafo de apoio antes da lista, quando ajudar a dar contexto.',
    botao: 'Fale conosco',
    imagem: 'profissional atendendo cliente',
    itens: [
      { icone: 'relogio', titulo: 'Prazo que se cumpre', texto: 'Cada entrega com data combinada desde o começo.' },
      { icone: 'usuarios', titulo: 'Time dedicado', texto: 'Você fala sempre com quem está tocando o seu projeto.' },
      { icone: 'crescimento', titulo: 'Resultado medido', texto: 'Relatórios simples mostrando o que mudou depois do trabalho.' },
      { icone: 'joinha', titulo: 'Suporte depois da entrega', texto: 'Acompanhamento nos primeiros meses, sem custo extra.' },
    ],
  },
  estatisticas: {
    titulo: 'Números que falam por nós',
    subtitulo: 'Um recorte do que já foi entregue.',
    texto: 'Números redondos e verificáveis convencem mais do que uma lista longa.',
    colunas: 4,
    itens: [
      { extra: '+250', titulo: 'Clientes atendidos' },
      { extra: '12', titulo: 'Anos de mercado' },
      { extra: '98%', titulo: 'De satisfação' },
      { extra: '+1.500', titulo: 'Projetos entregues' },
    ],
  },
  timeline: {
    titulo: 'Nossa trajetória',
    subtitulo: 'Os marcos que trouxeram a empresa até aqui.',
    itens: [
      { extra: '2019', titulo: 'O começo', texto: 'O que aconteceu neste marco, em uma ou duas linhas.' },
      { extra: '2022', titulo: 'A primeira grande entrega', texto: 'Marcos com data ajudam o visitante a medir a experiência.' },
      { extra: '2026', titulo: 'Onde estamos hoje', texto: 'Feche a linha do tempo com o momento atual da empresa.' },
    ],
  },
  tabs: {
    titulo: 'Tudo em um lugar',
    subtitulo: 'Cada aba abre um conteúdo sem tirar o visitante da página.',
    itens: [
      {
        titulo: 'Primeira aba',
        texto: 'O conteúdo desta aba. Abas funcionam bem para assuntos parecidos que competem pelo mesmo espaço.',
        imagem: 'apresentação de projeto em notebook',
      },
      {
        titulo: 'Segunda aba',
        texto: 'Mantenha os títulos curtos: eles são botões e precisam caber lado a lado no celular.',
        imagem: 'reunião de equipe em sala de vidro',
      },
      {
        titulo: 'Terceira aba',
        texto: 'Se o conteúdo de uma aba ficar muito maior que o das outras, considere separá-lo em outra seção.',
        imagem: 'detalhe de mesa de trabalho',
      },
    ],
  },
  galeria: {
    titulo: 'Galeria',
    subtitulo: 'Uma linha explicando o que estas imagens mostram.',
    colunas: 3,
    itens: [
      { imagem: 'projeto concluído visto de fora', titulo: 'Projeto entregue' },
      { imagem: 'ambiente interno iluminado', titulo: 'Ambiente interno' },
      { imagem: 'detalhe de acabamento', titulo: 'Detalhe do acabamento' },
      { imagem: 'equipe trabalhando em campo', titulo: 'Equipe em campo' },
      { imagem: 'vista aérea do projeto', titulo: 'Vista geral' },
      { imagem: 'ambiente antes da reforma', titulo: 'Antes e depois' },
    ],
  },
  masonry: {
    titulo: 'Mosaico',
    subtitulo: 'Imagens de alturas diferentes, encaixadas sem sobra.',
    colunas: 3,
    itens: [
      { imagem: 'fachada do projeto', titulo: 'Fachada', orientacao: 'retrato' },
      { imagem: 'ambiente interno iluminado', titulo: 'Interior' },
      { imagem: 'detalhe de acabamento', titulo: 'Detalhe', orientacao: 'quadrado' },
      { imagem: 'escada e pé-direito alto', titulo: 'Circulação', orientacao: 'retrato' },
      { imagem: 'vista aérea do projeto', titulo: 'Implantação' },
      { imagem: 'área externa ao entardecer', titulo: 'Área externa', orientacao: 'quadrado' },
    ],
  },
  carrossel: {
    titulo: 'Destaques',
    subtitulo: 'Passe os slides para ver mais.',
    itens: [
      {
        imagem: 'projeto em destaque',
        titulo: 'Primeiro slide',
        texto: 'Uma frase por slide. O visitante lê de passagem, então o texto precisa caber em um olhar.',
      },
      {
        imagem: 'equipe apresentando resultado',
        titulo: 'Segundo slide',
        texto: 'Slides funcionam melhor quando todos têm imagem: sem ela o carrossel fica desalinhado.',
      },
      {
        imagem: 'ambiente entregue ao cliente',
        titulo: 'Terceiro slide',
        texto: 'Três a cinco slides costumam bastar — o que vem depois quase ninguém vê.',
      },
    ],
  },
  banner: {
    titulo: 'Uma frase forte ocupando a tela inteira',
    subtitulo: 'A linha de apoio que completa a ideia.',
    botao: 'Quero saber mais',
    imagem: 'paisagem urbana ao entardecer',
  },
  depoimentos: {
    titulo: 'O que dizem sobre nós',
    subtitulo: 'Depoimentos de quem já trabalhou com a gente.',
    itens: [
      {
        texto: 'Escreva aqui o depoimento com as palavras do cliente. Dois ou três períodos convencem mais do que um texto longo.',
        extra: 'Nome do cliente',
        detalhe: 'Diretora de operações',
        imagem: 'retrato de cliente sorrindo',
        orientacao: 'quadrado',
      },
      {
        texto: 'Depoimento que cita um resultado concreto vale por três elogios genéricos.',
        extra: 'Nome do cliente',
        detalhe: 'Sócio-fundador',
        imagem: 'retrato de profissional em escritório',
        orientacao: 'quadrado',
      },
      {
        texto: 'Peça autorização antes de publicar nome, cargo e foto de quem deu o depoimento.',
        extra: 'Nome do cliente',
        detalhe: 'Gerente de marketing',
        imagem: 'retrato em ambiente de trabalho',
        orientacao: 'quadrado',
      },
    ],
  },
  logos: {
    titulo: 'Marcas que confiam na gente',
    subtitulo: 'Alguns dos clientes e parceiros.',
    itens: [
      { imagem: 'logotipo de empresa em fundo claro', titulo: 'Cliente um' },
      { imagem: 'logotipo de empresa parceira', titulo: 'Cliente dois' },
      { imagem: 'logotipo em preto e branco', titulo: 'Cliente três' },
      { imagem: 'marca de empresa de tecnologia', titulo: 'Cliente quatro' },
      { imagem: 'logotipo de indústria', titulo: 'Cliente cinco' },
    ],
  },
  faq: {
    titulo: 'Perguntas frequentes',
    subtitulo: 'As dúvidas que mais aparecem antes de fechar.',
    texto: 'Se ficar alguma pergunta de fora, é só chamar pelo contato no rodapé.',
    itens: [
      { titulo: 'Quanto tempo leva?', texto: 'Responda direto, com um prazo real. Resposta vaga aqui vira e-mail depois.' },
      { titulo: 'Como funciona o pagamento?', texto: 'Formas de pagamento, parcelamento e o que acontece em caso de cancelamento.' },
      { titulo: 'Vocês atendem em todo o país?', texto: 'Diga onde você atende e como funciona o atendimento a distância.' },
      { titulo: 'E depois da entrega?', texto: 'Explique o suporte, a garantia e por quanto tempo eles valem.' },
    ],
  },
  cta: {
    titulo: 'Pronto para começar?',
    subtitulo: 'Uma linha que tira a última dúvida antes do clique.',
    texto: 'Se precisar, um parágrafo curto reforçando o que a pessoa ganha ao clicar no botão.',
    botao: 'Fale conosco',
  },
  formulario: {
    titulo: 'Fale com a gente',
    subtitulo: 'Preencha os campos e retornamos em até um dia útil.',
    texto: 'Conte o que você precisa. Quanto mais detalhe, mais rápida é a resposta.',
    imagem: 'atendimento ao cliente por telefone',
  },
  precos: {
    titulo: 'Planos e preços',
    subtitulo: 'Escolha o plano que cabe no seu momento.',
    colunas: 3,
    itens: [
      {
        titulo: 'Essencial',
        extra: 'R$ 99',
        detalhe: '/mês',
        lista: ['Uma linha por vantagem', 'Até 3 usuários', 'Suporte por e-mail'],
        botao: 'Assinar',
      },
      {
        titulo: 'Profissional',
        extra: 'R$ 199',
        detalhe: '/mês',
        lista: ['Tudo do Essencial', 'Até 10 usuários', 'Suporte prioritário'],
        botao: 'Assinar',
        destaque: true,
      },
      {
        titulo: 'Empresarial',
        extra: 'R$ 399',
        detalhe: '/mês',
        lista: ['Tudo do Profissional', 'Usuários ilimitados', 'Gerente de conta'],
        botao: 'Falar com vendas',
      },
    ],
  },
  comparacao: {
    titulo: 'Compare os planos',
    subtitulo: 'O que muda de um para o outro.',
    rotulos: ['Usuários', 'Suporte', 'Relatórios'],
    itens: [
      { titulo: 'Essencial', lista: ['Até 3', 'Por e-mail', 'Mensais'] },
      { titulo: 'Profissional', lista: ['Até 10', 'Prioritário', 'Semanais'], destaque: true },
    ],
  },
  'grid-produtos': {
    titulo: 'Nossos produtos',
    subtitulo: 'Uma linha sobre a linha de produtos.',
    colunas: 3,
    itens: [
      { imagem: 'produto em fundo claro', orientacao: 'quadrado', titulo: 'Primeiro produto', extra: 'R$ 99', botao: 'Comprar' },
      { imagem: 'produto sobre mesa de madeira', orientacao: 'quadrado', titulo: 'Segundo produto', extra: 'R$ 149', botao: 'Comprar' },
      { imagem: 'produto em uso no dia a dia', orientacao: 'quadrado', titulo: 'Terceiro produto', extra: 'R$ 199', botao: 'Comprar' },
    ],
  },
}

/**
 * Gradiente do placeholder nas cores do projeto — a secao nova entra parecida
 * com o resto da pagina, em vez de um bloco cinza no meio dela. Termina na cor
 * dos titulos, que e escura por definicao (contrasta com o fundo da pagina),
 * para o rotulo branco desenhado no SVG continuar legivel.
 */
const coresPlaceholder = (tema?: LpTema) =>
  tema ? { de: tema.cores.principal, ate: tema.cores.titulos } : undefined

/**
 * Exemplo do layout. Como em `infoLayout`, o tipo pode chegar do Firestore ou da
 * IA fora do catalogo em tempo de execucao — cair no primeiro e melhor do que
 * estourar na hora de montar a secao.
 */
const exemploDe = (tipo: TipoLayout): ExemploSecao => EXEMPLO_SECAO[tipo] ?? EXEMPLO_SECAO.hero

/**
 * Item novo com o conteudo de exemplo do layout. `indice` escolhe qual exemplo
 * (a secao nova pede 0, 1, 2…); passando do fim da lista, volta ao comeco.
 */
export function novoItem(tipo: TipoLayout, indice = 0, tema?: LpTema): LpItem {
  const info = infoLayout(tipo)
  const campos = info.itens?.campos ?? []
  const exemplos = exemploDe(tipo).itens ?? []
  const ex: ExemploItem = exemplos.length > 0 ? exemplos[indice % exemplos.length] : {}
  const item: LpItem = { id: gerarId() }
  if (campos.includes('icone')) item.icone = ex.icone ?? 'check'
  // Galeria/masonry filtram itens sem imagem — o novo item nasce com placeholder
  // para aparecer no canvas e poder ser selecionado.
  if (campos.includes('imagem')) {
    item.imagem = placeholderMidia(
      ex.imagem ?? 'nova imagem',
      ex.orientacao ?? 'paisagem',
      'imagem',
      coresPlaceholder(tema),
    )
  }
  if (campos.includes('titulo')) item.titulo = ex.titulo ?? 'Novo item'
  if (campos.includes('texto')) item.texto = ex.texto ?? 'Descreva este item aqui.'
  // `extra` e `detalhe` mudam de significado conforme o layout (ver LpItem) — o
  // exemplo vem da tabela, senao a timeline nasce com "R$ 99" no lugar da data.
  if (campos.includes('extra')) item.extra = ex.extra ?? ''
  if (campos.includes('detalhe')) item.detalhe = ex.detalhe ?? ''
  if (campos.includes('lista')) item.lista = [...(ex.lista ?? ['Vantagem um', 'Vantagem dois'])]
  if (campos.includes('botao')) item.botao = { texto: ex.botao ?? 'Saiba mais', url: '#' }
  if (campos.includes('destaque') && ex.destaque) item.destaque = true
  return item
}

/**
 * Secao nova do editor: ja montada em arvore e com conteudo de exemplo.
 *
 * A arvore nao e opcional. O compilador so renderiza `raiz` (html.ts) e o painel
 * so lista e seleciona no que exista nela: sem ela a secao entrava na pagina como
 * uma faixa vazia, sem nada para clicar nem por onde comecar. Pior, secao sem
 * `raiz` derruba o `versao: 2` do documento na gravacao (validar.ts) — e a
 * leitura seguinte remigraria a pagina inteira por cima do que ja foi editado.
 *
 * `tema` tinge os placeholders de midia com as cores do projeto.
 */
export function novaSecao(tipo: TipoLayout, tema?: LpTema): LpSecao {
  const info = infoLayout(tipo)
  const ex = exemploDe(tipo)
  const secao: LpSecao = {
    id: gerarId(),
    tipo,
    nome: info.rotulo,
    ancora: slugificar(info.rotulo),
    titulo: ex.titulo,
    itens: [],
    largura: tipo === 'banner' ? 'full' : 'boxed',
    espacamento: { topo: 80, base: 80 },
  }
  if (info.campos.subtitulo && ex.subtitulo) secao.subtitulo = ex.subtitulo
  if (info.campos.texto && ex.texto) secao.texto = ex.texto
  if (info.campos.botao && ex.botao) secao.botao = { texto: ex.botao, url: '#' }
  if (info.campos.midia && ex.imagem) {
    secao.midia = placeholderMidia(
      ex.imagem,
      ex.orientacao ?? 'paisagem',
      'imagem',
      coresPlaceholder(tema),
    )
  }
  if (info.temColunas) secao.colunas = ex.colunas ?? 3
  if (info.itens) secao.itens = (ex.itens ?? []).map((_, i) => novoItem(tipo, i, tema))
  if (ex.rotulos) secao.rotulos = [...ex.rotulos]
  // A secao volta do expansor porque o banner muda no caminho: a midia dele e
  // fundo da faixa, nao um elemento solto no meio do texto.
  const { raiz, secao: ajustada } = expandirPreset(secao)
  return { ...ajustada, preset: tipo, raiz }
}
