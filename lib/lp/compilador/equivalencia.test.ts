/**
 * Prova que migrar para a arvore nao muda a pagina.
 *
 * Duas referencias, de proposito:
 *  - `fixtures.json` congela o HTML que o compilador TIPADO produzia. Ele
 *    sobrevive a exclusao daquele caminho e continua sendo a resposta a
 *    pergunta "a pagina ainda e o que sempre foi?".
 *  - a comparacao arvore x tipado vale enquanto os dois caminhos existirem, e
 *    sai junto com o caminho tipado.
 *
 * Para regerar as fixtures (so faz sentido enquanto o caminho tipado existir):
 * criar um teste temporario que percorre LAYOUTS, chama compilarCorpo com a
 * secao de `secaoDeReferencia(tipo)` e grava o JSON.
 */

import { describe, expect, it } from 'vitest'
import { compilarCorpo } from './html'
import fixtures from './fixtures.json'
import { expandirPreset } from '../presets/expandir'
import { LAYOUTS, infoLayout, novaSecao } from '../layouts'
import { documentoBase } from '../documento'
import { placeholderMidia } from '../placeholder'
import { briefingVazio } from '../tipos'
import type { LpDocumento, LpItem, LpSecao, TipoLayout } from '../tipos'
import { gerarId, slugificar } from '../util'

/**
 * A secao tipada que gerou `fixtures.json`, congelada aqui.
 *
 * Era `novaSecao(tipo)`, mas a referencia so vale com a MESMA entrada e aquela
 * funcao deixou de servir a este teste: ela e o conteudo de exemplo da secao
 * nova do editor, e melhorar esse conteudo quebraria a comparacao sem que nada
 * tivesse mudado na renderizacao. Isto aqui e a entrada do golden master, nao
 * conteudo de produto — mexer so junto com as fixtures.
 */
const TITULO_ITEM: Partial<Record<TipoLayout, string>> = {
  estatisticas: 'Clientes atendidos',
  timeline: 'O que aconteceu',
  precos: 'Nome do plano',
}

const EXTRA_ITEM: Partial<Record<TipoLayout, string>> = {
  cards: 'Subtítulo do card',
  estatisticas: '100+',
  precos: 'R$ 99',
  'grid-produtos': 'R$ 99',
  timeline: '2020',
  depoimentos: 'Nome do cliente',
}

function itemDeReferencia(tipo: TipoLayout): LpItem {
  const campos = infoLayout(tipo).itens?.campos ?? []
  const item: LpItem = { id: gerarId() }
  if (campos.includes('icone')) item.icone = 'check'
  if (campos.includes('imagem')) item.imagem = placeholderMidia('nova imagem', 'paisagem', 'imagem')
  if (campos.includes('titulo')) item.titulo = TITULO_ITEM[tipo] ?? 'Novo item'
  if (campos.includes('texto')) item.texto = 'Descreva este item aqui.'
  if (campos.includes('extra')) item.extra = EXTRA_ITEM[tipo] ?? ''
  if (campos.includes('detalhe')) item.detalhe = tipo === 'precos' ? '/mês' : ''
  if (campos.includes('lista')) item.lista = ['Vantagem um', 'Vantagem dois']
  if (campos.includes('botao')) item.botao = { texto: 'Saiba mais', url: '#' }
  return item
}

function secaoDeReferencia(tipo: TipoLayout): LpSecao {
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
    secao.itens = Array.from({ length: qtd }, () => itemDeReferencia(tipo))
  }
  if (tipo === 'comparacao') secao.rotulos = ['Característica um', 'Característica dois']
  return secao
}

/** Documento com uma secao so, para isolar o layout no teste. */
function docCom(secao: LpSecao): LpDocumento {
  return { ...documentoBase(briefingVazio('Teste')), secoes: [secao] }
}

/** Texto visivel do HTML, sem tag nem atributo — o que o visitante le. */
const textoVisivel = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Palavras visiveis, ordenadas: compara conteudo sem depender de wrapper. */
const palavras = (html: string) => textoVisivel(html).split(' ').filter(Boolean).sort()

/** URLs citadas no HTML. */
const urls = (html: string) =>
  [...html.matchAll(/(?:src|href)="([^"]*)"/g)].map((m) => m[1]).sort()

/** HTML de referencia congelado do preset. */
const referencia = (tipo: string) => (fixtures as Record<string, string>)[tipo]

describe('equivalência com o HTML congelado', () => {
  for (const info of LAYOUTS) {
    it(`${info.tipo}: mesmo texto visível do compilador original`, () => {
      const tipada = secaoDeReferencia(info.tipo)
      const { raiz, secao } = expandirPreset(tipada)
      const arvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).corpo
      expect(palavras(arvore)).toEqual(palavras(referencia(info.tipo)))
    })

    it(`${info.tipo}: mesmas mídias e links do compilador original`, () => {
      const tipada = secaoDeReferencia(info.tipo)
      const { raiz, secao } = expandirPreset(tipada)
      const arvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).corpo
      expect(urls(arvore)).toEqual(urls(referencia(info.tipo)))
    })
  }
})


describe('cobertura e âncoras', () => {
  it('as fixtures cobrem todos os presets do catálogo', () => {
    expect(Object.keys(fixtures).sort()).toEqual(LAYOUTS.map((l) => l.tipo).sort())
  })

  it('a âncora da seção sobrevive à expansão', () => {
    const secao = novaSecao('cards')
    const id = compilarCorpo(docCom(secao), { modo: 'export' }).idsPorSecao.get(secao.id)
    // A âncora vem de `secao.ancora`, que o expansor não toca — e é ela que o
    // menu do header usa para rolar até aqui.
    expect(id).toBe(secao.ancora)
  })
})
