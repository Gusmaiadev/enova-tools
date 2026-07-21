import type { Rect } from '@/lib/places/geometria'
import type { LeadResultado } from './resultado'

/**
 * Formato dos eventos SSE da busca. Modulo puro (sem 'server-only'), para o
 * Route Handler e o componente client compartilharem o mesmo contrato.
 */
export type EventoBusca =
  | { tipo: 'bbox'; bbox: Rect }
  | { tipo: 'celula'; bbox: Rect; depth: number }
  | { tipo: 'celula_ok'; bbox: Rect; depth: number; encontrados: number; saturada: boolean }
  | { tipo: 'subdividir'; bbox: Rect; depth: number }
  | { tipo: 'progresso'; total: number; chamadas: number }
  | { tipo: 'truncado'; chamadas: number }
  | {
      tipo: 'resultado'
      leads: LeadResultado[]
      chamadas: number
      truncado: boolean
      total: number
    }
  | { tipo: 'erro'; erro: string }
