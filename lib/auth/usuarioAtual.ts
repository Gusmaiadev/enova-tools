import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/firebase/admin'
import type { Usuario } from '@/lib/tipos'
import { COOKIE_SESSAO, usuarioDaSessao } from './sessao'

export type SessaoUsuario = {
  uid: string
  email: string | null
  name: string
  teamId: string
}

/**
 * Le a sessao e monta o usuario, ou null se nao houver sessao valida.
 * checkRevoked por padrao false: em paginas /app o proxy ja fez a verificacao
 * autoritativa (com revogacao) nesta mesma requisicao. Route Handlers de dados
 * que nao passam pelo proxy devem chamar com checkRevoked=true.
 */
export async function lerUsuario(checkRevoked = false): Promise<SessaoUsuario | null> {
  const jar = await cookies()
  const cookie = jar.get(COOKIE_SESSAO)?.value
  const sessao = await usuarioDaSessao(cookie, checkRevoked)
  if (!sessao) return null

  const snap = await db.collection('users').doc(sessao.uid).get()
  const dados = snap.data() as Usuario | undefined

  return {
    uid: sessao.uid,
    email: sessao.email,
    name: dados?.name ?? sessao.email ?? '',
    teamId: dados?.teamId ?? (process.env.DEFAULT_TEAM_ID ?? 'trinca'),
  }
}

/** Igual, mas redireciona para /login — para Server Components dentro de /app. */
export async function exigirUsuario(): Promise<SessaoUsuario> {
  const u = await lerUsuario(false)
  if (!u) redirect('/login')
  return u
}

/** True se ha uma sessao valida. checkRevoked=true (autoritativo, fora do proxy). */
export async function temSessao(): Promise<boolean> {
  const jar = await cookies()
  const cookie = jar.get(COOKIE_SESSAO)?.value
  return (await usuarioDaSessao(cookie, true)) !== null
}

/**
 * Manda para /app quem ja esta logado. Usado no topo de /login, /cadastro e da
 * landing — assim, ao voltar ao site, o usuario com sessao valida (cookie de 5
 * dias) nao ve o formulario de login de novo.
 */
export async function redirecionarSeAutenticado(): Promise<void> {
  if (await temSessao()) redirect('/app')
}
