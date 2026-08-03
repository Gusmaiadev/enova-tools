# Editor de LP — Entrega 2, Parte 1: renderizador de árvore

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O compilador passa a saber renderizar a árvore de elementos — HTML, CSS por breakpoint e JS — produzindo página visualmente equivalente à de hoje, sem que nada ainda dependa disso.

**Architecture:** O compilador aceita **os dois formatos**: `htmlSecao` renderiza `secao.raiz` quando ela existe e cai no layout tipado quando não. Como a migração não está ligada (Entrega 1), nenhum documento em produção tem `raiz`, então a aplicação segue idêntica. Isso também dá o arnês de equivalência: o mesmo documento pode ser renderizado pelos dois caminhos e comparado.

**Tech Stack:** TypeScript, vitest, sem dependências novas.

## Global Constraints

- **Não ligar nada.** `lib/lp/persistencia.ts` e `components/` não são tocados. Nenhum campo de `LpSecao` é removido. Ao final, `npm run build` passa e o app se comporta como antes.
- O caminho tipado atual (`corpo[s.tipo]()` em `htmlSecao`) **continua funcionando e não muda de saída**. Ele só deixa de ser usado quando a seção tem `raiz`.
- Segurança inalterada: `esc()` em texto, `urlSegura()` em URL, `corSegura()`/`escCss()` em cor — e agora também em todo valor de `LpEstilo` que vira CSS.
- Comentários em português sem acento, como nos arquivos vizinhos. Testes com `describe`/`it` em português.
- Ids por `gerarId()`. Commits pequenos, um por task, na branch `feat/editor-lp-entrega-2`.
- Breakpoints são os que já existem: base, `@media (max-width:900px)` (tablet), `@media (max-width:640px)` (celular).

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/lp/tipos.ts` (modificar) | `aparencia?` em `LpContainer` |
| `lib/lp/presets/*.ts` (modificar) | Expansores seedam `aparencia` |
| `lib/lp/compilador/widgets.ts` (criar) | HTML de cada widget — um `RENDER` por tipo |
| `lib/lp/compilador/arvore.ts` (criar) | Render recursivo do container + despacho |
| `lib/lp/compilador/estilo.ts` (criar) | `LpEstilo` + container → CSS, agrupado por breakpoint |
| `lib/lp/compilador/estilo.test.ts` (criar) | Testes do CSS gerado |
| `lib/lp/compilador/html.ts` (modificar) | `htmlSecao` escolhe árvore ou layout tipado |
| `lib/lp/compilador/css.ts` (modificar) | Bloco `APARENCIAS` + CSS gerado dos elementos |
| `lib/lp/compilador/js.ts` (modificar) | Módulos por widget em uso, varrendo a árvore |
| `lib/lp/compilador/equivalencia.test.ts` (criar) | Os 21 presets: árvore vs. tipado |

---

### Task 1: `aparencia` no container e nos expansores

O CSS de hoje dá identidade visual a cada layout — `.lp-card` tem borda, fundo e um hover que sobe 6px; `.lp-preco.destaque` tem o selo "Mais popular" via `::before`. Container genérico não carrega nada disso, e `LpEstilo` não tem hover nem pseudo-elemento. `aparencia` é o gancho que preserva essa identidade.

**Files:**
- Modify: `lib/lp/tipos.ts` (em `LpContainer`)
- Modify: `lib/lp/presets/comum.ts`, `grades.ts`, `simples.ts`
- Test: `lib/lp/presets/expandir.test.ts`

**Interfaces:**
- Produces: `Aparencia` exportado de `tipos.ts`; `container()` aceitando `aparencia` via `props`

- [ ] **Step 1: Escrever o teste (vai falhar)**

Acrescentar ao bloco `describe('expandirPreset — composicao livre')` em `lib/lp/presets/expandir.test.ts`:

```ts
  it('cards recebem aparencia de card', () => {
    const raiz = expandir(secao('cards', { itens: [{ id: 'i1', titulo: 'C' }] }))
    const grade = raiz.filhos[0]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    const card = grade.filhos[0]
    if (card.tipo !== 'container') throw new Error('esperava container')
    expect(card.aparencia).toBe('card')
  })

  it('plano em destaque recebe aparencia propria', () => {
    const raiz = expandir(
      secao('precos', {
        itens: [
          { id: 'p1', titulo: 'Basico' },
          { id: 'p2', titulo: 'Pro', destaque: true },
        ],
      }),
    )
    const grade = raiz.filhos[0]
    if (grade.tipo !== 'container') throw new Error('esperava container')
    const [normal, destaque] = grade.filhos
    if (normal.tipo !== 'container' || destaque.tipo !== 'container') {
      throw new Error('esperava containers')
    }
    expect(normal.aparencia).toBe('plano')
    expect(destaque.aparencia).toBe('plano-destaque')
  })

  it('produtos, blocos e figuras recebem a aparencia correspondente', () => {
    const prod = expandir(secao('grid-produtos', { itens: [{ id: 'i1', titulo: 'P' }] }))
    const gradeProd = prod.filhos[0]
    if (gradeProd.tipo !== 'container') throw new Error('esperava container')
    expect((gradeProd.filhos[0] as { aparencia?: string }).aparencia).toBe('produto')

    const gal = expandir(secao('galeria', { itens: [{ id: 'i1', imagem: midia }] }))
    const gradeGal = gal.filhos[0]
    if (gradeGal.tipo !== 'container') throw new Error('esperava container')
    expect((gradeGal.filhos[0] as { aparencia?: string }).aparencia).toBe('figura')
  })

  it('container sem identidade visual nao ganha aparencia', () => {
    const raiz = expandir(secao('texto-centralizado', { titulo: 'T' }))
    expect(raiz.aparencia).toBeUndefined()
  })
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: FAIL — 4 novos casos; `aparencia` não existe no tipo (erro de compilação do vitest) e os valores voltam `undefined`.

- [ ] **Step 3: Acrescentar o tipo**

Em `lib/lp/tipos.ts`, antes de `export type LpContainer`:

```ts
/**
 * Identidade visual pronta de um container. Vira uma classe no HTML e carrega o
 * que `LpEstilo` nao alcanca: hover, transicao e pseudo-elemento (o selo "Mais
 * popular" do plano em destaque e um ::before). `estilo` sobrepoe por cima.
 */
export type Aparencia =
  | 'card'
  | 'plano'
  | 'plano-destaque'
  | 'produto'
  | 'bloco'
  | 'figura'
  | 'beneficio'
  | 'marco'
  | 'caixa-cta'
```

E dentro de `LpContainer`, logo depois de `tipo: 'container'`:

```ts
  /** Ausente = container sem identidade visual propria. */
  aparencia?: Aparencia
```

- [ ] **Step 4: Seedar nos expansores**

Em `lib/lp/presets/grades.ts`, passar `aparencia` no `container()` de cada item:

```ts
// pCards — o container do card
container([...], { aparencia: 'card' })

// pPrecos — destaque muda a aparencia, nao so uma flag
container([...], { aparencia: i.destaque ? 'plano-destaque' : 'plano' })

// pGridProdutos
container([...], { aparencia: 'produto' })

// galeriaOuMasonry
container([...], { aparencia: 'figura' })

// pTimeline — cada marco
container([...], { aparencia: 'marco' })

// pBlocosAlternados — cada bloco
container(filhos, { direcao: …, colunas: …, alinhar: …, aparencia: 'bloco' })

// pListaBeneficios — cada beneficio
container([...], { direcao: LINHA, alinhar: { desktop: 'inicio' }, aparencia: 'beneficio' })
```

Em `lib/lp/presets/simples.ts`, `pCta` ganha a caixa em gradiente que o layout tinha:

```ts
export function pCta(s: LpSecao): LpContainer {
  return container([...cabeca(s), ...botaoSecao(s)], {
    alinhar: { desktop: 'centro' },
    aparencia: 'caixa-cta',
  })
}
```

`pLogos` e `pEstatisticas` não recebem aparência: logo e big number não têm caixa própria no CSS atual — a identidade deles está no widget (`lp-stat-valor`) ou na imagem em tons de cinza, que sai no CSS de aparência da figura.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run lib/lp/presets/expandir.test.ts`
Expected: PASS (30 testes)

- [ ] **Step 6: Suíte e typecheck**

Run: `npm test && npm run typecheck`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add lib/lp/tipos.ts lib/lp/presets/
git commit -m "feat(lp): aparencia no container, seedada pelos expansores"
```

---

### Task 2: HTML dos widgets simples e do container

**Files:**
- Create: `lib/lp/compilador/widgets.ts`
- Create: `lib/lp/compilador/arvore.ts`
- Test: `lib/lp/compilador/arvore.test.ts`

**Interfaces:**
- Consumes: `Ctx`, `alvo`, `htmlMidia`, `htmlBotao`, `quebras` de `html.ts` (precisam ser exportados)
- Produces: `renderElemento(ctx, el) => string` de `arvore.ts`; `RENDER_SIMPLES` de `widgets.ts`

- [ ] **Step 1: Exportar de `html.ts` o que o renderizador precisa**

Em `lib/lp/compilador/html.ts`, trocar de `function` privada para `export function`/`export const` (sem mudar corpo nenhum):

```ts
export type Ctx = { … }              // ja existe como `type Ctx`
export const alvo = (ctx: Ctx, caminho: string) => …
export function htmlMidia(ctx: Ctx, midia: LpMidia, caminho: string): string
export function htmlBotao(ctx: Ctx, botao: LpBotao, caminho: string, extra = ''): string
export const quebras = (texto: string) => …
export function urlMidia(ctx: Ctx, midia: LpMidia): string
```

- [ ] **Step 2: Escrever o teste (vai falhar)**

Criar `lib/lp/compilador/arvore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renderElemento } from './arvore'
import type { Ctx } from './html'
import type { LpContainer, LpMidia } from '../tipos'

const ctx = (): Ctx => ({ modo: 'export', midias: [] })
const ctxEditor = (): Ctx => ({ modo: 'editor', midias: [] })

const midia: LpMidia = {
  tipo: 'imagem',
  url: 'https://x/foto.jpg',
  alt: 'Alt',
  busca: '',
  orientacao: 'paisagem',
}

describe('renderElemento — widgets simples', () => {
  it('titulo sai na tag do nivel, com a classe do elemento', () => {
    const html = renderElemento(ctx(), { id: 'a', tipo: 'titulo', nivel: 'h1', texto: 'Oi' })
    expect(html).toBe('<h1 class="lp-el-titulo lp-e-a">Oi</h1>')
  })

  it('texto de subtitulo e de corpo usam classes diferentes', () => {
    const sub = renderElemento(ctx(), { id: 'b', tipo: 'texto', papel: 'subtitulo', texto: 'S' })
    const corpo = renderElemento(ctx(), { id: 'c', tipo: 'texto', papel: 'corpo', texto: 'C' })
    expect(sub).toContain('lp-subtitulo')
    expect(corpo).toContain('lp-texto')
  })

  it('escapa o texto do usuario e converte quebra de linha', () => {
    const html = renderElemento(ctx(), {
      id: 'd',
      tipo: 'titulo',
      nivel: 'h2',
      texto: '<script>x</script>\nlinha2',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<br>')
  })

  it('imagem sai dentro de .lp-midia', () => {
    const html = renderElemento(ctx(), { id: 'e', tipo: 'imagem', midia })
    expect(html).toContain('class="lp-midia')
    expect(html).toContain('src="https://x/foto.jpg"')
    expect(html).toContain('alt="Alt"')
  })

  it('numero traz o contador e o rotulo', () => {
    const html = renderElemento(ctx(), { id: 'f', tipo: 'numero', valor: '100+', rotulo: 'Clientes' })
    expect(html).toContain('data-contar')
    expect(html).toContain('100+')
    expect(html).toContain('Clientes')
  })

  it('divisor e espacador saem sem conteudo', () => {
    expect(renderElemento(ctx(), { id: 'g', tipo: 'divisor' })).toBe('<hr class="lp-divisor lp-e-g">')
    expect(
      renderElemento(ctx(), { id: 'h', tipo: 'espacador', altura: { desktop: 40 } }),
    ).toBe('<div class="lp-espacador lp-e-h"></div>')
  })
})

describe('renderElemento — container', () => {
  const arvore: LpContainer = {
    id: 'r',
    tipo: 'container',
    direcao: { desktop: 'coluna' },
    aparencia: 'card',
    filhos: [
      { id: 't', tipo: 'titulo', nivel: 'h3', texto: 'T' },
      { id: 'p', tipo: 'texto', papel: 'corpo', texto: 'P' },
    ],
  }

  it('emite a classe do container, a da aparencia e a do elemento', () => {
    const html = renderElemento(ctx(), arvore)
    expect(html).toContain('class="lp-c lp-ap-card lp-e-r"')
  })

  it('renderiza os filhos na ordem', () => {
    const html = renderElemento(ctx(), arvore)
    expect(html.indexOf('<h3')).toBeLessThan(html.indexOf('lp-texto'))
  })

  it('container vazio nao quebra', () => {
    const html = renderElemento(ctx(), {
      id: 'v',
      tipo: 'container',
      direcao: { desktop: 'coluna' },
      filhos: [],
    })
    expect(html).toBe('<div class="lp-c lp-e-v"></div>')
  })
})

describe('renderElemento — modo editor', () => {
  it('emite data-lp com o id do no so no editor', () => {
    const el = { id: 'x1', tipo: 'titulo', nivel: 'h2', texto: 'T' } as const
    expect(renderElemento(ctxEditor(), el)).toContain('data-lp="el:x1"')
    expect(renderElemento(ctx(), el)).not.toContain('data-lp')
  })
})
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/compilador/arvore.test.ts`
Expected: FAIL — `Failed to resolve import "./arvore"`

- [ ] **Step 4: Escrever `lib/lp/compilador/widgets.ts`**

```ts
/**
 * HTML de cada widget da arvore. As classes reaproveitam o CSS que a pagina ja
 * usa (.lp-subtitulo, .lp-midia, .lp-btn, .lp-icone, .lp-stat-*) — mudar o
 * modelo de dados nao pode mudar a aparencia da pagina.
 */

import { svgIcone } from '../icones'
import type { LpWidget } from '../tipos'
import { type Ctx, alvo, htmlBotao, htmlMidia, quebras } from './html'

/** Classe de um no: a fixa do widget mais a do id, para o CSS gerado alcancar. */
const cls = (fixa: string, id: string) => `${fixa} lp-e-${id}`.trim()

export function renderWidget(ctx: Ctx, w: LpWidget): string {
  const marca = alvo(ctx, `el:${w.id}`)
  switch (w.tipo) {
    case 'titulo':
      return `<${w.nivel} class="${cls('lp-el-titulo', w.id)}"${marca}>${quebras(w.texto)}</${w.nivel}>`
    case 'texto': {
      const base = w.papel === 'subtitulo' ? 'lp-subtitulo lp-el-subtitulo' : 'lp-texto lp-el-texto'
      return `<p class="${cls(base, w.id)}"${marca}>${quebras(w.texto)}</p>`
    }
    case 'imagem':
    case 'video':
      // htmlMidia ja emite .lp-midia e trata img/video, poster e autoplay.
      return htmlMidia(ctx, w.midia, `el:${w.id}`)
    case 'botao':
      return htmlBotao(ctx, w.botao, `el:${w.id}`, `lp-e-${w.id}`)
    case 'icone':
      return `<span class="${cls('lp-icone', w.id)}"${marca}>${svgIcone(w.nome)}</span>`
    case 'numero':
      return (
        `<div class="${cls('lp-stat', w.id)}"${marca}>` +
        `<div class="lp-stat-valor" data-contar>${quebras(w.valor)}</div>` +
        `<div class="lp-stat-rotulo">${quebras(w.rotulo)}</div>` +
        `</div>`
      )
    case 'lista': {
      const itens = w.itens
        .map((i) => `<li>${svgIcone(i.icone ?? 'check')}<span>${quebras(i.texto)}</span></li>`)
        .join('')
      return `<ul class="${cls('lp-lista', w.id)}"${marca}>${itens}</ul>`
    }
    case 'espacador':
      return `<div class="${cls('lp-espacador', w.id)}"${marca}></div>`
    case 'divisor':
      return `<hr class="${cls('lp-divisor', w.id)}"${marca}>`
    default:
      // Widgets compostos entram na Task 3.
      return ''
  }
}
```

- [ ] **Step 5: Escrever `lib/lp/compilador/arvore.ts`**

```ts
/**
 * Render recursivo da arvore de elementos da secao. Substitui as 21 funcoes de
 * layout: a estrutura agora e dado, nao codigo.
 */

import type { Aparencia, LpElemento } from '../tipos'
import { type Ctx, alvo } from './html'
import { renderWidget } from './widgets'

/** Classe CSS da aparencia do container. */
const CLASSE_APARENCIA: Record<Aparencia, string> = {
  card: 'lp-ap-card',
  plano: 'lp-ap-plano',
  'plano-destaque': 'lp-ap-plano lp-ap-destaque',
  produto: 'lp-ap-produto',
  bloco: 'lp-ap-bloco',
  figura: 'lp-ap-figura',
  beneficio: 'lp-ap-beneficio',
  marco: 'lp-ap-marco',
  'caixa-cta': 'lp-ap-caixa-cta',
}

export function renderElemento(ctx: Ctx, el: LpElemento): string {
  if (el.tipo !== 'container') return renderWidget(ctx, el)
  const classes = ['lp-c', el.aparencia ? CLASSE_APARENCIA[el.aparencia] : '', `lp-e-${el.id}`]
    .filter(Boolean)
    .join(' ')
  const filhos = el.filhos.map((f) => renderElemento(ctx, f)).join('')
  return `<div class="${classes}"${alvo(ctx, `el:${el.id}`)}>${filhos}</div>`
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run lib/lp/compilador/arvore.test.ts`
Expected: PASS (10 testes)

- [ ] **Step 7: Suíte, typecheck e commit**

```bash
npm test && npm run typecheck && npm run lint
git add lib/lp/compilador/
git commit -m "feat(lp): render recursivo do container e dos widgets simples"
```

---

### Task 3: HTML dos widgets compostos

Herdam quase inteiras as funções de hoje — é o que garante que o `<details>/<summary>` do FAQ, o `aria-label` dos slides e a `<table>` da comparação continuem iguais.

**Files:**
- Modify: `lib/lp/compilador/widgets.ts`
- Test: `lib/lp/compilador/arvore.test.ts`

**Interfaces:**
- Consumes: `slider()` de `html.ts` (exportar)
- Produces: `renderWidget` cobrindo os 15 tipos

- [ ] **Step 1: Escrever o teste (vai falhar)**

Acrescentar a `lib/lp/compilador/arvore.test.ts`:

```ts
describe('renderElemento — widgets compostos', () => {
  it('faq usa details/summary, com o primeiro aberto', () => {
    const html = renderElemento(ctx(), {
      id: 'f1',
      tipo: 'faq',
      perguntas: [
        { id: 'p1', pergunta: 'Um?', resposta: 'R1' },
        { id: 'p2', pergunta: 'Dois?', resposta: 'R2' },
      ],
    })
    expect(html).toContain('<details open>')
    expect((html.match(/<details/g) ?? []).length).toBe(2)
    expect(html).toContain('<summary>')
    expect(html).toContain('Um?')
  })

  it('abas emitem nav e paineis casados por indice', () => {
    const html = renderElemento(ctx(), {
      id: 'a1',
      tipo: 'abas',
      abas: [
        { id: 't1', titulo: 'A', texto: 'TA' },
        { id: 't2', titulo: 'B', texto: 'TB' },
      ],
    })
    expect(html).toContain('data-tab="0"')
    expect(html).toContain('data-painel="0"')
    expect(html).toContain('class="lp-tabs-nav"')
  })

  it('comparacao sai como tabela com cabecalho e linhas', () => {
    const html = renderElemento(ctx(), {
      id: 'c1',
      tipo: 'comparacao',
      rotulos: ['Preco'],
      colunas: [{ id: 'x', titulo: 'Pro', celulas: ['R$ 9'], destaque: true }],
    })
    expect(html).toContain('<table>')
    expect(html).toContain('<th class="destaque"')
    expect(html).toContain('R$ 9')
  })

  it('celula "sim" vira check e "nao" vira travessao', () => {
    const html = renderElemento(ctx(), {
      id: 'c2',
      tipo: 'comparacao',
      rotulos: ['A', 'B'],
      colunas: [{ id: 'x', titulo: 'P', celulas: ['sim', 'nao'] }],
    })
    expect(html).toContain('class="sim"')
    expect(html).toContain('class="nao"')
  })

  it('formulario emite honeypot e so confirma com destino', () => {
    const comDestino = renderElemento(ctx(), { id: 'fo', tipo: 'formulario', destino: 'https://x/y' })
    expect(comDestino).toContain('lp-mel')
    expect(comDestino).toContain('data-destino="https://x/y"')
    expect(comDestino).toContain('lp-form-ok')

    const sem = renderElemento(ctx(), { id: 'fo2', tipo: 'formulario' })
    expect(sem).not.toContain('data-destino')
    expect(sem).not.toContain('lp-form-ok')
  })

  it('depoimentos e carrossel usam o mesmo mecanismo de slider', () => {
    const dep = renderElemento(ctx(), {
      id: 'd1',
      tipo: 'depoimentos',
      depoimentos: [
        { id: '1', texto: 'Otimo', nome: 'Ana', cargo: 'CEO' },
        { id: '2', texto: 'Bom', nome: 'Beto' },
      ],
    })
    expect(dep).toContain('lp-slider-trilho')
    expect(dep).toContain('Ana')

    const car = renderElemento(ctx(), {
      id: 'k1',
      tipo: 'carrossel',
      slides: [
        { id: '1', titulo: 'Um' },
        { id: '2', titulo: 'Dois' },
      ],
    })
    expect(car).toContain('lp-slider-trilho')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/compilador/arvore.test.ts`
Expected: FAIL — os 6 casos novos voltam string vazia (o `default` da Task 2).

- [ ] **Step 3: Exportar `slider` e `celula` de `html.ts`**

Trocar `function slider(...)` por `export function slider(...)` e `function celula(...)` por `export function celula(...)`. Corpos inalterados.

- [ ] **Step 4: Completar `widgets.ts`**

Substituir o `default` por:

```ts
    case 'faq': {
      const chevron = svgIcone('chevron-baixo')
      const itens = w.perguntas
        .map(
          (p, n) =>
            `<details${n === 0 ? ' open' : ''}><summary><span>${quebras(p.pergunta)}</span>${chevron}</summary>` +
            `<div class="lp-faq-corpo"><p class="lp-faq-resposta">${quebras(p.resposta)}</p></div></details>`,
        )
        .join('')
      return `<div class="${cls('lp-faq', w.id)}"${marca}>${itens}</div>`
    }
    case 'abas': {
      const nav = w.abas
        .map(
          (a, n) =>
            `<button type="button" class="${n === 0 ? 'ativo' : ''}" data-tab="${n}">${quebras(a.titulo)}</button>`,
        )
        .join('')
      const paineis = w.abas
        .map((a, n) => {
          const img = a.imagem ? htmlMidia(ctx, a.imagem, `el:${w.id}:aba:${a.id}`) : ''
          return (
            `<div class="lp-tab-painel${n === 0 ? ' ativo' : ''}${img ? '' : ' sozinho'}" data-painel="${n}">` +
            `<div><p class="lp-tab-texto">${quebras(a.texto)}</p></div>${img}</div>`
          )
        })
        .join('')
      return `<div class="${cls('lp-tabs', w.id)}"${marca}><div class="lp-tabs-nav">${nav}</div>${paineis}</div>`
    }
    case 'carrossel': {
      const slides = w.slides.map((s) => {
        const img = s.imagem ? htmlMidia(ctx, s.imagem, `el:${w.id}:slide:${s.id}`) : ''
        const t = s.titulo ? `<h3 class="lp-slide-titulo">${quebras(s.titulo)}</h3>` : ''
        const p = s.texto ? `<p class="lp-slide-texto">${quebras(s.texto)}</p>` : ''
        return `<div>${img}${t}${p}</div>`
      })
      return `<div class="${cls('lp-carrossel', w.id)}"${marca}>${slider(slides, 'slide')}</div>`
    }
    case 'depoimentos': {
      const slides = w.depoimentos.map((d) => {
        const foto = d.foto
          ? `<img src="${esc(urlMidia(ctx, d.foto))}" alt="${esc(d.foto.alt)}" loading="lazy">`
          : ''
        const cargo = d.cargo ? `<div class="lp-depo-cargo">${quebras(d.cargo)}</div>` : ''
        return (
          `<div><blockquote>${svgIcone('aspas')}<p class="lp-depo-fala">${quebras(d.texto)}</p></blockquote>` +
          `<div class="lp-depo-autor">${foto}<div class="lp-depo-nome">${quebras(d.nome)}</div>${cargo}</div></div>`
        )
      })
      return `<div class="${cls('lp-depo', w.id)}"${marca}>${slider(slides, 'depoimento')}</div>`
    }
    case 'comparacao': {
      const cabecalho = w.colunas
        .map((c) => `<th${c.destaque ? ' class="destaque"' : ''}>${quebras(c.titulo)}</th>`)
        .join('')
      const linhas = w.rotulos
        .map((rotulo, n) => {
          const celulas = w.colunas
            .map((c) => `<td${c.destaque ? ' class="destaque"' : ''}>${celula(c.celulas[n] ?? '')}</td>`)
            .join('')
          return `<tr><td>${esc(rotulo)}</td>${celulas}</tr>`
        })
        .join('')
      return (
        `<div class="${cls('lp-comp', w.id)}"${marca}><table><thead><tr><th></th>${cabecalho}</tr></thead>` +
        `<tbody>${linhas}</tbody></table></div>`
      )
    }
    case 'formulario': {
      const destino = w.destino ? ` data-destino="${esc(urlSegura(w.destino))}"` : ''
      const confirmacao = w.destino
        ? '<div class="lp-form-ok">Mensagem enviada com sucesso! Retornaremos em breve.</div>'
        : ''
      return (
        `<form class="${cls('lp-form', w.id)}" novalidate${destino}${marca}>` +
        `<input class="lp-mel" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">` +
        `<label>Nome<input type="text" name="nome" required placeholder="Seu nome"></label>` +
        `<label>E-mail<input type="email" name="email" required placeholder="voce@email.com"></label>` +
        `<label>Telefone<input type="tel" name="telefone" placeholder="(00) 00000-0000"></label>` +
        `<label>Mensagem<textarea name="mensagem" required placeholder="Como podemos ajudar?"></textarea></label>` +
        `${confirmacao}<button class="lp-btn" type="submit">Enviar mensagem</button></form>`
      )
    }
```

E completar os imports do arquivo:

```ts
import { svgIcone } from '../icones'
import { esc, urlSegura } from '../util'
import { type Ctx, alvo, celula, htmlBotao, htmlMidia, quebras, slider, urlMidia } from './html'
```

- [ ] **Step 5: Rodar, verificar e commitar**

```bash
npx vitest run lib/lp/compilador/arvore.test.ts   # 16 passando
npm test && npm run typecheck && npm run lint
git add lib/lp/compilador/
git commit -m "feat(lp): render dos widgets compostos na arvore"
```

---

### Task 4: CSS gerado — container, estilo e breakpoints

**Files:**
- Create: `lib/lp/compilador/estilo.ts`
- Test: `lib/lp/compilador/estilo.test.ts`

**Interfaces:**
- Produces: `cssDaArvore(raiz: LpContainer) => { base: string; tablet: string; celular: string }`

- [ ] **Step 1: Escrever o teste (vai falhar)**

Criar `lib/lp/compilador/estilo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cssDaArvore } from './estilo'
import type { LpContainer } from '../tipos'

const raiz = (filhos: LpContainer['filhos'], extra: Partial<LpContainer> = {}): LpContainer => ({
  id: 'r',
  tipo: 'container',
  direcao: { desktop: 'coluna' },
  filhos,
  ...extra,
})

describe('cssDaArvore — container', () => {
  it('coluna vira flex column', () => {
    const { desktop } = cssDaArvore(raiz([]))
    expect(desktop).toContain('.lp-e-r{display:flex;flex-direction:column}')
  })

  it('linha com colunas vira grid', () => {
    const { desktop } = cssDaArvore(raiz([], { direcao: { desktop: 'linha' }, colunas: { desktop: 3 } }))
    expect(desktop).toContain('display:grid')
    expect(desktop).toContain('grid-template-columns:repeat(3,1fr)')
  })

  it('linha sem colunas vira flex row com wrap', () => {
    const { desktop } = cssDaArvore(raiz([], { direcao: { desktop: 'linha' } }))
    expect(desktop).toContain('flex-direction:row')
    expect(desktop).toContain('flex-wrap:wrap')
  })

  it('gap, alinhar e justificar viram as propriedades de flex/grid', () => {
    const { desktop } = cssDaArvore(
      raiz([], { gap: { desktop: 24 }, alinhar: { desktop: 'centro' }, justificar: { desktop: 'entre' } }),
    )
    expect(desktop).toContain('gap:24px')
    expect(desktop).toContain('align-items:center')
    expect(desktop).toContain('justify-content:space-between')
  })
})

describe('cssDaArvore — breakpoints', () => {
  it('valor so de celular nao aparece na base', () => {
    const { desktop, tablet, celular } = cssDaArvore(raiz([], { colunas: { desktop: 3, celular: 1 } }))
    expect(desktop).toContain('repeat(3,1fr)')
    expect(tablet).toBe('')
    expect(celular).toContain('repeat(1,1fr)')
  })

  it('os tres dispositivos saem cada um no seu bloco', () => {
    const { desktop, tablet, celular } = cssDaArvore(
      raiz([], { colunas: { desktop: 4, tablet: 2, celular: 1 } }),
    )
    expect(desktop).toContain('repeat(4,1fr)')
    expect(tablet).toContain('repeat(2,1fr)')
    expect(celular).toContain('repeat(1,1fr)')
  })

  it('oculto vira display:none no dispositivo marcado', () => {
    const { desktop, celular } = cssDaArvore(
      raiz([{ id: 'w', tipo: 'divisor', oculto: { celular: true } }]),
    )
    expect(desktop).not.toContain('.lp-e-w{display:none}')
    expect(celular).toContain('.lp-e-w{display:none}')
  })
})

describe('cssDaArvore — estilo', () => {
  it('traduz cor, fonte, tamanho e alinhamento', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'titulo',
          nivel: 'h2',
          texto: 'T',
          estilo: {
            cor: { desktop: '#ff0000' },
            tamanho: { desktop: '32px' },
            peso: { desktop: 700 },
            alinhamento: { desktop: 'center' },
          },
        },
      ]),
    )
    expect(desktop).toContain('color:#ff0000')
    expect(desktop).toContain('font-size:32px')
    expect(desktop).toContain('font-weight:700')
    expect(desktop).toContain('text-align:center')
  })

  it('margem e padding viram as quatro medidas', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'divisor',
          estilo: { padding: { desktop: { topo: 1, direita: 2, base: 3, esquerda: 4 } } },
        },
      ]),
    )
    expect(desktop).toContain('padding:1px 2px 3px 4px')
  })

  it('recusa injecao em cor e em valor livre', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'w',
          tipo: 'divisor',
          estilo: {
            cor: { desktop: 'red;}body{display:none' },
            tamanho: { desktop: '10px;}body{display:none' },
          },
        },
      ]),
    )
    expect(desktop).not.toContain('body{display:none')
  })

  it('elemento sem estilo nao gera regra nenhuma', () => {
    const { desktop } = cssDaArvore(raiz([{ id: 'w', tipo: 'divisor' }]))
    expect(desktop).not.toContain('.lp-e-w{')
  })

  it('desce a arvore inteira', () => {
    const { desktop } = cssDaArvore(
      raiz([
        {
          id: 'c',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 'neto', tipo: 'divisor', estilo: { cor: { desktop: '#00ff00' } } }],
        },
      ]),
    )
    expect(desktop).toContain('.lp-e-neto{color:#00ff00}')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/compilador/estilo.test.ts`
Expected: FAIL — `Failed to resolve import "./estilo"`

- [ ] **Step 3: Escrever `lib/lp/compilador/estilo.ts`**

```ts
/**
 * CSS derivado da arvore: layout do container e sobreposicoes de LpEstilo, um
 * seletor .lp-e-<id> por no.
 *
 * A saida vem separada por dispositivo para o chamador emitir UM bloco de media
 * query com todos os elementos, em vez de tres por elemento. A heranca sai da
 * cascata: sendo max-width, numa tela de 500px os dois blocos valem e o de 640
 * vence por vir depois.
 */

import { familiaCss } from '../fontes'
import { caminharElementos } from '../arvore'
import type { Caixa, Dispositivo, LpContainer, LpElemento, LpEstilo, PorDisp } from '../tipos'
import { corSegura, escCss } from '../util'

const DISPOSITIVOS: Dispositivo[] = ['desktop', 'tablet', 'celular']

const ALINHAR: Record<string, string> = {
  inicio: 'flex-start',
  centro: 'center',
  fim: 'flex-end',
  esticar: 'stretch',
}

const JUSTIFICAR: Record<string, string> = {
  inicio: 'flex-start',
  centro: 'center',
  fim: 'flex-end',
  entre: 'space-between',
}

const caixaCss = (c: Caixa) => `${c.topo}px ${c.direita}px ${c.base}px ${c.esquerda}px`

/** Numero seguro: valor vindo do documento nunca entra cru no CSS. */
const num = (n: unknown): string => (typeof n === 'number' && Number.isFinite(n) ? String(n) : '0')

/** Regras de layout do container num dispositivo. */
function regrasContainer(c: LpContainer, d: Dispositivo): string[] {
  const r: string[] = []
  const direcao = c.direcao[d]
  const colunas = c.colunas?.[d]
  if (direcao === 'linha' && colunas !== undefined) {
    r.push('display:grid', `grid-template-columns:repeat(${num(colunas)},1fr)`)
  } else if (direcao === 'linha') {
    r.push('display:flex', 'flex-direction:row', 'flex-wrap:wrap')
  } else if (direcao === 'coluna') {
    r.push('display:flex', 'flex-direction:column')
  } else if (colunas !== undefined) {
    // Colunas mudam de valor num breakpoint em que a direcao nao muda.
    r.push(`grid-template-columns:repeat(${num(colunas)},1fr)`)
  }
  if (c.gap?.[d] !== undefined) r.push(`gap:${num(c.gap[d])}px`)
  const al = c.alinhar?.[d]
  if (al) r.push(`align-items:${ALINHAR[al]}`)
  const ju = c.justificar?.[d]
  if (ju) r.push(`justify-content:${JUSTIFICAR[ju]}`)
  return r
}

/** Regras de LpEstilo num dispositivo. */
function regrasEstilo(e: LpEstilo, d: Dispositivo): string[] {
  const r: string[] = []
  const em = <T>(p: PorDisp<T> | undefined): T | undefined => p?.[d]
  const cor = em(e.cor)
  if (cor) r.push(`color:${escCss(corSegura(cor, 'inherit'))}`)
  const fundo = em(e.fundo)
  if (fundo) r.push(`background:${escCss(corSegura(fundo, 'transparent'))}`)
  const fonte = em(e.fonte)
  if (fonte) r.push(`font-family:${familiaCss(fonte)}`)
  const tamanho = em(e.tamanho)
  if (tamanho) r.push(`font-size:${escCss(tamanho)}`)
  const peso = em(e.peso)
  if (peso !== undefined) r.push(`font-weight:${num(peso)}`)
  const altura = em(e.alturaLinha)
  if (altura) r.push(`line-height:${escCss(altura)}`)
  const espaco = em(e.espacamentoLetras)
  if (espaco) r.push(`letter-spacing:${escCss(espaco)}`)
  const alinhamento = em(e.alinhamento)
  if (alinhamento) r.push(`text-align:${escCss(alinhamento)}`)
  const margem = em(e.margem)
  if (margem) r.push(`margin:${caixaCss(margem)}`)
  const padding = em(e.padding)
  if (padding) r.push(`padding:${caixaCss(padding)}`)
  const largura = em(e.largura)
  if (largura) r.push(`width:${escCss(largura)}`)
  const raio = em(e.raio)
  if (raio !== undefined) r.push(`border-radius:${num(raio)}px`)
  const sombra = em(e.sombra)
  if (sombra) r.push(`box-shadow:${escCss(sombra)}`)
  return r
}

function regrasDoNo(el: LpElemento, d: Dispositivo): string {
  const r: string[] = []
  if (el.tipo === 'container') r.push(...regrasContainer(el, d))
  if (el.estilo) r.push(...regrasEstilo(el.estilo, d))
  // A checagem de tipo vem antes do acesso: `altura` so existe no espacador, e
  // o TypeScript so libera o campo depois de estreitar a uniao.
  if (el.tipo === 'espacador' && el.altura[d] !== undefined) {
    r.push(`height:${num(el.altura[d])}px`)
  }
  // `oculto` por ultimo: esconder vence qualquer display que o layout pos.
  if (el.oculto?.[d]) r.push('display:none')
  return r.length > 0 ? `.lp-e-${el.id}{${r.join(';')}}` : ''
}

/** CSS de todos os nos da arvore, separado por dispositivo. */
export function cssDaArvore(raiz: LpContainer): Record<Dispositivo, string> {
  const nos = caminharElementos(raiz)
  const fora = { desktop: '', tablet: '', celular: '' }
  for (const d of DISPOSITIVOS) {
    fora[d] = nos
      .map((el) => regrasDoNo(el, d))
      .filter(Boolean)
      .join('\n')
  }
  return fora
}
```

Nota sobre `el.altura`: o acesso só é válido depois do teste `el.tipo === 'espacador'`. Se o TypeScript reclamar da ordem, inverta as duas condições — `el.tipo === 'espacador' && el.altura[d] !== undefined`.

- [ ] **Step 4: Rodar, verificar e commitar**

```bash
npx vitest run lib/lp/compilador/estilo.test.ts   # 12 passando
npm test && npm run typecheck && npm run lint
git add lib/lp/compilador/
git commit -m "feat(lp): CSS gerado da arvore, separado por breakpoint"
```

---

### Task 5: Ligar árvore, aparências e JS no compilador

**Files:**
- Modify: `lib/lp/compilador/html.ts` (`htmlSecao`)
- Modify: `lib/lp/compilador/css.ts` (bloco `APARENCIAS` + CSS gerado)
- Modify: `lib/lp/compilador/js.ts` (módulos por widget)
- Test: `lib/lp/compilador/compilador.test.ts`

**Interfaces:**
- Consumes: `renderElemento` (Task 2-3), `cssDaArvore` (Task 4)

- [ ] **Step 1: Escrever o teste (vai falhar)**

Acrescentar a `lib/lp/compilador/compilador.test.ts`. O arquivo **não** tem helper de documento com seção arbitrária — ele tem `briefing()` e `documentoCompleto()` —, então os dois helpers abaixo entram junto, e os imports também:

```ts
// acrescentar aos imports do arquivo
import { compilarCorpo } from './html'
import { compilarCss } from './css'
import { compilarJs } from './js'
import type { LpSecao } from '../tipos'

/** Documento com as secoes dadas, para isolar o caso no teste. */
function docCom(secoes: LpSecao[]): LpDocumento {
  return { ...documentoBase(briefingVazio('Teste')), secoes }
}

/** Secao tipada minima do layout pedido. */
const secaoBase = (tipo: TipoLayout): LpSecao => novaSecao(tipo)

describe('compilador com arvore', () => {
  it('secao com raiz usa a arvore e ignora os campos tipados', () => {
    const doc = docCom([
      {
        ...secaoBase('cta'),
        titulo: 'IGNORADO',
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 't', tipo: 'titulo', nivel: 'h2', texto: 'DA ARVORE' }],
        },
      },
    ])
    const { corpo } = compilarCorpo(doc, { modo: 'export' })
    expect(corpo).toContain('DA ARVORE')
    expect(corpo).not.toContain('IGNORADO')
  })

  it('secao sem raiz continua no layout tipado', () => {
    const doc = docCom([{ ...secaoBase('cta'), titulo: 'TIPADO' }])
    const { corpo } = compilarCorpo(doc, { modo: 'export' })
    expect(corpo).toContain('TIPADO')
    expect(corpo).toContain('lp-cta-caixa')
  })

  it('CSS traz as regras geradas dos elementos da arvore', () => {
    const doc = docCom([
      {
        ...secaoBase('cta'),
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            { id: 'w', tipo: 'titulo', nivel: 'h2', texto: 'T', estilo: { cor: { celular: '#123456' } } },
          ],
        },
      },
    ])
    const css = compilarCss(doc, new Map([[doc.secoes[0].id, 'cta']]))
    expect(css).toContain('.lp-e-r{display:flex')
    expect(css).toContain('@media (max-width:640px)')
    expect(css).toContain('#123456')
  })

  it('JS do slider entra quando ha widget de carrossel na arvore', () => {
    const doc = docCom([
      {
        ...secaoBase('cta'),
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [{ id: 'k', tipo: 'carrossel', slides: [{ id: '1' }, { id: '2' }] }],
        },
      },
    ])
    expect(compilarJs(doc, 'export')).toContain('lp-slider-trilho')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/compilador/compilador.test.ts`
Expected: FAIL — os 4 casos novos (o corpo ainda sai pelo layout tipado, o CSS não traz `.lp-e-*`, o JS não vê a árvore).

- [ ] **Step 3: `htmlSecao` escolhe o caminho**

Em `lib/lp/compilador/html.ts`, dentro de `htmlSecao`, trocar a última linha por:

```ts
  // Secao migrada renderiza a arvore; a sem `raiz` segue no layout tipado, que
  // e o que todo documento salvo ainda e.
  const interno = s.raiz
    ? `<div class="lp-container">${renderElemento(ctx, s.raiz)}</div>`
    : (corpo[s.tipo]?.() ?? '')
  return `<section id="${esc(idHtml)}" class="${classes.join(' ')}"${estilo}${alvo(ctx, `sec:${s.id}`)}${nomeEditor}>${fundo}${interno}</section>`
```

E importar no topo: `import { renderElemento } from './arvore'`

- [ ] **Step 4: `css.ts` — aparências e CSS gerado**

Acrescentar o bloco de aparências (as regras vêm do CSS por layout que já existe, re-ancoradas em classes próprias para não dependerem do layout que vai sumir):

```ts
/** Identidade visual dos containers (ver Aparencia em tipos.ts). */
const APARENCIAS = `
.lp-c{min-width:0}
.lp-ap-card{display:flex;flex-direction:column;background:color-mix(in srgb,var(--cor-titulos) 4%,transparent);border:1px solid color-mix(in srgb,var(--cor-titulos) 10%,transparent);border-radius:var(--raio);padding:32px 28px;transition:transform .25s,box-shadow .25s}
.lp-ap-card:hover{transform:translateY(-6px);box-shadow:0 24px 48px -24px color-mix(in srgb,var(--cor-principal) 45%,transparent)}
.lp-ap-plano{display:flex;flex-direction:column;border:1px solid color-mix(in srgb,var(--cor-titulos) 12%,transparent);border-radius:var(--raio);padding:36px 30px;background:color-mix(in srgb,var(--cor-titulos) 3%,transparent)}
.lp-ap-destaque{border-color:var(--cor-principal);box-shadow:0 24px 60px -28px color-mix(in srgb,var(--cor-principal) 55%,transparent);position:relative}
.lp-ap-destaque::before{content:'Mais popular';position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--cor-principal);color:#fff;font-size:.75rem;font-weight:700;padding:4px 14px;border-radius:999px;letter-spacing:.04em}
.lp-ap-produto{border:1px solid color-mix(in srgb,var(--cor-titulos) 10%,transparent);border-radius:var(--raio);overflow:hidden;background:color-mix(in srgb,var(--cor-titulos) 3%,transparent);display:flex;flex-direction:column}
.lp-ap-produto .lp-midia{border-radius:0;aspect-ratio:1}
.lp-ap-figura{position:relative;border-radius:var(--raio);overflow:hidden}
.lp-ap-figura .lp-midia{border-radius:0;aspect-ratio:4/3}
.lp-ap-figura img{transition:transform .4s}
.lp-ap-figura:hover img{transform:scale(1.05)}
.lp-ap-bloco .lp-midia{aspect-ratio:4/3}
.lp-ap-beneficio{align-items:flex-start}
.lp-ap-marco{position:relative}
.lp-ap-caixa-cta{background:linear-gradient(135deg,var(--cor-principal),var(--cor-secundaria));border-radius:calc(var(--raio) * 1.5);padding:64px 48px;text-align:center;color:#fff}
.lp-ap-caixa-cta h1,.lp-ap-caixa-cta h2,.lp-ap-caixa-cta h3,.lp-ap-caixa-cta p{color:#fff}
.lp-ap-caixa-cta .lp-btn{background:#fff;border-color:#fff;color:var(--cor-principal)}
.lp-lista{list-style:none;display:grid;gap:12px}
.lp-lista li{display:flex;gap:10px;align-items:flex-start}
.lp-lista li svg{width:18px;height:18px;flex:none;margin-top:3px;color:var(--cor-principal)}
.lp-divisor{border:0;border-top:1px solid color-mix(in srgb,var(--cor-titulos) 15%,transparent)}
@media (max-width:640px){.lp-ap-caixa-cta{padding:48px 24px}}
`
```

Em `compilarCss`, acrescentar `APARENCIAS` às partes fixas e emitir o CSS gerado agrupado por breakpoint, **depois** de tudo:

```ts
import { cssDaArvore } from './estilo'
```

```ts
  const partes: string[] = [varsTema(doc), BASE, HEADER, FOOTER, APARENCIAS]
```

e, no fim de `compilarCss`, antes do `return`:

```ts
  // CSS dos elementos por ultimo e agrupado por breakpoint: um bloco de media
  // query com todos os nos, em vez de tres por no. Vindo depois do CSS base
  // (que nunca passa de uma classe), o ajuste do usuario vence por ordem.
  const porDisp = { desktop: [] as string[], tablet: [] as string[], celular: [] as string[] }
  for (const secao of doc.secoes) {
    if (!secao.raiz) continue
    const css = cssDaArvore(secao.raiz)
    if (css.desktop) porDisp.desktop.push(css.desktop)
    if (css.tablet) porDisp.tablet.push(css.tablet)
    if (css.celular) porDisp.celular.push(css.celular)
  }
  if (porDisp.desktop.length > 0) partes.push(porDisp.desktop.join('\n'))
  if (porDisp.tablet.length > 0) {
    partes.push(`@media (max-width:900px){\n${porDisp.tablet.join('\n')}\n}`)
  }
  if (porDisp.celular.length > 0) {
    partes.push(`@media (max-width:640px){\n${porDisp.celular.join('\n')}\n}`)
  }
```

- [ ] **Step 5: `js.ts` — módulos por widget em uso**

Substituir a montagem do `Set` por uma varredura que enxerga os dois formatos:

```ts
import { caminharElementos } from '../arvore'

/** Tipos presentes na pagina: layout da secao tipada ou widget da arvore. */
function tiposUsados(doc: LpDocumento): Set<string> {
  const usados = new Set<string>()
  for (const s of doc.secoes) {
    if (s.raiz) {
      for (const el of caminharElementos(s.raiz)) usados.add(el.tipo)
    } else {
      usados.add(s.tipo)
    }
  }
  return usados
}
```

E em `compilarJs`, trocar `tipos.has('depoimentos') || tipos.has('carrossel')` etc. por checagens que aceitem os dois nomes:

```ts
  const tipos = tiposUsados(doc)
  const partes = ["'use strict';", NAV]
  if (tipos.has('depoimentos') || tipos.has('carrossel')) partes.push(SLIDER)
  // 'tabs' e o layout; 'abas' e o widget.
  if (tipos.has('tabs') || tipos.has('abas')) partes.push(TABS)
  if (modo === 'export') {
    if (tipos.has('estatisticas') || tipos.has('numero')) partes.push(CONTADOR)
    if (tipos.has('formulario')) partes.push(FORM)
  }
```

- [ ] **Step 6: Rodar, verificar e commitar**

```bash
npx vitest run lib/lp/compilador/compilador.test.ts
npm test && npm run typecheck && npm run lint && npm run build
git add lib/lp/compilador/
git commit -m "feat(lp): compilador aceita arvore e layout tipado lado a lado"
```

---

### Task 6: Testes de equivalência dos 21 presets

O que prova que a migração não vai mudar a página do cliente.

**Files:**
- Create: `lib/lp/compilador/equivalencia.test.ts`

**Interfaces:**
- Consumes: `expandirPreset`, `compilarCorpo`, `LAYOUTS`

- [ ] **Step 1: Escrever o teste**

```ts
import { describe, expect, it } from 'vitest'
import { compilarCorpo } from './html'
import { expandirPreset } from '../presets/expandir'
import { LAYOUTS, novaSecao } from '../layouts'
import { documentoBase } from '../documento'
import { briefingVazio } from '../tipos'
import type { LpDocumento, LpSecao } from '../tipos'

/** Documento com uma secao so, para isolar o layout no teste. */
function docCom(secao: LpSecao): LpDocumento {
  const base = documentoBase(briefingVazio('Teste'))
  return { ...base, secoes: [secao] }
}

/** Texto visivel do HTML, sem tag nem atributo — o que o visitante le. */
const textoVisivel = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** URLs citadas no HTML, na ordem. */
const urls = (html: string) => [...html.matchAll(/(?:src|href)="([^"]*)"/g)].map((m) => m[1])

describe('equivalencia arvore x layout tipado', () => {
  for (const info of LAYOUTS) {
    it(`${info.tipo}: mesmo texto visivel nos dois caminhos`, () => {
      const tipada = novaSecao(info.tipo)
      const { raiz, secao: ajustada } = expandirPreset(tipada)

      const htmlTipado = compilarCorpo(docCom(tipada), { modo: 'export' }).corpo
      const htmlArvore = compilarCorpo(docCom({ ...ajustada, raiz }), { modo: 'export' }).corpo

      // Ordem pode diferir em detalhes de wrapper; o conjunto de palavras, nao.
      const palavras = (h: string) => textoVisivel(h).split(' ').filter(Boolean).sort()
      expect(palavras(htmlArvore)).toEqual(palavras(htmlTipado))
    })

    it(`${info.tipo}: mesmas midias e links`, () => {
      const tipada = novaSecao(info.tipo)
      const { raiz, secao: ajustada } = expandirPreset(tipada)

      const htmlTipado = compilarCorpo(docCom(tipada), { modo: 'export' }).corpo
      const htmlArvore = compilarCorpo(docCom({ ...ajustada, raiz }), { modo: 'export' }).corpo

      expect(urls(htmlArvore).sort()).toEqual(urls(htmlTipado).sort())
    })
  }

  it('a ancora da secao nao muda com a migracao', () => {
    const tipada = novaSecao('cards')
    const { raiz, secao } = expandirPreset(tipada)
    const idTipado = compilarCorpo(docCom(tipada), { modo: 'export' }).idsPorSecao.get(tipada.id)
    const idArvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).idsPorSecao.get(
      tipada.id,
    )
    expect(idArvore).toBe(idTipado)
  })
})
```

- [ ] **Step 2: Rodar e investigar cada divergência**

Run: `npx vitest run lib/lp/compilador/equivalencia.test.ts`

Este teste **vai** falhar em alguns presets na primeira execução — é o objetivo dele. Para cada falha, decidir qual lado está errado:

- **Texto sumindo na árvore** → o expansor esqueceu um campo. Corrigir o expansor em `lib/lp/presets/`.
- **Texto sobrando na árvore** → o expansor duplicou. Corrigir o expansor.
- **URL faltando** → widget não está emitindo a mídia. Corrigir `widgets.ts`.
- **Divergência só de wrapper** (uma `<div>` a mais) → não é divergência: o teste compara texto visível e URLs, não estrutura. Se apareceu aqui, é conteúdo mesmo.

Corrigir e rodar de novo até passar. Registrar no commit o que cada correção resolveu.

- [ ] **Step 3: Verificação final e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add lib/lp/
git commit -m "test(lp): equivalencia arvore x layout tipado nos 21 presets"
```

---

## Ao final desta parte

O compilador sabe renderizar árvore — HTML, CSS por breakpoint e JS — e há prova, preset a preset, de que a saída é equivalente à de hoje. Nada foi ligado: nenhum documento tem `raiz` em produção, `persistencia.ts` e os componentes seguem intocados.

A **Parte 2** (próximo plano, mesma branch) liga a chave: migração em `persistencia.ts`, `documentoV1` como backup, painel por widget, seleção por nó no canvas e remoção dos campos antigos de `LpSecao`. As duas partes são mergeadas juntas — a virada é atômica.
