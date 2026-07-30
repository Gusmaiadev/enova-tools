import 'server-only'

/**
 * Traduz o termo de busca para ingles antes de consultar os bancos de midia.
 *
 * Motivo: Pexels e Pixabay indexam muito mais conteudo em ingles do que em
 * qualquer outro idioma. "reuniao de equipe" traz um punhado de resultados;
 * "team meeting" traz milhares. Como o briefing e a IA escrevem em portugues,
 * traduzir aqui e o que faz a busca funcionar de verdade.
 *
 * Duas camadas: um dicionario local (instantaneo, cobre o vocabulario comum de
 * landing page) e a IA como reforco para frases que o dicionario nao cobre. Sem
 * chave de IA o dicionario basta — nunca falha, no pior caso devolve o termo
 * original.
 */

/** Palavra a palavra. Chaves SEM acento e em minusculas (ver `normalizar`). */
const DICIONARIO: Record<string, string> = {
  // Pessoas e trabalho
  equipe: 'team',
  time: 'team',
  funcionario: 'employee',
  funcionarios: 'employees',
  colaborador: 'coworker',
  colaboradores: 'coworkers',
  cliente: 'client',
  clientes: 'clients',
  pessoa: 'person',
  pessoas: 'people',
  homem: 'man',
  mulher: 'woman',
  crianca: 'child',
  criancas: 'children',
  familia: 'family',
  casal: 'couple',
  jovem: 'young',
  idoso: 'elderly',
  reuniao: 'meeting',
  reunioes: 'meetings',
  trabalho: 'work',
  trabalhando: 'working',
  escritorio: 'office',
  empresa: 'company',
  empresarial: 'corporate',
  negocio: 'business',
  negocios: 'business',
  atendimento: 'customer service',
  vendedor: 'salesperson',
  vendas: 'sales',
  apresentacao: 'presentation',
  entrevista: 'interview',
  treinamento: 'training',
  palestra: 'lecture',
  gerente: 'manager',
  chefe: 'boss',
  socio: 'partner',
  recepcao: 'reception',
  aperto: 'handshake',
  maos: 'hands',
  sorrindo: 'smiling',
  sorriso: 'smile',
  retrato: 'portrait',
  // Profissoes e servicos
  advogado: 'lawyer',
  advogada: 'lawyer',
  advocacia: 'law firm',
  medico: 'doctor',
  medica: 'doctor',
  enfermeira: 'nurse',
  enfermeiro: 'nurse',
  dentista: 'dentist',
  odontologia: 'dentistry',
  psicologo: 'psychologist',
  psicologia: 'therapy',
  nutricionista: 'nutritionist',
  fisioterapia: 'physiotherapy',
  veterinario: 'veterinarian',
  arquiteto: 'architect',
  arquitetura: 'architecture',
  engenheiro: 'engineer',
  engenharia: 'engineering',
  contador: 'accountant',
  contabilidade: 'accounting',
  corretor: 'real estate agent',
  imobiliaria: 'real estate',
  imovel: 'property',
  imoveis: 'real estate',
  eletricista: 'electrician',
  encanador: 'plumber',
  pedreiro: 'bricklayer',
  marceneiro: 'carpenter',
  mecanico: 'mechanic',
  cabeleireiro: 'hairdresser',
  barbeiro: 'barber',
  barbearia: 'barbershop',
  manicure: 'manicure',
  esteticista: 'esthetician',
  fotografo: 'photographer',
  designer: 'designer',
  programador: 'programmer',
  professor: 'teacher',
  personal: 'personal trainer',
  consultor: 'consultant',
  consultoria: 'consulting',
  seguranca: 'security',
  limpeza: 'cleaning',
  motorista: 'driver',
  garcom: 'waiter',
  chef: 'chef',
  cozinheiro: 'cook',
  // Lugares e ambientes
  clinica: 'clinic',
  consultorio: 'medical office',
  hospital: 'hospital',
  farmacia: 'pharmacy',
  loja: 'store',
  mercado: 'market',
  supermercado: 'supermarket',
  restaurante: 'restaurant',
  cafeteria: 'coffee shop',
  padaria: 'bakery',
  hotel: 'hotel',
  pousada: 'inn',
  academia: 'gym',
  escola: 'school',
  faculdade: 'college',
  igreja: 'church',
  salao: 'salon',
  estudio: 'studio',
  oficina: 'workshop',
  fabrica: 'factory',
  industria: 'industry',
  galpao: 'warehouse',
  fazenda: 'farm',
  campo: 'countryside',
  cidade: 'city',
  praia: 'beach',
  piscina: 'pool',
  jardim: 'garden',
  quintal: 'backyard',
  casa: 'house',
  apartamento: 'apartment',
  predio: 'building',
  cozinha: 'kitchen',
  sala: 'living room',
  quarto: 'bedroom',
  banheiro: 'bathroom',
  fachada: 'facade',
  obra: 'construction site',
  construcao: 'construction',
  reforma: 'renovation',
  // Objetos e tecnologia
  computador: 'computer',
  notebook: 'laptop',
  celular: 'smartphone',
  tela: 'screen',
  teclado: 'keyboard',
  mesa: 'desk',
  cadeira: 'chair',
  movel: 'furniture',
  moveis: 'furniture',
  carro: 'car',
  caminhao: 'truck',
  moto: 'motorcycle',
  bicicleta: 'bicycle',
  onibus: 'bus',
  aviao: 'airplane',
  ferramenta: 'tool',
  ferramentas: 'tools',
  maquina: 'machine',
  equipamento: 'equipment',
  documento: 'document',
  documentos: 'documents',
  contrato: 'contract',
  grafico: 'chart',
  graficos: 'charts',
  dinheiro: 'money',
  cartao: 'credit card',
  presente: 'gift',
  caixa: 'box',
  entrega: 'delivery',
  pacote: 'package',
  // Comida
  comida: 'food',
  prato: 'dish',
  pizza: 'pizza',
  hamburguer: 'burger',
  churrasco: 'barbecue',
  carne: 'meat',
  peixe: 'fish',
  massa: 'pasta',
  salada: 'salad',
  sobremesa: 'dessert',
  bolo: 'cake',
  doce: 'sweets',
  pao: 'bread',
  cafe: 'coffee',
  suco: 'juice',
  bebida: 'drink',
  vinho: 'wine',
  cerveja: 'beer',
  fruta: 'fruit',
  frutas: 'fruits',
  legumes: 'vegetables',
  // Saude, beleza, bem-estar
  saude: 'health',
  beleza: 'beauty',
  bemestar: 'wellness',
  pele: 'skin',
  cabelo: 'hair',
  unhas: 'nails',
  dente: 'tooth',
  dentes: 'teeth',
  sorridente: 'smiling',
  massagem: 'massage',
  yoga: 'yoga',
  meditacao: 'meditation',
  exercicio: 'exercise',
  treino: 'workout',
  corrida: 'running',
  esporte: 'sport',
  futebol: 'soccer',
  natacao: 'swimming',
  // Abstratos de marketing
  sucesso: 'success',
  crescimento: 'growth',
  resultado: 'results',
  resultados: 'results',
  qualidade: 'quality',
  confianca: 'trust',
  cuidado: 'care',
  inovacao: 'innovation',
  tecnologia: 'technology',
  digital: 'digital',
  marketing: 'marketing',
  publicidade: 'advertising',
  parceria: 'partnership',
  celebracao: 'celebration',
  festa: 'party',
  casamento: 'wedding',
  aniversario: 'birthday',
  evento: 'event',
  viagem: 'travel',
  turismo: 'tourism',
  natureza: 'nature',
  sustentabilidade: 'sustainability',
  energia: 'energy',
  solar: 'solar',
  agua: 'water',
  planta: 'plant',
  plantas: 'plants',
  animal: 'animal',
  cachorro: 'dog',
  gato: 'cat',
  pet: 'pet',
  // Qualificadores
  moderno: 'modern',
  moderna: 'modern',
  minimalista: 'minimalist',
  elegante: 'elegant',
  luxuoso: 'luxury',
  luxo: 'luxury',
  simples: 'simple',
  limpo: 'clean',
  novo: 'new',
  antigo: 'vintage',
  rustico: 'rustic',
  colorido: 'colorful',
  claro: 'bright',
  escuro: 'dark',
  grande: 'large',
  pequeno: 'small',
  feliz: 'happy',
  profissional: 'professional',
  criativo: 'creative',
  abstrato: 'abstract',
  fundo: 'background',
  textura: 'texture',
  gradiente: 'gradient',
  aereo: 'aerial',
  panoramica: 'panoramic',
  detalhe: 'close up',
}

/** Palavras estruturais do portugues: sao descartadas, nao traduzidas. */
const VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'e', 'ou', 'com', 'sem', 'para',
  'por', 'pelo', 'pela', 'que', 'seu', 'sua', 'meu', 'minha', 'este', 'esta',
  'esse', 'essa', 'muito', 'mais', 'bem', 'sobre', 'entre', 'foto', 'imagem',
  'video', 'fotos', 'imagens', 'videos',
])

/** Marcadores de que o texto e portugues (nao vale a pena chamar a IA sem isto). */
const MARCADORES_PT = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]|\b(de|da|do|das|dos|com|para|em|no|na|uma|um|que|e)\b/i

const normalizar = (p: string) =>
  p
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** Traducao so pelo dicionario. Pura e sincrona — usada como base e fallback. */
export function traduzirPeloDicionario(termo: string): { termo: string; cobertas: number; palavras: number } {
  const palavras = termo.split(/[\s,;/]+/).filter((p) => p !== '')
  const saida: string[] = []
  let cobertas = 0
  let relevantes = 0
  for (const bruta of palavras) {
    const p = normalizar(bruta)
    if (p === '') continue
    if (VAZIAS.has(p)) continue
    relevantes++
    const traduzida = DICIONARIO[p]
    if (traduzida) {
      cobertas++
      saida.push(traduzida)
    } else {
      // Sem entrada no dicionario: mantem a palavra sem acento (nomes proprios,
      // termos ja em ingles e estrangeirismos passam intactos).
      saida.push(p)
    }
  }
  const juntas = [...new Set(saida.join(' ').split(' '))].join(' ').trim()
  return { termo: juntas === '' ? termo.trim() : juntas, cobertas, palavras: relevantes }
}

/* ------------------------------ IA de reforco ----------------------------- */

/**
 * Chamada curta e barata ao provedor de IA que o projeto ja usa (Groq ou
 * Gemini). Timeout apertado: se a IA demorar, a busca segue com o dicionario.
 */
async function traduzirComIA(termo: string): Promise<string | null> {
  const prompt =
    'Translate this Portuguese stock-photo search query into English keywords. ' +
    'Reply with ONLY the English keywords, 2 to 6 words, no punctuation, no quotes, no explanation.\n\n' +
    termo

  const groq = process.env.GROQ_API_KEY
  const gemini = process.env.GEMINI_API_KEY
  const forcado = process.env.IA_PROVIDER?.trim().toLowerCase()
  const usarGemini = forcado === 'gemini' ? Boolean(gemini) : !groq && Boolean(gemini)

  try {
    if (usarGemini) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gemini}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 64,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!resp.ok) return null
      const dados = await resp.json()
      return dados?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    }
    if (!groq) return null
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groq}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 32,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return null
    const dados = await resp.json()
    return dados?.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

/** Aceita so o que parece palavra-chave em ingles (a IA as vezes tagarela). */
function limparRespostaIA(bruta: string): string | null {
  const limpa = bruta
    .split('\n')[0]
    .replace(/["'`.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  if (limpa === '' || limpa.length > 80) return null
  if (!/^[a-z0-9 -]+$/.test(limpa)) return null
  if (limpa.split(' ').length > 8) return null
  return limpa
}

/* -------------------------------- Fachada -------------------------------- */

const CACHE = new Map<string, string>()
const LIMITE_CACHE = 500

export type Traducao = { termo: string; original: string; traduzido: boolean }

/**
 * Termo pronto para o banco de midia. Nunca lanca: no pior caso devolve o
 * original. `traduzido` diz se o texto mudou (a UI mostra isso ao usuario).
 */
export async function paraIngles(busca: string): Promise<Traducao> {
  const original = busca.trim().replace(/\s+/g, ' ')
  if (original === '') return { termo: '', original, traduzido: false }

  const chave = original.toLowerCase()
  const emCache = CACHE.get(chave)
  if (emCache !== undefined) {
    return { termo: emCache, original, traduzido: emCache !== chave }
  }

  const dicionario = traduzirPeloDicionario(original)
  const pareceIngles = !MARCADORES_PT.test(original) && dicionario.cobertas === 0

  let termo = dicionario.termo
  // Chama a IA so quando o dicionario deixou palavras de fora E o texto tem
  // cara de portugues — evita gastar chamada com termo que ja veio em ingles.
  if (!pareceIngles && dicionario.cobertas < dicionario.palavras) {
    const bruta = await traduzirComIA(original)
    const limpa = bruta ? limparRespostaIA(bruta) : null
    if (limpa) termo = limpa
  }

  if (CACHE.size >= LIMITE_CACHE) CACHE.clear()
  CACHE.set(chave, termo)
  return { termo, original, traduzido: termo.toLowerCase() !== chave }
}
