import { describe, expect, it } from 'vitest'
import { expandirPreset } from './expandir'
import type { LpElemento, LpMidia, LpSecao, TipoLayout } from '../tipos'

/** So a raiz: quase todo teste ignora a secao ajustada (so o banner mexe nela). */
const expandir = (s: LpSecao) => expandirPreset(s).raiz

const midia: LpMidia = {
  tipo: 'imagem',
  url: 'foto.jpg',
  alt: 'alt',
  busca: 'busca',
  orientacao: 'paisagem',
}

const secao = (tipo: TipoLayout, extra: Partial<LpSecao> = {}): LpSecao => ({
  id: 's1',
  tipo,
  nome: 'Seção',
  ancora: null,
  itens: [],
  largura: 'boxed',
  ...extra,
})

/** Tipos dos nos em profundidade, para afirmar a forma sem depender de id. */
function forma(el: LpElemento): unknown {
  return el.tipo === 'container' ? { container: el.filhos.map(forma) } : el.tipo
}

describe('expandirPreset — presets sem itens', () => {
  it('hero: titulo h1, subtitulo, texto e botao na coluna, midia ao lado', () => {
    const raiz = expandir(
      secao('hero', {
        titulo: 'T',
        subtitulo: 'S',
        texto: 'C',
        botao: { texto: 'B', url: '#' },
        midia,
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: ['titulo', 'texto', 'texto', 'botao'] }, 'imagem'],
    })
    const col = raiz.filhos[0]
    if (col.tipo !== 'container') throw new Error('esperava container')
    const t = col.filhos[0]
    if (t.tipo !== 'titulo') throw new Error('esperava titulo')
    expect(t.nivel).toBe('h1')
  })

  it('hero sem midia nao cria a coluna vazia', () => {
    const raiz = expandir(secao('hero', { titulo: 'T' }))
    expect(forma(raiz)).toEqual({ container: [{ container: ['titulo'] }] })
  })

  it('texto-midia poe a midia depois do texto e inverte quando pedido', () => {
    const normal = expandir(secao('texto-midia', { titulo: 'T', midia }))
    expect(forma(normal)).toEqual({ container: [{ container: ['titulo'] }, 'imagem'] })

    const invertido = expandir(secao('texto-midia', { titulo: 'T', midia, inverter: true }))
    expect(forma(invertido)).toEqual({ container: ['imagem', { container: ['titulo'] }] })
  })

  it('texto-centralizado empilha tudo numa coluna centralizada', () => {
    const raiz = expandir(
      secao('texto-centralizado', { titulo: 'T', texto: 'C', botao: { texto: 'B', url: '#' } }),
    )
    expect(forma(raiz)).toEqual({ container: ['titulo', 'texto', 'botao'] })
    expect(raiz.alinhar).toEqual({ desktop: 'centro' })
  })

  it('cta empilha e centraliza como o texto-centralizado', () => {
    const raiz = expandir(secao('cta', { titulo: 'T', botao: { texto: 'B', url: '#' } }))
    expect(forma(raiz)).toEqual({ container: ['titulo', 'botao'] })
  })

  it('banner move a midia para o fundo da secao devolvida, sem virar widget', () => {
    const s = secao('banner', { titulo: 'T', midia })
    const { raiz, secao: ajustada } = expandirPreset(s)
    expect(forma(raiz)).toEqual({ container: ['titulo'] })
    expect(ajustada.fundo?.midia).toBe(midia)
    expect(ajustada.midia).toBeNull()
  })

  it('banner nao muta a secao recebida', () => {
    const s = secao('banner', { titulo: 'T', midia })
    expandirPreset(s)
    expect(s.midia).toBe(midia)
    expect(s.fundo).toBeUndefined()
  })

  it('preset que nao ajusta nada devolve a mesma secao, pela mesma referencia', () => {
    const s = secao('cta', { titulo: 'T' })
    expect(expandirPreset(s).secao).toBe(s)
  })

  it('formulario poe o texto de um lado e o widget de formulario do outro', () => {
    const raiz = expandir(secao('formulario', { titulo: 'T', destinoForm: 'https://x/y' }))
    expect(forma(raiz)).toEqual({ container: [{ container: ['titulo'] }, 'formulario'] })
    const form = raiz.filhos[1]
    if (form.tipo !== 'formulario') throw new Error('esperava formulario')
    expect(form.destino).toBe('https://x/y')
  })

  it('formulario sem texto nenhum sai so com o formulario', () => {
    const raiz = expandir(secao('formulario'))
    expect(forma(raiz)).toEqual({ container: ['formulario'] })
  })
})
