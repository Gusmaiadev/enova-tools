/**
 * URL da ficha do negócio no Google Maps (o "Google Meu Negócio") a partir do
 * placeId. Formato oficial da Maps URLs API: `query` é obrigatório, mas quando
 * vem `query_place_id` o Google abre exatamente aquela ficha — o nome entra só
 * como texto de apoio. Modulo puro (sem 'server-only'): usado no client.
 */
export function urlGoogleMaps(placeId: string, nome: string): string {
  const query = encodeURIComponent(nome || placeId)
  const id = encodeURIComponent(placeId)
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${id}`
}
