import { describe, expect, it } from 'vitest'
import { migrarDocumentoParaArvore, precisaMigrar } from './migrar'
import type { LpDocumento, LpSecao } from './tipos'

const doc = (secoes: LpSecao[], versao?: 2): LpDocumento => ({
  ...(versao ? { versao } : {}),
  seo: { titulo: '', descricao: '' },
  tema: { tipografia: {}, cores: {}, raio: 8 } as LpDocumento['tema'],
  header: { logoTexto: 'X', menu: [], fixo: false, botoes: [] },
  secoes,
  footer: { linksUteis: [], menuSecundario: false },
  redes: [],
})

const secao = (extra: Partial<LpSecao> = {}): LpSecao => ({
  id: 's1',
  tipo: 'cta',
  nome: 'CTA',
  ancora: 'cta',
  titulo: 'Fale conosco',
  itens: [],
  largura: 'boxed',
  ...extra,
})

describe('precisaMigrar', () => {
  it('documento sem versao precisa', () => {
    expect(precisaMigrar(doc([secao()]))).toBe(true)
  })

  it('documento com versao 2 nao precisa', () => {
    expect(precisaMigrar(doc([secao()], 2))).toBe(false)
  })

  it('documento nulo nao precisa', () => {
    expect(precisaMigrar(null)).toBe(false)
  })
})

describe('migrarDocumentoParaArvore', () => {
  it('carimba versao 2 e cria a raiz de cada secao', () => {
    const migrado = migrarDocumentoParaArvore(doc([secao(), secao({ id: 's2' })]))
    expect(migrado.versao).toBe(2)
    expect(migrado.secoes.every((s) => s.raiz !== undefined)).toBe(true)
  })

  it('guarda o preset de origem e preserva id, nome e ancora', () => {
    const migrado = migrarDocumentoParaArvore(doc([secao()]))
    expect(migrado.secoes[0]).toMatchObject({
      id: 's1',
      nome: 'CTA',
      ancora: 'cta',
      preset: 'cta',
    })
  })

  it('nao altera o documento recebido', () => {
    const original = doc([secao()])
    migrarDocumentoParaArvore(original)
    expect(original.versao).toBeUndefined()
    expect(original.secoes[0].raiz).toBeUndefined()
  })

  it('documento ja em v2 passa intacto', () => {
    const ja = doc([secao()], 2)
    expect(migrarDocumentoParaArvore(ja)).toBe(ja)
  })

  it('preserva header, footer, tema e paginas', () => {
    const entrada = doc([secao()])
    entrada.paginas = [{ tipo: 'termos', titulo: 'Termos', conteudo: 'x' }]
    const migrado = migrarDocumentoParaArvore(entrada)
    expect(migrado.header).toEqual(entrada.header)
    expect(migrado.footer).toEqual(entrada.footer)
    expect(migrado.paginas).toEqual(entrada.paginas)
  })

  it('o texto do documento sobrevive a migracao', () => {
    const migrado = migrarDocumentoParaArvore(doc([secao({ titulo: 'Fale conosco' })]))
    const raiz = migrado.secoes[0].raiz
    if (!raiz) throw new Error('esperava raiz')
    const titulo = raiz.filhos[0]
    if (titulo.tipo !== 'titulo') throw new Error('esperava titulo')
    expect(titulo.texto).toBe('Fale conosco')
  })

  it('banner migrado leva a midia para o fundo, sem tocar no original', () => {
    const original = doc([
      secao({
        id: 'b1',
        tipo: 'banner',
        midia: {
          tipo: 'imagem',
          url: 'faixa.jpg',
          alt: '',
          busca: '',
          orientacao: 'paisagem',
        },
      }),
    ])
    const migrado = migrarDocumentoParaArvore(original)
    expect(migrado.secoes[0].fundo?.midia?.url).toBe('faixa.jpg')
    expect(migrado.secoes[0].midia).toBeNull()
    expect(original.secoes[0].midia?.url).toBe('faixa.jpg')
    expect(original.secoes[0].fundo).toBeUndefined()
  })
})
