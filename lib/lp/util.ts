/** Utilitarios puros do Criador de Landing Pages (server e client). */

/** Id curto e aleatorio para secoes/itens (nao precisa ser global-unique). */
export function gerarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

/** 'Quem Somos' -> 'quem-somos' (ancoras e nomes de arquivo). */
export function slugificar(texto: string): string {
  const semAcentos = texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return (
    semAcentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'secao'
  )
}

/** Escapa texto para HTML (conteudo vem do usuario e da IA — nunca confiar). */
export function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Remove caracteres perigosos de valores interpolados em CSS. */
export function escCss(valor: string): string {
  return valor.replace(/[<>"'{};\\]/g, '')
}

/**
 * Sanitiza URL de link/midia: aceita http(s), mailto, tel, ancora, caminho
 * relativo e data:image (placeholders SVG). Resto (javascript: etc.) vira '#'.
 */
export function urlSegura(url: string): string {
  const limpa = url.trim()
  if (limpa === '') return '#'
  if (/^#/.test(limpa)) return limpa
  if (/^(https?:|mailto:|tel:)/i.test(limpa)) return limpa
  if (/^data:image\/(svg\+xml|png|jpe?g|webp|gif);/i.test(limpa)) return limpa
  if (/^(\.\/|\.\.\/|\/[^/])/.test(limpa)) return limpa
  if (/^assets\//.test(limpa)) return limpa
  return '#'
}

/**
 * Valida e normaliza cor CSS simples (#hex, rgb/rgba, hsl ou nome). Hex curto
 * (#abc/#abcd) vira #rrggbb para que corContraste consiga medir a luminância.
 * Fora desses formatos, devolve o fallback.
 */
export function corSegura(cor: string | undefined, fallback: string): string {
  if (!cor) return fallback
  const limpa = cor.trim()
  // '#abc'/'#abcd' -> '#aabbcc' (o canal alfa de 4 dígitos é descartado).
  const curto = /^#([0-9a-f])([0-9a-f])([0-9a-f])[0-9a-f]?$/i.exec(limpa)
  if (curto) {
    return `#${curto[1]}${curto[1]}${curto[2]}${curto[2]}${curto[3]}${curto[3]}`.toLowerCase()
  }
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(limpa)) return limpa
  if (/^(rgb|hsl)a?\(\s*[\d.,%\s/]+\)$/i.test(limpa)) return limpa
  if (/^[a-z]{3,20}$/i.test(limpa)) return limpa
  return fallback
}

/** Prefixa https:// quando o usuário digita só o domínio (www.exemplo.com.br). */
export const normalizarUrl = (u: string): string =>
  u === '' || /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`

/** Clamp numerico com fallback para valores nao numericos. */
export function limitar(n: unknown, min: number, max: number, padrao: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : padrao
  return Math.min(max, Math.max(min, v))
}

/**
 * Luminância 0..1 de '#rrggbb', '#rrggbbaa' ou 'rgb()/rgba()'. Devolve null
 * quando não dá para medir (nome de cor, hsl) — o chamador decide o fallback.
 */
export function luminancia(cor: string): number | null {
  const limpa = cor.trim()
  const hex = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(limpa)
  let r: number
  let g: number
  let b: number
  if (hex) {
    const n = parseInt(hex[1], 16)
    r = (n >> 16) & 255
    g = (n >> 8) & 255
    b = n & 255
  } else {
    const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(limpa)
    if (!rgb) return null
    r = Number(rgb[1])
    g = Number(rgb[2])
    b = Number(rgb[3])
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * Texto legível (branco ou quase-preto) sobre uma cor de fundo. Cores que não
 * dá para medir (nomes, hsl) caem em `quandoIndefinido` — passe o padrão seguro
 * da área (footer escuro pede texto claro; header claro pede texto escuro).
 */
export function corContraste(fundo: string, quandoIndefinido = '#111318'): string {
  const l = luminancia(fundo)
  if (l === null) return quandoIndefinido
  return l > 0.55 ? '#111318' : '#ffffff'
}
