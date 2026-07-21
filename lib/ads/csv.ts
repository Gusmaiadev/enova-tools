/**
 * Parser tolerante de CSV de relatórios do Google Ads. Modulo puro.
 *
 * Exports do Ads variam bastante: vírgula OU tab, pt-BR ("1.234,56") OU en
 * ("1,234.56"), com linhas de título antes do cabeçalho e uma linha de "Total"
 * no fim. Este parser detecta o delimitador, acha a linha de cabeçalho pelos
 * nomes das colunas (sinônimos pt/en) e ignora títulos e totais.
 */

import type { Agregados, LinhaCampanha, LinhaTermo, TipoRelatorio } from './tipos'

/** Teto de linhas guardadas por snapshot (as maiores por custo). Os agregados
 *  usam TODAS as linhas — a truncagem afeta só a lista exibida. */
const MAX_LINHAS = 500

export type ResultadoParse =
  | { ok: true; linhas: (LinhaCampanha | LinhaTermo)[]; agregados: Agregados; total: number }
  | { ok: false; erro: string }

// ---------- tokenização ----------

function detectarDelimitador(texto: string): string {
  const amostra = texto.split('\n').slice(0, 15).join('\n')
  const tabs = (amostra.match(/\t/g) ?? []).length
  const virgulas = (amostra.match(/,/g) ?? []).length
  return tabs > virgulas ? '\t' : ','
}

/** CSV tokenizer que respeita aspas (inclusive delimitador e quebra dentro delas). */
function tokenizar(texto: string, delim: string): string[][] {
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++
        } else {
          aspas = false
        }
      } else {
        campo += c
      }
    } else if (c === '"') {
      aspas = true
    } else if (c === delim) {
      linha.push(campo)
      campo = ''
    } else if (c === '\n') {
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else if (c !== '\r') {
      campo += c
    }
  }
  if (campo.length || linha.length) {
    linha.push(campo)
    linhas.push(linha)
  }
  return linhas
}

// ---------- normalização ----------

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acentos combinantes
    .toLowerCase()
    .replace(/["']/g, '')
    .trim()
}

/** "1.234,56" | "1,234.56" | "R$ 12,34" | "45,2%" → número. */
export function parseNumero(bruto: string): number {
  if (!bruto) return 0
  let s = bruto.replace(/[^0-9.,-]/g, '')
  if (!s || s === '-') return 0

  const temPonto = s.includes('.')
  const temVirgula = s.includes(',')

  if (temPonto && temVirgula) {
    // O último separador que aparece é o decimal; o outro é milhar.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (temVirgula) {
    s = s.replace(',', '.') // só vírgula → decimal pt-BR
  } else if (temPonto) {
    // Só ponto: pode ser milhar pt-BR ("1.234") ou decimal en ("12.34").
    // Se cada grupo depois de um ponto tem 3 dígitos, é separador de milhar.
    const partes = s.split('.')
    const milhar = partes.length > 1 && partes.slice(1).every((p) => p.length === 3)
    if (milhar) s = s.replace(/\./g, '')
  }

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// Sinônimos de cabeçalho (já normalizados). A ordem importa: o mais específico
// primeiro para "grupo de anúncios" não casar com "campanha".
const SINONIMOS: Record<string, string[]> = {
  termo: ['termo de pesquisa', 'termo de busca', 'search term', 'termo'],
  grupo: ['grupo de anuncios', 'ad group', 'grupo'],
  campanha: ['campanha', 'campaign'],
  status: ['status da campanha', 'campaign status', 'status'],
  impressoes: ['impressoes', 'impr.', 'impr', 'impressions'],
  cliques: ['cliques', 'clicks'],
  custo: ['custo', 'cost'],
  conversoes: ['conversoes', 'conversions', 'conv.', 'conv'],
}

function casaColuna(cabecalho: string, chave: string): boolean {
  const alvo = normalizar(cabecalho)
  return SINONIMOS[chave].some((s) => alvo === s || alvo.startsWith(s))
}

/** Acha a linha de cabeçalho: a primeira que tem a coluna-chave do relatório. */
function acharCabecalho(linhas: string[][], chave: string): number {
  for (let i = 0; i < Math.min(linhas.length, 30); i++) {
    if (linhas[i].some((c) => casaColuna(c, chave))) return i
  }
  return -1
}

function indiceDe(cabecalho: string[], chave: string): number {
  return cabecalho.findIndex((c) => casaColuna(c, chave))
}

function ehLinhaTotal(primeiraCelula: string): boolean {
  const n = normalizar(primeiraCelula)
  return n === '' || n.startsWith('total') || n.startsWith('---')
}

// ---------- entrada principal ----------

export function parseRelatorio(texto: string, tipo: TipoRelatorio): ResultadoParse {
  const limpo = texto.replace(/^﻿/, '') // tira BOM
  if (!limpo.trim()) return { ok: false, erro: 'O arquivo está vazio.' }

  const delim = detectarDelimitador(limpo)
  const linhas = tokenizar(limpo, delim)
  const chave = tipo === 'termos' ? 'termo' : 'campanha'

  const hIdx = acharCabecalho(linhas, chave)
  if (hIdx < 0) {
    const oQue = tipo === 'termos' ? 'Termo de pesquisa' : 'Campanha'
    return {
      ok: false,
      erro: `Não encontrei a coluna "${oQue}". Confirme que este é o relatório de ${tipo === 'termos' ? 'termos de busca' : 'campanhas'} exportado do Google Ads.`,
    }
  }

  const cab = linhas[hIdx]
  const col = {
    campanha: indiceDe(cab, 'campanha'),
    termo: indiceDe(cab, 'termo'),
    grupo: indiceDe(cab, 'grupo'),
    status: indiceDe(cab, 'status'),
    impressoes: indiceDe(cab, 'impressoes'),
    cliques: indiceDe(cab, 'cliques'),
    custo: indiceDe(cab, 'custo'),
    conversoes: indiceDe(cab, 'conversoes'),
  }

  const cel = (linha: string[], i: number) => (i >= 0 ? (linha[i] ?? '').trim() : '')
  const num = (linha: string[], i: number) => parseNumero(cel(linha, i))

  const parsed: (LinhaCampanha | LinhaTermo)[] = []
  const agg: Agregados = { impressoes: 0, cliques: 0, custo: 0, conversoes: 0 }

  const colChave = tipo === 'termos' ? col.termo : col.campanha

  for (let i = hIdx + 1; i < linhas.length; i++) {
    const linha = linhas[i]
    const rotulo = cel(linha, colChave)
    if (ehLinhaTotal(rotulo)) continue

    const base = {
      impressoes: num(linha, col.impressoes),
      cliques: num(linha, col.cliques),
      custo: num(linha, col.custo),
      conversoes: num(linha, col.conversoes),
    }
    agg.impressoes += base.impressoes
    agg.cliques += base.cliques
    agg.custo += base.custo
    agg.conversoes += base.conversoes

    if (tipo === 'termos') {
      parsed.push({
        termo: rotulo,
        campanha: cel(linha, col.campanha) || null,
        grupo: cel(linha, col.grupo) || null,
        ...base,
      })
    } else {
      parsed.push({
        campanha: rotulo,
        status: cel(linha, col.status) || null,
        ...base,
      })
    }
  }

  if (parsed.length === 0) {
    return { ok: false, erro: 'Nenhuma linha de dados encontrada no arquivo.' }
  }

  // Guarda as maiores por custo (os agregados já somaram todas).
  const guardadas = [...parsed].sort((a, b) => b.custo - a.custo).slice(0, MAX_LINHAS)

  return { ok: true, linhas: guardadas, agregados: agg, total: parsed.length }
}
