import 'server-only'

import { FieldValue } from 'firebase-admin/firestore'
import { db } from '@/lib/firebase/admin'

const TEAM_ID = process.env.DEFAULT_TEAM_ID ?? 'trinca'

/**
 * Garante users/{uid} e a filiacao na equipe padrao. Idempotente: nao sobrescreve
 * um usuario existente nem duplica a filiacao. Usado tanto pelo cadastro por
 * senha (/api/users/init) quanto pelo login com Google (/api/auth/google).
 * So aceita dados ja verificados a partir do idToken — nunca do corpo cru.
 */
export async function provisionarUsuario(uid: string, email: string, nome: string) {
  const agora = Date.now()

  const userRef = db.collection('users').doc(uid)
  const existente = await userRef.get()
  if (!existente.exists) {
    await userRef.set({
      name: nome,
      email,
      teamId: TEAM_ID,
      // Contas novas nascem sem acesso ao Painel; um admin promove depois.
      admin: false,
      createdAt: agora,
      updatedAt: agora,
    })
  }

  const teamRef = db.collection('teams').doc(TEAM_ID)
  const team = await teamRef.get()
  if (team.exists) {
    await teamRef.update({ memberUids: FieldValue.arrayUnion(uid) })
  } else {
    await teamRef.set({ name: 'E-nova', memberUids: [uid], createdAt: agora })
  }
}
