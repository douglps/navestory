# ADR 003: Estratégia de Autenticação baseada em JWT

## Status
Aceito

## Contexto
Precisamos prover autenticação robusta para usuários web, bem como permitir que sistemas e integrações terceiras acessem os dados via API. O sistema deve interagir bem com nossa escolha de RLS (ADR 002).

## Decisão
Os padrões de autenticação serão baseados em **JWT (JSON Web Tokens)** distribuídos de forma atrelada aos mecanismos já providos no provedor de Auth (ex: Supabase Auth). As sessões para front-end web devem usar *httpOnly cookies*, enquanto que integrações e clientes de APIs externas proveniarão tokens (ex: de conta de serviço/API Key) nos cabeçalhos `Authorization: Bearer <token>`.

## Consequências
- **Positivas:**
  - Stateless e facilmente escalável.
  - Passagem implícita e natural do contexto (UUID do usuário, Role) para o banco avaliar usando Claims e RLS do Supabase.
- **Negativas:**
  - Revogação de um JWT sem expiração configurada adequadamente requer lista de bloqueio (blacklist/redlist armazenada/em cache de Redis), o que adiciona state.
  - Requer cuidado ao manipular tokens refrescados, limitando o lifetime do token de acesso a minutos, não horas/dias.

## Observação — Hashing de senha (bcrypt)

O fluxo de usuário (`register`/`login` em `auth.service.ts`) delega inteiramente para `supabase.auth.signUp`/`signInWithPassword`. O hashing de senha (bcrypt) é feito pelo GoTrue do Supabase — o código da aplicação nunca vê nem manipula o hash. O PRD (`docs/PRD/PRD-v1.0.md`) citava "bcrypt 12 rounds" como requisito não-funcional próprio; foi corrigido para refletir que é responsabilidade delegada ao provedor, não uma implementação local.

Isso só deixa de ser suficiente se surgir um fluxo de credencial que **não** passe pelo GoTrue — por exemplo, API Keys/tokens de conta de serviço para integrações externas (mencionados na seção de Decisão acima). Nesse caso, o hashing (bcrypt ou, preferencialmente, Argon2id) precisará ser implementado explicitamente na aplicação, já que não há biblioteca de hashing no projeto hoje.

---

## Addendum — Mecanismo de Transporte de Cookie Cross-Origin em Desenvolvimento (2026-07-13)

**Contexto:** Este ADR decide o uso de `httpOnly cookies` como mecanismo de sessão para o frontend web, mas deixava em aberto o mecanismo de transporte quando a API (`localhost:3001`) e o Next.js (`localhost:3000`) rodam em origens distintas durante o desenvolvimento local.

**Decisão adotada na Fase 1 (T1.1):**

O problema de cross-origin em dev é resolvido via **rewrite no `apps/web/next.config.ts`**, não via configuração de `Domain=localhost`:

```ts
// apps/web/next.config.ts
rewrites: async () => [
  {
    source: '/api/backend/:path*',
    destination: 'http://localhost:3001/:path*',
  },
]
```

Todas as chamadas do frontend para a API são feitas em `/api/backend/*` (mesma origem), e o Next.js faz o proxy para `localhost:3001`. O browser vê apenas `localhost:3000`, o cookie `httpOnly` é setado na mesma origem, e não há requisição cross-origin no sentido do browser.

**Implicação em produção:** Em produção, o frontend e a API residem em domínios distintos (`nave.app` / `api.nave.app`) ou a API é servida via reverse proxy na mesma origem. O mesmo padrão de rewrite pode ser replicado via configuração de proxy do CDN/infra, mantendo o cookie como `httpOnly` sem `SameSite=None`. Esta decisão não altera o ADR de usar httpOnly cookies — apenas especifica o mecanismo de transporte para o ambiente de desenvolvimento local.

**Arquivos afetados:** `apps/web/next.config.ts`, `apps/web/middleware.ts` (usa `/api/backend/auth/refresh` para renovar sessão SSR).
