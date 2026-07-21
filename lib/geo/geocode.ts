import 'server-only'

import { type Rect, retanguloDe } from '@/lib/places/geometria'

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

export class GeocodeError extends Error {}

/**
 * Geocodifica "bairro, cidade, uf, Brasil" e devolve o viewport como bbox inicial
 * (secao 8.1). Geocoding e SKU Essentials (10.000 gratis/mes) — barato. Usamos
 * geometry.viewport, que SEMPRE vem; geometry.bounds e opcional.
 */
export async function geocodificar(
  bairro: string,
  cidade: string,
  uf: string,
): Promise<Rect> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new GeocodeError('GOOGLE_MAPS_API_KEY não configurado.')

  const address = `${bairro}, ${cidade}, ${uf}, Brasil`
  const url = new URL(GEOCODE_URL)
  url.searchParams.set('address', address)
  url.searchParams.set('components', 'country:BR')
  url.searchParams.set('region', 'br')
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('key', apiKey)

  const resp = await fetch(url, { cache: 'no-store' })
  if (!resp.ok) throw new GeocodeError(`Geocoding retornou ${resp.status}.`)

  const data = (await resp.json()) as {
    status: string
    results?: Array<{
      geometry?: {
        viewport?: {
          northeast: { lat: number; lng: number }
          southwest: { lat: number; lng: number }
        }
      }
    }>
  }

  if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
    throw new GeocodeError('Bairro não encontrado. Confira o nome e a cidade.')
  }
  if (data.status !== 'OK') {
    throw new GeocodeError(`Geocoding falhou: ${data.status}.`)
  }

  const vp = data.results[0].geometry?.viewport
  if (!vp) throw new GeocodeError('Geocoding não retornou área para este bairro.')

  return retanguloDe(
    { latitude: vp.southwest.lat, longitude: vp.southwest.lng },
    { latitude: vp.northeast.lat, longitude: vp.northeast.lng },
  )
}
