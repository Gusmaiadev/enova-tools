import { NextResponse } from 'next/server'
import { verificar } from '@/lib/auth/challenge'
import { normalizarCodigo } from '@/lib/auth/codigo'
import { confiarDispositivo, gravarCookieDispositivo } from '@/lib/auth/dispositivo'
import { criarCookieDeSessao, gravarCookieDeSessao } from '@/lib/auth/sessao'
import { adminAuth } from '@/lib/firebase/admin'

export async function POST(req: Request) {
  let idToken: string
  let codigoBruto: unknown
  try {
    const body = await req.json()
    idToken = body.idToken
    codigoBruto = body.code
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const codigo = normalizarCodigo(codigoBruto)
  if (!codigo) {
    return NextResponse.json({ erro: 'Digite os 6 dígitos do código.' }, { status: 400 })
  }

  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid
  } catch {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  const agora = Date.now()
  const r = await verificar(uid, codigo, agora)
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: r.status })

  // 2FA aprovado: troca o idToken por um session cookie httpOnly de 5 dias.
  try {
    const cookie = await criarCookieDeSessao(idToken)
    await gravarCookieDeSessao(cookie)
  } catch {
    return NextResponse.json(
      { erro: 'Não foi possível criar a sessão. Entre novamente.' },
      { status: 500 },
    )
  }

  // Marca ESTE navegador como confiavel por 20 dias: nos proximos logins o codigo
  // nao sera pedido de novo aqui. Best-effort — se falhar, o pior caso e pedir o
  // codigo no proximo login.
  try {
    const token = await confiarDispositivo(uid)
    await gravarCookieDispositivo(token)
  } catch {
    // ignora: sessao ja criada, so nao "lembrou" do dispositivo
  }

  return NextResponse.json({ ok: true })
}
