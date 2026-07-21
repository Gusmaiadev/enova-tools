/**
 * Bounding box no formato que a Places API exige (Viewport).
 *
 * low  = canto SUDOESTE  (menor latitude, menor longitude)
 * high = canto NORDESTE  (maior latitude, maior longitude)
 *
 * No Brasil as latitudes sao NEGATIVAS: low.latitude e o valor MAIS negativo
 * (mais ao sul). Trocar low/high nao da erro — devolve zero resultados em
 * silencio. Este e o bug mais provavel desta feature; por isso o tipo carrega a
 * semantica no nome.
 */
export type LatLng = { latitude: number; longitude: number }
export type Rect = { low: LatLng; high: LatLng }

/** Normaliza qualquer par de cantos para o par (SW, NE) correto. */
export function retanguloDe(a: LatLng, b: LatLng): Rect {
  return {
    low: {
      latitude: Math.min(a.latitude, b.latitude),
      longitude: Math.min(a.longitude, b.longitude),
    },
    high: {
      latitude: Math.max(a.latitude, b.latitude),
      longitude: Math.max(a.longitude, b.longitude),
    },
  }
}

/**
 * Divide o retangulo em 4 quadrantes iguais pelo ponto medio. As celulas se
 * sobrepoem nas bordas de propósito zero — o dedupe por place.id no chamador
 * cuida de negocios que caem na divisa.
 */
export function dividirEm4(r: Rect): Rect[] {
  const midLat = (r.low.latitude + r.high.latitude) / 2
  const midLng = (r.low.longitude + r.high.longitude) / 2

  return [
    // SW
    retanguloDe(r.low, { latitude: midLat, longitude: midLng }),
    // SE
    retanguloDe(
      { latitude: r.low.latitude, longitude: midLng },
      { latitude: midLat, longitude: r.high.longitude },
    ),
    // NW
    retanguloDe(
      { latitude: midLat, longitude: r.low.longitude },
      { latitude: r.high.latitude, longitude: midLng },
    ),
    // NE
    retanguloDe({ latitude: midLat, longitude: midLng }, r.high),
  ]
}

/** Centro do retangulo — usado pelo radar da UI. */
export function centro(r: Rect): LatLng {
  return {
    latitude: (r.low.latitude + r.high.latitude) / 2,
    longitude: (r.low.longitude + r.high.longitude) / 2,
  }
}
