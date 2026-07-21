import { NextResponse } from 'next/server'

export const revalidate = 86400 // 24h

export type MunicipioIBGE = { id: number; nome: string }

/**
 * Proxy dos municipios de uma UF (secao 8.1). A UF vai pela sigla ("SP"); UF
 * invalida devolve 200 com [] no IBGE, entao tratamos lista vazia como erro
 * amigavel em vez de status HTTP.
 */
export async function GET(req: Request) {
  const uf = new URL(req.url).searchParams.get('uf')?.trim().toUpperCase()
  if (!uf || !/^[A-Z]{2}$/.test(uf)) {
    return NextResponse.json({ erro: 'UF inválida.' }, { status: 400 })
  }

  try {
    const r = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      { next: { revalidate } },
    )
    if (!r.ok) throw new Error(String(r.status))
    const bruto = (await r.json()) as Array<{ id: number; nome: string }>
    // UF bem-formada mas inexistente ("XX") volta 200 com [] no IBGE — tratamos
    // como erro amigavel em vez de devolver lista vazia silenciosa.
    if (bruto.length === 0) {
      return NextResponse.json({ erro: 'UF sem municípios.' }, { status: 404 })
    }
    const municipios = bruto
      .map((m) => ({ id: m.id, nome: m.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return NextResponse.json(municipios)
  } catch {
    return NextResponse.json({ erro: 'Falha ao carregar municípios.' }, { status: 502 })
  }
}
