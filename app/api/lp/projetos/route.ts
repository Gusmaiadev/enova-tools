import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { criarProjeto, listarProjetos } from '@/lib/lp/persistencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/lp/projetos — lista as landing pages da equipe. */
export async function GET() {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const projetos = await listarProjetos(usuario.teamId)
  return Response.json({ projetos })
}

/** POST /api/lp/projetos — cria uma landing page. Body: { nome }. */
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
    return Response.json({ erro: 'Dê um nome ao projeto (2+ caracteres).' }, { status: 400 })
  }

  const projeto = await criarProjeto(usuario.teamId, usuario.uid, nome)
  return Response.json({ ok: true, projeto })
}
