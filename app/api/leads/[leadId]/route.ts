import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { atualizarLead, type PatchLead } from '@/lib/leads/persistencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/leads/{leadId} — atualiza status e/ou dados proprios.
 * leadId = `${teamId}__${placeId}`. Extraimos o placeId e confiamos no teamId da
 * sessao (nunca no da URL) para evitar edicao cruzada entre equipes.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const { leadId } = await params
  const sep = leadId.indexOf('__')
  const placeId = sep >= 0 ? leadId.slice(sep + 2) : leadId
  if (!placeId) return Response.json({ erro: 'Lead inválido.' }, { status: 400 })

  let patch: PatchLead
  try {
    patch = await req.json()
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  // JSON `null` / array / primitivo sao JSON validos mas nao um corpo de patch.
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const r = await atualizarLead(usuario.teamId, placeId, usuario.uid, patch)
  if (!r.ok) return Response.json({ erro: r.erro }, { status: r.status })
  return Response.json({ ok: true })
}
