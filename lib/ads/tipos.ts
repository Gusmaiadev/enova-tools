/**
 * Tipos da ferramenta de acompanhamento de Google Ads. Modulo puro (sem
 * 'server-only'): usado no server (parser/persistencia) e no client (tabelas).
 */

export type TipoRelatorio = 'campanhas' | 'termos'

export const ROTULO_RELATORIO: Record<TipoRelatorio, string> = {
  campanhas: 'Campanhas',
  termos: 'Termos de busca',
}

/** Métricas base — os derivados (CTR, CPC…) são calculados, nunca guardados. */
export type LinhaCampanha = {
  campanha: string
  status: string | null
  impressoes: number
  cliques: number
  custo: number
  conversoes: number
}

export type LinhaTermo = {
  termo: string
  campanha: string | null
  grupo: string | null
  impressoes: number
  cliques: number
  custo: number
  conversoes: number
}

export type Agregados = {
  impressoes: number
  cliques: number
  custo: number
  conversoes: number
}

export type AdsCliente = {
  id: string
  nome: string
  teamId: string
  criadoPor: string
  createdAt: number
}

export type AdsSnapshot = {
  id: string
  clienteId: string
  teamId: string
  tipo: TipoRelatorio
  /** Linhas do relatório (truncadas por custo se muito grandes — ver totalLinhas). */
  linhas: (LinhaCampanha | LinhaTermo)[]
  agregados: Agregados
  /** Quantas linhas o CSV tinha antes de qualquer truncagem. */
  totalLinhas: number
  importadoPorNome: string
  createdAt: number
}

export type Derivadas = {
  ctr: number // cliques / impressões
  cpcMedio: number // custo / cliques
  custoPorConv: number // custo / conversões
  taxaConv: number // conversões / cliques
}

/** Saída estruturada da análise de IA (compartilhada server/client). */
export type SugestaoIA = {
  resumo: string
  anomalias: string[]
  negativas: string[]
  acoes: { titulo: string; detalhe: string }[]
}

const div = (a: number, b: number) => (b > 0 ? a / b : 0)

export function derivar(m: Agregados): Derivadas {
  return {
    ctr: div(m.cliques, m.impressoes),
    cpcMedio: div(m.custo, m.cliques),
    custoPorConv: div(m.custo, m.conversoes),
    taxaConv: div(m.conversoes, m.cliques),
  }
}
