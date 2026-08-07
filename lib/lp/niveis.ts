/**
 * Nivel de um texto da pagina: o que ele e — titulo (h1 a h4), subtitulo ou
 * paragrafo.
 *
 * Junta duas coisas que o modelo guarda separadas, `titulo.nivel` e
 * `texto.papel`, porque para quem escreve e uma pergunta so: "isto aqui e um
 * titulo de secao ou e corpo de texto?". O modelo continua com dois widgets —
 * eles tem tag e tipografia diferentes —, e trocar de nivel atravessa de um
 * para o outro.
 *
 * Modulo puro, sem React: o painel usa para montar o campo e os testes para
 * provar que toda opcao oferecida sobrevive a gravacao.
 */

import type { LpElemento } from './tipos'

export type NivelTexto = 'h1' | 'h2' | 'h3' | 'h4' | 'subtitulo' | 'paragrafo'

export const NIVEIS_TEXTO: { valor: NivelTexto; rotulo: string }[] = [
  { valor: 'h1', rotulo: 'h1 — título principal' },
  { valor: 'h2', rotulo: 'h2 — título de seção' },
  { valor: 'h3', rotulo: 'h3 — título de bloco' },
  { valor: 'h4', rotulo: 'h4 — título menor' },
  { valor: 'subtitulo', rotulo: 'Subtítulo — texto de apoio' },
  { valor: 'paragrafo', rotulo: 'Parágrafo — texto corrido' },
]

/** Titulo e uma frase: o que passar disso a coercao corta na gravacao. */
export const LIMITE_TITULO = 500

const EH_TITULO = new Set<NivelTexto>(['h1', 'h2', 'h3', 'h4'])

export const nivelEhTitulo = (n: NivelTexto): boolean => EH_TITULO.has(n)

/** Nivel do no; `null` no que nao e texto (imagem, container, botao…). */
export function nivelDoNo(el: LpElemento): NivelTexto | null {
  if (el.tipo === 'titulo') return el.nivel
  if (el.tipo === 'texto') return el.papel === 'subtitulo' ? 'subtitulo' : 'paragrafo'
  return null
}

/**
 * Troca o nivel do no NO LUGAR. Entre titulo e texto muda tambem o `tipo`: sao
 * widgets diferentes, com tag propria no HTML e categoria propria no tema (ver
 * categoriaDoNo, em heranca.ts). O id e o resto do no ficam — quem estava com
 * aquele elemento selecionado continua com ele, agora no nivel novo.
 *
 * No que nao e texto nao faz nada: nivel de imagem ou de container nao existe.
 */
export function aplicarNivel(el: LpElemento, nivel: NivelTexto): void {
  if (el.tipo !== 'titulo' && el.tipo !== 'texto') return
  // O cast e proposital: aqui o no atravessa a uniao discriminada, e nao da para
  // reatribuir `tipo` com ela de pe. Os dois widgets so diferem em `nivel` e
  // `papel`; o que sobra (id, texto, estilo, animacao, oculto) e comum aos dois
  // e por isso continua valendo sem ser copiado.
  const alvo = el as unknown as { tipo: string; nivel?: string; papel?: string }
  if (nivelEhTitulo(nivel)) {
    alvo.tipo = 'titulo'
    alvo.nivel = nivel
    delete alvo.papel
  } else {
    alvo.tipo = 'texto'
    alvo.papel = nivel === 'subtitulo' ? 'subtitulo' : 'corpo'
    delete alvo.nivel
  }
}
