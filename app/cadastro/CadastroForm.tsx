'use client'

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BotaoGoogle, DivisorOu } from '@/components/BotaoGoogle'
import { Button } from '@/components/Button'
import { Campo, Erro } from '@/components/Campo'
import { CartaoAuth } from '@/components/CartaoAuth'
import { getAuthClient } from '@/lib/firebase/client'
import { mensagemDeErroFirebase } from '@/lib/firebase/erros'
import { validarCadastro } from '@/lib/validacao'

export function CadastroForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const invalido = validarCadastro({ nome, email, senha, confirmacao })
    if (invalido) return setErro(invalido)

    setEnviando(true)
    try {
      const auth = getAuthClient()
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha)
      await updateProfile(cred.user, { displayName: nome.trim() })
      await sendEmailVerification(cred.user)

      const idToken = await cred.user.getIdToken()
      const r = await fetch('/api/users/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, nome: nome.trim() }),
      })
      if (!r.ok) {
        const { erro } = await r.json().catch(() => ({ erro: null }))
        throw new Error(erro ?? 'Não foi possível concluir o cadastro.')
      }

      // O cadastro nao autentica: a conta entra pelo fluxo de login normal,
      // que exige o 2FA. Derruba a sessao do SDK para nao deixar meio-caminho.
      await signOut(auth)
      router.push('/login?cadastrado=1')
    } catch (e) {
      setErro(mensagemDeErroFirebase(e))
      setEnviando(false)
    }
  }

  return (
    <CartaoAuth
      titulo="Criar conta"
      rodape={
        <>
          Já tem conta?{' '}
          <Link href="/login" className="text-blue hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          rotulo="Nome"
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
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
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Campo
          rotulo="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        <Erro>{erro}</Erro>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>
      <DivisorOu />
      <BotaoGoogle />
    </CartaoAuth>
  )
}
