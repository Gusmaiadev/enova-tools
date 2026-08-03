/**
 * Conversao do documento de secoes tipadas para arvore de elementos.
 *
 * NAO e chamada ainda: quem liga e persistencia.ts na Entrega 2, depois que o
 * compilador souber renderizar arvore. Ligar antes disso deixa toda pagina em
 * branco.
 *
 * A conversao e de mao unica. Quem chamar deve guardar o documento original em
 * `documentoV1` na primeira escrita — e a rede de protecao contra um expansor
 * errado estragar a pagina de um cliente.
 */

import { expandirPreset } from './presets/expandir'
import type { LpDocumento } from './tipos'

/** Documento salvo antes da arvore (sem `versao`). */
export function precisaMigrar(doc: LpDocumento | null | undefined): boolean {
  return Boolean(doc) && doc?.versao !== 2
}

/**
 * Devolve o documento em arvore. Nao muta a entrada: o chamador precisa do
 * original intacto para gravar em `documentoV1`. Documento ja em v2 volta como
 * esta, pela mesma referencia.
 */
export function migrarDocumentoParaArvore(doc: LpDocumento): LpDocumento {
  if (!precisaMigrar(doc)) return doc
  return {
    ...doc,
    versao: 2,
    secoes: doc.secoes.map((secao) => {
      // `expandirPreset` e puro: `ajustada` ja vem com a midia do banner movida
      // para o fundo, e `secao` continua intacta para o documentoV1.
      const { raiz, secao: ajustada } = expandirPreset(secao)
      return { ...ajustada, preset: secao.tipo, raiz }
    }),
  }
}
