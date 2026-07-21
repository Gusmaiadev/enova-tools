import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { criarCliente, listarClientes } from '@/lib/ads/persistencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/ads/clientes — lista os clientes (contas de Ads) da equipe. */
export async function GET() {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const clientes = await listarClientes(usuario.teamId)
  return Response.json({ clientes })
}

/** POST /api/ads/clientes — cria um cliente. Body: { nome }. */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let nome: unknown
  try {
    nome = (await req.json()).nome
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof nome !== 'string' || nome.trim().length < 2) {
    return Response.json({ erro: 'Dê um nome ao cliente (2+ caracteres).' }, { status: 400 })
  }

  const cliente = await criarCliente(usuario.teamId, usuario.uid, nome)
  return Response.json({ ok: true, cliente })
}
