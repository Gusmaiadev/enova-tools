/** Compartilhado entre client e server — a validacao roda nos dois (secao 5.3). */

export const SENHA_MIN = 8

export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN) return `A senha precisa de pelo menos ${SENHA_MIN} caracteres.`
  return null
}

export function validarConfirmacao(senha: string, confirmacao: string): string | null {
  if (senha !== confirmacao) return 'As senhas não conferem.'
  return null
}

export function validarNome(nome: string): string | null {
  if (nome.trim().length < 2) return 'Informe seu nome.'
  return null
}

export function validarEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'E-mail inválido.'
  return null
}

export function validarCadastro(input: {
  nome: string
  email: string
  senha: string
  confirmacao: string
}): string | null {
  return (
    validarNome(input.nome) ??
    validarEmail(input.email) ??
    validarSenha(input.senha) ??
    validarConfirmacao(input.senha, input.confirmacao)
  )
}
