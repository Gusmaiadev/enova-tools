/**
 * Ramos que importam para quem vende site: negocio local, com vitrine fisica,
 * que perde cliente por nao ter presenca digital propria.
 *
 * - `tipo`  -> `includedType` da Places API (New), filtro de tipo (singular).
 * - `termo` -> `textQuery`, que a searchText EXIGE (nao existe busca so-por-tipo
 *   num retangulo). O termo em PT-BR combina com includedType + strictTypeFiltering
 *   para reduzir "type bleed".
 */
export type Ramo = { tipo: string; rotulo: string; termo: string }

export const RAMOS: Ramo[] = [
  { tipo: 'beauty_salon', rotulo: 'Salão de beleza', termo: 'salão de beleza' },
  { tipo: 'hair_care', rotulo: 'Cabeleireiro / barbearia', termo: 'cabeleireiro barbearia' },
  { tipo: 'restaurant', rotulo: 'Restaurante', termo: 'restaurante' },
  { tipo: 'cafe', rotulo: 'Café', termo: 'café' },
  { tipo: 'bakery', rotulo: 'Padaria', termo: 'padaria' },
  { tipo: 'gym', rotulo: 'Academia', termo: 'academia' },
  { tipo: 'dentist', rotulo: 'Dentista', termo: 'dentista consultório odontológico' },
  { tipo: 'car_repair', rotulo: 'Oficina mecânica', termo: 'oficina mecânica' },
  { tipo: 'pet_store', rotulo: 'Pet shop', termo: 'pet shop' },
  { tipo: 'clothing_store', rotulo: 'Loja de roupas', termo: 'loja de roupas' },
  { tipo: 'furniture_store', rotulo: 'Loja de móveis', termo: 'loja de móveis' },
  { tipo: 'real_estate_agency', rotulo: 'Imobiliária', termo: 'imobiliária' },
  { tipo: 'lawyer', rotulo: 'Advogado', termo: 'advogado escritório de advocacia' },
  { tipo: 'veterinary_care', rotulo: 'Veterinário', termo: 'clínica veterinária' },
  { tipo: 'spa', rotulo: 'Spa', termo: 'spa' },
  { tipo: 'bar', rotulo: 'Bar', termo: 'bar' },
  { tipo: 'store', rotulo: 'Loja (genérico)', termo: 'loja' },
]

const PERMITIDOS = new Set(RAMOS.map((r) => r.tipo))

/** O tipo vem do client; nunca repasse para o Google sem passar por aqui. */
export function ramoValido(tipo: string): boolean {
  return PERMITIDOS.has(tipo)
}

export function rotuloDoRamo(tipo: string): string {
  return RAMOS.find((r) => r.tipo === tipo)?.rotulo ?? tipo
}

export function ramoDe(tipo: string): Ramo | undefined {
  return RAMOS.find((r) => r.tipo === tipo)
}
