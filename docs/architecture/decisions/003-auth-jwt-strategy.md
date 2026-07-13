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
