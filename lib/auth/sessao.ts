import 'server-only'

import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'

export const COOKIE_SESSAO = 'e_sessao'

/** 5 dias (secao 5.4). createSessionCookie espera expiresIn em MILISSEGUNDOS. */
export const SESSAO_MS = 5 * 24 * 60 * 60 * 1000

export async function criarCookieDeSessao(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSAO_MS })
}

export async function gravarCookieDeSessao(valor: string) {
  const jar = await cookies()
  jar.set(COOKIE_SESSAO, valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSAO_MS / 1000),
  })
}

export async function limparCookieDeSessao() {
  const jar = await cookies()
  jar.delete(COOKIE_SESSAO)
}

/**
 * Verifica a sessao a partir do cookie. checkRevoked=true forca ida ao Firebase
 * para pegar revogacao/desativacao — usado nos Route Handlers de dados.
 * Retorna o uid ou null.
 */
export async function usuarioDaSessao(
  cookie: string | undefined,
  checkRevoked = true,
): Promise<{ uid: string; email: string | null } | null> {
  if (!cookie) return null
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, checkRevoked)
    return { uid: decoded.uid, email: decoded.email ?? null }
  } catch {
    return null
  }
}
