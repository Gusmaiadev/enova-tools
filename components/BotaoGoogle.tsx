'use client'

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Erro } from '@/components/Campo'
import { getAuthClient } from '@/lib/firebase/client'
import { mensagemDeErroFirebase } from '@/lib/firebase/erros'

/**
 * "Continuar com Google". Autentica pelo popup do Google e cria a sessao via
 * /api/auth/google (sem 2FA por e-mail — o provedor Google ja e o segundo fator).
 * Serve tanto para cadastro quanto para login: contas novas sao criadas na hora.
 */
export function BotaoGoogle() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function entrar() {
    setErro(null)
    setCarregando(true)
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(getAuthClient(), provider)
      const idToken = await cred.user.getIdToken()

      const r = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.erro ?? 'Não foi possível entrar com o Google.')
      }

      router.push('/app')
    } catch (e) {
      // Popup fechado pelo usuario nao e erro digno de alarme.
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code: string }).code === 'auth/popup-closed-by-user'
      ) {
        setCarregando(false)
        return
      }
      setErro(mensagemDeErroFirebase(e))
      setCarregando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={entrar}
        disabled={carregando}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-4 text-sm font-semibold text-text transition-colors hover:bg-surface disabled:opacity-50"
      >
        <GoogleIcon />
        {carregando ? 'Conectando…' : 'Continuar com Google'}
      </button>
      <Erro>{erro}</Erro>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

/** Divisor "ou" entre o formulário e o botão do Google. */
export function DivisorOu() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-text-dim">
      <span className="h-px flex-1 bg-border" />
      ou
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
