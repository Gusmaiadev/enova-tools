import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_SESSAO, usuarioDaSessao } from '@/lib/auth/sessao'

/**
 * Protege /app/* (secao 5.4, passo 5).
 *
 * No Next.js 16 o antigo `middleware.ts` virou `proxy.ts` e passou a rodar por
 * padrao no runtime Node.js — por isso o firebase-admin (que usa node:crypto)
 * funciona aqui, coisa que era impossivel no runtime edge das versoes antigas.
 *
 * Faz a verificacao autoritativa com checkRevoked=true. Ainda assim, o layout de
 * /app e cada Route Handler de dados reverificam a sessao por conta propria — a
 * doc do Next recomenda nao confiar so no proxy (ele pode ser servido na borda),
 * e os handlers de /api nem sao cobertos por este matcher.
 */
export async function proxy(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_SESSAO)?.value
  const usuario = await usuarioDaSessao(cookie, true)

  if (!usuario) {
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/app/:path*',
}
