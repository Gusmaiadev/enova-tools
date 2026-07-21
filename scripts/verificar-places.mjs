// Validacao da etapa 4: prova que o field mask devolve websiteUri, gastando o
// minimo de cota (1 pagina = 1 chamada Enterprise). Rode com:  node scripts/verificar-places.mjs
//
// Le GOOGLE_MAPS_API_KEY do .env.local sem depender de nenhuma lib.
import { readFileSync } from 'node:fs'

function carregarEnv() {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const linha of txt.split('\n')) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}
carregarEnv()

const KEY = process.env.GOOGLE_MAPS_API_KEY
if (!KEY) {
  console.error('✗ GOOGLE_MAPS_API_KEY vazio no .env.local. Preencha e rode de novo.')
  process.exit(1)
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.primaryTypeDisplayName',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'nextPageToken',
].join(',')

// bbox fixo: uma fatia central de Santo André / SP (low=SW, high=NE).
const body = {
  textQuery: 'restaurante',
  includedType: 'restaurant',
  strictTypeFiltering: true,
  pageSize: 20,
  languageCode: 'pt-BR',
  regionCode: 'BR',
  locationRestriction: {
    rectangle: {
      low: { latitude: -23.678, longitude: -46.545 },
      high: { latitude: -23.655, longitude: -46.52 },
    },
  },
}

const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': KEY,
    'X-Goog-FieldMask': FIELD_MASK,
  },
  body: JSON.stringify(body),
})

if (!resp.ok) {
  console.error(`✗ HTTP ${resp.status}:`, (await resp.text()).slice(0, 400))
  process.exit(1)
}

const data = await resp.json()
const places = data.places ?? []
const comSite = places.filter((p) => p.websiteUri)
const social = places.filter((p) =>
  /instagram\.com|facebook\.com|linktr\.ee|wa\.me/i.test(p.websiteUri ?? ''),
)

console.log(`✓ ${places.length} negócios (1 chamada Enterprise gasta)`)
console.log(`  ${comSite.length} com algum website; ${social.length} apontam para rede social (lead_quente)`)
console.log(`  nextPageToken presente: ${data.nextPageToken ? 'sim' : 'não'}`)
console.log('\n  Amostra:')
for (const p of places.slice(0, 5)) {
  console.log(`   • ${p.displayName?.text ?? '(sem nome)'} — ${p.websiteUri ?? 'SEM SITE'}`)
}

if (places.length > 0 && 'websiteUri' in (places[0] ?? {})) {
  console.log('\n✓ O campo websiteUri está no retorno. Etapa 4 validada.')
} else if (places.length > 0) {
  console.log('\n⚠ Nenhum place da amostra tem websiteUri (pode ser real: muitos não têm).')
  console.log('  O importante é não ter dado erro de field mask/SKU — e não deu.')
}
