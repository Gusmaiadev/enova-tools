/**
 * O nível do texto — o campo único que o painel oferece em cima de dois widgets
 * diferentes. O que se prova aqui é que a travessia entre eles é limpa: o nó não
 * fica com resto do nível anterior, não perde o que era dele e continua válido
 * para a gravação.
 */

import { describe, expect, it } from 'vitest'
import { NIVEIS_TEXTO, aplicarNivel, nivelDoNo, nivelEhTitulo } from './niveis'
import type { LpContainer, LpElemento } from './tipos'
import { coergirDocumento } from './validar'

const titulo = (): LpElemento => ({
  id: 'w1',
  tipo: 'titulo',
  nivel: 'h2',
  texto: 'Fale conosco',
  estilo: { cor: { desktop: '#ff0000' } },
})

const texto = (papel: 'subtitulo' | 'corpo' = 'corpo'): LpElemento => ({
  id: 'w2',
  tipo: 'texto',
  papel,
  texto: 'Um parágrafo.',
})

/** A raiz que a gravação recebe, com o nó dentro. */
const raizCom = (el: LpElemento): LpContainer => ({
  id: 'r1',
  tipo: 'container',
  direcao: { desktop: 'coluna' },
  filhos: [el],
})

describe('nivelDoNo', () => {
  it('lê o nível dos dois widgets de texto', () => {
    expect(nivelDoNo(titulo())).toBe('h2')
    expect(nivelDoNo(texto('subtitulo'))).toBe('subtitulo')
    expect(nivelDoNo(texto('corpo'))).toBe('paragrafo')
  })

  it('o que não é texto não tem nível', () => {
    expect(nivelDoNo(raizCom(titulo()))).toBeNull()
    expect(nivelDoNo({ id: 'i', tipo: 'icone', nome: 'check' })).toBeNull()
  })
})

describe('aplicarNivel', () => {
  it('de parágrafo para título troca o widget e não deixa resto', () => {
    const el = texto('subtitulo')
    aplicarNivel(el, 'h3')
    // `papel` sobrando faria o nó carregar a marca do widget que ele não é mais.
    expect(el).toEqual({ id: 'w2', tipo: 'titulo', nivel: 'h3', texto: 'Um parágrafo.' })
  })

  it('de título para parágrafo troca o widget e não deixa resto', () => {
    const el = titulo()
    aplicarNivel(el, 'paragrafo')
    expect(el).toEqual({
      id: 'w1',
      tipo: 'texto',
      papel: 'corpo',
      texto: 'Fale conosco',
      estilo: { cor: { desktop: '#ff0000' } },
    })
  })

  it('preserva o id e o estilo do nó', () => {
    // O id é o que o canvas e o painel usam para saber quem está selecionado:
    // trocar o nível não pode soltar a seleção nem apagar o que foi ajustado.
    const el = titulo()
    aplicarNivel(el, 'subtitulo')
    expect(el.id).toBe('w1')
    expect(el.estilo?.cor?.desktop).toBe('#ff0000')
  })

  it('não mexe no que não é texto', () => {
    const el: LpElemento = { id: 'i', tipo: 'icone', nome: 'check' }
    aplicarNivel(el, 'h1')
    expect(el).toEqual({ id: 'i', tipo: 'icone', nome: 'check' })
  })

  it('todo nível do catálogo sobrevive à gravação', () => {
    for (const n of NIVEIS_TEXTO) {
      const el = texto()
      aplicarNivel(el, n.valor)
      // Pelo caminho de verdade (o PUT do editor), não por um coercitor de
      // mentira: nível que a coerção não reconhecesse voltaria como 'h2' ou
      // 'corpo', e o painel estaria oferecendo uma opção que não para em pé.
      const doc = coergirDocumento({
        secoes: [{ id: 's1', tipo: 'cta', nome: 'Seção', itens: [], raiz: raizCom(el) }],
      })
      const salvo = doc?.secoes[0].raiz?.filhos[0]
      expect(nivelDoNo(salvo as LpElemento)).toBe(n.valor)
      expect(salvo?.tipo).toBe(nivelEhTitulo(n.valor) ? 'titulo' : 'texto')
    }
  })
})
