import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { estadoUso } from '@/lib/places/usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/leads/uso — quanto do teto mensal de chamadas já foi usado. */
export async function GET() {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })
  return Response.json(await estadoUso())
}
