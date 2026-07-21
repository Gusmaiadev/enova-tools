import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  COOKIE_SESSAO,
  criarCookieDeSessao,
  gravarCookieDeSessao,
  usuarioDaSessao,
} from '@/lib/auth/sessao'
import { adminAuth } from '@/lib/firebase/admin'

/**
 * Re-emite o cookie de sessao a partir de um idToken fresco. Usado depois de
 * trocar a senha (ou o e-mail): a troca avanca o `tokensValidAfterTime` da conta,
 * o que faz o proxy — que verifica com checkRevoked=true — considerar o cookie
 * antigo revogado e deslogar. Trocar o cookie pelo novo idToken evita isso.
 *
 * ⚠️ Blindagem: NAO e um atalho para pular o 2FA. So funciona se JA existir um
 * cookie de sessao valido (que so nasce apos o 2FA) e se o idToken for do MESMO
 * uid. Um idToken so-de-senha (pre-2FA) nao tem cookie e nao passa daqui.
 */
export async function POST(req: Request) {
  let idToken: string
  try {
    idToken = (await req.json()).idToken
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  // Sessao atual (checkRevoked=false: a troca de senha pode ter acabado de
  // "revogar" o cookie; ainda assim ele prova que este navegador ja passou pelo
  // 2FA). O idToken novo e a autoridade sobre o uid.
  const jar = await cookies()
  const sessaoAtual = await usuarioDaSessao(jar.get(COOKIE_SESSAO)?.value, false)
  if (!sessaoAtual) {
    return NextResponse.json({ erro: 'Sem sessão para renovar.' }, { status: 401 })
  }

  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(idToken, true)).uid
  } catch {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  if (uid !== sessaoAtual.uid) {
    return NextResponse.json({ erro: 'Token não corresponde à sessão.' }, { status: 403 })
  }

  try {
    const cookie = await criarCookieDeSessao(idToken)
    await gravarCookieDeSessao(cookie)
  } catch {
    return NextResponse.json({ erro: 'Não foi possível renovar a sessão.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
