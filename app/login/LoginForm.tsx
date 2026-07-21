'use client'

import { signInWithEmailAndPassword } from 'firebase/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { BotaoGoogle, DivisorOu } from '@/components/BotaoGoogle'
import { Button } from '@/components/Button'
import { Aviso, Campo, Erro } from '@/components/Campo'
import { CartaoAuth } from '@/components/CartaoAuth'
import { getAuthClient } from '@/lib/firebase/client'
import { mensagemDeErroFirebase } from '@/lib/firebase/erros'

function Form() {
  const router = useRouter()
  const params = useSearchParams()
  const cadastrado = params.get('cadastrado') === '1'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      // O SDK ja considera o usuario autenticado aqui — mas as rules negam tudo,
      // entao o idToken so serve para o 2FA. Sem o cookie de sessao, /app barra.
      const auth = getAuthClient()
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha)
      const idToken = await cred.user.getIdToken()

      const r = await fetch('/api/auth/2fa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(data.erro ?? 'Não foi possível enviar o código.')
      }

      // Dispositivo confiavel: a sessao ja foi criada no server, sem 2FA.
      router.push(data.trusted ? '/app' : '/verificar')
    } catch (e) {
      setErro(mensagemDeErroFirebase(e))
      setEnviando(false)
    }
  }

  return (
    <CartaoAuth
      titulo="Entrar"
      rodape={
        <>
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-blue hover:underline">
            Cadastrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4">
        {cadastrado ? <Aviso>Conta criada. Entre para continuar.</Aviso> : null}
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Erro>{erro}</Erro>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <DivisorOu />
      <BotaoGoogle />
    </CartaoAuth>
  )
}

export function LoginForm() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  )
}
