/** Traduz os codigos do Firebase Auth para mensagens em PT-BR seguras de exibir. */
const MENSAGENS: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha é muito fraca.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Tente de novo em alguns minutos.',
  'auth/requires-recent-login': 'Por segurança, entre de novo antes de repetir esta ação.',
  'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.',
}

function temCodigo(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string'
}

export function mensagemDeErroFirebase(e: unknown): string {
  if (temCodigo(e) && MENSAGENS[e.code]) return MENSAGENS[e.code]
  if (e instanceof Error && e.message) return e.message
  return 'Algo deu errado. Tente novamente.'
}
