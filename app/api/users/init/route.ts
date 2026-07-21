import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { provisionarUsuario } from '@/lib/users/provisionar'
import { validarNome } from '@/lib/validacao'

/**
 * Cria users/{uid} apos o cadastro por senha (secao 5.3, passo 5).
 *
 * Roda ANTES do 2FA — o usuario acabou de criar a conta e so tem o idToken da
 * senha. Seguro porque o unico dado que aceitamos vem do proprio token verificado:
 * o uid e o e-mail sao do Firebase, nao do corpo da requisicao.
 */
export async function POST(req: Request) {
  let idToken: string
  let nome: string

  try {
    const body = await req.json()
    idToken = body.idToken
    nome = body.nome ?? ''
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const erroNome = validarNome(nome)
  if (erroNome) return NextResponse.json({ erro: erroNome }, { status: 400 })

  let uid: string
  let email: string
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
    email = decoded.email ?? ''
  } catch {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  await provisionarUsuario(uid, email, nome.trim())

  return NextResponse.json({ ok: true })
}
