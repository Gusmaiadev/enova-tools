import { describe, expect, it } from 'vitest'
import { acharNo } from './arvore'
import { aplicarTexto, arquivosUsados } from './documento'
import type { LpContainer, LpDocumento, LpMidia, LpSecao } from './tipos'

const enviada = (caminho: string): LpMidia => ({
  tipo: 'imagem',
  url: `https://bucket/${caminho}`,
  alt: '',
  busca: '',
  orientacao: 'paisagem',
  caminho,
})

const docBase = (secoes: LpSecao[]): LpDocumento => ({
  seo: { titulo: '', descricao: '' },
  tema: { tipografia: {}, cores: {}, raio: 8 } as LpDocumento['tema'],
  header: { logoTexto: 'X', menu: [], fixo: false, botoes: [] },
  secoes,
  footer: { linksUteis: [], menuSecundario: false },
  redes: [],
})

const secao = (extra: Partial<LpSecao>): LpSecao => ({
  id: 's1',
  tipo: 'hero',
  nome: 'Hero',
  ancora: null,
  itens: [],
  largura: 'boxed',
  ...extra,
})

describe('arquivosUsados', () => {
  it('acha midia nos campos antigos da secao', () => {
    const doc = docBase([
      secao({
        midia: enviada('lp/1/a.jpg'),
        fundo: { midia: enviada('lp/1/b.jpg') },
        itens: [{ id: 'i1', imagem: enviada('lp/1/c.jpg') }],
      }),
    ])
    expect([...arquivosUsados({ documento: doc })].sort()).toEqual([
      'lp/1/a.jpg',
      'lp/1/b.jpg',
      'lp/1/c.jpg',
    ])
  })

  it('acha midia em qualquer profundidade da arvore', () => {
    const doc = docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            {
              id: 'c',
              tipo: 'container',
              direcao: { desktop: 'linha' },
              filhos: [{ id: 'i', tipo: 'imagem', midia: enviada('lp/1/fundo.jpg') }],
            },
          ],
        },
      }),
    ])
    expect([...arquivosUsados({ documento: doc })]).toEqual(['lp/1/fundo.jpg'])
  })

  it('acha midia dentro de widget composto', () => {
    const doc = docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            {
              id: 'd',
              tipo: 'depoimentos',
              depoimentos: [{ id: '1', texto: 'oi', nome: 'A', foto: enviada('lp/1/foto.jpg') }],
            },
          ],
        },
      }),
    ])
    expect([...arquivosUsados({ documento: doc })]).toEqual(['lp/1/foto.jpg'])
  })

  it('ignora midia de banco (sem caminho no bucket)', () => {
    const doc = docBase([
      secao({
        midia: {
          tipo: 'imagem',
          url: 'https://pexels/x.jpg',
          alt: '',
          busca: '',
          orientacao: 'paisagem',
        },
      }),
    ])
    expect(arquivosUsados({ documento: doc }).size).toBe(0)
  })
})

describe('aplicarTexto na árvore', () => {
  const docArvore = () =>
    docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            { id: 'w1', tipo: 'titulo', nivel: 'h2', texto: 'antes' },
            { id: 'w2', tipo: 'botao', botao: { texto: 'antes', url: '#' } },
            { id: 'w3', tipo: 'numero', valor: '10', rotulo: 'Anos' },
          ],
        },
      }),
    ])

  const noDe = (d: LpDocumento, id: string) => acharNo(d.secoes[0].raiz as LpContainer, id)

  it('escreve no título pelo id do nó', () => {
    const no = noDe(aplicarTexto(docArvore(), 'el:w1', 'depois'), 'w1')
    expect(no?.tipo === 'titulo' && no.texto).toBe('depois')
  })

  it('escreve no texto do botão', () => {
    const no = noDe(aplicarTexto(docArvore(), 'el:w2', 'clique'), 'w2')
    expect(no?.tipo === 'botao' && no.botao.texto).toBe('clique')
  })

  it('escreve no valor do número', () => {
    const no = noDe(aplicarTexto(docArvore(), 'el:w3', '25'), 'w3')
    expect(no?.tipo === 'numero' && no.valor).toBe('25')
  })

  it('botão não fica sem texto — senão sumiria da página', () => {
    const no = noDe(aplicarTexto(docArvore(), 'el:w2', '   '), 'w2')
    expect(no?.tipo === 'botao' && no.botao.texto).toBe('antes')
  })

  it('alvo inexistente não quebra nem altera nada', () => {
    const antes = docArvore()
    const d = aplicarTexto(antes, 'el:nada', 'x')
    expect(JSON.stringify(d.secoes)).toBe(JSON.stringify(antes.secoes))
  })

  it('não toca no documento recebido', () => {
    const antes = docArvore()
    aplicarTexto(antes, 'el:w1', 'depois')
    expect(noDe(antes, 'w1')?.tipo === 'titulo' && noDe(antes, 'w1')).toMatchObject({
      texto: 'antes',
    })
  })
})
