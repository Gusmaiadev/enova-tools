'use client'

import { onAuthStateChanged, type User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { Aviso, Erro } from '@/components/Campo'
import { CartaoAuth } from '@/components/CartaoAuth'
import { getAuthClient } from '@/lib/firebase/client'
import { mensagemDeErroFirebase } from '@/lib/firebase/erros'

export default function Verificar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [prontoAuth, setProntoAuth] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Apos o redirect, o SDK restaura a sessao da senha do IndexedDB.
    return onAuthStateChanged(getAuthClient(), (u) => {
      setUser(u)
      setProntoAuth(true)
    })
  }, [])

  useEffect(() => {
    // Sem sessao de senha nao ha o que verificar — volta pro login.
    if (prontoAuth && !user) router.replace('/login')
  }, [prontoAuth, user, router])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function verificar(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErro(null)
    setVerificando(true)
    try {
      const idToken = await user.getIdToken()
      const r = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, code: codigo }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.erro ?? 'Código inválido.')

      // Cookie de sessao gravado no server. Agora /app libera.
      router.push('/app')
    } catch (e) {
      setErro(mensagemDeErroFirebase(e))
      setVerificando(false)
    }
  }

  async function reenviar() {
    if (!user) return
    setErro(null)
    setAviso(null)
    setReenviando(true)
    try {
      const idToken = await user.getIdToken()
      const r = await fetch('/api/auth/2fa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.erro ?? 'Não foi possível reenviar.')
      setAviso('Enviamos um novo código.')
    } catch (e) {
      setErro(mensagemDeErroFirebase(e))
    } finally {
      setReenviando(false)
    }
  }

  return (
    <CartaoAuth titulo="Verificação">
      <p className="mb-4 text-sm text-text-dim">
        Enviamos um código de 6 dígitos para o seu e-mail. Ele expira em 10 minutos.
      </p>
      <form onSubmit={verificar} className="flex flex-col gap-4">
        <input
          ref={inputRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          aria-label="Código de verificação"
          className="h-14 rounded-md border border-border bg-surface-2 text-center font-mono text-2xl tracking-[0.5em] text-text focus:border-blue"
        />
        {aviso ? <Aviso>{aviso}</Aviso> : null}
        <Erro>{erro}</Erro>
        <Button type="submit" disabled={verificando || codigo.length !== 6}>
          {verificando ? 'Verificando…' : 'Verificar'}
        </Button>
      </form>
      <button
        type="button"
        onClick={reenviar}
        disabled={reenviando}
        className="mt-4 w-full text-center text-sm text-text-dim hover:text-text disabled:opacity-50"
      >
        {reenviando ? 'Reenviando…' : 'Reenviar código'}
      </button>
    </CartaoAuth>
  )
}
