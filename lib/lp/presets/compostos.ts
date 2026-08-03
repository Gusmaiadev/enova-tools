/**
 * Presets que continuam widget fechado. Sao os que carregam JavaScript e
 * semantica de acessibilidade — details/summary, aria dos slides, table de
 * verdade —, e que uma arvore montada a mao quebraria sem aviso.
 */

import type { LpContainer, LpSecao, LpWidget } from '../tipos'
import { gerarId } from '../util'
import { botaoSecao, cabeca, container } from './comum'

/** cabeca + o widget + botao da secao. */
const comWidget = (s: LpSecao, w: LpWidget): LpContainer =>
  container([...cabeca(s), w, ...botaoSecao(s)])

export function pFaq(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'faq',
    perguntas: s.itens.map((i) => ({
      id: i.id,
      pergunta: i.titulo ?? '',
      resposta: i.texto ?? '',
    })),
  })
}

export function pAbas(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'abas',
    abas: s.itens.map((i) => ({
      id: i.id,
      titulo: i.titulo ?? '',
      texto: i.texto ?? '',
      imagem: i.imagem ?? null,
    })),
  })
}

export function pCarrossel(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'carrossel',
    slides: s.itens.map((i) => ({
      id: i.id,
      imagem: i.imagem ?? null,
      titulo: i.titulo,
      texto: i.texto,
    })),
  })
}

export function pDepoimentos(s: LpSecao): LpContainer {
  // No LpItem do depoimento, `extra` e o nome e `detalhe` e o cargo (ver o
  // comentario de LpItem em tipos.ts e ROTULO_ITEM em layouts.ts).
  return comWidget(s, {
    id: gerarId(),
    tipo: 'depoimentos',
    depoimentos: s.itens.map((i) => ({
      id: i.id,
      texto: i.texto ?? '',
      nome: i.extra ?? '',
      cargo: i.detalhe,
      foto: i.imagem ?? null,
    })),
  })
}

export function pComparacao(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'comparacao',
    rotulos: s.rotulos ?? [],
    colunas: s.itens.map((i) => ({
      id: i.id,
      titulo: i.titulo ?? '',
      celulas: i.lista ?? [],
      destaque: i.destaque,
    })),
  })
}
