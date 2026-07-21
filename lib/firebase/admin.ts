import 'server-only'

import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

/**
 * Admin SDK — a unica porta de entrada para o Firestore neste projeto.
 * Ignora as firestore.rules por design, e por isso so pode ser tocado a partir
 * do server. O import 'server-only' faz o build quebrar se um componente
 * client tentar importar isto.
 *
 * Inicializacao preguicosa (na primeira chamada, nao no load do modulo): assim
 * `next build` nao explode quando o .env ainda nao esta preenchido, e um erro de
 * credencial ausente aparece so em runtime, com mensagem clara.
 */
function criarApp(): App {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (
    !privateKey ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !process.env.FIREBASE_ADMIN_PROJECT_ID
  ) {
    throw new Error(
      'Credenciais do Firebase Admin ausentes. Preencha FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no .env.local.',
    )
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // A chave vem do .env com \n escapado; o cert() exige quebras reais.
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  })
}

function app(): App {
  return getApps().length ? getApp() : criarApp()
}

export function getAdminAuth(): Auth {
  return getAuth(app())
}

export function getDb(): Firestore {
  return getFirestore(app())
}

/**
 * Proxies preguicosos: `adminAuth.verifyIdToken(...)` e `db.collection(...)`
 * continuam funcionando como antes, mas so tocam o Firebase quando de fato usados.
 */
export const adminAuth = new Proxy({} as Auth, {
  get(_t, prop) {
    const value = getAdminAuth()[prop as keyof Auth]
    return typeof value === 'function' ? value.bind(getAdminAuth()) : value
  },
})

export const db = new Proxy({} as Firestore, {
  get(_t, prop) {
    const value = getDb()[prop as keyof Firestore]
    return typeof value === 'function' ? value.bind(getDb()) : value
  },
})
