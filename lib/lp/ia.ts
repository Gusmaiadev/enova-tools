import 'server-only'

/**
 * Geração da landing page com IA. Suporta dois provedores intercambiáveis:
 * Llama 3.3 70B via Groq (padrão, gratuito) e Gemini 2.5 Flash. A escolha é por
 * `IA_PROVIDER` no .env.local ('groq' | 'gemini'); sem isso, usa o que tiver
 * chave, preferindo o Groq. Trocar de provedor = trocar essa variável.
 *
 * A IA não inventa a estrutura: o briefing já define quais seções existem, em
 * que ordem e com que layout. O trabalho dela é escrever o conteúdo (títulos,
 * textos, itens), escolher ícones, fechar a identidade visual quando o usuário
 * não definiu e descrever as mídias a buscar no banco de imagens.
 *
 * Privacidade: enviamos apenas o briefing que o próprio usuário digitou. Sem
 * nenhuma chave a ferramenta continua funcionando — cai no documento base
 * determinístico (documentoBase) e avisa na tela.
 */

import { NOMES_ICONES } from './icones'
import { FONTES_GOOGLE } from './fontes'
import { PERIODOS_PRECO, infoLayout } from './layouts'
import type { LpBriefing, LpDocumento, TipoLayout } from './tipos'
import { ROTULO_REDE } from './tipos'
import type { ResumoReferencia } from './referencias'
import { coergirDocumentoIA } from './validar'

export type ResultadoIA =
  | { ok: true; documento: LpDocumento }
  | { ok: false; erro: string; semChave?: boolean; chaveInvalida?: boolean }

/* -------------------------- Provedores de IA ---------------------------- */

/** Resultado de UMA chamada ao modelo (a repetição fica na camada acima). */
type Tentativa =
  | { tipo: 'ok'; texto: string; truncado: boolean }
  | { tipo: 'erro'; status: number; detalhe: string }
  | { tipo: 'chaveInvalida'; erro: string }
  | { tipo: 'rede' }

type Provedor = {
  nome: string
  envKey: string
  temChave: () => boolean
  chamar: (prompt: string) => Promise<Tentativa>
}

const GEMINI: Provedor = {
  nome: 'Gemini 2.5 Flash',
  envKey: 'GEMINI_API_KEY',
  temChave: () => Boolean(process.env.GEMINI_API_KEY),
  async chamar(prompt) {
    const chave = process.env.GEMINI_API_KEY as string
    const endpoint =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    try {
      const resp = await fetch(`${endpoint}?key=${chave}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.85,
            maxOutputTokens: 24576,
            thinkingConfig: { thinkingBudget: 2048 },
          },
        }),
        signal: AbortSignal.timeout(120000),
      })
      if (!resp.ok) {
        const detalhe = await resp.text().catch(() => '')
        if (resp.status === 400 && /API key/i.test(detalhe)) {
          return { tipo: 'chaveInvalida', erro: 'Chave do Gemini inválida. Verifique GEMINI_API_KEY.' }
        }
        return { tipo: 'erro', status: resp.status, detalhe }
      }
      const dados = await resp.json()
      const candidato = dados?.candidates?.[0]
      const texto: string = candidato?.content?.parts?.[0]?.text ?? ''
      return { tipo: 'ok', texto, truncado: candidato?.finishReason === 'MAX_TOKENS' }
    } catch {
      return { tipo: 'rede' }
    }
  },
}

const GROQ: Provedor = {
  nome: 'Llama 3.3 70B (Groq)',
  envKey: 'GROQ_API_KEY',
  temChave: () => Boolean(process.env.GROQ_API_KEY),
  async chamar(prompt) {
    const chave = process.env.GROQ_API_KEY as string
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          // O prompt exige JSON e contém a palavra "JSON" (requisito do json_object).
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.85,
          // O Groq cobra do limite por minuto o prompt MAIS este teto de saída,
          // reservado antes de gerar. No plano gratuito são 12.000 TPM: com
          // 8192 aqui, qualquer briefing acima de ~3.800 tokens levava 413.
          // 6000 cabe uma página de 6 seções com folga e deixa ~6.000 de prompt.
          max_tokens: 6000,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(120000),
      })
      if (!resp.ok) {
        const detalhe = await resp.text().catch(() => '')
        if (resp.status === 401) {
          return { tipo: 'chaveInvalida', erro: 'Chave do Groq inválida. Verifique GROQ_API_KEY.' }
        }
        return { tipo: 'erro', status: resp.status, detalhe }
      }
      const dados = await resp.json()
      const escolha = dados?.choices?.[0]
      const texto: string = escolha?.message?.content ?? ''
      return { tipo: 'ok', texto, truncado: escolha?.finish_reason === 'length' }
    } catch {
      return { tipo: 'rede' }
    }
  },
}

/** Provedor ativo: `IA_PROVIDER` manda; senão o que tiver chave, Groq primeiro. */
function escolherProvedor(): Provedor {
  const forcado = process.env.IA_PROVIDER?.trim().toLowerCase()
  if (forcado === 'gemini') return GEMINI
  if (forcado === 'groq' || forcado === 'llama') return GROQ
  if (GROQ.temChave()) return GROQ
  if (GEMINI.temChave()) return GEMINI
  return GROQ
}

export function temGemini(): boolean {
  return GEMINI.temChave()
}

export function temIA(): boolean {
  return GROQ.temChave() || GEMINI.temChave()
}

/**
 * O que os campos genéricos do item significam em cada layout — sem isto a IA
 * tem de adivinhar o que é "extra" num card e escreve qualquer coisa ali.
 */
const SENTIDO_ITEM: Partial<
  Record<TipoLayout, Partial<Record<'titulo' | 'extra' | 'detalhe', string>>>
> = {
  cards: { extra: 'subtítulo curto do card' },
  estatisticas: { extra: 'o número, ex.: "+500"', titulo: 'o que o número significa' },
  precos: {
    extra: 'preço',
    // O campo virou select no assistente e no editor: fora dessa lista, o valor
    // aparece como "personalizado" e o usuário tem de arrumar na mão.
    detalhe: `período — use exatamente um destes: ${PERIODOS_PRECO.filter((p) => p.valor !== '')
      .map((p) => `"${p.valor}"`)
      .join(', ')}`,
  },
  'grid-produtos': { extra: 'preço' },
  timeline: { extra: 'data' },
  depoimentos: { extra: 'nome do cliente', detalhe: 'cargo ou empresa' },
}

/** Guia de campos por layout, derivado do catálogo (nunca sai de sincronia). */
function guiaLayouts(tipos: TipoLayout[]): string {
  return [...new Set(tipos)]
    .map((tipo) => {
      const info = infoLayout(tipo)
      const campos = ['titulo']
      if (info.campos.subtitulo) campos.push('subtitulo?')
      if (info.campos.texto) campos.push('texto?')
      if (info.campos.botao) campos.push('botao?{texto,url}')
      if (info.campos.midia) campos.push('midia?{busca,tipo,orientacao}')
      if (info.temColunas) campos.push('colunas(2|3|4)')
      const sentido = SENTIDO_ITEM[tipo] ?? {}
      const itens = info.itens
        ? ` | itens[]: { ${info.itens.campos
            .map((c) => {
              if (c === 'imagem') return 'imagem{busca,tipo,orientacao}'
              if (c === 'botao') return 'botao{texto,url}'
              const explica =
                c === 'titulo' || c === 'extra' || c === 'detalhe' ? sentido[c] : undefined
              return explica ? `${c} (${explica})` : c
            })
            .join(', ')} }`
        : ' | sem itens'
      return `- ${tipo} (${info.rotulo}): ${campos.join(', ')}${itens}\n  ${info.descricao}`
    })
    .join('\n')
}

function blocoBriefing(briefing: LpBriefing): string {
  const linhas: string[] = [`Projeto: ${briefing.nome}`]

  const cores = Object.entries(briefing.cores).filter(([, v]) => v)
  linhas.push(
    cores.length > 0
      ? `Cores definidas pelo usuário (OBRIGATÓRIO respeitar): ${cores.map(([k, v]) => `${k}=${v}`).join(', ')}`
      : 'Cores: o usuário não definiu — escolha uma paleta coerente com o segmento e as referências.',
  )

  const fontes = Object.entries(briefing.tipografia)
    .filter(([, v]) => v && Object.keys(v).length > 0)
    .map(([cat, v]) => `${cat}=${JSON.stringify(v)}`)
  linhas.push(
    fontes.length > 0
      ? `Tipografia definida pelo usuário (OBRIGATÓRIO respeitar): ${fontes.join(', ')}`
      : 'Tipografia: o usuário não definiu — escolha do catálogo de fontes.',
  )

  if (briefing.menu.length > 0) {
    linhas.push(
      `Menu do header: ${briefing.menu.map((m) => (m.url ? `${m.rotulo} -> ${m.url}` : m.rotulo)).join(', ')}`,
    )
  }
  if (briefing.redes.length > 0) {
    linhas.push(
      `Redes sociais: ${briefing.redes.map((r) => `${ROTULO_REDE[r.rede]} (${r.url})`).join(', ')}`,
    )
  }
  const f = briefing.footer
  const footer = [
    f.textoInstitucional && `texto institucional: ${f.textoInstitucional}`,
    f.direitos && `direitos: ${f.direitos}`,
    f.endereco && `endereço: ${f.endereco}`,
    f.telefones.length > 0 &&
      `telefones: ${f.telefones.map((t) => (t.whatsapp ? `${t.numero} (WhatsApp)` : t.numero)).join(', ')}`,
    f.email && `e-mail: ${f.email}`,
    f.linksUteis.length > 0 && `links úteis: ${f.linksUteis.map((l) => `${l.rotulo} -> ${l.url}`).join(', ')}`,
    f.menuSecundario && 'repetir o menu principal no rodapé',
  ].filter(Boolean)
  if (footer.length > 0) linhas.push(`Footer: ${footer.join(' | ')}`)

  return linhas.join('\n')
}

function blocoSecoes(briefing: LpBriefing): string {
  return briefing.secoes
    .map((s, i) => {
      const itemMenu = briefing.menu.find((m) => m.id === s.itemMenu)?.rotulo
      const partes = [
        `${i + 1}. id="${s.id}" | layout=${s.layout} | nome="${s.nome}"`,
        s.vincularMenu
          ? `   aparece no menu${itemMenu ? ` como "${itemMenu}"` : ''} (gere uma âncora)`
          : '   fora do menu (ancora = null)',
        s.titulo && `   título (escrito pelo usuário, use como está): ${s.titulo}`,
        s.subtitulo && `   subtítulo (escrito pelo usuário, use como está): ${s.subtitulo}`,
        s.conteudo && `   o que dizer: ${s.conteudo}`,
        s.colunas && `   colunas: ${s.colunas}`,
        s.botao &&
          `   botão: o usuário JÁ DEFINIU ("${s.botao.texto}" -> ${s.botao.url}) — não gere o campo "botao" nesta seção`,
        s.itens &&
          s.itens.length > 0 &&
          `   itens escritos pelo usuário (gere EXATAMENTE ${s.itens.length}, nesta ordem, mantendo o que ele escreveu e completando o resto): ${s.itens
            .map(
              (it, n) =>
                `${n + 1}) ${[it.titulo, it.extra, it.detalhe, it.texto].filter(Boolean).join(' | ') || '(em branco — escreva você)'}`,
            )
            .join('; ')}`,
        s.midia?.arquivo
          ? `   mídia: o usuário JÁ ESCOLHEU a mídia (${s.midia.tipo}) — não gere o campo "midia" nesta seção`
          : s.midia?.busca &&
            `   mídia pedida: ${s.midia.tipo} ${s.midia.orientacao} — "${s.midia.busca}"`,
      ].filter(Boolean)
      return partes.join('\n')
    })
    .join('\n')
}

function blocoReferencias(referencias: ResumoReferencia[]): string {
  if (referencias.length === 0) return ''
  const corpo = referencias
    .map((r) => `- ${r.url}\n${r.resumo.split('\n').map((l) => `  ${l}`).join('\n')}`)
    .join('\n')
  return `\nSITES DE REFERÊNCIA (INSPIRAÇÃO DE ESTILO — JAMAIS COPIE TEXTO, NOME OU MARCA DELES):
${corpo}
Use apenas como leitura de estilo: sensação da paleta, peso tipográfico, nível de formalidade e densidade de conteúdo.\n`
}

function montarPrompt(
  briefing: LpBriefing,
  referencias: ResumoReferencia[],
): string {
  const tipos = briefing.secoes.map((s) => s.layout)
  return `Você é um diretor de arte e redator publicitário sênior. Escreva o conteúdo completo de uma landing page profissional em PORTUGUÊS DO BRASIL.

BRIEFING
${blocoBriefing(briefing)}
${blocoReferencias(referencias)}
SEÇÕES (mantenha exatamente esta ordem, estes ids e estes layouts):
${blocoSecoes(briefing)}

LAYOUTS E CAMPOS DISPONÍVEIS
${guiaLayouts(tipos)}

REGRAS DE CONTEÚDO
- Português do Brasil, tom profissional e persuasivo. Nada de "lorem ipsum", nada de texto genérico de exemplo.
- Títulos curtos e concretos (até 8 palavras). Textos de 1 a 3 frases. Fale de benefício, não de característica.
- NUNCA invente dados verificáveis: prêmios, certificações, número de clientes reais, preços que o briefing não deu. Em estatísticas e preços use valores redondos claramente ilustrativos, que o usuário vai ajustar.
- Preencha TODAS as seções listadas, na ordem, com o layout indicado. Não crie nem remova seções.
- Seções com itens: gere entre 3 e 6 itens (comparacao: 2 a 4 colunas; precos: 3 planos com um "destaque": true).
- Em "comparacao", "rotulos" são as linhas da tabela e cada item.lista traz as células na mesma ordem dos rótulos (use "sim"/"não" quando for presença de recurso).
- Ícones: use APENAS estes nomes — ${NOMES_ICONES.join(', ')}.
- Botões: "url" deve ser "#ancora-de-uma-secao" ou "#" quando não houver destino. Nunca invente domínio.
- Âncoras: minúsculas, sem acento, com hífen (ex.: "quem-somos"). Só nas seções marcadas como do menu; nas demais use null.
- Menu do header: use os itens do briefing, apontando para "#ancora" das seções correspondentes; itens com URL externa mantêm a URL.

REGRAS DE IDENTIDADE VISUAL
- Fontes: use APENAS estes nomes — ${FONTES_GOOGLE.map((f) => f.nome).join(', ')}.
- Se o usuário definiu cor ou fonte, repita o valor dele. Se não definiu, escolha e mantenha coerência na página inteira.
- Contraste é obrigatório: texto sobre fundo precisa ser legível (WCAG AA). "fundoPagina" claro pede "titulos"/"textos" escuros e vice-versa.
- Alterne o fundo das seções para dar ritmo: deixe a maioria sem "fundo" e use "fundo": { "cor": "..." } em uma a cada duas ou três seções, sempre com um tom sutil da paleta.
- Em "hero" e "banner" com mídia de fundo, o texto sai branco automaticamente — escolha "escurecer" entre 40 e 70.

REGRAS DE MÍDIA
- Não invente URL de imagem ou vídeo. Preencha apenas { "busca", "tipo", "orientacao" } e o sistema busca no banco de mídias.
- "busca": 3 a 6 palavras-chave concretas e visuais, de preferência em inglês. Ex.: "modern office team meeting". Português também funciona — o sistema traduz antes de buscar.
- Descreva o que a CÂMERA vê, não o conceito. "dentist examining patient" acha foto; "excelência em odontologia" não acha nada.
- "alt": descrição em português do que aparece na imagem.
- Respeite o tipo e a orientação pedidos no briefing. Se a seção pede mídia e o briefing não descreveu, crie uma busca coerente com o assunto.
- Seção marcada como "o usuário JÁ ESCOLHEU a mídia" (arquivo dele ou foto do banco): omita o campo "midia" dela. O sistema coloca a mídia escolhida no lugar; qualquer busca que você escrever ali seria descartada.

FORMATO DA RESPOSTA
Responda SOMENTE com um objeto JSON válido (sem markdown, sem comentários) neste formato:
{
  "seo": { "titulo": "até 60 caracteres", "descricao": "até 155 caracteres" },
  "tema": {
    "tipografia": {
      "titulos": { "fonte": "Sora", "peso": 700, "tamanho": "42px", "alturaLinha": "1.15", "espacamentoLetras": "-0.01em" },
      "subtitulos": { "fonte": "Inter", "peso": 500, "tamanho": "20px", "alturaLinha": "1.5", "espacamentoLetras": "0" },
      "textos": { "fonte": "Inter", "peso": 400, "tamanho": "16px", "alturaLinha": "1.7", "espacamentoLetras": "0" },
      "botoes": { "fonte": "Inter", "peso": 600, "tamanho": "16px", "alturaLinha": "1.2", "espacamentoLetras": "0.01em" }
    },
    "cores": { "principal": "#2563eb", "secundaria": "#7c3aed", "titulos": "#0f172a", "subtitulos": "#334155", "textos": "#475569", "botoes": "#ffffff", "fundoBotoes": "#2563eb", "header": "#ffffff", "footer": "#0f172a", "fundoPagina": "#ffffff" },
    "raio": 12
  },
  "header": { "logoTexto": "Nome da marca", "menu": [{ "rotulo": "Home", "alvo": "#topo" }], "fixo": true, "botoes": [{ "texto": "Fale conosco", "url": "#contato" }] },
  "secoes": [
    { "id": "id-do-briefing", "tipo": "hero", "nome": "Início", "ancora": "inicio", "titulo": "...", "subtitulo": "...", "texto": "...", "botao": { "texto": "...", "url": "#contato" }, "midia": { "busca": "modern office team", "tipo": "imagem", "orientacao": "paisagem", "alt": "Equipe reunida em escritório moderno" }, "itens": [], "largura": "boxed", "espacamento": { "topo": 96, "base": 96 }, "fundo": { "escurecer": 55 } }
  ],
  "footer": { "textoInstitucional": "...", "direitos": "© 2026 Marca. Todos os direitos reservados.", "endereco": "...", "telefones": [{ "numero": "(11) 99999-9999", "whatsapp": true }], "email": "...", "linksUteis": [{ "rotulo": "...", "url": "#..." }], "botoes": [{ "texto": "Fale conosco", "url": "#contato" }], "menuSecundario": false },
  "redes": [{ "rede": "instagram", "url": "https://..." }]
}
Todas as seções do briefing devem aparecer em "secoes", com o mesmo "id" e o mesmo "tipo".
Não escreva links de "Termos de Uso" nem de "Política de Privacidade" em "linksUteis": quando essas páginas existem, o sistema as gera e coloca o link no rodapé sozinho.`
}

/** Extrai o JSON da resposta tolerando cercas de markdown e texto ao redor. */
function extrairJson(texto: string): unknown {
  const inicio = texto.indexOf('{')
  const fim = texto.lastIndexOf('}')
  if (inicio === -1 || fim <= inicio) return null
  try {
    return JSON.parse(texto.slice(inicio, fim + 1))
  } catch {
    return null
  }
}

const MAX_TENTATIVAS = 3

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Segundos de espera que o provedor sugere no corpo do 429: o Gemini manda em
 * `retryDelay` (RetryInfo), o Groq escreve "try again in 20.5s". Sem ler isso, a
 * espera exponencial de 2s e 4s cai dentro da mesma janela de um minuto do
 * limite por minuto do Groq — as três tentativas falham pelo mesmo motivo.
 */
function segundosRetry(detalhe: string): number | null {
  const m =
    /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(detalhe) ??
    /try again in (\d+(?:\.\d+)?)s/i.exec(detalhe)
  return m ? Math.ceil(Number(m[1])) : null
}

/** Mensagem (campo error.message) que o Gemini devolve, para diagnóstico. */
function razaoApi(detalhe: string): string {
  const m = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(detalhe)
  return m ? m[1].replace(/\\"/g, '"').slice(0, 200) : ''
}

/** Mensagem amigável para status de erro, expondo a razão real da API. */
function mensagemErro(status: number, detalhe: string): string {
  if (status === 429 || status === 503) {
    if (/FreeTier/i.test(detalhe)) {
      return 'A chave está caindo na cota gratuita do Gemini e ela se esgotou. Confirme se a chave pertence ao projeto com faturamento ativo (AI Studio → Chaves de API) e tente de novo.'
    }
    const razao = razaoApi(detalhe)
    return `A IA recusou o pedido por limite/capacidade (${status})${razao ? `: ${razao}` : ''}. Tentei algumas vezes; aguarde um pouco e gere de novo.`
  }
  const razao = razaoApi(detalhe)
  return `A IA respondeu com erro (${status})${razao ? `: ${razao}` : ''}. Tente de novo.`
}

/** Gera o documento da landing page a partir do briefing. Nunca lança. */
export async function gerarDocumento(
  briefing: LpBriefing,
  referencias: ResumoReferencia[],
): Promise<ResultadoIA> {
  const provedor = escolherProvedor()
  if (!provedor.temChave()) {
    return {
      ok: false,
      semChave: true,
      erro: `IA não configurada. Adicione ${provedor.envKey} ao .env.local para a IA escrever o conteúdo.`,
    }
  }
  if (briefing.secoes.length === 0) {
    return { ok: false, erro: 'Adicione pelo menos uma seção antes de gerar a página.' }
  }

  const prompt = montarPrompt(briefing, referencias)
  let ultimoErro = 'A IA respondeu com erro. Tente de novo.'

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const r = await provedor.chamar(prompt)

    if (r.tipo === 'chaveInvalida') {
      // Chave inválida ≠ ausente: é erro, não deve virar página em branco.
      return { ok: false, chaveInvalida: true, erro: r.erro }
    }

    if (r.tipo === 'rede') {
      if (tentativa < MAX_TENTATIVAS) {
        await esperar(2 ** tentativa * 1000)
        continue
      }
      return { ok: false, erro: 'Falha ao falar com a IA. Verifique a conexão e tente de novo.' }
    }

    if (r.tipo === 'erro') {
      // 429/503 costumam ser transitórios (capacidade/limite) — espera e repete.
      if ((r.status === 429 || r.status === 503) && tentativa < MAX_TENTATIVAS) {
        ultimoErro = mensagemErro(r.status, r.detalhe)
        await esperar(Math.min((segundosRetry(r.detalhe) ?? 2 ** tentativa) * 1000, 30000))
        continue
      }
      return { ok: false, erro: mensagemErro(r.status, r.detalhe) }
    }

    // r.tipo === 'ok'
    if (r.truncado && r.texto === '') {
      return { ok: false, erro: 'A página ficou grande demais para a IA. Reduza o número de seções e tente de novo.' }
    }
    const bruto = extrairJson(r.texto)
    if (bruto === null) {
      // JSON cortado no meio (resposta truncada) — vale uma nova tentativa.
      if (r.truncado && tentativa < MAX_TENTATIVAS) continue
      return { ok: false, erro: 'Não consegui interpretar a resposta da IA. Tente gerar de novo.' }
    }
    const documento = coergirDocumentoIA(bruto, briefing)
    if (!documento) {
      return { ok: false, erro: 'A IA não devolveu seções válidas. Tente gerar de novo.' }
    }
    return { ok: true, documento }
  }

  return { ok: false, erro: ultimoErro }
}
