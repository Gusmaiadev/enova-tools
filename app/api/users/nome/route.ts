import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { db } from '@/lib/firebase/admin'
import { validarNome } from '@/lib/validacao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Atualiza o nome do usuario em users/{uid} E propaga para o campo `ownerName`
 * desnormalizado de todos os leads dele (secao 5.5) — senao a aba Equipe mostra
 * o nome velho para sempre.
 */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let nome: string
  try {
    nome = String((await req.json()).nome ?? '').trim()
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const invalido = validarNome(nome)
  if (invalido) return Response.json({ erro: invalido }, { status: 400 })

  const agora = Date.now()
  await db.collection('users').doc(usuario.uid).update({ name: nome, updatedAt: agora })

  // Propaga ownerName nos leads do usuario, em lotes (limite de 500 por batch).
  const snap = await db
    .collection('leads')
    .where('teamId', '==', usuario.teamId)
    .where('ownerUid', '==', usuario.uid)
    .select() // so os ids; nao precisamos do corpo
    .get()

  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch()
    for (const d of docs.slice(i, i + 400)) {
      batch.update(d.ref, { ownerName: nome, updatedAt: agora })
    }
    await batch.commit()
  }

  return Response.json({ ok: true, propagados: docs.length })
}
