# E-nova Tools

Ambiente interno de ferramentas da E-nova. A primeira ferramenta é o **Buscador
de Leads**: encontra empresas que ainda não têm site, para prospecção.

Stack: Next.js 16 (App Router) + TypeScript · Firebase Spark (Auth + Firestore) ·
Google Places API (New) + Geocoding · IBGE · Resend · Tailwind v4 · deploy Vercel.

> Roda inteiro no plano **Spark (grátis)**. Sem Cloud Functions, sem Storage.
> Os Route Handlers do Next são o backend.

---

## 1. Pré-requisitos

- **Node 22+** (o firebase-admin v14 exige; este projeto usou 22.14).
- Uma conta Firebase (plano Spark), uma chave da Google Maps Platform e uma conta Resend.

## 2. Configurar as credenciais

Copie o exemplo e preencha:

```bash
cp .env.example .env.local
```

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Configurações do projeto → Seus apps (Web) → SDK config |
| `FIREBASE_ADMIN_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY` | Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada (JSON) |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs e Serviços → Credenciais (**server-only**, nunca `NEXT_PUBLIC`) |
| `RESEND_API_KEY` | Resend → API Keys |
| `EMAIL_FROM` | Um endereço de um domínio verificado no Resend (em teste, `onboarding@resend.dev` só envia para o dono da conta) |
| `DEFAULT_TEAM_ID` | Já vem `trinca`; deixe assim no MVP |

> A `FIREBASE_ADMIN_PRIVATE_KEY` do JSON tem quebras de linha reais. No `.env.local`
> cole entre aspas duplas com os `\n` escapados, ex.: `"-----BEGIN...\n...\n-----END-----\n"`.
> O código já converte `\n` em quebras reais.

### No Google Cloud Console
- Habilite **Places API (New)** e **Geocoding API**.
- Restrinja a chave a essas duas APIs (+ IP do servidor, em produção).

### No Firebase Console
- Ative **Authentication → Sign-in method → E-mail/senha**.
- Em **Firestore**, publique as regras deste repositório (`firestore.rules`) — elas
  **negam tudo**. Isso é proposital e obrigatório (ver seção de segurança abaixo).

  ```bash
  # com a Firebase CLI, uma vez:
  npx firebase deploy --only firestore:rules
  ```

## 3. Rodar

```bash
npm install
npm run dev          # http://localhost:3000
```

Outros scripts:

```bash
npm run build        # build de produção
npm run typecheck    # tsc --noEmit
npm test             # vitest (classificador + quadtree)
npm run lint         # eslint
```

### Validar a Places API isoladamente

Depois de preencher `GOOGLE_MAPS_API_KEY`, confirme que o field mask devolve
`websiteUri` gastando **1 chamada**:

```bash
node scripts/verificar-places.mjs
```

## 4. Por que Firestore nega tudo (não afrouxe)

O SDK client considera o usuário autenticado **logo após a senha**, antes do
código 2FA. Se as regras permitissem leitura por usuário autenticado, dava para
**pular o 2FA** falando direto com o Firestore. Por isso:

- `firestore.rules` → **nega tudo**.
- **Todo** acesso a dados passa por Route Handler usando o **Admin SDK** (que
  ignora as regras por design). O client só usa o Firebase para autenticar.

## 5. Arquitetura em uma olhada

```
proxy.ts                     Gate de /app/* (Next 16 renomeou middleware->proxy; roda em Node)
app/api/auth/2fa/*           2FA manual por e-mail (Firebase nao tem 2FA por e-mail nativo)
app/api/leads/buscar         Busca por streaming SSE que alimenta o radar
lib/places/varrer.ts         Quadtree: subdivide a bbox quando bate o teto de 60 do searchText
lib/places/classificar.ts    A tese do produto: Instagram no campo "site" = lead quente
lib/leads/equipe.ts          Indice da equipe em UMA query (dedupe + marcacao, sem `in` de 30)
lib/ferramentas.ts           Registro de ferramentas - adicione a 2a aqui + uma rota em app/app/
```

### Como adicionar a segunda ferramenta
1. Adicione uma entrada em `lib/ferramentas.ts`.
2. Crie `app/app/{slug}/page.tsx`.
O grid em `/app` e o gate do `proxy.ts` já cobrem o resto.

## 6. Custos (free tier, ~5 usuários)

- **Places searchText Enterprise**: 1.000 chamadas grátis/mês. Cada *página* (até 20
  negócios) é uma chamada. Uma busca totalmente paginada = 3 chamadas. Há trava dura
  por busca e um contador mensal em `usage/{yyyy-mm}` que bloqueia em 800.
- **Geocoding**: 10.000 grátis/mês (barato).
- **IBGE / Resend / Firebase Spark**: grátis nas cotas deste uso.
