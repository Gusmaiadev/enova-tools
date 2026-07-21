export type Classificacao = 'sem_nada' | 'lead_quente' | 'tem_site'

/**
 * Perfis sociais e agregadores de link. Quem poe isto no campo "site" nao tem
 * site — tem presenca digital alugada.
 */
const SEM_SITE_PROPRIO =
  /instagram\.com|facebook\.com|linktr\.ee|linktree|wa\.me|beacons\.ai/i

/**
 * A tese do produto (secao 8.3).
 *
 * Quem tem Instagram no campo de site e o MELHOR lead: ja entendeu que precisa
 * de presenca digital, ja investe tempo nisso, e nao tem site. Quem nao tem nada
 * muitas vezes nao tem nem interesse.
 */
export function classificar(place: { websiteUri?: string | null }): Classificacao {
  if (!place.websiteUri) return 'sem_nada'
  if (SEM_SITE_PROPRIO.test(place.websiteUri)) return 'lead_quente'
  return 'tem_site'
}
