/**
 * Field mask fixo. NUNCA monte um field mask inline (secao 7.2).
 *
 * A cobranca da Places API e pelo SKU mais alto presente no mask. websiteUri e
 * nationalPhoneNumber disparam o SKU Enterprise (1.000 chamadas gratis/mes).
 * Adicionar um campo sem querer aqui muda o SKU e a fatura; os campos Essentials
 * vem de graca junto porque o Enterprise ja domina o preco.
 */
export const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.primaryTypeDisplayName',
  'places.websiteUri', // Enterprise
  'places.nationalPhoneNumber', // Enterprise
  'nextPageToken',
].join(',')
