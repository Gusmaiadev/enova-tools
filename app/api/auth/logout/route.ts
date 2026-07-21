import { NextResponse } from 'next/server'
import { limparCookieDeSessao } from '@/lib/auth/sessao'

export async function POST() {
  await limparCookieDeSessao()
  return NextResponse.json({ ok: true })
}
