# Editor de LP — Entrega 2, Parte 2: a virada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Os documentos passam a ser árvore de verdade — migrados na leitura, renderizados pelo compilador recursivo e editados por um painel por widget.

**Architecture:** Mesma disciplina da Parte 1: os dois caminhos convivem até o último momento. O painel novo atende seções com `raiz` e o antigo atende as sem; a migração liga a chave; só então o caminho tipado é deletado do compilador e do painel. Cada task deixa a aplicação compilando e funcionando.

**Tech Stack:** TypeScript, React 19, Next 16, vitest.

## Global Constraints

- Cada task termina com `npm test`, `npm run typecheck`, `npm run lint` e `npm run build` passando.
- Segurança inalterada: `esc()`, `urlSegura()`, `corSegura()`/`escCss()` em tudo que vira HTML ou CSS.
- Comentários em português sem acento nos arquivos de `lib/`; componentes seguem o padrão do arquivo vizinho (com acento em texto de UI).
- Ids por `gerarId()`. Commits pequenos, um por task, na branch `feat/editor-lp-entrega-2`.
- **A Parte 1 e a Parte 2 são mergeadas juntas.** Não abrir PR nem merge antes da task 9.
- O briefing **não muda**: `SecaoBriefing`, `EtapaSecoes.tsx` e o assistente ficam intocados.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/lp/compilador/comum.ts` (criar) | Helpers compartilhados — quebra o ciclo html↔arvore |
| `lib/lp/compilador/fixtures.json` (criar) | HTML de referência dos 21 presets |
| `lib/lp/arvore.ts` (modificar) | `acharNo`, `atualizarNo`, `removerNo`, `duplicarNo` |
| `lib/lp/documento.ts` (modificar) | `aplicarTexto` por `el:<id>` |
| `lib/lp/persistencia.ts` (modificar) | Migração na leitura + `documentoV1` |
| `lib/lp/editorRuntime.ts` (modificar) | Seleção e edição inline por `el:<id>` |
| `components/lp/PainelWidget.tsx` (criar) | Despacho por `el.tipo`, três abas |
| `components/lp/widgets/*.tsx` (criar) | Um painel por widget |
| `components/lp/PorDispositivo.tsx` (criar) | Controle com seletor desktop/tablet/celular |
| `components/lp/PainelEstrutura.tsx` (modificar) | Árvore em vez de lista plana |
| `lib/lp/tipos.ts` (modificar) | `SecaoTipada` separada de `LpSecao` |
| `lib/lp/compilador/html.ts` (modificar) | Deleta as 21 funções de layout |
| `lib/lp/compilador/css.ts` (modificar) | Deleta `POR_LAYOUT` |

---

### Task 1: Quebrar o ciclo de imports

Débito da Parte 1: `html.ts` importa `renderElemento` de `arvore.ts`, que importa `Ctx` e `alvo` de volta. Funciona porque todo uso está dentro de função, mas basta alguém mover uma chamada para o escopo do módulo e quebra.

**Files:**
- Create: `lib/lp/compilador/comum.ts`
- Modify: `lib/lp/compilador/html.ts`, `arvore.ts`, `widgets.ts`

**Interfaces:**
- Produces: `comum.ts` exportando `Ctx`, `alvo`, `urlMidia`, `posterDe`, `atributosVideo`, `atributosVideoFundo`, `htmlMidia`, `htmlBotao`, `quebras`, `href`, `slider`, `celula`

- [ ] **Step 1: Mover os helpers**

Criar `lib/lp/compilador/comum.ts` e mover para lá, **sem alterar corpo nenhum**, estas declarações de `html.ts`: o tipo `Ctx`, `href`, `alvo`, `urlMidia`, `posterDe`, `atributosVideo`, `atributosVideoFundo`, `htmlMidia`, `htmlBotao`, `quebras`, `slider`, `celula`. Todas exportadas.

O cabeçalho do arquivo novo:

```ts
/**
 * Peças compartilhadas do compilador de HTML: contexto, marcação do editor,
 * midia, botao e os mecanismos de slider e de celula de tabela.
 *
 * Existe para quebrar o ciclo html.ts <-> arvore.ts: os dois precisam destas
 * funcoes, e nenhum dos dois pode importar o outro.
 */
```

- [ ] **Step 2: Reapontar os imports**

Em `html.ts`, `arvore.ts` e `widgets.ts`, importar de `./comum` o que antes vinha de `./html`. `html.ts` mantém `import { renderElemento } from './arvore'`; `arvore.ts` deixa de importar de `./html`.

- [ ] **Step 3: Verificar que o ciclo sumiu**

Run: `npx madge --circular lib/lp/compilador/ 2>/dev/null || echo "madge nao instalado — conferir a mao"`

Sem madge, confirmar a mão: `arvore.ts` e `widgets.ts` não podem conter `from './html'`.

Run: `grep -n "from './html'" lib/lp/compilador/arvore.ts lib/lp/compilador/widgets.ts`
Expected: nenhuma linha.

- [ ] **Step 4: Verificar e commitar**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add lib/lp/compilador/
git commit -m "refactor(lp): helpers compartilhados em comum.ts, sem ciclo de import"
```

Nenhum teste novo: é movimentação pura, e a suíte existente é o que prova que nada mudou de comportamento.

---

### Task 2: Congelar a equivalência em fixtures

O teste de equivalência da Parte 1 compara os dois caminhos de render. Quando o caminho tipado for deletado (task 9), ele perde a referência. Congelar agora o HTML que o compilador de hoje produz transforma "os dois caminhos concordam" em "a árvore continua produzindo o que a página sempre produziu".

**Files:**
- Create: `lib/lp/compilador/fixtures.json`
- Create: `lib/lp/compilador/gerar-fixtures.ts`
- Modify: `lib/lp/compilador/equivalencia.test.ts`

- [ ] **Step 1: Escrever o gerador**

Criar `lib/lp/compilador/gerar-fixtures.ts`:

```ts
/**
 * Congela o HTML que o caminho TIPADO produz para cada preset. Rodar apenas
 * enquanto esse caminho existir — depois da task 9 ele nao existe mais, e o
 * arquivo passa a ser a unica referencia do que a pagina sempre foi.
 *
 *   npx tsx lib/lp/compilador/gerar-fixtures.ts
 */

import { writeFileSync } from 'node:fs'
import { compilarCorpo } from './html'
import { documentoBase } from '../documento'
import { LAYOUTS, novaSecao } from '../layouts'
import { briefingVazio } from '../tipos'

const fixtures: Record<string, string> = {}
for (const info of LAYOUTS) {
  const doc = { ...documentoBase(briefingVazio('Teste')), secoes: [novaSecao(info.tipo)] }
  fixtures[info.tipo] = compilarCorpo(doc, { modo: 'export' }).corpo
}
writeFileSync(
  new URL('./fixtures.json', import.meta.url),
  JSON.stringify(fixtures, null, 2) + '\n',
)
console.log(`${Object.keys(fixtures).length} fixtures gravadas`)
```

- [ ] **Step 2: Gerar e conferir**

Run: `npx tsx lib/lp/compilador/gerar-fixtures.ts`
Expected: `21 fixtures gravadas`.

Se `tsx` não estiver disponível, rodar via vitest: criar um teste temporário que chama o gerador, executá-lo e apagar o teste. **Não** adicionar `tsx` como dependência só para isto.

- [ ] **Step 3: Trocar a referência do teste**

Em `equivalencia.test.ts`, o caso de texto/URL passa a comparar contra a fixture em vez do render tipado:

```ts
import fixtures from './fixtures.json'

describe('equivalência com o HTML congelado', () => {
  for (const info of LAYOUTS) {
    it(`${info.tipo}: mesmo texto visível do compilador original`, () => {
      const tipada = novaSecao(info.tipo)
      const { raiz, secao } = expandirPreset(tipada)
      const arvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).corpo
      const referencia = (fixtures as Record<string, string>)[info.tipo]
      expect(palavras(arvore)).toEqual(palavras(referencia))
    })

    it(`${info.tipo}: mesmas mídias e links do compilador original`, () => {
      const tipada = novaSecao(info.tipo)
      const { raiz, secao } = expandirPreset(tipada)
      const arvore = compilarCorpo(docCom({ ...secao, raiz }), { modo: 'export' }).corpo
      const referencia = (fixtures as Record<string, string>)[info.tipo]
      expect(urls(arvore)).toEqual(urls(referencia))
    })
  }
})
```

Manter o `describe` antigo (árvore x tipado) enquanto os dois caminhos existirem — ele some na task 9.

`resolveJsonModule` já está ligado no `tsconfig.json`, então o import do JSON funciona.

- [ ] **Step 4: Verificar e commitar**

```bash
npm test && npm run typecheck && npm run lint
git add lib/lp/compilador/
git commit -m "test(lp): congela o HTML dos 21 presets como referencia da migracao"
```

---

### Task 3: Operações de árvore

**Files:**
- Modify: `lib/lp/arvore.ts`
- Modify: `lib/lp/documento.ts` (`aplicarTexto`)
- Test: `lib/lp/arvore.test.ts`

**Interfaces:**
- Produces: `acharNo(raiz, id)`, `atualizarNo(raiz, id, mut)`, `removerNo(raiz, id)`, `duplicarNo(raiz, id)`, `regerarIds(el)`

- [ ] **Step 1: Escrever os testes (vão falhar)**

Acrescentar a `lib/lp/arvore.test.ts`:

```ts
import { acharNo, atualizarNo, duplicarNo, regerarIds, removerNo } from './arvore'

describe('operacoes de arvore', () => {
  const base = (): LpContainer => ({
    id: 'r',
    tipo: 'container',
    direcao: { desktop: 'coluna' },
    filhos: [
      { id: 't1', tipo: 'titulo', nivel: 'h2', texto: 'A' },
      {
        id: 'c1',
        tipo: 'container',
        direcao: { desktop: 'linha' },
        filhos: [{ id: 't2', tipo: 'titulo', nivel: 'h3', texto: 'B' }],
      },
    ],
  })

  it('acha no em qualquer profundidade e devolve null quando nao existe', () => {
    expect(acharNo(base(), 't2')?.id).toBe('t2')
    expect(acharNo(base(), 'r')?.id).toBe('r')
    expect(acharNo(base(), 'nada')).toBeNull()
  })

  it('atualizarNo muta so o no pedido e devolve arvore nova', () => {
    const antes = base()
    const depois = atualizarNo(antes, 't2', (el) => {
      if (el.tipo === 'titulo') el.texto = 'MUDOU'
    })
    const alvo = acharNo(depois, 't2')
    expect(alvo?.tipo === 'titulo' && alvo.texto).toBe('MUDOU')
    // A entrada nao e tocada.
    const original = acharNo(antes, 't2')
    expect(original?.tipo === 'titulo' && original.texto).toBe('B')
  })

  it('removerNo tira o no e mantem os irmaos', () => {
    const depois = removerNo(base(), 't1')
    expect(acharNo(depois, 't1')).toBeNull()
    expect(acharNo(depois, 'c1')).not.toBeNull()
  })

  it('removerNo na raiz nao faz nada', () => {
    const depois = removerNo(base(), 'r')
    expect(acharNo(depois, 'r')).not.toBeNull()
  })

  it('duplicarNo insere copia logo depois, com ids novos', () => {
    const depois = duplicarNo(base(), 'c1')
    const raiz = depois as LpContainer
    expect(raiz.filhos).toHaveLength(3)
    const copia = raiz.filhos[2]
    expect(copia.id).not.toBe('c1')
    if (copia.tipo !== 'container') throw new Error('esperava container')
    // O neto tambem ganhou id novo — senao dois nos teriam o mesmo id.
    expect(copia.filhos[0].id).not.toBe('t2')
  })

  it('regerarIds troca todos os ids da subarvore', () => {
    const antes = base()
    const depois = regerarIds(antes) as LpContainer
    expect(depois.id).not.toBe('r')
    expect(depois.filhos[0].id).not.toBe('t1')
    expect(antes.id).toBe('r')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/arvore.test.ts`
Expected: FAIL — funções não exportadas.

- [ ] **Step 3: Implementar em `lib/lp/arvore.ts`**

```ts
import { gerarId } from './util'

/** No pelo id, em qualquer profundidade. */
export function acharNo(raiz: LpContainer, id: string): LpElemento | null {
  return caminharElementos(raiz).find((el) => el.id === id) ?? null
}

/** Copia profunda da arvore (ela e JSON puro). */
const clonarArvore = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/**
 * Arvore nova com o no alterado pela funcao. A entrada nao e tocada: o editor
 * guarda snapshots no historico de desfazer, e mutar quebraria o Ctrl+Z.
 */
export function atualizarNo(
  raiz: LpContainer,
  id: string,
  mut: (el: LpElemento) => void,
): LpContainer {
  const copia = clonarArvore(raiz)
  const alvo = acharNo(copia, id)
  if (alvo) mut(alvo)
  return copia
}

/** Arvore nova sem o no. A raiz nao pode ser removida. */
export function removerNo(raiz: LpContainer, id: string): LpContainer {
  if (raiz.id === id) return raiz
  const copia = clonarArvore(raiz)
  const podar = (c: LpContainer) => {
    c.filhos = c.filhos.filter((f) => f.id !== id)
    for (const f of c.filhos) if (f.tipo === 'container') podar(f)
  }
  podar(copia)
  return copia
}

/** Ids novos em toda a subarvore — copia nao pode repetir id de ninguem. */
export function regerarIds<T extends LpElemento>(el: T): T {
  const copia = clonarArvore(el)
  for (const no of copia.tipo === 'container' ? caminharElementos(copia) : [copia]) {
    no.id = gerarId()
  }
  return copia
}

/** Copia do no logo depois dele, com ids novos. */
export function duplicarNo(raiz: LpContainer, id: string): LpContainer {
  const copia = clonarArvore(raiz)
  const inserir = (c: LpContainer): boolean => {
    const i = c.filhos.findIndex((f) => f.id === id)
    if (i >= 0) {
      c.filhos.splice(i + 1, 0, regerarIds(c.filhos[i]))
      return true
    }
    return c.filhos.some((f) => f.tipo === 'container' && inserir(f))
  }
  inserir(copia)
  return copia
}
```

- [ ] **Step 4: `aplicarTexto` resolve `el:<id>`**

Em `lib/lp/documento.ts`, `aplicarTexto` hoje quebra o caminho `sec:ID:campo`. Acrescentar o ramo novo **antes** da lógica existente:

```ts
export function aplicarTexto(doc: LpDocumento, alvo: string, valor: string): LpDocumento {
  // Formato novo: o alvo e o id do no, e a arvore diz o que ele e.
  if (alvo.startsWith('el:')) {
    const id = alvo.slice(3)
    return alterarDoc(doc, (d) => {
      for (const secao of d.secoes) {
        if (!secao.raiz) continue
        const no = acharNo(secao.raiz, id)
        if (!no) continue
        if (no.tipo === 'titulo' || no.tipo === 'texto') no.texto = valor
        else if (no.tipo === 'botao') no.botao.texto = valor
        else if (no.tipo === 'numero') no.valor = valor
        return
      }
    })
  }
  // …lógica atual, inalterada, para o formato `sec:ID:campo`…
}
```

`alterarDoc` já clona o documento, então mutar `no` aqui dentro é seguro — não é a árvore original.

- [ ] **Step 5: Teste de `aplicarTexto`**

Acrescentar a `lib/lp/documento.test.ts`:

```ts
describe('aplicarTexto na arvore', () => {
  const docArvore = () =>
    docBase([
      secao({
        raiz: {
          id: 'r',
          tipo: 'container',
          direcao: { desktop: 'coluna' },
          filhos: [
            { id: 'w1', tipo: 'titulo', nivel: 'h2', texto: 'antes' },
            { id: 'w2', tipo: 'botao', botao: { texto: 'antes', url: '#' } },
          ],
        },
      }),
    ])

  it('escreve no titulo pelo id do no', () => {
    const d = aplicarTexto(docArvore(), 'el:w1', 'depois')
    const no = acharNo(d.secoes[0].raiz!, 'w1')
    expect(no?.tipo === 'titulo' && no.texto).toBe('depois')
  })

  it('escreve no texto do botao', () => {
    const d = aplicarTexto(docArvore(), 'el:w2', 'clique')
    const no = acharNo(d.secoes[0].raiz!, 'w2')
    expect(no?.tipo === 'botao' && no.botao.texto).toBe('clique')
  })

  it('alvo inexistente nao quebra nem altera nada', () => {
    const antes = docArvore()
    const d = aplicarTexto(antes, 'el:nada', 'x')
    expect(JSON.stringify(d.secoes)).toBe(JSON.stringify(antes.secoes))
  })
})
```

- [ ] **Step 6: Verificar e commitar**

```bash
npm test && npm run typecheck && npm run lint
git add lib/lp/
git commit -m "feat(lp): operacoes de arvore e aplicarTexto por id de no"
```

---

### Task 4: Ligar a migração

**Files:**
- Modify: `lib/lp/persistencia.ts`
- Test: `lib/lp/persistencia.test.ts` (criar)

- [ ] **Step 1: Escrever o teste (vai falhar)**

O arquivo usa `server-only` e o Firestore admin. O teste cobre só a função pura de migração dentro de `migrar()`, então extrair essa parte:

Criar `lib/lp/persistencia.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { migrarDados } from './persistencia'
import type { LpProjeto } from './tipos'

const dados = (versao?: 2): Omit<LpProjeto, 'id'> => ({
  nome: 'X',
  teamId: 't',
  criadoPor: 'u',
  createdAt: 1,
  atualizadoEm: 1,
  briefing: {
    nome: 'X',
    tipografia: {},
    cores: {},
    referencias: [],
    menu: [],
    footer: {
      textoInstitucional: '',
      direitos: '',
      endereco: '',
      telefones: [],
      email: '',
      linksUteis: [],
      menuSecundario: false,
    },
    redes: [],
    secoes: [],
    paginas: [],
  },
  documento: {
    ...(versao ? { versao } : {}),
    seo: { titulo: '', descricao: '' },
    tema: { tipografia: {}, cores: {}, raio: 8 } as never,
    header: { logoTexto: 'X', menu: [], fixo: false, botoes: [] },
    secoes: [
      {
        id: 's1',
        tipo: 'cta',
        nome: 'CTA',
        ancora: 'cta',
        titulo: 'Oi',
        itens: [],
        largura: 'boxed',
      },
    ],
    footer: { linksUteis: [], menuSecundario: false },
    redes: [],
  },
})

describe('migrarDados', () => {
  it('documento sem versao sai migrado, com raiz em cada secao', () => {
    const fora = migrarDados(dados())
    expect(fora.documento?.versao).toBe(2)
    expect(fora.documento?.secoes[0].raiz).toBeDefined()
  })

  it('documento ja em v2 nao e reprocessado', () => {
    const entrada = dados(2)
    const fora = migrarDados(entrada)
    expect(fora.documento?.secoes[0].raiz).toBeUndefined()
  })

  it('projeto sem documento passa sem quebrar', () => {
    const entrada = { ...dados(), documento: null }
    expect(migrarDados(entrada).documento).toBeNull()
  })

  it('as conversoes antigas continuam valendo', () => {
    const entrada = dados()
    // Formato antigo: telefones como string unica.
    entrada.briefing.footer.telefones = '(11) 3333-4444' as never
    expect(Array.isArray(migrarDados(entrada).briefing.footer.telefones)).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run lib/lp/persistencia.test.ts`
Expected: FAIL — `migrarDados` não é exportada.

- [ ] **Step 3: Implementar**

Em `lib/lp/persistencia.ts`, renomear `migrar` para `migrarDados`, exportá-la e acrescentar a árvore:

```ts
import { migrarDocumentoParaArvore, precisaMigrar } from './migrar'
```

```ts
export function migrarDados(dados: Omit<LpProjeto, 'id'>): Omit<LpProjeto, 'id'> {
  const documento = dados.documento && {
    ...dados.documento,
    header: {
      ...dados.documento.header,
      botoes: normalizarBotoes(
        dados.documento.header.botoes ?? (dados.documento.header as { botao?: unknown }).botao,
      ),
    },
    footer: {
      ...dados.documento.footer,
      telefones: normalizarTelefones(dados.documento.footer.telefones),
      botoes: normalizarBotoes(dados.documento.footer.botoes),
    },
  }
  return {
    ...dados,
    briefing: {
      ...dados.briefing,
      paginas: dados.briefing.paginas ?? [],
      footer: {
        ...dados.briefing.footer,
        telefones: normalizarTelefones(dados.briefing.footer.telefones),
      },
    },
    // A arvore vem por ultimo: as conversoes acima normalizam o formato que o
    // expansor recebe.
    documento: documento && migrarDocumentoParaArvore(documento),
  }
}
```

- [ ] **Step 4: Gravar o `documentoV1` na primeira escrita**

Em `atualizarProjeto`, antes de gravar o documento:

```ts
  if (patch.documento !== undefined) {
    dados.documento = patch.documento
    dados.gerada = patch.documento !== null
    // Rede de protecao: na primeira escrita depois da migracao, guarda o
    // documento como estava. Se um expansor errado estragar a pagina de um
    // cliente, o original ainda existe.
    const cru = (await projetosCol().doc(lpId).get()).data() as
      | { documento?: LpDocumento | null; documentoV1?: unknown }
      | undefined
    if (cru?.documentoV1 === undefined && cru?.documento && precisaMigrar(cru.documento)) {
      dados.documentoV1 = cru.documento
    }
  }
```

Ler o documento cru é obrigatório: `obterProjeto` já devolve migrado, e gravar isso como "V1" salvaria a coisa errada.

- [ ] **Step 5: Verificar e commitar**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add lib/lp/persistencia.ts lib/lp/persistencia.test.ts
git commit -m "feat(lp): migracao na leitura e documentoV1 como rede de protecao"
```

**A partir desta task o editor mostra a página vinda da árvore, mas o painel antigo ainda edita os campos tipados — que o compilador já ignora.** É por isso que a task 5 e a 6 vêm em seguida, e por isso nada é mergeado antes da 9.

---

### Task 5: Canvas por `el:<id>`

**Files:**
- Modify: `lib/lp/editorRuntime.ts`
- Modify: `components/lp/EditorLp.tsx`

- [ ] **Step 1: Ampliar o regex de editáveis**

Em `editorRuntime.ts`, `EDITAVEIS` hoje casa os campos do formato antigo. Acrescentar o formato novo — o runtime não conhece tipos, então quem decide o que é editável é o compilador, marcando o nó:

```js
  var EDITAVEIS = /^el:|:(titulo|subtitulo|texto|extra|detalhe|botao|logo|institucional|direitos|endereco|email)$|^footer:telefone:|^(header|footer):botao:/
```

E em `widgets.ts`, emitir `data-lp-editavel` só nos widgets cujo texto pode ser digitado no canvas (`titulo`, `texto`, `botao`, `numero`), para o duplo clique não abrir `contenteditable` numa imagem:

```ts
const editavel = (ctx: Ctx, w: LpWidget) =>
  ctx.modo === 'editor' && ['titulo', 'texto', 'botao', 'numero'].includes(w.tipo)
    ? ' data-lp-editavel'
    : ''
```

E o runtime passa a exigir o atributo:

```js
  document.addEventListener('dblclick', function (e) {
    var el = e.target.closest('[data-lp]')
    if (!el) return
    var alvoNo = el.getAttribute('data-lp')
    var novo = alvoNo.indexOf('el:') === 0
    if (novo ? !el.hasAttribute('data-lp-editavel') : !EDITAVEIS.test(alvoNo)) return
    e.preventDefault()
    iniciarEdicao(el)
  })
```

- [ ] **Step 2: `lerAlvo` entende os dois formatos**

Em `EditorLp.tsx`, `lerAlvo` hoje devolve `{ secaoId, itemId }`. Passa a devolver também o id do nó:

```ts
/** 'el:ID' -> no da arvore; 'sec:ID:item:IID:campo' -> formato antigo. */
function lerAlvo(alvo: string | null): {
  secaoId: string | null
  itemId: string | null
  noId: string | null
} {
  if (alvo?.startsWith('el:')) return { secaoId: null, itemId: null, noId: alvo.slice(3) }
  if (!alvo || !alvo.startsWith('sec:')) return { secaoId: null, itemId: null, noId: null }
  const partes = alvo.split(':')
  return {
    secaoId: partes[1] ?? null,
    itemId: partes[2] === 'item' ? (partes[3] ?? null) : null,
    noId: null,
  }
}
```

E o `useState` de `itemId` ganha um irmão `noId`, alimentado no `case 'selecionar'`. Quando `noId` existe, a aba muda para `editar` também.

**Descobrir a seção do nó:** o alvo `el:<id>` não diz de qual seção o nó é. O `PainelWidget` precisa disso para mutar. Resolver com uma busca:

```ts
/** Secao que contem o no, ou null. */
const secaoDoNo = (d: LpDocumento, noId: string) =>
  d.secoes.find((s) => s.raiz && acharNo(s.raiz, noId)) ?? null
```

- [ ] **Step 3: Verificar e commitar**

Sem teste automatizado: é comportamento de DOM dentro de iframe, que a suíte não cobre hoje. A verificação é manual — abrir o editor, clicar num título migrado, confirmar que ele fica selecionado e que o duplo clique edita; clicar numa imagem e confirmar que o duplo clique **não** abre edição de texto.

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add lib/lp/editorRuntime.ts lib/lp/compilador/widgets.ts components/lp/EditorLp.tsx
git commit -m "feat(lp): selecao e edicao inline por id de no no canvas"
```

---

### Task 6: Painel por widget

A maior task do plano. `PainelPropriedades.tsx` (827 linhas) não é apagado ainda: ele continua atendendo seção sem `raiz`.

**Files:**
- Create: `components/lp/PorDispositivo.tsx`
- Create: `components/lp/PainelWidget.tsx`
- Create: `components/lp/widgets/PainelTexto.tsx`, `PainelMidia.tsx`, `PainelBotaoWidget.tsx`, `PainelContainer.tsx`, `PainelComposto.tsx`
- Modify: `components/lp/EditorLp.tsx`

- [ ] **Step 1: `PorDispositivo` — o controle com os três dispositivos**

```tsx
'use client'

import { Monitor, Smartphone, Tablet } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Dispositivo, PorDisp } from '@/lib/lp/tipos'

const ICONES = { desktop: Monitor, tablet: Tablet, celular: Smartphone } as const
const ROTULOS = { desktop: 'Computador', tablet: 'Tablet', celular: 'Celular' } as const

/**
 * Envolve um controle e escolhe em qual dispositivo o valor é escrito. O ponto
 * azul marca os dispositivos que já têm valor próprio — sem ele, não há como
 * saber que o celular está diferente sem clicar em cada aba.
 */
export function PorDispositivo<T>({
  rotulo,
  valor,
  ativo,
  aoTrocarDispositivo,
  children,
}: {
  rotulo: string
  valor: PorDisp<T> | undefined
  ativo: Dispositivo
  aoTrocarDispositivo: (d: Dispositivo) => void
  children: ReactNode
}) {
  const dispositivos: Dispositivo[] = ['desktop', 'tablet', 'celular']
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-dim">{rotulo}</span>
        <div className="flex gap-0.5 rounded border border-border bg-surface-2 p-0.5">
          {dispositivos.map((d) => {
            const Icone = ICONES[d]
            const definido = valor?.[d] !== undefined
            return (
              <button
                key={d}
                type="button"
                onClick={() => aoTrocarDispositivo(d)}
                aria-label={ROTULOS[d]}
                aria-pressed={ativo === d}
                title={definido ? `${ROTULOS[d]} — valor próprio` : ROTULOS[d]}
                className={`relative rounded p-1 transition-colors ${
                  ativo === d ? 'bg-blue text-white' : 'text-text-dim hover:text-text'
                }`}
              >
                <Icone className="h-3.5 w-3.5" />
                {definido && (
                  <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-blue" />
                )}
              </button>
            )
          })}
        </div>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: `PainelWidget` — despacho e abas**

```tsx
'use client'

import { useState } from 'react'
import { PainelBotaoWidget } from './widgets/PainelBotaoWidget'
import { PainelComposto } from './widgets/PainelComposto'
import { PainelContainer } from './widgets/PainelContainer'
import { PainelMidia } from './widgets/PainelMidia'
import { PainelTexto } from './widgets/PainelTexto'
import { Vazio } from './campos'
import { acharNo } from '@/lib/lp/arvore'
import type { Dispositivo, LpDocumento, LpElemento } from '@/lib/lp/tipos'

export type Aplicar = (mut: (d: LpDocumento) => void, agrupar?: string) => void
type Aba = 'conteudo' | 'estilo' | 'avancado'

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'conteudo', rotulo: 'Conteúdo' },
  { chave: 'estilo', rotulo: 'Estilo' },
  { chave: 'avancado', rotulo: 'Avançado' },
]

const NOME: Record<string, string> = {
  container: 'Container',
  titulo: 'Título',
  texto: 'Texto',
  imagem: 'Imagem',
  video: 'Vídeo',
  botao: 'Botão',
  icone: 'Ícone',
  numero: 'Número',
  lista: 'Lista',
  espacador: 'Espaçador',
  divisor: 'Divisor',
  faq: 'FAQ',
  abas: 'Abas',
  carrossel: 'Carrossel',
  depoimentos: 'Depoimentos',
  comparacao: 'Comparação',
  formulario: 'Formulário',
}

export function PainelWidget({
  doc,
  noId,
  aplicar,
  aoSelecionar,
}: {
  doc: LpDocumento
  noId: string
  aplicar: Aplicar
  aoSelecionar: (id: string) => void
}) {
  const [aba, setAba] = useState<Aba>('conteudo')
  const [dispositivo, setDispositivo] = useState<Dispositivo>('desktop')

  const secao = doc.secoes.find((s) => s.raiz && acharNo(s.raiz, noId))
  const no = secao?.raiz ? acharNo(secao.raiz, noId) : null
  if (!secao || !no) return <Vazio>Selecione um elemento na página.</Vazio>

  // Caminho até a raiz, para subir na árvore sem caçar o pai no canvas.
  const trilha = caminhoAte(secao.raiz!, noId)

  const comuns = { no, secaoId: secao.id, aplicar, dispositivo, aba }

  return (
    <div className="space-y-3">
      <nav aria-label="Caminho do elemento" className="flex flex-wrap items-center gap-1 text-xs">
        {trilha.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-text-dim">›</span>}
            <button
              type="button"
              onClick={() => aoSelecionar(p.id)}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                p.id === noId ? 'bg-blue/15 text-blue' : 'text-text-dim hover:text-text'
              }`}
            >
              {NOME[p.tipo] ?? p.tipo}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex border-b border-border">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setAba(a.chave)}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${
              aba === a.chave
                ? 'border-blue text-text'
                : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {no.tipo === 'container' && <PainelContainer {...comuns} no={no} />}
      {(no.tipo === 'titulo' || no.tipo === 'texto' || no.tipo === 'numero') && (
        <PainelTexto {...comuns} no={no} />
      )}
      {(no.tipo === 'imagem' || no.tipo === 'video') && <PainelMidia {...comuns} no={no} />}
      {no.tipo === 'botao' && <PainelBotaoWidget {...comuns} no={no} />}
      {['faq', 'abas', 'carrossel', 'depoimentos', 'comparacao', 'formulario'].includes(
        no.tipo,
      ) && <PainelComposto {...comuns} no={no} />}
    </div>
  )
}
```

Não há seletor de dispositivo global: cada campo que aceita valor por dispositivo traz o seu (`PorDispositivo`), e todos escrevem no mesmo estado — clicar em "celular" num campo mantém o contexto nos outros.

`caminhoAte` entra no mesmo arquivo:

```ts
/** Ancestrais do no, da raiz ate ele — alimenta o caminho clicavel. */
function caminhoAte(raiz: LpContainer, id: string): LpElemento[] {
  const trilha: LpElemento[] = []
  const desce = (el: LpElemento): boolean => {
    trilha.push(el)
    if (el.id === id) return true
    if (el.tipo === 'container' && el.filhos.some(desce)) return true
    trilha.pop()
    return false
  }
  desce(raiz)
  return trilha
}
```

- [ ] **Step 3: Os painéis por tipo**

Cada um é um arquivo pequeno que usa `Texto`, `Area`, `Cor`, `Fonte`, `Faixa`, `Opcoes` de `campos.tsx` e `PorDispositivo` para os campos que aceitam valor por dispositivo. A regra de repartição entre as abas:

| Aba | O que entra |
|---|---|
| Conteúdo | texto, mídia, URL, itens do widget composto, ícone |
| Estilo | cor, fundo, fonte, tamanho, peso, altura de linha, espaçamento, alinhamento, raio, sombra |
| Avançado | margem, padding, largura, ocultar por dispositivo |

Estilo e Avançado são **iguais para todo widget** — extrair `CamposEstilo` e `CamposAvancado` e usar nos cinco painéis, em vez de repetir.

Escrever, nesta ordem, rodando `npm run build` a cada um: `PainelTexto` (texto + nível do título), `PainelMidia` (reusa `CampoMidia`), `PainelBotaoWidget` (reusa `CamposBotao`), `PainelContainer` (direção, colunas, gap, alinhar, justificar — todos por dispositivo), `PainelComposto` (a lista do widget, reusando o padrão de `ItensSecao`).

- [ ] **Step 4: Ligar no `EditorLp`**

Na aba `editar`, escolher o painel conforme o alvo:

```tsx
{aba === 'editar' &&
  (noId ? (
    <PainelWidget doc={doc} noId={noId} aplicar={aplicar} aoSelecionar={selecionarNo} />
  ) : (
    <PainelPropriedades … />
  ))}
```

- [ ] **Step 5: Verificar e commitar**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add components/lp/
git commit -m "feat(lp): painel por widget com abas e valor por dispositivo"
```

---

### Task 7: Painel de camadas

**Files:**
- Modify: `components/lp/PainelEstrutura.tsx`

- [ ] **Step 1: Árvore em vez de lista plana**

Cada seção vira um nó expansível; dentro, os containers e widgets, recuados por profundidade. Clicar seleciona (mesmo `aoSelecionar` do canvas). A alça de arrastar continua reordenando **seções**; reordenar nós dentro da seção é a Entrega 3.

Cada linha mostra o nome do tipo (o mapa `NOME` do `PainelWidget`, extraído para `lib/lp/tipos.ts` ou um módulo próprio para os dois usarem) e um trecho do texto quando houver.

- [ ] **Step 2: Verificar e commitar**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add components/lp/PainelEstrutura.tsx
git commit -m "feat(lp): painel de estrutura mostra a arvore da secao"
```

---

### Task 8: `SecaoTipada` separada de `LpSecao`

**Files:**
- Modify: `lib/lp/tipos.ts`, `layouts.ts`, `documento.ts`, `validar.ts`, `presets/*`
- Modify: `app/api/lp/gerar/route.ts`

- [ ] **Step 1: Separar os tipos**

Em `tipos.ts`, o shape atual vira `SecaoTipada` — formato **intermediário**, produzido pela IA e pelo `documentoBase`, consumido pelo expansor. `LpSecao` fica só com o que é persistido:

```ts
export type LpSecao = {
  id: string
  nome: string
  ancora: string | null
  preset?: TipoLayout
  raiz: LpContainer
  fundo?: { … }
  espacamento?: PorDisp<{ topo: number; base: number }>
}
```

`SecaoTipada` mantém os campos de hoje e some de `LpDocumento`.

- [ ] **Step 2: Expandir na geração**

`documentoBase` e `coergirDocumentoIA` passam a devolver `DocumentoTipado` (com `SecaoTipada[]`), e a rota de geração aplica o expansor antes de gravar — o mesmo `expandirPreset` da migração.

- [ ] **Step 3: Seguir os erros do compilador**

`npm run typecheck` aponta cada lugar que ainda espera os campos antigos em `LpSecao`. Corrigir um a um. `EtapaSecoes.tsx` não aparece — ele usa `SecaoBriefing`, que não muda.

- [ ] **Step 4: Verificar e commitar**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add lib app
git commit -m "feat(lp): LpSecao vira arvore; o formato tipado fica so na geracao"
```

---

### Task 9: Deletar o caminho tipado

**Files:**
- Modify: `lib/lp/compilador/html.ts`, `css.ts`
- Modify: `components/lp/PainelPropriedades.tsx` (deletar)
- Modify: `lib/lp/compilador/equivalencia.test.ts`

- [ ] **Step 1: Apagar o que ficou órfão**

De `html.ts`: as 21 funções `lHero`…`lCarrossel`, o mapa `corpo` e os helpers só delas (`acaoSecao`, `cabeca`, `tituloEl`, `subtituloEl`, `textoEl`, `textoItem`, `itemAlvo`).
De `css.ts`: `POR_LAYOUT`, `LAYOUTS_ORDENADOS`, `cssDaSecao`, `SELETOR_ELEMENTO`, `ajusteParaCss` — a menos que `cssBarras` ainda use `ajusteParaCss`, que usa.
De `components/lp/`: `PainelPropriedades.tsx` e o que só ele importava.

O `typecheck` e o `lint` (no-unused-vars) apontam o que sobrou.

- [ ] **Step 2: Limpar o teste de equivalência**

Apagar o `describe` que comparava árvore x tipado. Fica só o que compara contra `fixtures.json` — a referência congelada do que a página sempre foi.

- [ ] **Step 3: Verificação final**

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Além disso, verificação manual obrigatória, que os testes não cobrem: abrir um projeto real no editor, conferir que a página está visualmente igual, editar um título pelo painel e confirmar que muda no canvas, e exportar o .zip.

- [ ] **Step 4: Commit**

```bash
git add -A lib components
git commit -m "refactor(lp): deleta o caminho tipado do compilador e o painel antigo"
```

---

## Ao final

O documento é árvore, o compilador só sabe renderizar árvore, e cada elemento tem painel próprio com valor por dispositivo. As Partes 1 e 2 são mergeadas juntas — a virada é atômica.

Fica para a **Entrega 3** o que este plano não faz: arrastar elementos dentro da seção no canvas, e a biblioteca de widgets para inserir elementos novos.
