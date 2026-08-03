/**
 * Caminhamento da arvore de elementos da secao. Modulo puro, sem conhecer
 * presets nem compilador — quem precisa varrer a arvore (coleta de midias,
 * geracao de CSS, busca de no) parte daqui.
 */

import type { LpContainer, LpElemento, LpMidia } from './tipos'

/** Todos os nos em profundidade, a raiz primeiro. */
export function caminharElementos(raiz: LpContainer): LpElemento[] {
  const fora: LpElemento[] = []
  const visitar = (el: LpElemento) => {
    fora.push(el)
    if (el.tipo === 'container') el.filhos.forEach(visitar)
  }
  visitar(raiz)
  return fora
}

/**
 * Midias que o no cita. Precisa conhecer cada widget composto: uma midia
 * esquecida aqui e um arquivo que a limpeza de orfaos apaga com a pagina ainda
 * usando (ver arquivosUsados em documento.ts).
 */
export function midiasDoElemento(el: LpElemento): LpMidia[] {
  switch (el.tipo) {
    case 'imagem':
    case 'video':
      return [el.midia]
    case 'abas':
      return el.abas.map((a) => a.imagem).filter((m): m is LpMidia => Boolean(m))
    case 'carrossel':
      return el.slides.map((s) => s.imagem).filter((m): m is LpMidia => Boolean(m))
    case 'depoimentos':
      return el.depoimentos.map((d) => d.foto).filter((m): m is LpMidia => Boolean(m))
    default:
      return []
  }
}
