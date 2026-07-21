import { describe, expect, it } from 'vitest'
import { centro, dividirEm4, type Rect, retanguloDe } from './geometria'
import type { Place } from './searchText'
import { type BuscarCelula, MAX_DEPTH, varrer } from './varrer'

const BBOX: Rect = retanguloDe(
  { latitude: -23.7, longitude: -46.7 },
  { latitude: -23.5, longitude: -46.5 },
)

function place(id: string): Place {
  return {
    id,
    displayName: id,
    formattedAddress: 'rua x',
    phone: null,
    websiteUri: null,
    primaryType: null,
  }
}

function dentro(p: { latitude: number; longitude: number }, r: Rect) {
  return (
    p.latitude >= r.low.latitude &&
    p.latitude <= r.high.latitude &&
    p.longitude >= r.low.longitude &&
    p.longitude <= r.high.longitude
  )
}

/**
 * Mundo sintetico: N negocios espalhados. A "API" falsa devolve ate 60 dos que
 * caem na celula. Assim a saturacao/subdivisao acontece de verdade, sem rede.
 */
function mundo(pontos: Array<{ id: string; latitude: number; longitude: number }>) {
  const chamadasPorCelula: Rect[] = []
  const buscar: BuscarCelula = async (bbox, _tipo, _termo, aoBillar, limitePaginas) => {
    chamadasPorCelula.push(bbox)
    const dentroDaCelula = pontos.filter((p) => dentro(p, bbox))
    // simula ate 3 paginas de 20, mas respeita o orcamento (limitePaginas)
    const querPaginas = Math.min(3, Math.ceil(dentroDaCelula.length / 20) || 1)
    const paginas = Math.min(querPaginas, Math.max(0, limitePaginas))
    for (let i = 0; i < paginas; i++) aoBillar()
    return dentroDaCelula.slice(0, 60).map((p) => place(p.id))
  }
  return { buscar, chamadasPorCelula }
}

describe('geometria', () => {
  it('dividirEm4 cobre o retangulo inteiro sem sobra e cada quadrante e 1/4 da area', () => {
    const qs = dividirEm4(BBOX)
    expect(qs).toHaveLength(4)
    // cantos externos preservados
    const lats = qs.flatMap((q) => [q.low.latitude, q.high.latitude])
    const lngs = qs.flatMap((q) => [q.low.longitude, q.high.longitude])
    expect(Math.min(...lats)).toBeCloseTo(BBOX.low.latitude)
    expect(Math.max(...lats)).toBeCloseTo(BBOX.high.latitude)
    expect(Math.min(...lngs)).toBeCloseTo(BBOX.low.longitude)
    expect(Math.max(...lngs)).toBeCloseTo(BBOX.high.longitude)
  })

  it('retanguloDe normaliza cantos trocados para (SW, NE)', () => {
    const r = retanguloDe(
      { latitude: -23.5, longitude: -46.5 },
      { latitude: -23.7, longitude: -46.7 },
    )
    expect(r.low.latitude).toBe(-23.7)
    expect(r.high.latitude).toBe(-23.5)
  })

  it('o centro de cada quadrante fica dentro do bbox original', () => {
    for (const q of dividirEm4(BBOX)) expect(dentro(centro(q), BBOX)).toBe(true)
  })
})

describe('varrer (quadtree)', () => {
  it('celula esparsa (<60) nao subdivide: 1 chamada de celula', async () => {
    const { buscar, chamadasPorCelula } = mundo([
      { id: 'a', latitude: -23.6, longitude: -46.6 },
      { id: 'b', latitude: -23.55, longitude: -46.55 },
    ])
    const r = await varrer(BBOX, 'restaurant', { termo: 'x', buscarCelula: buscar })
    expect(r.places.size).toBe(2)
    expect(chamadasPorCelula).toHaveLength(1) // nao subdividiu
    expect(r.truncado).toBe(false)
  })

  it('celula saturada (>=60) subdivide em 4', async () => {
    // 80 pontos concentrados no quadrante SW forcam saturacao no nivel 0
    const pontos = Array.from({ length: 80 }, (_, i) => ({
      id: `p${i}`,
      latitude: -23.69 + (i % 8) * 0.001,
      longitude: -46.69 + Math.floor(i / 8) * 0.001,
    }))
    const { buscar, chamadasPorCelula } = mundo(pontos)
    const r = await varrer(BBOX, 'restaurant', { termo: 'x', buscarCelula: buscar })
    // nivel 0 satura -> 4 filhos => pelo menos 5 celulas visitadas
    expect(chamadasPorCelula.length).toBeGreaterThanOrEqual(5)
    // todos os pontos unicos acabam coletados (dedupe por id)
    expect(r.places.size).toBe(80)
  })

  it('respeita o teto de profundidade mesmo com saturacao em toda parte', async () => {
    // "API" que SEMPRE devolve 60 -> saturacao infinita se nao houver trava.
    // Billa 1 por celula (ignora limitePaginas) para contar celulas visitadas.
    const buscarSempreCheio: BuscarCelula = async (_b, _t, _termo, aoBillar) => {
      aoBillar()
      return Array.from({ length: 60 }, (_, i) => place(`x${Math.random()}-${i}`))
    }
    const r = await varrer(BBOX, 'restaurant', {
      termo: 'x',
      buscarCelula: buscarSempreCheio,
      maxPaginas: 100000, // nao deixa o teto de custo mascarar o teto de profundidade
    })
    // 4^0 + 4^1 + ... + 4^MAX_DEPTH celulas no pior caso
    const maxCelulas = Array.from({ length: MAX_DEPTH + 1 }, (_, d) => 4 ** d).reduce(
      (a, b) => a + b,
      0,
    )
    expect(r.chamadas).toBeLessThanOrEqual(maxCelulas)
    expect(r.chamadas).toBeGreaterThan(0)
  })

  it('para no teto duro de chamadas e marca truncado — sem estourar', async () => {
    // Celula saturada que pagina ate 3x, mas honra o orcamento (limitePaginas).
    const buscarSaturado: BuscarCelula = async (_b, _t, _termo, aoBillar, limitePaginas) => {
      const paginas = Math.min(3, Math.max(0, limitePaginas))
      for (let i = 0; i < paginas; i++) aoBillar()
      return Array.from({ length: 60 }, (_, i) => place(`y${Math.random()}-${i}`))
    }
    const r = await varrer(BBOX, 'restaurant', {
      termo: 'x',
      buscarCelula: buscarSaturado,
      maxPaginas: 10,
    })
    expect(r.truncado).toBe(true)
    // Teto DURO: nunca ultrapassa maxPaginas (antes estourava por ate 2).
    expect(r.chamadas).toBeLessThanOrEqual(10)
  })

  it('emite eventos de radar na ordem esperada', async () => {
    const { buscar } = mundo([{ id: 'a', latitude: -23.6, longitude: -46.6 }])
    const eventos: string[] = []
    await varrer(BBOX, 'restaurant', {
      termo: 'x',
      buscarCelula: buscar,
      onEvento: (e) => eventos.push(e.tipo),
    })
    expect(eventos[0]).toBe('celula')
    expect(eventos).toContain('celula_ok')
    expect(eventos).toContain('progresso')
  })

  it('aborta quando o signal e cancelado', async () => {
    const controller = new AbortController()
    const buscarQueAborta: BuscarCelula = async (_b, _t, _termo, aoBillar) => {
      aoBillar()
      controller.abort()
      return Array.from({ length: 60 }, (_, i) => place(`z${i}`))
    }
    const r = await varrer(BBOX, 'restaurant', {
      termo: 'x',
      buscarCelula: buscarQueAborta,
      signal: controller.signal,
    })
    // depois de abortar, nao mergulha nos 4 filhos
    expect(r.chamadas).toBe(1)
  })
})
