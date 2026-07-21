import 'server-only'

import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, db } from '@/lib/firebase/admin'
import type { Usuario } from '@/lib/tipos'

export type UsuarioAdmin = {
  uid: string
  name: string
  email: string
  admin: boolean
  createdAt: number
}

/** Todos os usuarios da equipe, para o Painel. Ordenados por nome. */
export async function listarUsuarios(teamId: string): Promise<UsuarioAdmin[]> {
  const snap = await db.collection('users').where('teamId', '==', teamId).get()
  return snap.docs
    .map((d) => {
      const u = d.data() as Usuario
      return {
        uid: d.id,
        name: u.name,
        email: u.email,
        admin: u.admin ?? true, // legado sem o campo = admin (ver lerUsuario)
        createdAt: u.createdAt,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/**
 * Exclui um usuario por completo: a conta de Auth, o doc users/{uid}, a filiacao
 * na equipe e TODOS os leads que ele salvou. Irreversivel.
 */
export async function excluirUsuario(teamId: string, uid: string): Promise<void> {
  // Leads do usuario (indice teamId + ownerUid ja existe).
  const leads = await db
    .collection('leads')
    .where('teamId', '==', teamId)
    .where('ownerUid', '==', uid)
    .get()

  const batch = db.batch()
  leads.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(db.collection('users').doc(uid))
  await batch.commit()

  await db.collection('teams').doc(teamId).update({ memberUids: FieldValue.arrayRemove(uid) })

  // Best-effort: conta de Auth + estado de 2FA/dispositivos. allSettled para uma
  // falha isolada (ex.: conta ja removida) nao abortar as demais limpezas.
  await Promise.allSettled([
    adminAuth.deleteUser(uid),
    db.collection('dispositivos_confiaveis').doc(uid).delete(),
    db.collection('mfa_challenges').doc(uid).delete(),
  ])
}

export async function definirAdmin(uid: string, admin: boolean): Promise<void> {
  await db.collection('users').doc(uid).update({ admin, updatedAt: Date.now() })
}
