import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase/admin'

/**
 * "Dispositivo confiavel" — pula o 2FA por 20 dias num aparelho onde o codigo ja
 * foi aprovado uma vez (secao 5.4).
 *
 * O cookie `e_disp` guarda um token opaco e aleatorio; o Firestore guarda so o
 * HASH desse token, com validade, em `dispositivos_confiaveis/{uid}`. Assim a
 * posse do cookie faz o papel de segundo fator: quem nao passou pelo 2FA neste
 * navegador nao tem o token, e o token so vale para o uid que o registrou.
 */
export const COOKIE_DISPOSITIVO = 'e_disp'

/** 20 dias (secao 5.4). */
export const DISPOSITIVO_MS = 20 * 24 * 60 * 60 * 1000

type Dispositivo = { hash: string; expiresAt: number }

function ref(uid: string) {
  return db.collection('dispositivos_confiaveis').doc(uid)
}

function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function hashesConferem(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** Le o token do cookie deste navegador (ou null). */
export async function lerCookieDispositivo(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_DISPOSITIVO)?.value ?? null
}

/**
 * True se este navegador tem um token registrado e nao expirado para o uid.
 * Nao confia so no cookie: o hash precisa bater com um registro do proprio uid.
 */
export async function dispositivoConfiavel(uid: string, token: string | null): Promise<boolean> {
  if (!token) return false
  try {
    const snap = await ref(uid).get()
    if (!snap.exists) return false
    const lista = (snap.data()?.dispositivos ?? []) as Dispositivo[]
    const alvo = hashDoToken(token)
    const agora = Date.now()
    return lista.some((d) => d.expiresAt > agora && hashesConferem(d.hash, alvo))
  } catch {
    // Na duvida, exige o 2FA (fail-closed).
    return false
  }
}

/**
 * Registra este dispositivo como confiavel por 20 dias e devolve o token novo
 * para gravar no cookie. Aproveita para podar registros expirados.
 */
export async function confiarDispositivo(uid: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const agora = Date.now()
  const novo: Dispositivo = { hash: hashDoToken(token), expiresAt: agora + DISPOSITIVO_MS }

  const snap = await ref(uid).get()
  const anteriores = ((snap.data()?.dispositivos ?? []) as Dispositivo[]).filter(
    (d) => d.expiresAt > agora,
  )
  await ref(uid).set({ dispositivos: [...anteriores, novo] })
  return token
}

export async function gravarCookieDispositivo(token: string) {
  const jar = await cookies()
  jar.set(COOKIE_DISPOSITIVO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(DISPOSITIVO_MS / 1000),
  })
}
