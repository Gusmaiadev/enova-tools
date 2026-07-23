/**
 * Catalogo curado de fontes do Google Fonts para o Criador de Landing Pages.
 * Os pesos listados sao os que a familia realmente tem — o css2 do Google
 * rejeita a URL inteira se qualquer peso pedido nao existir.
 */

export type FonteGoogle = {
  nome: string
  categoria: 'sans' | 'serif' | 'display' | 'mono'
  pesos: number[]
}

export const FONTES_GOOGLE: FonteGoogle[] = [
  { nome: 'Inter', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Roboto', categoria: 'sans', pesos: [300, 400, 500, 700, 900] },
  { nome: 'Open Sans', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800] },
  { nome: 'Montserrat', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Poppins', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Lato', categoria: 'sans', pesos: [300, 400, 700, 900] },
  { nome: 'Raleway', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Nunito', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Work Sans', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'DM Sans', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Manrope', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800] },
  { nome: 'Rubik', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Karla', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800] },
  { nome: 'Sora', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800] },
  { nome: 'Outfit', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Space Grotesk', categoria: 'sans', pesos: [300, 400, 500, 600, 700] },
  { nome: 'Archivo', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'Josefin Sans', categoria: 'sans', pesos: [300, 400, 500, 600, 700] },
  { nome: 'Barlow', categoria: 'sans', pesos: [300, 400, 500, 600, 700, 800, 900] },
  { nome: 'IBM Plex Sans', categoria: 'sans', pesos: [300, 400, 500, 600, 700] },
  { nome: 'Playfair Display', categoria: 'serif', pesos: [400, 500, 600, 700, 800, 900] },
  { nome: 'Merriweather', categoria: 'serif', pesos: [300, 400, 700, 900] },
  { nome: 'Cormorant Garamond', categoria: 'serif', pesos: [300, 400, 500, 600, 700] },
  { nome: 'Lora', categoria: 'serif', pesos: [400, 500, 600, 700] },
  { nome: 'Libre Baskerville', categoria: 'serif', pesos: [400, 700] },
  { nome: 'Oswald', categoria: 'display', pesos: [300, 400, 500, 600, 700] },
  { nome: 'Bebas Neue', categoria: 'display', pesos: [400] },
  { nome: 'Anton', categoria: 'display', pesos: [400] },
  { nome: 'Chakra Petch', categoria: 'display', pesos: [300, 400, 500, 600, 700] },
  { nome: 'IBM Plex Mono', categoria: 'mono', pesos: [300, 400, 500, 600, 700] },
]

/** Fallback generico por categoria, para o font-family compilado. */
const FALLBACK: Record<FonteGoogle['categoria'], string> = {
  sans: 'sans-serif',
  serif: 'serif',
  display: 'sans-serif',
  mono: 'monospace',
}

export function fontePorNome(nome: string): FonteGoogle | undefined {
  return FONTES_GOOGLE.find((f) => f.nome === nome)
}

export function familiaCss(nome: string): string {
  return `'${nome}', ${FALLBACK[fontePorNome(nome)?.categoria ?? 'sans']}`
}

/** Peso existente mais proximo do pedido (para nao pedir 800 de uma fonte 400). */
export function pesoValido(nome: string, peso: number): number {
  const fonte = fontePorNome(nome)
  if (!fonte) return peso
  return fonte.pesos.reduce(
    (melhor, p) => (Math.abs(p - peso) < Math.abs(melhor - peso) ? p : melhor),
    fonte.pesos[0],
  )
}

/** URL do CSS do Google Fonts para as familias usadas (so pesos existentes). */
export function urlGoogleFonts(familias: string[]): string | null {
  const unicas = [...new Set(familias)]
    .map((f) => fontePorNome(f))
    .filter((f): f is FonteGoogle => f !== undefined)
  if (unicas.length === 0) return null
  const partes = unicas.map((f) => {
    const nome = encodeURIComponent(f.nome).replace(/%20/g, '+')
    return `family=${nome}:wght@${f.pesos.join(';')}`
  })
  return `https://fonts.googleapis.com/css2?${partes.join('&')}&display=swap`
}
