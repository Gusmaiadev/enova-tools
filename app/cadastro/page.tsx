import { redirecionarSeAutenticado } from '@/lib/auth/usuarioAtual'
import { CadastroForm } from './CadastroForm'

export default async function Cadastro() {
  // Quem ja tem sessao valida vai direto para /app.
  await redirecionarSeAutenticado()
  return <CadastroForm />
}
