import 'server-only'

import { db } from '@/lib/firebase/admin'

/** Configuracao global do app (doc unico config/app). */
export type ConfigApp = {
  /** Se a pagina /cadastro aceita novas contas. */
  cadastroAberto: boolean
}

function ref() {
  return db.collection('config').doc('app')
}

/** Le a config; default = cadastro aberto quando nunca foi configurado. */
export async function lerConfig(): Promise<ConfigApp> {
  const snap = await ref().get()
  const dados = snap.data() as Partial<ConfigApp> | undefined
  return { cadastroAberto: dados?.cadastroAberto ?? true }
}

export async function definirCadastroAberto(aberto: boolean): Promise<void> {
  await ref().set({ cadastroAberto: aberto }, { merge: true })
}
