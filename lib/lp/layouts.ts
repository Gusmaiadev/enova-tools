/**
 * Catalogo de layouts de secao. Guia tres consumidores: o assistente (seletor
 * de layout), o editor (campos visiveis no painel, nova secao/novo item) e a
 * IA (descricao de cada layout no prompt).
 */

import { placeholderMidia } from './placeholder'
import type { LpItem, LpSecao, TipoLayout } from './tipos'
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
    descricao: 'Grade de cards com ícone, título e texto, em 2, 3 ou 4 colunas.',
    grupo: 'Cards e listas',
    campos: { subtitulo: true, texto: true, botao: false, midia: false },
    itens: { rotulo: 'Card', campos: ['icone', 'titulo', 'texto'] },
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
    rotulo: 'Estatísticas',
    descricao: 'Números de destaque com contagem animada (clientes, projetos, anos…).',
    grupo: 'Cards e listas',
    campos: { subtitulo: true, texto: false, botao: false, midia: false },
    itens: { rotulo: 'Estatística', campos: ['extra', 'titulo'] },
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

/** Item novo com conteudo de exemplo, conforme os campos do layout. */
export function novoItem(tipo: TipoLayout): LpItem {
  const info = infoLayout(tipo)
  const campos = info.itens?.campos ?? []
  const item: LpItem = { id: gerarId() }
  if (campos.includes('icone')) item.icone = 'check'
  // Galeria/masonry filtram itens sem imagem — o novo item nasce com placeholder
  // para aparecer no canvas e poder ser selecionado.
  if (campos.includes('imagem')) {
    item.imagem = placeholderMidia('nova imagem', 'paisagem', 'imagem')
  }
  if (campos.includes('titulo')) item.titulo = 'Novo item'
  if (campos.includes('texto')) item.texto = 'Descreva este item aqui.'
  if (campos.includes('extra')) item.extra = tipo === 'estatisticas' ? '100+' : 'R$ 99'
  if (campos.includes('detalhe')) item.detalhe = tipo === 'precos' ? '/mês' : ''
  if (campos.includes('lista')) item.lista = ['Vantagem um', 'Vantagem dois']
  if (campos.includes('botao')) item.botao = { texto: 'Saiba mais', url: '#' }
  return item
}

/** Secao nova (inserida pelo editor) com conteudo de exemplo. */
export function novaSecao(tipo: TipoLayout): LpSecao {
  const info = infoLayout(tipo)
  const secao: LpSecao = {
    id: gerarId(),
    tipo,
    nome: info.rotulo,
    ancora: slugificar(info.rotulo),
    titulo: info.rotulo,
    itens: [],
    largura: tipo === 'banner' ? 'full' : 'boxed',
    espacamento: { topo: 80, base: 80 },
  }
  if (info.campos.subtitulo) secao.subtitulo = ''
  if (info.campos.texto) secao.texto = 'Escreva o conteúdo desta seção.'
  if (info.campos.botao && (tipo === 'hero' || tipo === 'cta' || tipo === 'banner')) {
    secao.botao = { texto: 'Fale conosco', url: '#' }
  }
  if (info.temColunas) secao.colunas = 3
  if (info.itens) {
    const qtd = tipo === 'comparacao' ? 2 : 3
    secao.itens = Array.from({ length: qtd }, () => novoItem(tipo))
  }
  if (tipo === 'comparacao') secao.rotulos = ['Característica um', 'Característica dois']
  return secao
}
