/**
 * Construtores compartilhados pelos expansores de preset. Existem para que os
 * 21 presets nao repitam a montagem de no — e para que a ordem dos elementos
 * saia igual a que o compilador de hoje emite.
 */

import type { LpBotao, LpContainer, LpElemento, LpMidia, LpSecao, LpWidget } from '../tipos'
import { gerarId } from '../util'

export const COL = { desktop: 'coluna' } as const
export const LINHA = { desktop: 'linha' } as const

export function container(
  filhos: LpElemento[],
  props: Partial<Omit<LpContainer, 'id' | 'tipo' | 'filhos'>> = {},
): LpContainer {
  return { id: gerarId(), tipo: 'container', direcao: COL, filhos, ...props }
}

export const wTitulo = (texto: string, nivel: 'h1' | 'h2' | 'h3' | 'h4' = 'h2'): LpWidget => ({
  id: gerarId(),
  tipo: 'titulo',
  nivel,
  texto,
})

export const wTexto = (texto: string, papel: 'subtitulo' | 'corpo'): LpWidget => ({
  id: gerarId(),
  tipo: 'texto',
  papel,
  texto,
})

export const wMidia = (m: LpMidia): LpWidget =>
  m.tipo === 'video'
    ? { id: gerarId(), tipo: 'video', midia: m }
    : { id: gerarId(), tipo: 'imagem', midia: m }

export const wBotao = (b: LpBotao): LpWidget => ({ id: gerarId(), tipo: 'botao', botao: b })

export const wIcone = (nome: string): LpWidget => ({ id: gerarId(), tipo: 'icone', nome })

/**
 * Titulo + subtitulo + texto da secao, nessa ordem — a mesma de cabeca() e dos
 * blocos de texto do compilador atual. So entra o que existir.
 */
export function cabeca(s: LpSecao, nivel: 'h1' | 'h2' = 'h2'): LpElemento[] {
  const fora: LpElemento[] = []
  if (s.titulo) fora.push(wTitulo(s.titulo, nivel))
  if (s.subtitulo) fora.push(wTexto(s.subtitulo, 'subtitulo'))
  if (s.texto) fora.push(wTexto(s.texto, 'corpo'))
  return fora
}

/** Botao da secao, quando existe. Sempre por ultimo, como em acaoSecao(). */
export const botaoSecao = (s: LpSecao): LpElemento[] => (s.botao ? [wBotao(s.botao)] : [])
