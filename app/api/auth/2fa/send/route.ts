import { NextResponse } from 'next/server'
import { criarEnvio, reverterEnvio } from '@/lib/auth/challenge'
import { enviarCodigo } from '@/lib/auth/email'
import { adminAuth } from '@/lib/firebase/admin'

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

  let uid: string
  let email: string | undefined
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
    email = decoded.email
  } catch {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  if (!email) {
    return NextResponse.json({ erro: 'Conta sem e-mail.' }, { status: 400 })
  }

  const agora = Date.now()
  const r = await criarEnvio(uid, agora)
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: r.status })

  try {
    await enviarCodigo(email, r.codigo, r.minutos)
  } catch (e) {
    // E-mail nao entregue: desfaz a reserva para nao consumir o teto de 3/15min.
    await reverterEnvio(uid, r.sentAt)
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : 'Falha ao enviar o código.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ pending: true })
}
