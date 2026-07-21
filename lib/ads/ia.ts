import 'server-only'

import {
  type AdsSnapshot,
  derivar,
  type LinhaCampanha,
  type LinhaTermo,
  type SugestaoIA,
} from './tipos'
import { formatarMoeda, formatarNumero, formatarPercent } from './formato'

/**
 * Análise de campanhas com Gemini 2.5 Flash (AI Studio).
 *
 * Privacidade: enviamos SÓ métricas de performance (números, nomes de campanha
 * e termos). NUNCA o nome/identificador do cliente. No free tier o Google pode
 * usar os dados para treino — antes de rodar dados reais de cliente em escala,
 * troque `GEMINI_API_KEY` por uma chave do tier pago (a mesma chamada serve).
 */

const MODELO = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`

export type ResultadoIA =
  | { ok: true; sugestao: SugestaoIA }
  | { ok: false; erro: string; semChave?: boolean }

function linhaMetricas(nome: string, m: { impressoes: number; cliques: number; custo: number; conversoes: number }) {
  const d = derivar({ ...m })
  return `- ${nome}: custo ${formatarMoeda(m.custo)}, ${formatarNumero(m.impressoes)} impr., ${formatarNumero(m.cliques)} cliques (CTR ${formatarPercent(d.ctr)}), ${formatarNumero(m.conversoes)} conv. (custo/conv ${formatarMoeda(d.custoPorConv)})`
}

function montarPrompt(campanhas: AdsSnapshot | null, termos: AdsSnapshot | null): string {
  const partes: string[] = []

  if (campanhas) {
    partes.push('CAMPANHAS:')
    partes.push(linhaMetricas('TOTAL', campanhas.agregados))
    for (const l of campanhas.linhas.slice(0, 40) as LinhaCampanha[]) {
      partes.push(linhaMetricas(l.campanha, l))
    }
  }

  if (termos) {
    partes.push('\nTERMOS DE BUSCA (top por custo):')
    for (const t of termos.linhas.slice(0, 60) as LinhaTermo[]) {
      partes.push(linhaMetricas(`"${t.termo}"`, t))
    }
  }

  return `Você é um especialista em Google Ads. Analise os dados abaixo de uma conta e responda em português do Brasil.

${partes.join('\n')}

Responda APENAS com um JSON neste formato exato:
{
  "resumo": "2-3 frases sobre o desempenho geral",
  "anomalias": ["pontos de atenção como gasto alto sem conversão, CTR baixo, etc."],
  "negativas": ["termos de busca que deveriam virar palavra-chave negativa, com o motivo"],
  "acoes": [{"titulo": "ação recomendada", "detalhe": "por que e como fazer"}]
}
Seja específico e cite números. Se faltar dado para alguma seção, devolva lista vazia.`
}

function extrairJson(texto: string): SugestaoIA | null {
  try {
    // O modelo às vezes embrulha em ```json … ```; pega do primeiro { ao último }.
    const inicio = texto.indexOf('{')
    const fim = texto.lastIndexOf('}')
    if (inicio < 0 || fim < 0) return null
    const obj = JSON.parse(texto.slice(inicio, fim + 1))
    return {
      resumo: typeof obj.resumo === 'string' ? obj.resumo : '',
      anomalias: Array.isArray(obj.anomalias) ? obj.anomalias.map(String) : [],
      negativas: Array.isArray(obj.negativas) ? obj.negativas.map(String) : [],
      acoes: Array.isArray(obj.acoes)
        ? obj.acoes
            .filter((a: unknown) => a && typeof a === 'object')
            .map((a: { titulo?: unknown; detalhe?: unknown }) => ({
              titulo: String(a.titulo ?? ''),
              detalhe: String(a.detalhe ?? ''),
            }))
        : [],
    }
  } catch {
    return null
  }
}

export async function analisar(
  campanhas: AdsSnapshot | null,
  termos: AdsSnapshot | null,
): Promise<ResultadoIA> {
  const chave = process.env.GEMINI_API_KEY
  if (!chave) {
    return {
      ok: false,
      semChave: true,
      erro: 'IA não configurada. Adicione GEMINI_API_KEY ao .env.local para ativar as sugestões.',
    }
  }
  if (!campanhas && !termos) {
    return { ok: false, erro: 'Importe um relatório antes de pedir a análise.' }
  }

  try {
    const resp = await fetch(`${ENDPOINT}?key=${chave}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: montarPrompt(campanhas, termos) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
    })

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => '')
      if (resp.status === 400 && /API key/i.test(detalhe)) {
        return { ok: false, semChave: true, erro: 'Chave da IA inválida. Verifique GEMINI_API_KEY.' }
      }
      return { ok: false, erro: `A IA respondeu com erro (${resp.status}). Tente de novo.` }
    }

    const data = await resp.json()
    const texto: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const sugestao = extrairJson(texto)
    if (!sugestao) return { ok: false, erro: 'Não consegui interpretar a resposta da IA. Tente de novo.' }

    return { ok: true, sugestao }
  } catch {
    return { ok: false, erro: 'Falha ao falar com a IA. Verifique a conexão e tente de novo.' }
  }
}
