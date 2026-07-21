import type { Classificacao } from './places/classificar'

export type StatusLead =
  | 'salvo'
  | 'contatado'
  | 'negociando'
  | 'fechado'
  | 'descartado'

export const STATUS_LEAD: StatusLead[] = [
  'salvo',
  'contatado',
  'negociando',
  'fechado',
  'descartado',
]

export const ROTULO_STATUS: Record<StatusLead, string> = {
  salvo: 'Salvo',
  contatado: 'Contatado',
  negociando: 'Negociando',
  fechado: 'Fechado',
  descartado: 'Descartado',
}

export type Usuario = {
  name: string
  email: string
  teamId: string
  createdAt: number
  updatedAt: number
}

export type Equipe = {
  name: string
  memberUids: string[]
  createdAt: number
}

/** Snapshot de exibicao. TTL de 30 dias (secao 8.5). */
export type CacheLead = {
  displayName: string
  formattedAddress: string
  phone: string | null
  websiteUri: string | null
  primaryType: string | null
  cachedAt: number
}

/** Dado do usuario. Sem TTL, nunca expira — aquilo e dele. */
export type ProprioLead = {
  notas: string
  telefoneConfirmado: string | null
  contatoNome: string | null
}

export type Lead = {
  placeId: string
  teamId: string
  ownerUid: string
  /** Desnormalizado — a aba Equipe le isto direto, sem join. */
  ownerName: string
  status: StatusLead
  classificacao: Classificacao
  cache: CacheLead
  proprio: ProprioLead
  createdAt: number
  updatedAt: number
}

/**
 * Lead como a EQUIPE o ve: sem o campo `proprio`, que e privado do dono (secao
 * 8.5). O GET /api/leads devolve os leads dos colegas neste formato.
 */
export type LeadEquipe = Omit<Lead, 'proprio'>

/** leadId composto: a deduplicacao vira propriedade do banco (secao 6). */
export function leadId(teamId: string, placeId: string): string {
  return `${teamId}__${placeId}`
}

export const TTL_CACHE_MS = 30 * 24 * 60 * 60 * 1000
