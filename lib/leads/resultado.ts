import type { Classificacao } from '@/lib/places/classificar'
import type { Place } from '@/lib/places/searchText'

/**
 * Um negocio pronto para a lista da UI. So chega aqui o que ainda nao foi salvo
 * por ninguem da equipe — leads de colegas sao filtrados no server (secao 8.4).
 */
export type LeadResultado = Place & {
  classificacao: Classificacao
}

/** Ordena: lead_quente (ouro) primeiro, depois sem_nada, depois tem_site. */
const PESO: Record<Classificacao, number> = {
  lead_quente: 0,
  sem_nada: 1,
  tem_site: 2,
}

export function ordenarLeads(leads: LeadResultado[]): LeadResultado[] {
  return [...leads].sort((a, b) => {
    const dp = PESO[a.classificacao] - PESO[b.classificacao]
    if (dp !== 0) return dp
    return a.displayName.localeCompare(b.displayName, 'pt-BR')
  })
}
