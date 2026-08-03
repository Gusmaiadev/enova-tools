/** Utilitarios puros do Criador de Landing Pages (server e client). */

import type { BotaoComId, TelefoneFooter } from './tipos'

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

/**
 * Slug que serve como id de elemento — sempre comecando por letra. `slugificar`
 * aceita comecar por digito ("2024", ou o id cru da secao, que a IA as vezes
 * devolve no lugar da ancora), e o compilador recusa esse id e emite outro. O
 * menu, que ja recebeu o "#ancora", passa a apontar para um id inexistente e o
 * clique nao sai do lugar.
 */
export function ancoraSegura(texto: string): string {
  const slug = slugificar(texto)
  return /^[a-z]/.test(slug) ? slug : `sec-${slug}`
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
 * relativo, pagina do proprio pacote (termos.html) e data:image (placeholders
 * SVG). Resto (javascript: etc.) vira '#'.
 */
export function urlSegura(url: string): string {
  const limpa = url.trim()
  if (limpa === '') return '#'
  if (/^#/.test(limpa)) return limpa
  if (/^(https?:|mailto:|tel:)/i.test(limpa)) return limpa
  // Arquivo .html ao lado do index (as paginas de termos/privacidade).
  if (/^[a-z0-9][a-z0-9._-]*\.html(#[a-z0-9_-]*)?$/i.test(limpa)) return limpa
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

/** Quantidade maxima de telefones no rodape. */
export const MAX_TELEFONES = 6

/** Quantidade maxima de botoes no header e no rodape. */
export const MAX_BOTOES = 4

/** Id de secao/item/telefone/botao: so [A-Za-z0-9_-], senao vira um novo. */
const idOuNovo = (v: unknown): string => {
  const limpo = typeof v === 'string' ? v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) : ''
  return limpo === '' ? gerarId() : limpo
}

/**
 * Botoes de header/rodape sempre como lista, cada um com id (o editor aponta
 * para o id no data-lp). Aceita o formato antigo — um botao so, sem id, que os
 * documentos salvos antes disso guardam em `header.botao`, e que a IA as vezes
 * ainda responde. Botao sem texto e descartado: sairia um retangulo vazio.
 */
export function normalizarBotoes(valor: unknown): BotaoComId[] {
  const bruta: unknown[] = Array.isArray(valor)
    ? valor
    : valor !== null && typeof valor === 'object'
      ? [valor]
      : []
  const botoes: BotaoComId[] = []
  for (const bruto of bruta) {
    if (bruto === null || typeof bruto !== 'object') continue
    const b = bruto as Record<string, unknown>
    const texto = typeof b.texto === 'string' ? b.texto.slice(0, 80).trim() : ''
    if (texto === '') continue
    botoes.push({
      ...(b as unknown as BotaoComId),
      id: idOuNovo(b.id),
      texto,
      url: typeof b.url === 'string' ? b.url.trim() : '#',
    })
    if (botoes.length === MAX_BOTOES) break
  }
  return botoes
}

/**
 * Link de um telefone do rodape: wa.me quando o numero e WhatsApp, tel: nos
 * outros. Numero brasileiro escrito do jeito de casa ("(11) 99999-9999") ganha
 * o DDI 55; o que ja veio com "+" e o que tem cara de 0800 ou de numero local
 * (sem DDD) fica como esta. Sem digito nenhum devolve '' — ai o numero sai como
 * texto, sem link.
 */
export function linkTelefone(numero: string, whatsapp: boolean): string {
  const digitos = numero.replace(/\D/g, '')
  if (digitos === '') return ''
  const comDdi = numero.trim().startsWith('+') || digitos.length > 11
  const local = digitos.startsWith('0') || digitos.length < 10
  const internacional = comDdi ? digitos : local ? '' : `55${digitos}`
  // No WhatsApp o link sempre sai: quem marcou a caixa quer o link, e o wa.me
  // avisa se o numero nao existe.
  if (whatsapp) return `https://wa.me/${internacional || digitos}`
  return internacional === '' ? `tel:${digitos}` : `tel:+${internacional}`
}

/**
 * Telefones do rodape sempre como lista. Aceita o formato antigo — uma string
 * unica com todos os numeros ("(11) 3333-4444 / (11) 99999-9999") — porque
 * briefings e documentos salvos antes da lista ainda chegam assim, e a IA as
 * vezes responde no formato velho.
 */
export function normalizarTelefones(valor: unknown): TelefoneFooter[] {
  const bruta: unknown[] = Array.isArray(valor)
    ? valor
    : typeof valor === 'string'
      ? valor.split(/[\n/|;,]+/)
      : []
  const telefones: TelefoneFooter[] = []
  for (const bruto of bruta) {
    const t: Record<string, unknown> =
      typeof bruto === 'string'
        ? { numero: bruto }
        : bruto !== null && typeof bruto === 'object'
          ? (bruto as Record<string, unknown>)
          : {}
    const numero = typeof t.numero === 'string' ? t.numero.slice(0, 40).trim() : ''
    if (numero === '') continue
    telefones.push({ id: idOuNovo(t.id), numero, whatsapp: t.whatsapp === true })
    if (telefones.length === MAX_TELEFONES) break
  }
  return telefones
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
