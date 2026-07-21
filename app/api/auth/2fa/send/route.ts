import { NextResponse } from 'next/server'
import { criarEnvio, reverterEnvio } from '@/lib/auth/challenge'
import { dispositivoConfiavel, lerCookieDispositivo } from '@/lib/auth/dispositivo'
import { enviarCodigo } from '@/lib/auth/email'
import { criarCookieDeSessao, gravarCookieDeSessao } from '@/lib/auth/sessao'
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

  // Dispositivo confiavel (2FA aprovado aqui nos ultimos 20 dias): pula o codigo
  // e cria a sessao direto. O cookie `e_disp` so existe apos um 2FA anterior neste
  // navegador e so vale para este uid — por isso serve de segundo fator.
  const tokenDispositivo = await lerCookieDispositivo()
  if (await dispositivoConfiavel(uid, tokenDispositivo)) {
    try {
      const cookie = await criarCookieDeSessao(idToken)
      await gravarCookieDeSessao(cookie)
      return NextResponse.json({ trusted: true })
    } catch {
      // Se falhar a sessao, cai no fluxo normal do codigo abaixo.
    }
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
