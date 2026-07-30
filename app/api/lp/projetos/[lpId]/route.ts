import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { removerPastaDoProjeto } from '@/lib/lp/armazenamento'
import { atualizarProjeto, excluirProjeto, obterProjeto } from '@/lib/lp/persistencia'
import { coergirBriefing, coergirDocumento } from '@/lib/lp/validar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/lp/projetos/{lpId} — projeto completo (briefing + documento). */
export async function GET(_req: Request, { params }: { params: Promise<{ lpId: string }> }) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const { lpId } = await params
  const projeto = await obterProjeto(lpId, usuario.teamId)
  if (!projeto) return Response.json({ erro: 'Projeto não encontrado.' }, { status: 404 })

  return Response.json({ projeto })
}

/**
 * PUT /api/lp/projetos/{lpId} — salva nome, briefing e/ou documento.
 * Body: { nome?, briefing?, documento? }. Tudo é coagido no servidor.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ lpId: string }> }) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const { lpId } = await params
  const projeto = await obterProjeto(lpId, usuario.teamId)
  if (!projeto) return Response.json({ erro: 'Projeto não encontrado.' }, { status: 404 })

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const patch: Parameters<typeof atualizarProjeto>[2] = {}

  if (corpo.nome !== undefined) {
    if (typeof corpo.nome !== 'string' || corpo.nome.trim().length < 2) {
      return Response.json({ erro: 'Dê um nome ao projeto (2+ caracteres).' }, { status: 400 })
    }
    patch.nome = corpo.nome
  }

  if (corpo.briefing !== undefined) {
    patch.briefing = coergirBriefing(corpo.briefing, patch.nome ?? projeto.nome)
  }

  if (corpo.documento !== undefined) {
    if (corpo.documento === null) {
      patch.documento = null
    } else {
      const documento = coergirDocumento(corpo.documento)
      if (!documento) {
        return Response.json({ erro: 'A página precisa ter ao menos uma seção.' }, { status: 400 })
      }
      patch.documento = documento
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ erro: 'Nada para salvar.' }, { status: 400 })
  }

  await atualizarProjeto(lpId, usuario.teamId, patch)
  return Response.json({ ok: true, ...(patch.documento ? { documento: patch.documento } : {}) })
}

/**
 * DELETE /api/lp/projetos/{lpId} — remove a landing page e as mídias que o
 * usuário enviou para ela (a pasta dela no bucket ficaria órfã para sempre).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ lpId: string }> }) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const { lpId } = await params
  const projeto = await obterProjeto(lpId, usuario.teamId)
  if (!projeto) return Response.json({ erro: 'Projeto não encontrado.' }, { status: 404 })

  // Antes do Firestore: se a limpeza falhar, o projeto continua lá e é possível
  // tentar de novo. O contrário deixaria arquivo sem nada apontando para ele.
  await removerPastaDoProjeto(usuario.teamId, lpId)
  await excluirProjeto(lpId, usuario.teamId)
  return Response.json({ ok: true })
}
