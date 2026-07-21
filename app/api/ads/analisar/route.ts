import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { analisar } from '@/lib/ads/ia'
import { obterCliente, ultimoSnapshot } from '@/lib/ads/persistencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/ads/analisar — roda a IA sobre os últimos snapshots do cliente. */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let clienteId: unknown
  try {
    clienteId = (await req.json()).clienteId
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof clienteId !== 'string') {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const cliente = await obterCliente(clienteId, usuario.teamId)
  if (!cliente) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 })

  const [campanhas, termos] = await Promise.all([
    ultimoSnapshot(clienteId, usuario.teamId, 'campanhas'),
    ultimoSnapshot(clienteId, usuario.teamId, 'termos'),
  ])

  const r = await analisar(campanhas, termos)
  if (!r.ok) {
    return Response.json({ erro: r.erro, semChave: r.semChave ?? false }, { status: r.semChave ? 200 : 502 })
  }
  return Response.json({ ok: true, sugestao: r.sugestao })
}
