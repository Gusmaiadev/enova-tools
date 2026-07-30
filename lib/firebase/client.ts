'use client'

import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

/**
 * SDK client. Serve para UMA coisa: autenticar (senha, reautenticacao, troca de
 * e-mail/senha) e produzir o idToken que o server verifica.
 *
 * NUNCA importe firebase/firestore aqui. O client nao fala com o Firestore —
 * as rules negam tudo (secao 5.2) e todo dado passa por Route Handler.
 * NUNCA importe firebase/storage: existe bucket, mas quem grava e apaga e o
 * Admin SDK em /api/lp/upload — storage.rules nega tudo para o client.
 *
 * Init preguicoso via funcao: getAuth() lanca com apiKey vazia, e nao queremos
 * que o prerender de build (SSR das paginas client) quebre por isso. No browser
 * as NEXT_PUBLIC_* estao presentes e a chamada acontece so em handlers/efeitos.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

let authMemo: Auth | null = null

export function getAuthClient(): Auth {
  if (!authMemo) {
    const app = getApps().length ? getApp() : initializeApp(config)
    authMemo = getAuth(app)
  }
  return authMemo
}
