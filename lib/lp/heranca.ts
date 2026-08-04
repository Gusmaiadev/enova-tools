/**
 * De onde cada widget herda o estilo quando nao tem override proprio.
 *
 * O painel precisa disso para mostrar o valor EFETIVO — o que a pagina esta
 * usando de fato — em vez de campo vazio. Sem isto, quem definiu a fonte no
 * briefing abre o editor e ve "automatico" em tudo, como se a escolha nao
 * tivesse sido aplicada.
 *
 * Modulo puro: nao decide aparencia, so responde de onde vem o valor.
 */

import type { CategoriaTexto, LpElemento, LpTema } from './tipos'

/**
 * Categoria de tipografia do tema que rege o no. `null` para o que nao e texto
 * (imagem, container, divisor…), que nao herda tipografia de lugar nenhum.
 */
export function categoriaDoNo(el: LpElemento): CategoriaTexto | null {
  switch (el.tipo) {
    case 'titulo':
      return 'titulos'
    case 'texto':
      return el.papel === 'subtitulo' ? 'subtitulos' : 'textos'
    case 'botao':
      return 'botoes'
    // O numero grande usa a familia de titulos no CSS (--fonte-titulos).
    case 'numero':
      return 'titulos'
    default:
      return null
  }
}

export type EstiloEfetivo = {
  fonte?: string
  tamanho?: string
  peso?: number
  alturaLinha?: string
  espacamentoLetras?: string
  cor?: string
  fundo?: string
}

/**
 * Valores que o tema aplica ao no. Sao os que o painel mostra como "do tema"
 * enquanto o usuario nao sobrepoe.
 *
 * Ressalva do `tamanho`: titulos saem da pagina dentro de um `clamp()`, entao o
 * tamanho renderizado varia com a largura da tela. O valor aqui e a BASE — o
 * numero que o usuario escreveu na Identidade —, que e o que ele reconhece.
 */
export function estiloHerdado(el: LpElemento, tema: LpTema): EstiloEfetivo {
  const cat = categoriaDoNo(el)
  if (!cat) return {}
  const t = tema.tipografia[cat]
  return {
    fonte: t.fonte,
    tamanho: t.tamanho,
    peso: t.peso,
    alturaLinha: t.alturaLinha,
    espacamentoLetras: t.espacamentoLetras,
    cor: tema.cores[cat],
    // No botao a cor do tema e a do TEXTO; o fundo tem chave propria.
    fundo: cat === 'botoes' ? tema.cores.fundoBotoes : undefined,
  }
}
