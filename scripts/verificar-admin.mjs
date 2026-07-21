// Valida as credenciais do Firebase Admin: inicializa o SDK e faz um ping no
// Firestore (o Admin SDK ignora as rules por design). Rode: node scripts/verificar-admin.mjs
import { readFileSync } from 'node:fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function carregarEnv() {
  const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const linha of txt.split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}
carregarEnv()

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  console.error('✗ Faltam variáveis FIREBASE_ADMIN_* no .env.local.')
  process.exit(1)
}

try {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  const db = getFirestore()
  // Leitura barata: o Admin SDK autentica contra o Google e ignora as rules.
  const snap = await db.collection('_healthcheck').limit(1).get()
  console.log('✓ Credenciais do Firebase Admin válidas.')
  console.log(`  Projeto: ${projectId}`)
  console.log(`  Conta de serviço: ${clientEmail}`)
  console.log(`  Firestore respondeu (docs na coleção de teste: ${snap.size}).`)
  process.exit(0)
} catch (e) {
  const code = e?.code
  const msg = e?.message ?? String(e)
  if (code === 5 || /NOT_FOUND/.test(msg)) {
    // Autenticou, mas o banco nao existe: credenciais OK, falta provisionar.
    console.log('✓ Credenciais do Firebase Admin VÁLIDAS (autenticação passou).')
    console.log('✗ Mas o banco Firestore ainda NÃO foi criado neste projeto.')
    console.log('  → Firebase Console → Build → Firestore Database → Criar banco de dados')
    console.log('    (modo produção; localização southamerica-east1 / São Paulo).')
    console.log('  Depois rode este script de novo.')
    process.exit(2)
  }
  if (code === 7 || code === 16 || /PERMISSION_DENIED|UNAUTHENTICATED/.test(msg)) {
    console.error('✗ Credenciais REJEITADAS (auth falhou):')
    console.error('  ' + msg)
    process.exit(1)
  }
  console.error('✗ Falha inesperada no Admin SDK:')
  console.error('  ' + msg)
  process.exit(1)
}
