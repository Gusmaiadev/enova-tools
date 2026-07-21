// Valida o envio de e-mail do 2FA via Gmail SMTP.
// Uso:  node scripts/verificar-email.mjs destino@qualquer.com
// Sem argumento, envia para o proprio GMAIL_USER.
import { readFileSync } from 'node:fs'
import nodemailer from 'nodemailer'

const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const l of txt.split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const user = process.env.GMAIL_USER
const pass = process.env.GMAIL_APP_PASSWORD
const to = process.argv[2] || user

if (!user || !pass) {
  console.error('✗ GMAIL_USER ou GMAIL_APP_PASSWORD ausentes no .env.local.')
  process.exit(1)
}

const codigo = String(Math.floor(100000 + Math.random() * 900000))
const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })

try {
  const info = await transporter.sendMail({
    from: `E-nova Tools <${user}>`,
    to,
    subject: `${codigo} é o seu código de acesso (teste)`,
    text: `Código de teste do E-nova Tools: ${codigo}. Se você recebeu isto, o 2FA está funcionando para qualquer e-mail.`,
  })
  console.log('✓ E-mail enviado pelo Gmail.')
  console.log(`  De: ${user}`)
  console.log(`  Para: ${to}`)
  console.log(`  messageId: ${info.messageId}`)
  console.log('  Confira a caixa de entrada (e o spam).')
} catch (e) {
  console.error('✗ Falha ao enviar pelo Gmail:')
  console.error('  ' + (e?.message ?? e))
  if (/Invalid login|Username and Password not accepted|BadCredentials/i.test(e?.message ?? '')) {
    console.error('  → Provável senha de app inválida. Gere em: Conta Google → Segurança')
    console.error('    → Verificação em duas etapas → Senhas de app (16 caracteres, sem espaços).')
  }
  process.exit(1)
}
