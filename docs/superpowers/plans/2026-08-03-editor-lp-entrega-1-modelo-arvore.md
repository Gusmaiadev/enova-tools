# Editor de LP — Entrega 1: modelo em árvore, expansor e migração

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o modelo de dados em árvore, o expansor que converte os 21 presets em árvore e a função de migração — tudo puro e coberto por testes, sem ligar nada ainda.

**Architecture:** Entrega **puramente aditiva**. Os tipos novos entram ao lado dos antigos, `LpSecao.raiz` e `LpDocumento.versao` nascem opcionais, e a migração é escrita e testada mas **não é chamada** em `persistencia.ts`. Quem liga a chave é a Entrega 2, quando o compilador souber renderizar árvore. Assim a aplicação continua compilando e funcionando exatamente como hoje durante toda esta entrega.

**Tech Stack:** TypeScript, vitest (`npm test` → `vitest run`, `include: ['lib/**/*.test.ts']`), sem dependências novas.

## Global Constraints

- **Nada é ligado nesta entrega.** Não modificar `lib/lp/compilador/`, `components/lp/`, nem chamar a migração em `persistencia.ts`. Ao final, `npm run build` e `npm test` passam e o app se comporta como antes.
- **Nenhum campo antigo é removido.** `LpSecao` mantém `titulo`, `subtitulo`, `texto`, `botao`, `midia`, `itens`, `colunas`, `inverter`, `largura`, `rotulos`, `ajustes`, `destinoForm`. A remoção é da Entrega 2.
- Ids gerados com `gerarId()` de `lib/lp/util.ts`. Nunca `Math.random()` direto.
- Comentários e mensagens em português, sem acento em comentário de código quando o arquivo vizinho também não usa (seguir o padrão do arquivo).
- Testes com `describe`/`it` de vitest e descrições em português, seguindo `lib/lp/util.test.ts`.
- Conforme `AGENTS.md`, esta versão do Next.js difere do conhecimento prévio: consultar `node_modules/next/dist/docs/` antes de escrever qualquer código de framework. Esta entrega é TypeScript puro, então não deve ser necessário.
- Commits pequenos, um por task, na branch `feat/editor-lp-elementor`.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/lp/tipos.ts` (modificar) | Tipos da árvore ao lado dos atuais; `raiz?` e `versao?` opcionais |
| `lib/lp/arvore.ts` (criar) | Caminhamento e construtores de nó — puro, sem conhecer presets |
| `lib/lp/arvore.test.ts` (criar) | Testes do caminhamento |
| `lib/lp/presets/comum.ts` (criar) | Construtores compartilhados pelos 21 presets |
| `lib/lp/presets/simples.ts` (criar) | 6 presets sem itens repetíveis |
| `lib/lp/presets/grades.ts` (criar) | 10 presets de composição livre |
| `lib/lp/presets/compostos.ts` (criar) | 5 presets que viram widget composto |
| `lib/lp/presets/expandir.ts` (criar) | Despachante `expandirPreset` |
| `lib/lp/presets/expandir.test.ts` (criar) | Testes dos 21 presets |
| `lib/lp/migrar.ts` (criar) | `migrarDocumentoParaArvore` |
| `lib/lp/migrar.test.ts` (criar) | Testes da migração |
| `lib/lp/documento.ts` (modificar) | `arquivosUsados` caminhando os dois formatos |

---

### Task 1: Tipos da árvore e caminhamento

**Files:**
- Modify: `lib/lp/tipos.ts` (acrescentar ao final da seção de tipos, antes de `CategoriaTexto`)
- Create: `lib/lp/arvore.ts`
- Test: `lib/lp/arvore.test.ts`

**Interfaces:**
- Consumes: `gerarId` de `lib/lp/util.ts`; `LpMidia`, `LpBotao` de `lib/lp/tipos.ts`
- Produces: os tipos `Dispositivo`, `PorDisp<T>`, `Caixa`, `LpEstilo`, `LpContainer`, `LpWidget`, `LpElemento`; e de `arvore.ts` as funções `caminharElementos(raiz: LpContainer): LpElemento[]` e `midiasDoElemento(el: LpElemento): LpMidia[]`

- [ ] **Step 1: Escrever os tipos em `lib/lp/tipos.ts`**

Acrescentar antes da linha `export type CategoriaTexto`:

```ts
/* ------------------------------- Árvore ---------------------------------- */

export type Dispositivo = 'desktop' | 'tablet' | 'celular'

/**
 * Valor de estilo por dispositivo. `desktop` e a base (sem media query); tablet
 * e celular so emitem CSS quando presentes. A heranca sai da cascata: sendo
 * max-width, numa tela de 500px os dois blocos valem e o de 640 vence por vir
 * depois — celular herda de tablet, que herda de desktop.
 */
export type PorDisp<T> = Partial<Record<Dispositivo, T>>

export type Caixa = { topo: number; direita: number; base: number; esquerda: number }

/** Sobreposicoes visuais de um no. Ausente = herda do tema. */
export type LpEstilo = {
  cor?: PorDisp<string>
  fundo?: PorDisp<string>
  fonte?: PorDisp<string>
  tamanho?: PorDisp<string>
  peso?: PorDisp<number>
  alturaLinha?: PorDisp<string>
  espacamentoLetras?: PorDisp<string>
  alinhamento?: PorDisp<'left' | 'center' | 'right'>
  margem?: PorDisp<Caixa>
  padding?: PorDisp<Caixa>
  largura?: PorDisp<string>
  raio?: PorDisp<number>
  sombra?: PorDisp<string>
}

/** Comum a todo no da arvore. */
type NoBase = {
  id: string
  estilo?: LpEstilo
  /** Esconde o no no dispositivo marcado. */
  oculto?: PorDisp<boolean>
}

export type LpContainer = NoBase & {
  tipo: 'container'
  direcao: PorDisp<'linha' | 'coluna'>
  colunas?: PorDisp<number>
  gap?: PorDisp<number>
  alinhar?: PorDisp<'inicio' | 'centro' | 'fim' | 'esticar'>
  justificar?: PorDisp<'inicio' | 'centro' | 'fim' | 'entre'>
  filhos: LpElemento[]
}

export type LpWidget = NoBase &
  (
    | { tipo: 'titulo'; nivel: 'h1' | 'h2' | 'h3' | 'h4'; texto: string }
    /** `papel` escolhe a categoria de tipografia do tema (subtitulos/textos). */
    | { tipo: 'texto'; papel: 'subtitulo' | 'corpo'; texto: string }
    | { tipo: 'imagem'; midia: LpMidia }
    | { tipo: 'video'; midia: LpMidia }
    | { tipo: 'botao'; botao: LpBotao }
    | { tipo: 'icone'; nome: string }
    | { tipo: 'numero'; valor: string; rotulo: string }
    | { tipo: 'lista'; itens: { id: string; icone?: string; texto: string }[] }
    | { tipo: 'espacador'; altura: PorDisp<number> }
    | { tipo: 'divisor' }
    | { tipo: 'faq'; perguntas: { id: string; pergunta: string; resposta: string }[] }
    | {
        tipo: 'abas'
        abas: { id: string; titulo: string; texto: string; imagem?: LpMidia | null }[]
      }
    | {
        tipo: 'carrossel'
        slides: { id: string; imagem?: LpMidia | null; titulo?: string; texto?: string }[]
      }
    | {
        tipo: 'depoimentos'
        depoimentos: {
          id: string
          texto: string
          nome: string
          cargo?: string
          foto?: LpMidia | null
        }[]
      }
    | {
        tipo: 'comparacao'
        rotulos: string[]
        colunas: { id: string; titulo: string; celulas: string[]; destaque?: boolean }[]
      }
    | { tipo: 'formulario'; destino?: string }
  )

export type LpElemento = LpContainer | LpWidget
```

Na mesma passagem, acrescentar os dois campos opcionais. Em `LpSecao`, logo depois de `tipo`:

```ts
  /**
   * Conteudo da secao em arvore. Opcional enquanto o compilador nao renderiza
   * arvore (Entrega 2): documento salvo hoje nao tem, e o expansor produz.
   */
  raiz?: LpContainer
```

E em `LpDocumento`, como primeiro campo:

```ts
  /** Ausente = formato de secoes tipadas (pre-arvore). */
  versao?: 2
```

- [ ] **Step 2: Escrever o teste de caminhamento (vai falhar)**

Criar `lib/lp/arvore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { caminharElementos, midiasDoElemento } from './arvore'
import type { LpContainer, LpMidia } from './tipos'

const midia = (url: string): LpMidia => ({
  tipo: 'imagem',
  url,
  alt: '',
  busca: '',
  orientacao: 'paisagem',
})

const arvore: LpContainer = {
  id: 'raiz',
  tipo: 'container',
  direcao: { desktop: 'coluna' },
  filhos: [
    { id: 't1', tipo: 'titulo', nivel: 'h2', texto: 'Olá' },
    {
      id: 'c1',
      tipo: 'container',
      direcao: { desktop: 'linha' },
      filhos: [
        { id: 'i1', tipo: 'imagem', midia: midia('a.jpg') },
        { id: 'p1', tipo: 'texto', papel: 'corpo', texto: 'corpo' },
      ],
    },
  ],
}

describe('caminharElementos', () => {
  it('devolve todos os nos, inclusive a raiz, em profundidade', () => {
    expect(caminharElementos(arvore).map((e) => e.id)).toEqual([
      'raiz',
      't1',
      'c1',
      'i1',
      'p1',
    ])
  })

  it('devolve so a raiz quando nao ha filhos', () => {
    const vazia: LpContainer = {
      id: 'r',
      tipo: 'container',
      direcao: { desktop: 'coluna' },
      filhos: [],
    }
    expect(caminharElementos(vazia).map((e) => e.id)).toEqual(['r'])
  })
})

describe('midiasDoElemento', () => {
  it('acha a midia do widget de imagem', () => {
    expect(midiasDoElemento({ id: 'i', tipo: 'imagem', midia: midia('x.jpg') })).toHaveLength(1)
  })

  it('acha as midias de dentro dos widgets compostos', () => {
    const urls = midiasDoElemento({
      id: 'a',
      tipo: 'abas',
      abas: [
        { id: '1', titulo: 'A', texto: '', imagem: midia('aba.jpg') },
        { id: '2', titulo: 'B', texto: '', imagem: null },
      ],
    }).map((m) => m.url)
    expect(urls).toEqual(['aba.jpg'])
  })

  it('devolve vazio para widget sem midia', () => {
    expect(midiasDoElemento({ id: 't', tipo: 'titulo', nivel: 'h2', texto: 'x' })).toEqual([])
  })
})
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run lib/lp/arvore.test.ts`
Expected: FAIL — `Failed to resolve import "./arvore"`

- [ ] **Step 4: Implementar `lib/lp/arvore.ts`**

```ts
/**
 * Caminhamento da arvore de elementos da secao. Modulo puro, sem conhecer
 * presets nem compilador — quem precisa varrer a arvore (coleta de midias,
 * geracao de CSS, busca de no) parte daqui.
 */

import type { LpContainer, LpElemento, LpMidia } from './tipos'

/** Todos os nos em profundidade, a raiz primeiro. */
export function caminharElementos(raiz: LpContainer): LpElemento[] {
  const fora: LpElemento[] = []
  const visitar = (el: LpElemento) => {
    fora.push(el)
    if (el.tipo === 'container') el.filhos.forEach(visitar)
  }
  visitar(raiz)
  return fora
}

/**
 * Midias que o no cita. Precisa conhecer cada widget composto: uma midia
 * esquecida aqui e um arquivo que a limpeza de orfaos apaga com a pagina ainda
 * usando (ver arquivosUsados em documento.ts).
 */
export function midiasDoElemento(el: LpElemento): LpMidia[] {
  switch (el.tipo) {
    case 'imagem':
    case 'video':
      return [el.midia]
    case 'abas':
      return el.abas.map((a) => a.imagem).filter((m): m is LpMidia => Boolean(m))
    case 'carrossel':
      return el.slides.map((s) => s.imagem).filter((m): m is LpMidia => Boolean(m))
    case 'depoimentos':
      return el.depoimentos.map((d) => d.foto).filter((m): m is LpMidia => Boolean(m))
    default:
      return []
  }
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run lib/lp/arvore.test.ts`
Expected: PASS (7 testes)

- [ ] **Step 6: Confirmar que nada quebrou**

Run: `npm test && npm run typecheck`
Expected: todas as suítes passam; `tsc --noEmit` sem erro.

- [ ] **Step 7: Commit**

```bash
git add lib/lp/tipos.ts lib/lp/arvore.ts lib/lp/arvore.test.ts
git commit -m "feat(lp): tipos da arvore de elementos e caminhamento"
```

---

### Task 2: `arquivosUsados` caminhando a árvore

Esta é a task de maior risco do plano: `arquivosUsados` define o que a limpeza de órfãos **não** apaga. Ela entra agora, antes de existir qualquer documento em árvore, para já estar correta quando a Entrega 2 ligar a chave.

**Files:**
- Modify: `lib/lp/documento.ts:456-473`
- Test: `lib/lp/documento.test.ts` (criar — ainda não existe)

**Interfaces:**
- Consumes: `caminharElementos`, `midiasDoElemento` de `lib/lp/arvore.ts` (Task 1)
- Produces: `arquivosUsados` com a mesma assinatura de hoje, `(projeto) => Set<string>`

- [ ] **Step 1: Escrever o teste de regressão (vai falhar)**

Criar `lib/lp/documento.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { arquivosUsados } from './documento'
import type { LpDocumento, LpMidia, LpSecao } from './tipos'

const enviada = (caminho: string): LpMidia => ({
  tipo: 'imagem',
  url: `https://bucket/${caminho}`,
  alt: '',
  busca: '',
  orientacao: 'paisagem',
  caminho,
})

const docBase = (secoes: LpSecao[]): LpDocumento => ({
  seo: { titulo: '', descricao: '' },
  tema: { tipografia: {}, cores: {}, raio: 8 } as LpDocumento['tema'],
  header: { logoTexto: 'X', menu: [], fixo: false, botoes: [] },
  secoes,
  footer: { linksUteis: [], menuSecundario: false },
  redes: [],
})

const secao = (extra: Partial<LpSecao>): LpSecao => ({
  id: 's1',
  tipo: 'hero',
  nome: 'Hero',
  ancora: null,
  itens: [],
  largura: 'boxed',
  ...extra,
})

describe('arquivosUsados', () => {
  it('acha midia nos campos antigos da secao', () => {
    const doc = docBase([
      secao({
        midia: enviada('lp/1/a.jpg'),
        fundo: { midia: enviada('lp/1/b.jpg') },
        itens: [{ id: 'i1', imagem: enviada('lp/1/c.jpg') }],
      }),
    ])
    expect([...arquivosUsados({ documento: doc })].sort()).toEqual([
      'lp/1/a.jpg',
      'lp/1/b.jpg',
      'lp/1/c.jpg',
    ])
  })

  it('acha midia em qualquer profundidade da arvore', () => {
    const doc = docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            {
              id: 'c',
              tipo: 'container',
              direcao: { desktop: 'linha' },
              filhos: [{ id: 'i', tipo: 'imagem', midia: enviada('lp/1/fundo.jpg') }],
            },
          ],
        },
      }),
    ])
    expect([...arquivosUsados({ documento: doc })]).toEqual(['lp/1/fundo.jpg'])
  })

  it('acha midia dentro de widget composto', () => {
    const doc = docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            {
              id: 'd',
              tipo: 'depoimentos',
              depoimentos: [{ id: '1', texto: 'oi', nome: 'A', foto: enviada('lp/1/foto.jpg') }],
            },
          ],
        },
      }),
    ])
    expect([...arquivosUsados({ documento: doc })]).toEqual(['lp/1/foto.jpg'])
  })

  it('ignora midia de banco (sem caminho no bucket)', () => {
    const doc = docBase([
      secao({
        midia: { tipo: 'imagem', url: 'https://pexels/x.jpg', alt: '', busca: '', orientacao: 'paisagem' },
      }),
    ])
    expect(arquivosUsados({ documento: doc }).size).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/documento.test.ts`
Expected: FAIL — os dois testes de árvore devolvem `Set` vazio (`[]` em vez do caminho esperado). Os outros dois passam.

- [ ] **Step 3: Reescrever `arquivosUsados`**

Em `lib/lp/documento.ts`, acrescentar ao bloco de imports:

```ts
import { caminharElementos, midiasDoElemento } from './arvore'
```

E substituir o corpo da função (linhas 456-473) por:

```ts
export function arquivosUsados(projeto: {
  documento?: LpDocumento | null
  briefing?: LpBriefing | null
}): Set<string> {
  const usados = new Set<string>()
  const anotar = (m: LpMidia | null | undefined) => {
    if (m?.caminho) usados.add(m.caminho)
  }
  anotar(projeto.documento?.header.logo)
  anotar(projeto.briefing?.logo)
  for (const secao of projeto.documento?.secoes ?? []) {
    // Campos tipados: valem enquanto houver documento pre-arvore salvo.
    anotar(secao.midia)
    anotar(secao.fundo?.midia)
    for (const item of secao.itens ?? []) anotar(item.imagem)
    // Arvore: o que a Entrega 2 em diante produz.
    if (secao.raiz) {
      for (const el of caminharElementos(secao.raiz)) midiasDoElemento(el).forEach(anotar)
    }
  }
  for (const secao of projeto.briefing?.secoes ?? []) anotar(secao.midia?.arquivo)
  return usados
}
```

Os dois formatos convivem de propósito: durante a transição um mesmo projeto pode ter seções migradas e não migradas, e apagar arquivo é irreversível.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run lib/lp/documento.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add lib/lp/documento.ts lib/lp/documento.test.ts
git commit -m "fix(lp): arquivosUsados caminha a arvore alem dos campos tipados"
```

---

### Task 3: Construtores comuns e os 6 presets sem itens

**Files:**
- Create: `lib/lp/presets/comum.ts`
- Create: `lib/lp/presets/simples.ts`
- Create: `lib/lp/presets/expandir.ts`
- Test: `lib/lp/presets/expandir.test.ts`

**Interfaces:**
- Consumes: `gerarId` (`lib/lp/util.ts`); tipos da Task 1
- Produces:
  - `comum.ts`: `container(filhos, props?) => LpContainer`, `wTitulo(texto, nivel?) => LpWidget`, `wTexto(texto, papel) => LpWidget`, `wMidia(m) => LpWidget`, `wBotao(b) => LpWidget`, `wIcone(nome) => LpWidget`, `cabeca(s, nivel?) => LpElemento[]`, `botaoSecao(s) => LpElemento[]`, `COL`, `LINHA`
  - `expandir.ts`: `expandirPreset(s: LpSecao) => { raiz: LpContainer; secao: LpSecao }`. Puro: nunca muta `s`. `secao` e a mesma referencia recebida, exceto no banner, onde volta uma copia com a midia movida para `fundo`.

- [ ] **Step 1: Escrever `lib/lp/presets/comum.ts`**

```ts
/**
 * Construtores compartilhados pelos expansores de preset. Existem para que os
 * 21 presets nao repitam a montagem de no — e para que a ordem dos elementos
 * saia igual a que o compilador de hoje emite.
 */

import type { LpBotao, LpContainer, LpElemento, LpMidia, LpSecao, LpWidget } from '../tipos'
import { gerarId } from '../util'

export const COL = { desktop: 'coluna' } as const
export const LINHA = { desktop: 'linha' } as const

export function container(
  filhos: LpElemento[],
  props: Partial<Omit<LpContainer, 'id' | 'tipo' | 'filhos'>> = {},
): LpContainer {
  return { id: gerarId(), tipo: 'container', direcao: COL, filhos, ...props }
}

export const wTitulo = (texto: string, nivel: 'h1' | 'h2' | 'h3' | 'h4' = 'h2'): LpWidget => ({
  id: gerarId(),
  tipo: 'titulo',
  nivel,
  texto,
})

export const wTexto = (texto: string, papel: 'subtitulo' | 'corpo'): LpWidget => ({
  id: gerarId(),
  tipo: 'texto',
  papel,
  texto,
})

export const wMidia = (m: LpMidia): LpWidget =>
  m.tipo === 'video'
    ? { id: gerarId(), tipo: 'video', midia: m }
    : { id: gerarId(), tipo: 'imagem', midia: m }

export const wBotao = (b: LpBotao): LpWidget => ({ id: gerarId(), tipo: 'botao', botao: b })

export const wIcone = (nome: string): LpWidget => ({ id: gerarId(), tipo: 'icone', nome })

/**
 * Titulo + subtitulo + texto da secao, nessa ordem — a mesma de cabeca() e dos
 * blocos de texto do compilador atual. So entra o que existir.
 */
export function cabeca(s: LpSecao, nivel: 'h1' | 'h2' = 'h2'): LpElemento[] {
  const fora: LpElemento[] = []
  if (s.titulo) fora.push(wTitulo(s.titulo, nivel))
  if (s.subtitulo) fora.push(wTexto(s.subtitulo, 'subtitulo'))
  if (s.texto) fora.push(wTexto(s.texto, 'corpo'))
  return fora
}

/** Botao da secao, quando existe. Sempre por ultimo, como em acaoSecao(). */
export const botaoSecao = (s: LpSecao): LpElemento[] => (s.botao ? [wBotao(s.botao)] : [])
```

- [ ] **Step 2: Escrever o teste dos 6 presets (vai falhar)**

Criar `lib/lp/presets/expandir.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { expandirPreset } from './expandir'
import type { LpElemento, LpMidia, LpSecao, TipoLayout } from '../tipos'

/** So a raiz: quase todo teste ignora a secao ajustada (so o banner mexe nela). */
const expandir = (s: LpSecao) => expandirPreset(s).raiz

const midia: LpMidia = {
  tipo: 'imagem',
  url: 'foto.jpg',
  alt: 'alt',
  busca: 'busca',
  orientacao: 'paisagem',
}

const secao = (tipo: TipoLayout, extra: Partial<LpSecao> = {}): LpSecao => ({
  id: 's1',
  tipo,
  nome: 'Seção',
  ancora: null,
  itens: [],
  largura: 'boxed',
  ...extra,
})

/** Tipos dos nos em profundidade, para afirmar a forma sem depender de id. */
function forma(el: LpElemento): unknown {
  return el.tipo === 'container' ? { container: el.filhos.map(forma) } : el.tipo
}

describe('expandirPreset — presets sem itens', () => {
  it('hero: titulo h1, subtitulo, texto e botao na coluna, midia ao lado', () => {
    const raiz = expandir(
      secao('hero', { titulo: 'T', subtitulo: 'S', texto: 'C', botao: { texto: 'B', url: '#' }, midia }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: ['titulo', 'texto', 'texto', 'botao'] }, 'imagem'],
    })
    const col = raiz.filhos[0]
    if (col.tipo !== 'container') throw new Error('esperava container')
    const t = col.filhos[0]
    if (t.tipo !== 'titulo') throw new Error('esperava titulo')
    expect(t.nivel).toBe('h1')
  })

  it('hero sem midia nao cria a coluna vazia', () => {
    const raiz = expandir(secao('hero', { titulo: 'T' }))
    expect(forma(raiz)).toEqual({ container: [{ container: ['titulo'] }] })
  })

  it('texto-midia poe a midia depois do texto e inverte quando pedido', () => {
    const normal = expandir(secao('texto-midia', { titulo: 'T', midia }))
    expect(forma(normal)).toEqual({ container: [{ container: ['titulo'] }, 'imagem'] })

    const invertido = expandir(secao('texto-midia', { titulo: 'T', midia, inverter: true }))
    expect(forma(invertido)).toEqual({ container: ['imagem', { container: ['titulo'] }] })
  })

  it('texto-centralizado empilha tudo numa coluna centralizada', () => {
    const raiz = expandir(
      secao('texto-centralizado', { titulo: 'T', texto: 'C', botao: { texto: 'B', url: '#' } }),
    )
    expect(forma(raiz)).toEqual({ container: ['titulo', 'texto', 'botao'] })
    expect(raiz.alinhar).toEqual({ desktop: 'centro' })
  })

  it('cta empilha e centraliza como o texto-centralizado', () => {
    const raiz = expandir(secao('cta', { titulo: 'T', botao: { texto: 'B', url: '#' } }))
    expect(forma(raiz)).toEqual({ container: ['titulo', 'botao'] })
  })

  it('banner move a midia para o fundo da secao devolvida, sem virar widget', () => {
    const s = secao('banner', { titulo: 'T', midia })
    const { raiz, secao: ajustada } = expandirPreset(s)
    expect(forma(raiz)).toEqual({ container: ['titulo'] })
    expect(ajustada.fundo?.midia).toBe(midia)
    expect(ajustada.midia).toBeNull()
  })

  it('banner nao muta a secao recebida', () => {
    const s = secao('banner', { titulo: 'T', midia })
    expandirPreset(s)
    expect(s.midia).toBe(midia)
    expect(s.fundo).toBeUndefined()
  })

  it('preset que nao ajusta nada devolve a mesma secao, pela mesma referencia', () => {
    const s = secao('cta', { titulo: 'T' })
    expect(expandirPreset(s).secao).toBe(s)
  })

  it('formulario poe o texto de um lado e o widget de formulario do outro', () => {
    const raiz = expandir(secao('formulario', { titulo: 'T', destinoForm: 'https://x/y' }))
    expect(forma(raiz)).toEqual({ container: [{ container: ['titulo'] }, 'formulario'] })
    const form = raiz.filhos[1]
    if (form.tipo !== 'formulario') throw new Error('esperava formulario')
    expect(form.destino).toBe('https://x/y')
  })

  it('formulario sem texto nenhum sai so com o formulario', () => {
    const raiz = expandir(secao('formulario'))
    expect(forma(raiz)).toEqual({ container: ['formulario'] })
  })
})
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: FAIL — `Failed to resolve import "./expandir"`

- [ ] **Step 4: Escrever `lib/lp/presets/simples.ts`**

```ts
/**
 * Presets sem itens repetiveis. A ordem dos elementos reproduz o que as funcoes
 * lHero, lTextoMidia, lTextoCentralizado, lCta, lBanner e lFormulario do
 * compilador atual emitem — a migracao nao pode mudar a pagina de lugar.
 */

import type { LpContainer, LpElemento, LpSecao } from '../tipos'
import { gerarId } from '../util'
import { COL, LINHA, botaoSecao, cabeca, container, wMidia } from './comum'

export function pHero(s: LpSecao): LpContainer {
  const texto = container([...cabeca(s, 'h1'), ...botaoSecao(s)])
  // Hero com midia de fundo mostra so o texto: a midia lateral e o outro modo.
  const lateral = !s.fundo?.midia && s.midia ? [wMidia(s.midia)] : []
  const filhos = lateral.length > 0 ? [texto, ...lateral] : [texto]
  return container(filhos, {
    direcao: lateral.length > 0 ? LINHA : COL,
    colunas: lateral.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
    alinhar: { desktop: 'centro' },
  })
}

export function pTextoMidia(s: LpSecao): LpContainer {
  const texto = container([...cabeca(s), ...botaoSecao(s)])
  const midia = s.midia ? [wMidia(s.midia)] : []
  // `inverter` significava "midia antes do texto"; agora e a ordem dos filhos.
  const filhos = s.inverter ? [...midia, texto] : [texto, ...midia]
  return container(filhos, {
    direcao: midia.length > 0 ? LINHA : COL,
    colunas: midia.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
    alinhar: { desktop: 'centro' },
  })
}

export function pTextoCentralizado(s: LpSecao): LpContainer {
  return container([...cabeca(s), ...botaoSecao(s)], { alinhar: { desktop: 'centro' } })
}

export function pCta(s: LpSecao): LpContainer {
  return container([...cabeca(s), ...botaoSecao(s)], { alinhar: { desktop: 'centro' } })
}

export function pBanner(s: LpSecao): LpContainer {
  // A midia ja foi movida para o fundo por ajustarSecao(), em expandir.ts —
  // aqui ela nao existe mais como campo da secao.
  return container([...cabeca(s), ...botaoSecao(s)], { alinhar: { desktop: 'centro' } })
}

export function pFormulario(s: LpSecao): LpContainer {
  const lado: LpElemento[] = [...cabeca(s), ...(s.midia ? [wMidia(s.midia)] : []), ...botaoSecao(s)]
  const form: LpElemento = { id: gerarId(), tipo: 'formulario', destino: s.destinoForm }
  if (lado.length === 0) return container([form])
  return container([container(lado), form], {
    direcao: LINHA,
    colunas: { desktop: 2, tablet: 1 },
  })
}
```

- [ ] **Step 5: Escrever `lib/lp/presets/expandir.ts` com os 6 ligados**

```ts
/**
 * Converte uma secao tipada (documento salvo ou saida da IA) na arvore de
 * elementos. Usado em tres lugares — migracao na leitura, "Nova secao" no
 * editor e coercao da IA —, entao preset certo aqui e preset certo nos tres.
 */

import type { LpContainer, LpSecao, TipoLayout } from '../tipos'
import { container } from './comum'
import {
  pBanner,
  pCta,
  pFormulario,
  pHero,
  pTextoCentralizado,
  pTextoMidia,
} from './simples'

type Expansor = (s: LpSecao) => LpContainer

const EXPANSORES: Partial<Record<TipoLayout, Expansor>> = {
  hero: pHero,
  'texto-midia': pTextoMidia,
  'texto-centralizado': pTextoCentralizado,
  cta: pCta,
  banner: pBanner,
  formulario: pFormulario,
}

/**
 * Secao ajustada antes de expandir. So o banner precisa: nele a midia da secao
 * e FUNDO, nao elemento da pagina (html.ts:466). Sem isto a faixa perde o fundo
 * e ganha uma foto solta no meio do texto.
 *
 * Devolve a MESMA referencia quando nao ha o que ajustar, para o chamador poder
 * comparar por identidade.
 */
function ajustarSecao(s: LpSecao): LpSecao {
  if (s.tipo !== 'banner' || !s.midia) return s
  return { ...s, fundo: { ...s.fundo, midia: s.midia }, midia: null }
}

/**
 * Devolve a arvore e a secao que corresponde a ela. Os dois vem juntos de
 * proposito: o banner muda a secao, e uma assinatura que so devolvesse a raiz
 * deixaria o chamador esquecer disso sem nenhum aviso.
 */
export function expandirPreset(s: LpSecao): { raiz: LpContainer; secao: LpSecao } {
  const secao = ajustarSecao(s)
  const expansor = EXPANSORES[secao.tipo]
  // Preset ainda sem expansor cai num container vazio em vez de lancar: melhor
  // uma secao vazia para o usuario preencher do que um projeto que nao abre.
  return { raiz: expansor ? expansor(secao) : container([]), secao }
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: PASS (8 testes)

- [ ] **Step 7: Commit**

```bash
git add lib/lp/presets/
git commit -m "feat(lp): expansor dos presets sem itens repetiveis"
```

---

### Task 4: Os 10 presets de composição livre

**Files:**
- Create: `lib/lp/presets/grades.ts`
- Modify: `lib/lp/presets/expandir.ts` (registrar os 10)
- Test: `lib/lp/presets/expandir.test.ts` (acrescentar bloco)

**Interfaces:**
- Consumes: construtores de `comum.ts` (Task 3)
- Produces: `pCards`, `pPrecos`, `pGridProdutos`, `pListaBeneficios`, `pGaleria`, `pMasonry`, `pLogos`, `pTimeline`, `pBlocosAlternados`, `pEstatisticas` — todos `(s: LpSecao) => LpContainer`

- [ ] **Step 1: Escrever os testes (vão falhar)**

Acrescentar ao final de `lib/lp/presets/expandir.test.ts`:

```ts
describe('expandirPreset — composicao livre', () => {
  it('cards: cabeca, grade de containers por item, botao no fim', () => {
    const raiz = expandir(
      secao('cards', {
        titulo: 'T',
        colunas: 3,
        botao: { texto: 'B', url: '#' },
        itens: [
          { id: 'i1', icone: 'check', titulo: 'C1', extra: 'Sub', texto: 'Txt', botao: { texto: 'x', url: '#' } },
          { id: 'i2', titulo: 'C2' },
        ],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [
        'titulo',
        {
          container: [
            { container: ['icone', 'titulo', 'texto', 'texto', 'botao'] },
            { container: ['titulo'] },
          ],
        },
        'botao',
      ],
    })
    const grade = raiz.filhos[1]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    expect(grade.colunas).toEqual({ desktop: 3, tablet: 2, celular: 1 })
  })

  it('galeria e masonry sem itens com imagem saem com a grade vazia', () => {
    const raiz = expandir(secao('galeria', { itens: [{ id: 'i1' }] }))
    expect(forma(raiz)).toEqual({ container: [{ container: [] }] })
  })

  it('galeria monta um container por imagem, com a legenda depois', () => {
    const raiz = expandir(
      secao('galeria', { colunas: 2, itens: [{ id: 'i1', imagem: midia, titulo: 'Legenda' }] }),
    )
    expect(forma(raiz)).toEqual({ container: [{ container: [{ container: ['imagem', 'texto'] }] }] })
  })

  it('estatisticas viram widget numero, valor de extra e rotulo de titulo', () => {
    const raiz = expandir(
      secao('estatisticas', { itens: [{ id: 'i1', extra: '100+', titulo: 'Clientes' }] }),
    )
    const grade = raiz.filhos[0]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    const num = grade.filhos[0]
    if (num.tipo !== 'numero') throw new Error('esperava numero')
    expect(num).toMatchObject({ valor: '100+', rotulo: 'Clientes' })
  })

  it('precos monta nome, preco, periodo, lista de vantagens e botao', () => {
    const raiz = expandir(
      secao('precos', {
        itens: [
          {
            id: 'i1',
            titulo: 'Pro',
            extra: 'R$ 99',
            detalhe: '/mês',
            lista: ['Um', 'Dois'],
            botao: { texto: 'Assinar', url: '#' },
          },
        ],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['titulo', 'texto', 'texto', 'lista', 'botao'] }] }],
    })
  })

  it('timeline usa extra como data antes do titulo', () => {
    const raiz = expandir(
      secao('timeline', { itens: [{ id: 'i1', extra: '2020', titulo: 'Marco', texto: 'Txt' }] }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['texto', 'titulo', 'texto'] }] }],
    })
  })

  it('logos usa a imagem quando existe e o nome quando nao', () => {
    const raiz = expandir(
      secao('logos', { itens: [{ id: 'i1', imagem: midia }, { id: 'i2', titulo: 'Marca' }] }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['imagem'] }, { container: ['titulo'] }] }],
    })
  })

  it('blocos-alternados monta texto e imagem por bloco', () => {
    const raiz = expandir(
      secao('blocos-alternados', {
        itens: [{ id: 'i1', titulo: 'B', texto: 'T', imagem: midia }],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: [{ container: ['titulo', 'texto'] }, 'imagem'] }] }],
    })
  })

  it('lista-beneficios poe a coluna de texto e a midia lado a lado', () => {
    const raiz = expandir(
      secao('lista-beneficios', {
        titulo: 'T',
        midia,
        itens: [{ id: 'i1', icone: 'check', titulo: 'B', texto: 'D' }],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [
        { container: ['titulo', { container: [{ container: ['icone', 'titulo', 'texto'] }] }] },
        'imagem',
      ],
    })
  })

  it('grid-produtos monta foto, nome, preco e botao', () => {
    const raiz = expandir(
      secao('grid-produtos', {
        itens: [{ id: 'i1', imagem: midia, titulo: 'P', extra: 'R$ 9', botao: { texto: 'Ver', url: '#' } }],
      }),
    )
    expect(forma(raiz)).toEqual({
      container: [{ container: [{ container: ['imagem', 'titulo', 'texto', 'botao'] }] }],
    })
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: FAIL — os 10 novos casos devolvem `{ container: [] }` (o fallback de `expandirPreset`). Os 8 da Task 3 continuam passando.

- [ ] **Step 3: Escrever `lib/lp/presets/grades.ts`**

```ts
/**
 * Presets que viram composicao livre: uma grade de containers, um por item.
 * Cada card/plano/produto passa a ser montavel elemento a elemento, e a grade
 * ja nasce com os valores de tablet e celular que as media queries do
 * compilador atual aplicam (css.ts:228 e vizinhas).
 */

import type { LpContainer, LpElemento, LpItem, LpSecao } from '../tipos'
import { gerarId } from '../util'
import { COL, LINHA, botaoSecao, cabeca, container, wBotao, wIcone, wMidia, wTexto, wTitulo } from './comum'

/** Colunas da grade com o mesmo escalonamento das media queries de hoje. */
const colunasDe = (n: number | undefined, padrao: number) => {
  const desktop = n ?? padrao
  return { desktop, tablet: Math.min(2, desktop), celular: 1 }
}

/** cabeca + grade + botao da secao — o esqueleto de quase todos os presets. */
function comGrade(s: LpSecao, grade: LpContainer): LpContainer {
  return container([...cabeca(s), grade, ...botaoSecao(s)])
}

function grade(filhos: LpElemento[], colunas: LpContainer['colunas']): LpContainer {
  return container(filhos, { direcao: LINHA, colunas, gap: { desktop: 24 } })
}

export function pCards(s: LpSecao): LpContainer {
  const cards = s.itens.map((i) =>
    container([
      ...(i.icone ? [wIcone(i.icone)] : []),
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ]),
  )
  return comGrade(s, grade(cards, colunasDe(s.colunas, 3)))
}

export function pPrecos(s: LpSecao): LpContainer {
  const planos = s.itens.map((i) =>
    container([
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.detalhe ? [wTexto(i.detalhe, 'corpo')] : []),
      ...(i.lista && i.lista.length > 0
        ? [
            {
              id: gerarId(),
              tipo: 'lista' as const,
              itens: i.lista.map((t) => ({ id: gerarId(), icone: 'check', texto: t })),
            },
          ]
        : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ]),
  )
  return comGrade(s, grade(planos, colunasDe(s.colunas, Math.min(3, Math.max(2, s.itens.length)))))
}

export function pGridProdutos(s: LpSecao): LpContainer {
  const produtos = s.itens.map((i) =>
    container([
      ...(i.imagem ? [wMidia(i.imagem)] : []),
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ]),
  )
  return comGrade(s, grade(produtos, colunasDe(s.colunas, 3)))
}

/** Galeria e masonry: um container por imagem, legenda abaixo. */
function galeriaOuMasonry(s: LpSecao): LpContainer {
  const figuras = s.itens
    .filter((i) => i.imagem)
    .map((i) =>
      container([
        wMidia(i.imagem as NonNullable<LpItem['imagem']>),
        ...(i.titulo ? [wTexto(i.titulo, 'corpo')] : []),
      ]),
    )
  return comGrade(s, grade(figuras, colunasDe(s.colunas, 3)))
}

export const pGaleria = galeriaOuMasonry
export const pMasonry = galeriaOuMasonry

export function pLogos(s: LpSecao): LpContainer {
  const logos = s.itens.map((i) =>
    container(i.imagem ? [wMidia(i.imagem)] : i.titulo ? [wTitulo(i.titulo, 'h4')] : []),
  )
  return comGrade(s, grade(logos, { desktop: Math.min(5, Math.max(2, s.itens.length)), tablet: 3, celular: 2 }))
}

export function pTimeline(s: LpSecao): LpContainer {
  const marcos = s.itens.map((i) =>
    container([
      ...(i.extra ? [wTexto(i.extra, 'subtitulo')] : []),
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
    ]),
  )
  return comGrade(s, container(marcos, { direcao: COL, gap: { desktop: 32 } }))
}

export function pEstatisticas(s: LpSecao): LpContainer {
  const numeros: LpElemento[] = s.itens.map((i) => ({
    id: gerarId(),
    tipo: 'numero',
    valor: i.extra ?? '0',
    rotulo: i.titulo ?? '',
  }))
  return comGrade(
    s,
    grade(numeros, colunasDe(s.colunas, Math.min(4, Math.max(2, s.itens.length)))),
  )
}

export function pBlocosAlternados(s: LpSecao): LpContainer {
  const blocos = s.itens.map((i, n) => {
    const texto = container([
      ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
      ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
      ...(i.botao ? [wBotao(i.botao)] : []),
    ])
    const img = i.imagem ? [wMidia(i.imagem)] : []
    // `inverter` dizia por qual lado a alternancia comeca; agora e a ordem.
    const comecaInvertido = Boolean(s.inverter)
    const invertido = n % 2 === (comecaInvertido ? 0 : 1)
    const filhos = invertido && img.length > 0 ? [...img, texto] : [texto, ...img]
    return container(filhos, {
      direcao: img.length > 0 ? LINHA : COL,
      colunas: img.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
      alinhar: { desktop: 'centro' },
    })
  })
  return comGrade(s, container(blocos, { direcao: COL, gap: { desktop: 48 } }))
}

export function pListaBeneficios(s: LpSecao): LpContainer {
  const beneficios = s.itens.map((i) =>
    container(
      [
        ...(i.icone ? [wIcone(i.icone)] : []),
        ...(i.titulo ? [wTitulo(i.titulo, 'h3')] : []),
        ...(i.texto ? [wTexto(i.texto, 'corpo')] : []),
      ],
      { direcao: LINHA, alinhar: { desktop: 'inicio' } },
    ),
  )
  const coluna = container([
    ...cabeca(s),
    container(beneficios, { direcao: COL, gap: { desktop: 20 } }),
    ...botaoSecao(s),
  ])
  const midia = s.midia ? [wMidia(s.midia)] : []
  return container([coluna, ...midia], {
    direcao: midia.length > 0 ? LINHA : COL,
    colunas: midia.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
    alinhar: { desktop: 'centro' },
  })
}
```

- [ ] **Step 4: Registrar os 10 em `expandir.ts`**

Acrescentar ao import e ao mapa:

```ts
import {
  pBlocosAlternados,
  pCards,
  pEstatisticas,
  pGaleria,
  pGridProdutos,
  pListaBeneficios,
  pLogos,
  pMasonry,
  pPrecos,
  pTimeline,
} from './grades'
```

```ts
const EXPANSORES: Partial<Record<TipoLayout, Expansor>> = {
  hero: pHero,
  'texto-midia': pTextoMidia,
  'texto-centralizado': pTextoCentralizado,
  cta: pCta,
  banner: pBanner,
  formulario: pFormulario,
  cards: pCards,
  precos: pPrecos,
  'grid-produtos': pGridProdutos,
  'lista-beneficios': pListaBeneficios,
  galeria: pGaleria,
  masonry: pMasonry,
  logos: pLogos,
  timeline: pTimeline,
  'blocos-alternados': pBlocosAlternados,
  estatisticas: pEstatisticas,
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: PASS (18 testes)

- [ ] **Step 6: Commit**

```bash
git add lib/lp/presets/
git commit -m "feat(lp): expansor dos presets de composicao livre"
```

---

### Task 5: Os 5 presets que viram widget composto

**Files:**
- Create: `lib/lp/presets/compostos.ts`
- Modify: `lib/lp/presets/expandir.ts` (registrar os 5)
- Test: `lib/lp/presets/expandir.test.ts` (acrescentar bloco)

**Interfaces:**
- Consumes: construtores de `comum.ts` (Task 3)
- Produces: `pFaq`, `pAbas`, `pCarrossel`, `pDepoimentos`, `pComparacao` — todos `(s: LpSecao) => LpContainer`

- [ ] **Step 1: Escrever os testes (vão falhar)**

Acrescentar ao final de `lib/lp/presets/expandir.test.ts`:

```ts
describe('expandirPreset — widgets compostos', () => {
  it('faq vira um widget so, com as perguntas dentro', () => {
    const raiz = expandir(
      secao('faq', {
        titulo: 'Dúvidas',
        itens: [
          { id: 'i1', titulo: 'Pergunta?', texto: 'Resposta.' },
          { id: 'i2', titulo: 'Outra?' },
        ],
      }),
    )
    expect(forma(raiz)).toEqual({ container: ['titulo', 'faq'] })
    const faq = raiz.filhos[1]
    if (faq.tipo !== 'faq') throw new Error('esperava faq')
    expect(faq.perguntas).toEqual([
      { id: 'i1', pergunta: 'Pergunta?', resposta: 'Resposta.' },
      { id: 'i2', pergunta: 'Outra?', resposta: '' },
    ])
  })

  it('tabs vira widget de abas preservando titulo, texto e imagem', () => {
    const raiz = expandir(
      secao('tabs', { itens: [{ id: 'a1', titulo: 'Aba', texto: 'Txt', imagem: midia }] }),
    )
    const abas = raiz.filhos[0]
    if (abas.tipo !== 'abas') throw new Error('esperava abas')
    expect(abas.abas).toEqual([{ id: 'a1', titulo: 'Aba', texto: 'Txt', imagem: midia }])
  })

  it('carrossel preserva a ordem dos slides', () => {
    const raiz = expandir(
      secao('carrossel', {
        itens: [
          { id: 's1', imagem: midia, titulo: 'Um' },
          { id: 's2', titulo: 'Dois' },
        ],
      }),
    )
    const car = raiz.filhos[0]
    if (car.tipo !== 'carrossel') throw new Error('esperava carrossel')
    expect(car.slides.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('depoimentos mapeia extra para nome e detalhe para cargo', () => {
    const raiz = expandir(
      secao('depoimentos', {
        itens: [{ id: 'd1', texto: 'Ótimo', extra: 'Ana', detalhe: 'CEO', imagem: midia }],
      }),
    )
    const dep = raiz.filhos[0]
    if (dep.tipo !== 'depoimentos') throw new Error('esperava depoimentos')
    expect(dep.depoimentos).toEqual([
      { id: 'd1', texto: 'Ótimo', nome: 'Ana', cargo: 'CEO', foto: midia },
    ])
  })

  it('comparacao leva rotulos da secao e celulas de cada coluna', () => {
    const raiz = expandir(
      secao('comparacao', {
        rotulos: ['Preço', 'Suporte'],
        itens: [
          { id: 'c1', titulo: 'Básico', lista: ['R$ 9', 'Não'], destaque: false },
          { id: 'c2', titulo: 'Pro', lista: ['R$ 99', 'Sim'], destaque: true },
        ],
      }),
    )
    const comp = raiz.filhos[0]
    if (comp.tipo !== 'comparacao') throw new Error('esperava comparacao')
    expect(comp.rotulos).toEqual(['Preço', 'Suporte'])
    expect(comp.colunas).toEqual([
      { id: 'c1', titulo: 'Básico', celulas: ['R$ 9', 'Não'], destaque: false },
      { id: 'c2', titulo: 'Pro', celulas: ['R$ 99', 'Sim'], destaque: true },
    ])
  })

  it('todo preset do catalogo tem expansor', () => {
    for (const info of LAYOUTS) {
      const raiz = expandir(secao(info.tipo, { titulo: 'T' }))
      expect(raiz.filhos.length, `preset ${info.tipo} sem expansor`).toBeGreaterThan(0)
    }
  })
})
```

E acrescentar ao topo do arquivo de teste:

```ts
import { LAYOUTS } from '../layouts'
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: FAIL — os 5 casos novos e o de cobertura do catálogo falham; os 18 anteriores passam.

- [ ] **Step 3: Escrever `lib/lp/presets/compostos.ts`**

```ts
/**
 * Presets que continuam widget fechado. Sao os que carregam JavaScript e
 * semantica de acessibilidade — details/summary, aria dos slides, table de
 * verdade —, e que uma arvore montada a mao quebraria sem aviso.
 */

import type { LpContainer, LpSecao, LpWidget } from '../tipos'
import { gerarId } from '../util'
import { botaoSecao, cabeca, container } from './comum'

/** cabeca + o widget + botao da secao. */
const comWidget = (s: LpSecao, w: LpWidget): LpContainer =>
  container([...cabeca(s), w, ...botaoSecao(s)])

export function pFaq(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'faq',
    perguntas: s.itens.map((i) => ({
      id: i.id,
      pergunta: i.titulo ?? '',
      resposta: i.texto ?? '',
    })),
  })
}

export function pAbas(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'abas',
    abas: s.itens.map((i) => ({
      id: i.id,
      titulo: i.titulo ?? '',
      texto: i.texto ?? '',
      imagem: i.imagem ?? null,
    })),
  })
}

export function pCarrossel(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'carrossel',
    slides: s.itens.map((i) => ({
      id: i.id,
      imagem: i.imagem ?? null,
      titulo: i.titulo,
      texto: i.texto,
    })),
  })
}

export function pDepoimentos(s: LpSecao): LpContainer {
  // No LpItem do depoimento, `extra` e o nome e `detalhe` e o cargo (ver o
  // comentario de LpItem em tipos.ts e ROTULO_ITEM em layouts.ts).
  return comWidget(s, {
    id: gerarId(),
    tipo: 'depoimentos',
    depoimentos: s.itens.map((i) => ({
      id: i.id,
      texto: i.texto ?? '',
      nome: i.extra ?? '',
      cargo: i.detalhe,
      foto: i.imagem ?? null,
    })),
  })
}

export function pComparacao(s: LpSecao): LpContainer {
  return comWidget(s, {
    id: gerarId(),
    tipo: 'comparacao',
    rotulos: s.rotulos ?? [],
    colunas: s.itens.map((i) => ({
      id: i.id,
      titulo: i.titulo ?? '',
      celulas: i.lista ?? [],
      destaque: i.destaque,
    })),
  })
}
```

- [ ] **Step 4: Registrar os 5 em `expandir.ts`**

```ts
import { pAbas, pCarrossel, pComparacao, pDepoimentos, pFaq } from './compostos'
```

Acrescentar ao mapa:

```ts
  faq: pFaq,
  tabs: pAbas,
  carrossel: pCarrossel,
  depoimentos: pDepoimentos,
  comparacao: pComparacao,
```

Com os 21 registrados, o mapa deixa de ser parcial. Substituir a declaração inteira e a função por:

```ts
const EXPANSORES: Record<TipoLayout, Expansor> = {
  hero: pHero,
  'texto-midia': pTextoMidia,
  'texto-centralizado': pTextoCentralizado,
  cta: pCta,
  banner: pBanner,
  formulario: pFormulario,
  cards: pCards,
  precos: pPrecos,
  'grid-produtos': pGridProdutos,
  'lista-beneficios': pListaBeneficios,
  galeria: pGaleria,
  masonry: pMasonry,
  logos: pLogos,
  timeline: pTimeline,
  'blocos-alternados': pBlocosAlternados,
  estatisticas: pEstatisticas,
  faq: pFaq,
  tabs: pAbas,
  carrossel: pCarrossel,
  depoimentos: pDepoimentos,
  comparacao: pComparacao,
}

export function expandirPreset(s: LpSecao): { raiz: LpContainer; secao: LpSecao } {
  const secao = ajustarSecao(s)
  // O cast e proposital: `tipo` vem do Firestore e da IA, entao em tempo de
  // execucao pode ser um valor fora do catalogo, por mais que o tipo estatico
  // diga que nao.
  const expansor = EXPANSORES[secao.tipo] as Expansor | undefined
  // Tipo fora do catalogo cai num container vazio: melhor uma secao para o
  // usuario preencher do que um projeto que nao abre.
  return { raiz: expansor ? expansor(secao) : container([]), secao }
}
```

`Record` completo em vez de `Partial` faz o TypeScript recusar o build se um preset novo entrar em `TipoLayout` sem expansor.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: PASS (24 testes)

- [ ] **Step 6: Rodar tudo**

Run: `npm test && npm run typecheck && npm run lint`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add lib/lp/presets/
git commit -m "feat(lp): expansor dos presets com widget composto"
```

---

### Task 6: Migração do documento

**Files:**
- Create: `lib/lp/migrar.ts`
- Test: `lib/lp/migrar.test.ts`

**Interfaces:**
- Consumes: `expandirPreset` (Tasks 3-5)
- Produces: `migrarDocumentoParaArvore(doc: LpDocumento): LpDocumento` e `precisaMigrar(doc: LpDocumento | null): boolean`

**Nota de escopo:** esta função **não** é chamada em `persistencia.ts` nesta entrega. Ligá-la é a última etapa da Entrega 2, quando o compilador souber renderizar árvore. Chamar agora deixaria toda página em branco.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Criar `lib/lp/migrar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { migrarDocumentoParaArvore, precisaMigrar } from './migrar'
import type { LpDocumento, LpSecao } from './tipos'

const doc = (secoes: LpSecao[], versao?: 2): LpDocumento => ({
  ...(versao ? { versao } : {}),
  seo: { titulo: '', descricao: '' },
  tema: { tipografia: {}, cores: {}, raio: 8 } as LpDocumento['tema'],
  header: { logoTexto: 'X', menu: [], fixo: false, botoes: [] },
  secoes,
  footer: { linksUteis: [], menuSecundario: false },
  redes: [],
})

const secao = (extra: Partial<LpSecao> = {}): LpSecao => ({
  id: 's1',
  tipo: 'cta',
  nome: 'CTA',
  ancora: 'cta',
  titulo: 'Fale conosco',
  itens: [],
  largura: 'boxed',
  ...extra,
})

describe('precisaMigrar', () => {
  it('documento sem versao precisa', () => {
    expect(precisaMigrar(doc([secao()]))).toBe(true)
  })

  it('documento com versao 2 nao precisa', () => {
    expect(precisaMigrar(doc([secao()], 2))).toBe(false)
  })

  it('documento nulo nao precisa', () => {
    expect(precisaMigrar(null)).toBe(false)
  })
})

describe('migrarDocumentoParaArvore', () => {
  it('carimba versao 2 e cria a raiz de cada secao', () => {
    const migrado = migrarDocumentoParaArvore(doc([secao(), secao({ id: 's2' })]))
    expect(migrado.versao).toBe(2)
    expect(migrado.secoes.every((s) => s.raiz !== undefined)).toBe(true)
  })

  it('guarda o preset de origem e preserva id, nome e ancora', () => {
    const migrado = migrarDocumentoParaArvore(doc([secao()]))
    expect(migrado.secoes[0]).toMatchObject({
      id: 's1',
      nome: 'CTA',
      ancora: 'cta',
      preset: 'cta',
    })
  })

  it('nao altera o documento recebido', () => {
    const original = doc([secao()])
    migrarDocumentoParaArvore(original)
    expect(original.versao).toBeUndefined()
    expect(original.secoes[0].raiz).toBeUndefined()
  })

  it('documento ja em v2 passa intacto', () => {
    const ja = doc([secao()], 2)
    expect(migrarDocumentoParaArvore(ja)).toBe(ja)
  })

  it('preserva header, footer, tema e paginas', () => {
    const entrada = doc([secao()])
    entrada.paginas = [{ tipo: 'termos', titulo: 'Termos', conteudo: 'x' }]
    const migrado = migrarDocumentoParaArvore(entrada)
    expect(migrado.header).toEqual(entrada.header)
    expect(migrado.footer).toEqual(entrada.footer)
    expect(migrado.paginas).toEqual(entrada.paginas)
  })

  it('o texto do documento sobrevive a migracao', () => {
    const migrado = migrarDocumentoParaArvore(doc([secao({ titulo: 'Fale conosco' })]))
    const raiz = migrado.secoes[0].raiz
    if (!raiz) throw new Error('esperava raiz')
    const titulo = raiz.filhos[0]
    if (titulo.tipo !== 'titulo') throw new Error('esperava titulo')
    expect(titulo.texto).toBe('Fale conosco')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/migrar.test.ts`
Expected: FAIL — `Failed to resolve import "./migrar"`

- [ ] **Step 3: Escrever `lib/lp/migrar.ts`**

```ts
/**
 * Conversao do documento de secoes tipadas para arvore de elementos.
 *
 * NAO e chamada ainda: quem liga e persistencia.ts na Entrega 2, depois que o
 * compilador souber renderizar arvore. Ligar antes disso deixa toda pagina em
 * branco.
 *
 * A conversao e de mao unica. Quem chamar deve guardar o documento original em
 * `documentoV1` na primeira escrita — e a rede de protecao contra um expansor
 * errado estragar a pagina de um cliente.
 */

import { expandirPreset } from './presets/expandir'
import type { LpDocumento } from './tipos'

/** Documento salvo antes da arvore (sem `versao`). */
export function precisaMigrar(doc: LpDocumento | null | undefined): boolean {
  return Boolean(doc) && doc?.versao !== 2
}

/**
 * Devolve o documento em arvore. Nao muta a entrada: o chamador precisa do
 * original intacto para gravar em `documentoV1`. Documento ja em v2 volta como
 * esta, pela mesma referencia.
 */
export function migrarDocumentoParaArvore(doc: LpDocumento): LpDocumento {
  if (!precisaMigrar(doc)) return doc
  return {
    ...doc,
    versao: 2,
    secoes: doc.secoes.map((secao) => {
      // `expandirPreset` e puro: `ajustada` ja vem com a midia do banner movida
      // para o fundo, e `secao` continua intacta para o documentoV1.
      const { raiz, secao: ajustada } = expandirPreset(secao)
      return { ...ajustada, preset: secao.tipo, raiz }
    }),
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run lib/lp/migrar.test.ts`
Expected: PASS (10 testes)

- [ ] **Step 5: Rodar tudo e confirmar que a aplicação segue igual**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tudo passa. O `build` é o que prova a constraint global: nada foi ligado, então a aplicação compila como antes.

- [ ] **Step 6: Commit**

```bash
git add lib/lp/migrar.ts lib/lp/migrar.test.ts
git commit -m "feat(lp): migracao do documento para arvore (ainda nao ligada)"
```

---

## Ao final da entrega

Existe e está testado: o modelo em árvore, o caminhamento, os 21 expansores, a migração e a `arquivosUsados` já preparada para os dois formatos. Nada disso está ligado — a aplicação se comporta exatamente como antes.

A Entrega 2 (compilador recursivo) é quem chama `migrarDocumentoParaArvore` em `persistencia.ts`, grava `documentoV1` na primeira escrita e remove os campos antigos de `LpSecao`.
