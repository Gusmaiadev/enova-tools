import { blue, yellow, pink } from './tokens'

/**
 * Estende os tokens da secao 4 com tres cores extras. Esta e a unica excecao a
 * regra semantica das cores: aqui elas sao identidade de pessoa, nao estado do
 * sistema. Avatar nao conta como "amarelo na tela".
 */
const PALETA = [blue, yellow, pink, '#00D9A3', '#A855F7', '#FF7A2E'] as const

export function avatarDe(uid: string, nome: string) {
  // hash estavel — o mesmo uid da sempre a mesma cor, em qualquer sessao
  let h = 0
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0

  const bg = PALETA[Math.abs(h) % PALETA.length]
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return { bg, iniciais }
}
