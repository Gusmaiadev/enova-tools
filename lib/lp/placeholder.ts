/**
 * Placeholders SVG (data URI) para midias sem resultado do Envato — a pagina
 * funciona offline e o usuario troca depois no editor. Puro.
 */

import type { LpMidia, Orientacao, TipoMidia } from './tipos'

const DIMENSOES: Record<Orientacao, [number, number]> = {
  paisagem: [1200, 800],
  retrato: [800, 1067],
  quadrado: [900, 900],
}

/** SVG com gradiente + rotulo da busca (e um play, se for video). */
export function placeholderMidia(
  busca: string,
  orientacao: Orientacao,
  tipo: TipoMidia,
  cores: { de: string; ate: string } = { de: '#334155', ate: '#0f172a' },
): LpMidia {
  const [w, h] = DIMENSOES[orientacao]
  const rotulo = (busca || 'Imagem ilustrativa').slice(0, 48).replace(/[<>&"']/g, '')
  const play =
    tipo === 'video'
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="54" fill="rgba(255,255,255,0.9)"/><path d="M ${w / 2 - 14} ${h / 2 - 24} L ${w / 2 + 26} ${h / 2} L ${w / 2 - 14} ${h / 2 + 24} Z" fill="#0f172a"/>`
      : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cores.de}"/><stop offset="1" stop-color="${cores.ate}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><g opacity="0.25" stroke="#ffffff" stroke-width="2" fill="none"><circle cx="${w * 0.82}" cy="${h * 0.2}" r="${h * 0.16}"/><circle cx="${w * 0.12}" cy="${h * 0.85}" r="${h * 0.24}"/></g>${play}<text x="${w / 2}" y="${h - 40}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(h / 30)}" fill="rgba(255,255,255,0.75)">${rotulo}</text></svg>`
  return {
    tipo,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    alt: busca || 'Imagem ilustrativa',
    busca,
    orientacao,
  }
}
