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
import type { LpDocumento, LpProjeto } from './tipos'
import { normalizarBotoes, normalizarTelefones } from './util'

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
      // Secao que ja tem arvore fica como esta. Um documento misto nao deveria
      // existir, mas existe: o editor chegou a inserir secao sem `raiz`, e isso
      // apagava o `versao: 2` na gravacao (validar.ts). Reexpandir tudo aqui
      // levaria junto as edicoes de widget das outras secoes — a expansao le so
      // os campos tipados, que nao acompanham o que foi editado na arvore.
      if (secao.raiz) return { ...secao, preset: secao.preset ?? secao.tipo }
      // `expandirPreset` e puro: `ajustada` ja vem com a midia do banner movida
      // para o fundo, e `secao` continua intacta para o documentoV1.
      const { raiz, secao: ajustada } = expandirPreset(secao)
      return { ...ajustada, preset: secao.tipo, raiz }
    }),
  }
}

/**
 * Formatos antigos convertidos na leitura do projeto: telefones que eram uma
 * string unica, botao do header que virou lista, paginas legais que nao
 * existiam — e, por ultimo, o documento em arvore.
 *
 * Vive aqui, e nao em persistencia.ts, para ser testavel sem inicializar o
 * Firebase Admin: e funcao pura sobre os dados do projeto.
 */
export function migrarProjeto(dados: Omit<LpProjeto, 'id'>): Omit<LpProjeto, 'id'> {
  const documento = dados.documento && {
    ...dados.documento,
    header: {
      ...dados.documento.header,
      botoes: normalizarBotoes(
        dados.documento.header.botoes ?? (dados.documento.header as { botao?: unknown }).botao,
      ),
    },
    footer: {
      ...dados.documento.footer,
      telefones: normalizarTelefones(dados.documento.footer.telefones),
      botoes: normalizarBotoes(dados.documento.footer.botoes),
    },
  }
  return {
    ...dados,
    briefing: {
      ...dados.briefing,
      paginas: dados.briefing.paginas ?? [],
      footer: {
        ...dados.briefing.footer,
        telefones: normalizarTelefones(dados.briefing.footer.telefones),
      },
    },
    // A arvore vem por ultimo: as conversoes acima normalizam o formato que o
    // expansor recebe.
    documento: documento && migrarDocumentoParaArvore(documento),
  }
}
