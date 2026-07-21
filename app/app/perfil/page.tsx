'use client'

import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  type User,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/Button'
import { Aviso, Campo, Erro } from '@/components/Campo'
import { getAuthClient } from '@/lib/firebase/client'
import { mensagemDeErroFirebase } from '@/lib/firebase/erros'
import { SENHA_MIN, validarNome } from '@/lib/validacao'

export default function Perfil() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    return onAuthStateChanged(getAuthClient(), setUser)
  }, [])

  async function sair() {
    await getAuthClient().signOut()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-4">
        {user ? (
          <Avatar uid={user.uid} nome={user.displayName} email={user.email} size={56} />
        ) : (
          <div className="h-14 w-14 rounded-full bg-surface-2" />
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {user?.displayName ?? '—'}
          </h1>
          <p className="font-mono text-sm text-text-dim">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <SecaoNome user={user} />
        <SecaoEmail user={user} />
        <SecaoSenha user={user} />

        <div className="border-t border-border pt-6">
          <Button variante="ghost" onClick={sair}>
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  )
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}

function SecaoNome({ user }: { user: User | null }) {
  // Override local: null = "ainda mostrando o nome do usuario". Assim o campo
  // acompanha o carregamento do user sem setState num efeito.
  const [editado, setEditado] = useState<string | null>(null)
  const nome = editado ?? user?.displayName ?? ''
  const setNome = setEditado
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    const invalido = validarNome(nome)
    if (invalido) return setErro(invalido)
    if (!user) return

    setSalvando(true)
    try {
      await updateProfile(user, { displayName: nome.trim() })
      const r = await fetch('/api/users/nome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.erro ?? 'Falha ao salvar o nome.')
      }
      setAviso('Nome atualizado.')
    } catch (e) {
      setErro(mensagemDeErroFirebase(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao titulo="Nome">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <Campo rotulo="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        {aviso ? <Aviso>{aviso}</Aviso> : null}
        <Erro>{erro}</Erro>
        <Button type="submit" disabled={salvando} className="self-start">
          {salvando ? 'Salvando…' : 'Salvar nome'}
        </Button>
      </form>
    </Cartao>
  )
}

function SecaoEmail({ user }: { user: User | null }) {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function trocar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    if (!user) return
    const novo = email.trim()
    if (!novo || novo === user.email) return setErro('Informe um e-mail diferente do atual.')

    setEnviando(true)
    try {
      // verifyBeforeUpdateEmail, NAO updateEmail: o Firebase exige verificacao do
      // novo endereco antes da troca (secao 5.5).
      await verifyBeforeUpdateEmail(user, novo)
      setAviso(
        'Enviamos um link de confirmação para o e-mail NOVO. A troca só acontece depois que você clicar nele.',
      )
      setEmail('')
    } catch (e) {
      setErro(mensagemDeErroFirebase(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Cartao titulo="E-mail">
      <p className="mb-3 font-mono text-sm text-text-dim">Atual: {user?.email}</p>
      <form onSubmit={trocar} className="flex flex-col gap-3">
        <Campo
          rotulo="Novo e-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {aviso ? <Aviso>{aviso}</Aviso> : null}
        <Erro>{erro}</Erro>
        <Button type="submit" disabled={enviando} className="self-start">
          {enviando ? 'Enviando…' : 'Enviar confirmação'}
        </Button>
      </form>
    </Cartao>
  )
}

function SecaoSenha({ user }: { user: User | null }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function trocar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    if (!user?.email) return
    if (nova.length < SENHA_MIN) return setErro(`A nova senha precisa de ${SENHA_MIN}+ caracteres.`)

    setSalvando(true)
    try {
      // Trocar senha exige reautenticacao recente (secao 5.5).
      const cred = EmailAuthProvider.credential(user.email, atual)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, nova)
      setAviso('Senha atualizada.')
      setAtual('')
      setNova('')
    } catch (e) {
      setErro(mensagemDeErroFirebase(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao titulo="Senha">
      <form onSubmit={trocar} className="flex flex-col gap-3">
        <Campo
          rotulo="Senha atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
        />
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
        {aviso ? <Aviso>{aviso}</Aviso> : null}
        <Erro>{erro}</Erro>
        <Button type="submit" disabled={salvando} className="self-start">
          {salvando ? 'Salvando…' : 'Trocar senha'}
        </Button>
      </form>
    </Cartao>
  )
}
