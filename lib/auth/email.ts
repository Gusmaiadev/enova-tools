import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Envio do código 2FA via Gmail (SMTP).
 *
 * Escolha do usuário: sem domínio próprio, o Resend só entregaria para o dono da
 * conta. O Gmail (com senha de app) envia de tools.enova@gmail.com para qualquer
 * destinatário, grátis, dentro do limite de ~500/dia — de sobra para ~5 usuários.
 *
 * Init preguicoso para nao quebrar `next build` quando as credenciais faltam.
 */
let transporter: Transporter | null = null
function getTransporter(): Transporter {
  if (!transporter) {
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    if (!user || !pass) {
      throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD não configurados no .env.local.')
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
  }
  return transporter
}

/**
 * O e-mail diz APENAS o codigo e o prazo (secao 5.4). Nunca o nome do usuario
 * nem dados da conta — se a caixa vazar, o codigo sozinho nao identifica ninguem.
 */
export async function enviarCodigo(para: string, codigo: string, minutos: number) {
  const user = process.env.GMAIL_USER
  if (!user) throw new Error('GMAIL_USER não configurado.')

  await getTransporter().sendMail({
    from: `E-nova Tools <${user}>`,
    to: para,
    subject: `${codigo} é o seu código de acesso`,
    text: `Seu código de acesso é ${codigo}. Ele expira em ${minutos} minutos.\n\nSe você não tentou entrar, ignore este e-mail.`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <p style="color:#333; font-size:15px;">Seu código de acesso é:</p>
        <p style="font-size:34px; font-weight:700; letter-spacing:6px; margin:12px 0; font-family: 'Courier New', monospace;">${codigo}</p>
        <p style="color:#666; font-size:13px;">Ele expira em ${minutos} minutos.</p>
        <p style="color:#999; font-size:12px; margin-top:20px;">Se você não tentou entrar, ignore este e-mail.</p>
      </div>
    `,
  })
}
