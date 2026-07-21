import { NextResponse } from 'next/server'

/**
 * Proxy da lista de estados do IBGE (secao 8.1). Passa pelo server para evitar
 * qualquer surpresa de CORS e cachear — a lista muda praticamente nunca.
 */
export const revalidate = 86400 // 24h

export type EstadoIBGE = { id: number; sigla: string; nome: string }

export async function GET() {
  try {
    const r = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
      { next: { revalidate } },
    )
    if (!r.ok) throw new Error(String(r.status))
    const bruto = (await r.json()) as EstadoIBGE[]
    // Reordena com localeCompare pt-BR (o orderBy do IBGE trata acento de forma ingenua).
    const estados = bruto
      .map((e) => ({ id: e.id, sigla: e.sigla, nome: e.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return NextResponse.json(estados)
  } catch {
    return NextResponse.json({ erro: 'Falha ao carregar estados.' }, { status: 502 })
  }
}
