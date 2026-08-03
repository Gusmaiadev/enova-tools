# Editor de Landing Pages no modelo Elementor — Design

Data: 2026-08-03

## Problema

O editor visual de LP permite selecionar elementos no canvas e editar texto inline,
mas não permite **compor**: a posição de cada elemento dentro da seção é fixa, e o
painel edita a seção inteira de uma vez.

A causa é o modelo de dados. `LpSecao` (`lib/lp/tipos.ts:191`) tem slots fixos —
`titulo`, `subtitulo`, `texto`, `botao` (um só), `midia` (uma só), `itens[]` — e quem
decide a ordem deles na tela é o compilador: cada um dos 21 layouts é uma função com
o HTML escrito à mão (`lHero`, `lCards`, `lFaq`… em `lib/lp/compilador/html.ts`). Em
`lTextoMidia`, por exemplo, a ordem título → subtítulo → texto → botão está literal
na string de template.

**Não existe "posição do elemento" como dado.** Arrastar um botão para cima do título
não tem onde ser gravado.

Do outro lado, `components/lp/PainelPropriedades.tsx` são 827 linhas que mostram todos
os campos da seção simultaneamente, enquanto o Elementor mostra apenas o widget
selecionado.

## Objetivo

Editor no modelo Elementor: cada elemento (mídia, botão, título, subtítulo, conteúdo)
editável de forma independente, e arrastável para qualquer posição **dentro da mesma
seção**.

## Decisões tomadas

Três escolhas feitas em conjunto com o usuário, todas na direção do escopo completo:

1. **Tela livre de verdade.** A seção vira container e o conteúdo vira árvore de
   widgets. Não é "liberdade dentro do layout".
2. **Os 21 layouts viram presets.** A IA continua escolhendo `hero`, `cards`, `faq`…
   e um expansor converte isso em árvore. Os layouts deixam de renderizar e passam a
   semear.
3. **Responsivo por breakpoint completo.** Toda propriedade de estilo aceita valor
   próprio em desktop, tablet e celular.

Uma quarta decisão define a fronteira interna:

4. **Linha por comportamento.** Onde é só layout, vira composição livre (cards,
   preços, produtos, benefícios, galeria, masonry, logos, timeline, blocos alternados,
   big numbers). Onde há JavaScript e semântica de acessibilidade, continua widget
   composto com lista própria (FAQ, abas, carrossel, depoimentos, comparação,
   formulário).

## 1. Modelo de dados

### Valor por dispositivo

Os breakpoints já existem em `lib/lp/compilador/css.ts` e são consistentes:
`max-width:900px` (tablet) e `max-width:640px` (celular), desktop-first. O modelo
adota exatamente esses.

```ts
export type Dispositivo = 'desktop' | 'tablet' | 'celular'

/** Valor por dispositivo. `desktop` é a base (sem media query); tablet e celular
 *  só emitem CSS quando presentes. */
export type PorDisp<T> = Partial<Record<Dispositivo, T>>
```

A herança sai de graça da cascata: sendo `max-width`, numa tela de 500px os dois
blocos valem, e o de 640 vence por vir depois. Logo celular herda de tablet, que herda
de desktop, sem código de resolução.

```ts
```

### A árvore

```ts
/** Comum a todo nó. */
type Base = {
  id: string
  estilo?: LpEstilo          // ausente = herda do tema
  oculto?: PorDisp<boolean>  // "não mostrar no celular"
}

/**
 * Identidade visual pronta de um container: vira uma classe no HTML e carrega o
 * que `LpEstilo` não alcança — hover, transição e pseudo-elemento (o selo "Mais
 * popular" do plano em destaque é um `::before`). Sem isso, migrar uma seção de
 * cards produziria três colunas de texto cru, sem borda, sem fundo e sem hover.
 * `estilo` sobrepõe por cima.
 */
export type Aparencia =
  | 'card' | 'plano' | 'plano-destaque' | 'produto' | 'bloco'
  | 'figura' | 'beneficio' | 'marco' | 'caixa-cta'

export type LpContainer = Base & {
  tipo: 'container'
  aparencia?: Aparencia
  direcao: PorDisp<'linha' | 'coluna'>
  colunas?: PorDisp<number>
  gap?: PorDisp<number>
  alinhar?: PorDisp<'inicio' | 'centro' | 'fim' | 'esticar'>
  justificar?: PorDisp<'inicio' | 'centro' | 'fim' | 'entre'>
  filhos: LpElemento[]
}

export type LpElemento = LpContainer | LpWidget
```

**Um só primitivo de layout, recursivo.** Não se adota o modelo antigo do Elementor
(Seção → Linha → Coluna → Widget, quatro níveis fixos): o Elementor atual usa
container flexbox que aninha, que é mais simples e mais poderoso. Container com
`direcao: 'linha'` é uma linha de colunas; com `'coluna'`, uma pilha. Grade de cards é
um container `linha` com `colunas: 3` cujos filhos são containers.

### Os widgets

```ts
export type LpWidget = Base & (
  // --- simples: livres para compor ---
  | { tipo: 'titulo'; nivel: 'h1'|'h2'|'h3'|'h4'; texto: string }
  /** `papel` escolhe a categoria de tipografia do tema (subtitulos ou textos). */
  | { tipo: 'texto'; papel: 'subtitulo' | 'corpo'; texto: string }
  | { tipo: 'imagem' | 'video'; midia: LpMidia }
  | { tipo: 'botao'; botao: LpBotao }
  | { tipo: 'icone'; nome: string }
  | { tipo: 'numero'; valor: string; rotulo: string }   // big number, com contador
  | { tipo: 'lista'; itens: { id: string; icone?: string; texto: string }[] }
  | { tipo: 'espacador'; altura: PorDisp<number> }
  | { tipo: 'divisor' }
  // --- compostos: JS e semântica ficam do lado do compilador ---
  | { tipo: 'faq'; perguntas: { id: string; pergunta: string; resposta: string }[] }
  | { tipo: 'abas'; abas: { id: string; titulo: string; texto: string; imagem?: LpMidia }[] }
  | { tipo: 'carrossel'; slides: { id: string; imagem?: LpMidia; titulo?: string; texto?: string }[] }
  | { tipo: 'depoimentos'; depoimentos: { id: string; texto: string; nome: string; cargo?: string; foto?: LpMidia }[] }
  | { tipo: 'comparacao'; rotulos: string[]; colunas: { id: string; titulo: string; celulas: string[]; destaque?: boolean }[] }
  | { tipo: 'formulario'; destino?: string }
)
```

### Estilo

```ts
export type LpEstilo = {
  cor?: PorDisp<string>;        fundo?: PorDisp<string>
  fonte?: PorDisp<string>;      tamanho?: PorDisp<string>
  peso?: PorDisp<number>;       alturaLinha?: PorDisp<string>
  espacamentoLetras?: PorDisp<string>
  alinhamento?: PorDisp<'left'|'center'|'right'>
  margem?: PorDisp<Caixa>;      padding?: PorDisp<Caixa>
  largura?: PorDisp<string>;    raio?: PorDisp<number>
  sombra?: PorDisp<string>
}
type Caixa = { topo: number; direita: number; base: number; esquerda: number }
```

`LpTema` continua existindo e mandando no padrão; `estilo` só sobrepõe o que o usuário
mexeu. Página sem ajustes gera CSS praticamente do tamanho de hoje.

O tema tem quatro categorias de tipografia (`titulos`, `subtitulos`, `textos`,
`botoes`) e cada widget diz a qual pertence: `titulo` → `titulos`, `botao` → `botoes`,
e `texto` → `subtitulos` ou `textos` conforme o `papel`. Sem esse campo, todo
subtítulo perderia a tipografia própria na migração.

### A seção

```ts
export type LpSecao = {
  id: string
  nome: string
  ancora: string | null
  /** Preset que semeou a seção. Vira rótulo no painel e continua sendo o que a IA
   *  escolhe — mas não manda mais no render. */
  preset?: TipoLayout
  raiz: LpContainer
  fundo?: { cor?: string; midia?: LpMidia | null; escurecer?: number; textoClaro?: boolean }
  espacamento?: PorDisp<{ topo: number; base: number }>
}
```

### Consequências

- `AjusteTexto`, `ElementoTexto`, `LpItem`, e os campos `colunas`, `inverter`,
  `largura`, `rotulos`, `titulo`, `subtitulo`, `texto`, `botao`, `midia`, `itens`,
  `ajustes`, `destinoForm` deixam de existir em `LpSecao`. É mudança de tipo com
  quebra: nenhum documento salvo carrega sem migração.
- O alvo do `data-lp` deixa de ser `sec:ID:campo` e vira `el:<id>`, porque todo nó tem
  id próprio. Some o parser de caminho do `editorRuntime.ts`, e o regex `EDITAVEIS`
  vira uma checagem do tipo do nó.

## 2. Compilador

### `html.ts`: 21 funções viram uma

```ts
function renderElemento(ctx: Ctx, el: LpElemento): string {
  if (el.tipo === 'container') {
    return `<div class="lp-c ${classe(el)}"${alvo(ctx, `el:${el.id}`)}>${
      el.filhos.map((f) => renderElemento(ctx, f)).join('')
    }</div>`
  }
  return RENDER[el.tipo](ctx, el)
}
```

Os widgets compostos herdam quase inteiras as funções de hoje: o `<details>/<summary>`
do FAQ, o `slider()` com `aria-label` do carrossel e dos depoimentos, a `<table>` da
comparação, o `<form>` com honeypot. Sai delas apenas o cabeçalho da seção
(`cabeca()`, `tituloEl()`, `acaoSecao()`), que agora são widgets soltos.

Disciplina de segurança inalterada: `esc()` em texto, `urlSegura()` em URL,
`corSegura()`/`escCss()` em cor — e agora também nos valores de `estilo`, que viram
CSS.

### Container → CSS

```
direcao 'coluna'            → display:flex; flex-direction:column
direcao 'linha' + colunas N → display:grid; grid-template-columns:repeat(N,1fr)
direcao 'linha' sem colunas → display:flex; flex-direction:row; flex-wrap:wrap
```

### `css.ts`: estático encolhe, gerado aparece

Some quase todo o CSS por layout (`CSS_LAYOUT[tipo]`); entra CSS derivado de `estilo`,
uma classe `.lp-e-<id>` por nó que tenha ajuste. Ordem de emissão:

```
1. reset + tema + CSS base de container/widget   (nunca passa de 1 classe)
2. regras base de cada elemento (.lp-e-ID)
3. UM bloco @media (max-width:900px) com todos os elementos
4. UM bloco @media (max-width:640px) com todos os elementos
```

Agrupar por breakpoint evita três media queries por nó. A regra de que o CSS base
nunca ultrapassa uma classe garante que o ajuste do usuário vença por ordem, sem
`!important` e sem seletor duplicado.

### Responsivo bom por padrão

O preset semeia os valores de tablet e celular junto com os de desktop. Grade de cards
nasce `colunas: { desktop: 3, tablet: 2, celular: 1 }` — o mesmo que as media queries
de `css.ts:228` fazem hoje. O usuário ganha os três controles, mas a página já chega
empilhando certo no celular.

### `js.ts`: por widget em uso

Mesma lógica de hoje trocando a chave: slider se houver `carrossel` ou `depoimentos`,
accordion se houver `faq`, contador se houver `numero`, envio se houver `formulario`.
A varredura passa a ser na árvore.

A coleta de mídias (`ctx.midias`, que alimenta o export com download dos arquivos)
também caminha a árvore.

### Fundo da seção

`fundo` continua em `LpSecao`, fora da árvore, e o render dele não muda: a
`lp-fundo-midia` mais a `lp-veu` seguem sendo emitidas no `<section>`, antes da raiz.
Fundo é propriedade da seção, não elemento arrastável.

### Inalterado

Modo `export` continua sem emitir `data-lp` nem CSS de editor. Âncoras de seção
(`idHtmlSecao`) seguem iguais — o menu do header não sente nada. Páginas legais
(`termos.html`, `privacidade.html`) são texto corrido e ficam intocadas.

## 3. Presets e migração

### O expansor

```ts
/** Converte uma seção tipada (formato antigo ou saída da IA) na árvore. */
function expandirPreset(tipo: TipoLayout, dados: DadosPreset): LpContainer
```

Usado em três lugares, o que o torna barato:

| Onde | Para quê |
|---|---|
| `persistencia.ts` | Migrar documento salvo na leitura |
| `PainelEstrutura` → "Nova" | Criar seção nova já montada (substitui `novaSecao`) |
| Coerção da IA | Converter o que o modelo devolveu |

Um só caminho de código para os três: expansor de `cards` correto = correto nos três.

**Caso especial do banner.** Hoje o banner usa `s.midia` como imagem de fundo, não
como elemento na página (`html.ts:466`: `s.tipo === 'banner' ? (s.midia ?? s.fundo?.midia)`).
Como `midia` sai de `LpSecao`, o expansor do preset `banner` move essa mídia para
`fundo.midia` em vez de criar um widget de imagem na árvore — senão a faixa perde o
fundo e ganha uma foto solta no meio do texto.

### O gancho já existe

`persistencia.ts:17` tem uma `migrar()` que roda em toda leitura (`obterProjeto`) e já
converte três formatos antigos (telefones que eram string, botão do header que virou
lista, páginas legais).

```ts
export type LpDocumento = {
  /** Ausente = formato de seções tipadas (pré-árvore). */
  versao?: 2
  // seo, tema, header, secoes, footer, redes e paginas seguem inalterados
}
```

Sem `versao`, `migrar()` roda o expansor em cada seção. Editor, compilador e export só
conhecem o formato novo — mesma disciplina que o arquivo já segue.

**Migração na leitura, não em lote.** Sem script de manutenção, sem janela de
indisponibilidade; projeto não aberto há um ano migra no dia em que for aberto.

### Rede de proteção

A conversão é de mão única. Na primeira escrita pós-migração, gravar o original em um
campo `documentoV1` no Firestore. Custo desprezível, e transforma "a migração estragou
a página do cliente" de acidente irreversível em incidente recuperável.

### Risco obrigatório: `arquivosUsados`

`documento.ts:456` monta a lista de arquivos do bucket que o projeto ainda cita — e o
que **não** está nessa lista a limpeza de órfãos apaga. Ela hoje varre `secao.midia`,
`secao.fundo?.midia` e `item.imagem`: exatamente os campos extintos.

Se não for reescrita para caminhar a árvore, a limpeza passa a considerar órfã toda
mídia enviada pelo usuário e apaga os arquivos do bucket com a página ainda em uso.

**Vai na mesma entrega do modelo de dados, como item obrigatório.** É o único ponto do
plano em que errar significa perder arquivo do cliente.

### Prova de que a migração não estragou nada

`compilador.test.ts` já tem 787 linhas de fixtures cobrindo os layouts. Elas viram o
conjunto de referência: para cada um dos 21 presets, o teste pega o documento no
formato antigo, expande, renderiza no formato novo e compara contra o HTML que o
compilador de hoje produz — mesmos textos, mesmas URLs, mesmas tags semânticas, mesmas
âncoras.

Limite conhecido: os widgets compostos saem praticamente idênticos, porque herdam a
função de render inteira. Os que viram composição livre (cards, preços, produtos,
benefícios, galeria) passam a ter o grid gerado a partir do container em vez do CSS
estático — equivalente, mas não byte a byte. Diferença de um ou dois pixels em `gap` e
`padding` é possível, e é para isso que serve o `documentoV1`.

## 4. Editor

### Arrastar dentro do canvas

Roda inteiro dentro do iframe, no `editorRuntime.ts`, com **pointer events** em vez de
HTML5 drag-and-drop — dá controle sobre o indicador de destino e evita a imagem
fantasma do navegador. Ao soltar, o runtime envia `{tipo:'mover', id, paiId, indice}` e
o pai muta a árvore.

**Restrição pedida:** destino fora da seção de origem é recusado e o indicador some.

### Arrastar da biblioteca para o canvas

O iframe é `sandbox="allow-scripts"` sem `allow-same-origin` (`EditorLp.tsx:608`), logo
sua origem é `null` e o `dataTransfer` do HTML5 não atravessa de forma confiável.

Solução: o pai rastreia o ponteiro e transmite `{tipo:'arrastando', x, y, widget}` por
`postMessage`; o iframe desenha o indicador e responde qual é o alvo; no `mouseup` o
pai insere.

Junto vai o caminho por teclado — selecionar o container e clicar no widget insere no
fim. É o mecanismo de acessibilidade e serve de plano B se o arrasto entre janelas se
mostrar instável.

### Painel de camadas

A aba Estrutura deixa de ser lista plana de seções e passa a mostrar a árvore inteira
(seção → containers → widgets), com reordenação por alça usando o `useArrastar` que já
existe (`components/lp/arrastar.ts`). É o caminho acessível para a mesma operação do
canvas.

### Painel por widget

`PainelPropriedades.tsx` (827 linhas) é aposentado. No lugar, um `PainelWidget` que
despacha por `el.tipo`, **um arquivo por widget**, com as três abas do Elementor:

- **Conteúdo** — texto, mídia, url, itens do widget composto
- **Estilo** — cor, fonte, tamanho, peso, alinhamento, fundo, raio, sombra
- **Avançado** — margem, padding, largura, ocultar por dispositivo, âncora

O seletor desktop/tablet/celular aparece apenas nos campos que aceitam valor por
dispositivo. No topo, caminho clicável (`Seção › Container › Botão`) para subir na
árvore sem caçar o pai no canvas.

### Histórico

Sem mudança: `alterarDoc` e a pilha de snapshots (`EditorLp.tsx:116`) trabalham no
documento inteiro, então mover um nó já entra em Ctrl+Z de graça.

## 5. IA, briefing e validação

O briefing **não muda de formato**. `SecaoBriefing` continua com `layout: TipoLayout`
e o assistente segue igual. A IA continua devolvendo seções tipadas,
`coergirDocumentoIA` (`validar.ts:682`) continua validando o mesmo shape, e só então o
expansor roda. É o retorno da decisão dos presets: as 706 linhas de `validar.ts` quase
não são tocadas.

Muda em `documento.ts` o que fala o formato antigo:

- `aplicarTexto` — hoje quebra o caminho `sec:ID:campo`; passa a resolver `el:<id>`
- `aplicarItens`, `aplicarTextos`, `aplicarBotoes`, `aplicarLados` — sincronizam
  briefing → documento após regeração
- `duplicarSecao` — passa a regerar os ids da subárvore inteira
- `arquivosUsados` — ver risco na seção 3

Entram as operações de árvore: `acharNo`, `moverNo`, `inserirNo`, `removerNo`,
`duplicarNo`.

## Ordem de entrega

Cada uma com spec e plano próprios.

| | Entrega | Visível ao usuário | Estado |
|---|---|---|---|
| 1 | Modelo + expansor + migração + `arquivosUsados` | Nada | Concluída |
| 2 | **A virada**: compilador recursivo, migração ligada, painel por widget, remoção dos campos antigos | Sim | Em andamento |
| 3 | Canvas: arrastar dentro da seção | Sim | |
| 4 | Biblioteca de widgets e inserção | Sim | |
| 5 | IA e briefing sobre árvore | Não | |

**Por que a 2 é grande.** O plano original separava o compilador (2) do painel (4).
Não dá: `PainelPropriedades.tsx` lê os campos tipados da seção em 22 lugares. No
instante em que o compilador passa a renderizar a árvore, o painel continua
escrevendo em `secao.titulo` — que ninguém mais lê. Editar um título deixaria de
ter efeito na página, em silêncio. Não é erro de build, é o editor parando de
funcionar. A virada do compilador e a do painel têm de ser atômicas.

A Entrega 2 é construída em duas partes, na mesma branch e mergeadas juntas:
**2a** o renderizador (compilador aceita os dois formatos, nada ligado) e **2b**
a virada propriamente dita.

## Testes

O projeto usa vitest (`npm test`), com suítes já existentes em `lib/lp/`.

- **Expansor** — um caso por preset: seção antiga → árvore esperada.
- **Migração** — documento sem `versao` sai com `versao: 2` e árvore equivalente;
  documento já em v2 passa intacto.
- **Compilador** — as fixtures de `compilador.test.ts` como referência: mesmos textos,
  URLs, tags semânticas e âncoras que o compilador atual produz.
- **`arquivosUsados`** — mídia enviada em qualquer profundidade da árvore aparece no
  conjunto. Teste de regressão explícito contra a perda de arquivo.
- **CSS por breakpoint** — `estilo` com valor só em celular emite regra apenas no
  bloco de 640px; valor em desktop emite fora de media query.
- **Operações de árvore** — mover, inserir, remover, duplicar (com ids novos).

## Riscos

| Risco | Mitigação |
|---|---|
| Limpeza de órfãos apaga mídia em uso | `arquivosUsados` reescrita na mesma entrega, com teste de regressão |
| Migração degrada página de cliente | `documentoV1` guardado no Firestore; testes comparando com o render atual |
| Arrasto entre janelas instável (iframe origin `null`) | Protocolo por `postMessage`; caminho por teclado como plano B funcional |
| Usuário monta árvore que quebra no celular | Presets semeiam tablet/celular; controles por dispositivo no painel |
| Escopo grande demais para uma entrega | Seis entregas independentes; corte seguro após a 2 |

## Restrição de implementação

Conforme `AGENTS.md`, esta versão do Next.js tem mudanças de API em relação ao
conhecimento prévio do modelo: consultar o guia pertinente em
`node_modules/next/dist/docs/` antes de escrever código.
