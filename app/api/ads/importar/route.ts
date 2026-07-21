import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { parseRelatorio } from '@/lib/ads/csv'
import { obterCliente, salvarSnapshot } from '@/lib/ads/persistencia'
import type { TipoRelatorio } from '@/lib/ads/tipos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIPOS: TipoRelatorio[] = ['campanhas', 'termos']

/** POST /api/ads/importar — parseia um CSV e guarda como snapshot. */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let clienteId: unknown
  let tipo: unknown
  let csv: unknown
  try {
    const body = await req.json()
    clienteId = body.clienteId
    tipo = body.tipo
    csv = body.csv
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof clienteId !== 'string' || !TIPOS.includes(tipo as TipoRelatorio) || typeof csv !== 'string') {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const cliente = await obterCliente(clienteId, usuario.teamId)
  if (!cliente) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 })

  const r = parseRelatorio(csv, tipo as TipoRelatorio)
  if (!r.ok) return Response.json({ erro: r.erro }, { status: 400 })

  await salvarSnapshot({
    clienteId,
    teamId: usuario.teamId,
    tipo: tipo as TipoRelatorio,
    linhas: r.linhas,
    agregados: r.agregados,
    totalLinhas: r.total,
    importadoPorNome: usuario.name,
    createdAt: Date.now(),
  })

  return Response.json({ ok: true, total: r.total, agregados: r.agregados })
}
