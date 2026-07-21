import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { definirAdmin, excluirUsuario } from '@/lib/admin/usuarios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** DELETE /api/admin/usuarios/{uid} — exclui a conta, os leads e a filiação. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const admin = await lerUsuario(true)
  if (!admin) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })
  if (!admin.admin) return Response.json({ erro: 'Acesso restrito.' }, { status: 403 })

  const { uid } = await params
  if (uid === admin.uid) {
    return Response.json({ erro: 'Você não pode excluir a própria conta.' }, { status: 400 })
  }

  await excluirUsuario(admin.teamId, uid)
  return Response.json({ ok: true })
}

/** PATCH /api/admin/usuarios/{uid} — promove ou rebaixa admin. Body: { admin: boolean }. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const admin = await lerUsuario(true)
  if (!admin) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })
  if (!admin.admin) return Response.json({ erro: 'Acesso restrito.' }, { status: 403 })

  const { uid } = await params

  let novoAdmin: unknown
  try {
    novoAdmin = (await req.json()).admin
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof novoAdmin !== 'boolean') {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  // Evita que o admin se rebaixe e perca o acesso ao Painel sem querer.
  if (uid === admin.uid && novoAdmin === false) {
    return Response.json({ erro: 'Você não pode remover o próprio acesso de admin.' }, { status: 400 })
  }

  await definirAdmin(uid, novoAdmin)
  return Response.json({ ok: true })
}
