import Link from 'next/link'
import { CartaoAuth } from '@/components/CartaoAuth'
import { lerConfig } from '@/lib/admin/config'
import { redirecionarSeAutenticado } from '@/lib/auth/usuarioAtual'
import { CadastroForm } from './CadastroForm'

export const dynamic = 'force-dynamic'

export default async function Cadastro() {
  // Quem ja tem sessao valida vai direto para /app.
  await redirecionarSeAutenticado()

  // Cadastro pode estar desabilitado no Painel.
  const { cadastroAberto } = await lerConfig()
  if (!cadastroAberto) {
    return (
      <CartaoAuth
        titulo="Cadastro indisponível"
        rodape={
          <>
            Já tem conta?{' '}
            <Link href="/login" className="text-blue hover:underline">
              Entrar
            </Link>
          </>
        }
      >
        <p className="text-sm text-text-dim">
          A criação de novas contas está desativada no momento. Fale com um
          administrador da equipe.
        </p>
      </CartaoAuth>
    )
  }

  return <CadastroForm />
}
