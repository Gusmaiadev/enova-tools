import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { listarUsuarios } from '@/lib/admin/usuarios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/admin/usuarios — lista todos os usuarios da equipe (só admin). */
export async function GET() {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })
  if (!usuario.admin) return Response.json({ erro: 'Acesso restrito.' }, { status: 403 })

  const usuarios = await listarUsuarios(usuario.teamId)
  return Response.json({ usuarios })
}
