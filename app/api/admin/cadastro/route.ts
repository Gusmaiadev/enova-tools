import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { definirCadastroAberto, lerConfig } from '@/lib/admin/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/admin/cadastro — estado atual do cadastro. */
export async function GET() {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })
  if (!usuario.admin) return Response.json({ erro: 'Acesso restrito.' }, { status: 403 })

  const { cadastroAberto } = await lerConfig()
  return Response.json({ cadastroAberto })
}

/** POST /api/admin/cadastro — abre/fecha o cadastro. Body: { aberto: boolean }. */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })
  if (!usuario.admin) return Response.json({ erro: 'Acesso restrito.' }, { status: 403 })

  let aberto: unknown
  try {
    aberto = (await req.json()).aberto
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof aberto !== 'boolean') {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  await definirCadastroAberto(aberto)
  return Response.json({ ok: true, cadastroAberto: aberto })
}
