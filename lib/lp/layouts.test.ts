/**
 * A secao que o botao "Nova" do editor insere. O que se prova aqui e que ela
 * chega usavel: com arvore montada, com um widget para cada coisa que o layout
 * sabe mostrar e com texto de exemplo no lugar de campo em branco.
 *
 * Vale por cada um desses pontos: enquanto o painel so edita no que ja existe na
 * arvore, o que a secao nova nao trouxer o usuario nao consegue colocar depois.
 */

import { describe, expect, it } from 'vitest'
import { caminharElementos } from './arvore'
import { compilarCorpo } from './compilador/html'
import { documentoBase } from './documento'
import { LAYOUTS, novaSecao, novoItem } from './layouts'
import { briefingVazio } from './tipos'
import type { LpDocumento, LpSecao } from './tipos'
import { coergirDocumento } from './validar'

/** Documento com uma secao so, para isolar o layout. */
const docCom = (secao: LpSecao): LpDocumento => ({
  ...documentoBase(briefingVazio('Teste')),
  secoes: [secao],
})

const html = (secao: LpSecao) => compilarCorpo(docCom(secao), { modo: 'export' }).corpo

/** Texto visivel do HTML, sem tag nem atributo — o que o visitante le. */
const textoVisivel = (corpo: string) =>
  corpo.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const nos = (secao: LpSecao) => caminharElementos(secao.raiz!)
const tiposDeNo = (secao: LpSecao) => new Set(nos(secao).map((e) => e.tipo))
/** Papeis dos widgets de texto: distingue subtitulo de corpo. */
const papeis = (secao: LpSecao) =>
  new Set(nos(secao).flatMap((e) => (e.tipo === 'texto' ? [e.papel] : [])))

describe('novaSecao', () => {
  for (const info of LAYOUTS) {
    it(`${info.tipo}: nasce com árvore e conteúdo visível`, () => {
      const secao = novaSecao(info.tipo)

      // A regressão que isto tranca: sem `raiz` a seção entrava na página como
      // uma faixa vazia (html.ts só renderiza a árvore) e sem nenhum nó para
      // selecionar no painel — impossível escrever texto ou trocar a imagem.
      expect(secao.raiz).toBeDefined()
      expect(secao.preset).toBe(info.tipo)
      expect(nos(secao).filter((e) => e.tipo !== 'container')).not.toHaveLength(0)
      expect(textoVisivel(html(secao))).toContain(secao.titulo)
    })

    it(`${info.tipo}: traz um widget para cada campo que o layout declara`, () => {
      const secao = novaSecao(info.tipo)
      const tipos = tiposDeNo(secao)

      expect(tipos.has('titulo')).toBe(true)
      if (info.campos.subtitulo) expect(papeis(secao).has('subtitulo')).toBe(true)
      if (info.campos.texto) expect(papeis(secao).has('corpo')).toBe(true)
      if (info.campos.botao) expect(tipos.has('botao')).toBe(true)
      if (info.campos.midia) {
        // No banner a mídia da seção é o fundo da faixa, não um elemento solto
        // no meio do texto — o expansor a move para lá.
        if (info.tipo === 'banner') expect(secao.fundo?.midia?.url).toBeTruthy()
        else expect(tipos.has('imagem')).toBe(true)
      }
    })

    if (info.itens) {
      const campos = info.itens.campos
      it(`${info.tipo}: cada campo do ${info.itens.rotulo.toLowerCase()} vem preenchido`, () => {
        const secao = novaSecao(info.tipo)
        expect(secao.itens.length).toBeGreaterThanOrEqual(2)

        const item = novoItem(info.tipo)
        for (const campo of campos) {
          switch (campo) {
            case 'imagem':
              expect(item.imagem?.url).toBeTruthy()
              break
            case 'botao':
              expect(item.botao?.texto).toBeTruthy()
              break
            case 'lista':
              expect(item.lista?.length).toBeGreaterThan(0)
              break
            case 'destaque':
              // Destaque é escolha da lista inteira: um item se sobressai.
              expect(secao.itens.filter((i) => i.destaque)).toHaveLength(1)
              break
            case 'url':
              // Logo sem link para o site do cliente é o caso normal.
              break
            default:
              expect(item[campo]).toBeTruthy()
          }
        }
      })
    }
  }

  it('a comparação tem uma célula por rótulo de linha', () => {
    const secao = novaSecao('comparacao')
    // Coluna com menos células que rótulos deixa buracos na tabela.
    for (const coluna of secao.itens) {
      expect(coluna.lista).toHaveLength(secao.rotulos?.length ?? 0)
    }
  })

  it('o tema do projeto tinge os placeholders de imagem', () => {
    const tema = documentoBase(briefingVazio('Teste')).tema
    tema.cores.principal = '#ff0066'
    const secao = novaSecao('hero', tema)
    expect(decodeURIComponent(secao.midia?.url ?? '')).toContain('#ff0066')
    // Sem tema continua o cinza padrão do placeholder.
    expect(decodeURIComponent(novaSecao('hero').midia?.url ?? '')).not.toContain('#ff0066')
  })

  it('seção nova não derruba o `versao: 2` do documento', () => {
    // `versao` é derivada de toda seção ter árvore (validar.ts). Uma seção sem
    // `raiz` marcava o documento salvo como pré-árvore, e a leitura seguinte
    // remigrava a página inteira por cima do que já tinha sido editado.
    const doc = coergirDocumento({
      ...documentoBase(briefingVazio('Teste')),
      secoes: [novaSecao('hero'), novaSecao('cards')],
    })
    expect(doc?.versao).toBe(2)
    expect(doc?.secoes.every((s) => s.raiz)).toBe(true)
  })
})
