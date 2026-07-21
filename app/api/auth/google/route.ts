import { NextResponse } from 'next/server'
import { criarCookieDeSessao, gravarCookieDeSessao } from '@/lib/auth/sessao'
import { adminAuth } from '@/lib/firebase/admin'
import { provisionarUsuario } from '@/lib/users/provisionar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Login/cadastro com Google. Cria a sessao SEM 2FA por e-mail — o login Google ja
 * e um segundo fator forte, e mandar codigo para o mesmo Gmail seria teatro.
 *
 * ⚠️ Blindagem: so aceita tokens cujo provedor e google.com. Sem isso, alguem
 * poderia autenticar por senha e chamar este endpoint para PULAR o 2FA.
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

  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  // O provedor precisa ser google.com — este atalho nao vale para senha.
  if (decoded.firebase?.sign_in_provider !== 'google.com') {
    return NextResponse.json({ erro: 'Provedor não permitido aqui.' }, { status: 403 })
  }

  const uid = decoded.uid
  const email = decoded.email ?? ''
  const nome = decoded.name ?? email.split('@')[0] ?? 'Usuário'

  await provisionarUsuario(uid, email, nome)

  try {
    const cookie = await criarCookieDeSessao(idToken)
    await gravarCookieDeSessao(cookie)
  } catch {
    return NextResponse.json(
      { erro: 'Não foi possível criar a sessão. Tente novamente.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
