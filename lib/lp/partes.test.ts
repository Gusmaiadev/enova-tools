/**
 * O catálogo de partes preso ao markup de verdade.
 *
 * Cada parte é um seletor CSS que só funciona enquanto o widget emitir aquele
 * elemento com aquela classe. Renomear `.lp-depo-nome` em widgets.ts sem mexer
 * aqui deixaria o campo no painel gravando um estilo que não pousa em lugar
 * nenhum — falha silenciosa, do tipo que só aparece quando o cliente reclama.
 */

import { describe, expect, it } from 'vitest'
import { caminharElementos } from './arvore'
import { compilarCorpo } from './compilador/html'
import { documentoBase } from './documento'
import { novaSecao } from './layouts'
import { TIPOS_COM_PARTES, partesDe } from './partes'
import { briefingVazio } from './tipos'
import type { LpSecao, TipoLayout } from './tipos'

/** Preset em que cada widget composto aparece. */
const ONDE_APARECE: Record<string, TipoLayout> = {
  numero: 'estatisticas',
  faq: 'faq',
  abas: 'tabs',
  carrossel: 'carrossel',
  depoimentos: 'depoimentos',
  comparacao: 'comparacao',
  formulario: 'formulario',
  // A lista com check é a das vantagens de cada plano.
  lista: 'precos',
}

const corpoDe = (secao: LpSecao) =>
  compilarCorpo({ ...documentoBase(briefingVazio('Teste')), secoes: [secao] }, { modo: 'export' })
    .corpo

/**
 * Pedaços de um seletor que dá para procurar no HTML: nome de classe e nome de
 * tag, sem as pseudo-classes (`:first-child`, `:not(.ativo)`), que dependem de
 * posição e não aparecem na marcação.
 */
const alvos = (seletor: string) =>
  seletor
    .split(/\s+/)
    .map((t) => t.replace(/:not\([^)]*\)/g, '').replace(/:[a-z-]+/g, ''))
    .filter(Boolean)
    .map((t) => (t.startsWith('.') ? t.slice(1) : `<${t}`))

describe('catálogo de partes', () => {
  for (const [tipo, layout] of Object.entries(ONDE_APARECE)) {
    it(`${tipo}: o preset produz o widget e o HTML tem os seletores`, () => {
      const secao = novaSecao(layout)
      const raiz = secao.raiz
      if (!raiz) throw new Error('esperava a seção montada')
      expect(caminharElementos(raiz).some((el) => el.tipo === tipo)).toBe(true)

      const corpo = corpoDe(secao)
      const partes = partesDe(tipo)
      expect(partes.length).toBeGreaterThan(0)
      for (const parte of partes) {
        for (const seletor of parte.seletores) {
          for (const alvo of alvos(seletor)) {
            expect(corpo, `${tipo}/${parte.chave} → ${seletor}`).toContain(alvo)
          }
        }
      }
    })
  }

  it('todo widget do catálogo está coberto aqui', () => {
    // Widget novo com partes entra no catálogo e no mapa acima junto — senão
    // ele nasce sem ninguém conferindo se os seletores dele existem.
    expect(TIPOS_COM_PARTES.sort()).toEqual(Object.keys(ONDE_APARECE).sort())
  })

  it('as chaves de parte não se repetem dentro do mesmo widget', () => {
    for (const tipo of TIPOS_COM_PARTES) {
      const chaves = partesDe(tipo).map((p) => p.chave)
      expect(new Set(chaves).size, tipo).toBe(chaves.length)
    }
  })
})
