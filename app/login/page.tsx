import { redirecionarSeAutenticado } from '@/lib/auth/usuarioAtual'
import { LoginForm } from './LoginForm'

export default async function Login() {
  // Quem ja tem sessao valida vai direto para /app — nao ve o login de novo.
  await redirecionarSeAutenticado()
  return <LoginForm />
}
