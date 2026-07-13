# Variáveis de Ambiente — Nave SaaS

> Toda variável de ambiente deve ser configurada antes de iniciar qualquer serviço. Valores reais nunca devem ser commitados no repositório — usar `.env.local` (ignorado pelo `.gitignore`). Copiar `.env.example` como ponto de partida.

**Última atualização:** 2026-07-13

---

## Regras de segurança

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** pode ser exposta como `NEXT_PUBLIC_*` nem aparecer em logs, respostas HTTP ou código client-side (regra S3).
- SPEC-20260521-001 RF-SEC-006 exige validação de variáveis obrigatórias na startup via Joi em `apps/api/src/config/env.validation.ts`. **Status real em 2026-07-13 (pós T0.3): ainda não implementado.** O stub atual de `apps/api/src/main.ts` lê `process.env.PORT` diretamente, sem validação nem `ConfigService`. Isso é dívida da Fase 1 (T1.2), não um fato já implementado — não assumir que a validação está ativa.
- Stack trace nunca é exposto ao cliente em `NODE_ENV=production` (regra S5) — também pendente de implementação real; o stub de T0.3 não trata isso ainda.

---

## Backend — `apps/api`

RF-SEC-001 de SPEC-20260521-001 exige que essas variáveis sejam lidas via `ConfigService.getOrThrow()`, nunca `process.env` direto no código de domínio. **Status real em 2026-07-13:** o stub de T0.3 usa `process.env.PORT` e `process.env.SUPABASE_JWT_SECRET` diretamente (ver `apps/api/src/main.ts` e `apps/api/src/auth/jwt.strategy.ts`) — a migração para `ConfigModule`/`ConfigService` é trabalho pendente, não implementado ainda.

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `PORT` | não | Porta em que o servidor NestJS escuta. Padrão: `3001` | `3001` |
| `NODE_ENV` | não | Modo de execução. Controla stack trace (S5), Swagger (SPEC-20260521-005) e logs de debug | `development` ou `production` |
| `SUPABASE_URL` | sim | URL do projeto Supabase (sem prefixo `NEXT_PUBLIC_`). Usada no módulo de auth e no `AdminSupabaseService` | `https://sfkefpoanmoiagwxbwld.supabase.co` |
| `SUPABASE_JWT_SECRET` | sim | Segredo JWT do projeto Supabase, usado pelo `JwtStrategy` (`passport-jwt`) para validar tokens de acesso emitidos pelo GoTrue | `<valor-do-dashboard-supabase>` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave de serviço do Supabase; bypassa RLS. Usada exclusivamente no `AdminSupabaseService` e na Edge Function de alertas de manutenção. Nunca compartilhar com o frontend | `<service-role-key-do-dashboard>` |
| `RESEND_API_KEY` | sim* | Chave da API do Resend para envio de e-mails de alerta de manutenção (SPEC-20260521-002). Obrigatória somente quando o módulo de alertas for ativado | `re_...` |
| `SWAGGER_ENABLED` | não | Se `true`, habilita o Swagger UI mesmo em `production` (útil para staging). Por padrão, Swagger só é ativo em `development` (SPEC-20260521-005) | `true` |

> **Nota sobre `SUPABASE_URL`:** versões anteriores do repositório usavam `NEXT_PUBLIC_SUPABASE_URL` no backend (achado crítico P1 de SPEC-20260521-001). A variável correta para o backend é `SUPABASE_URL`, sem prefixo.

---

## Frontend — `apps/web`

Variáveis com prefixo `NEXT_PUBLIC_` são embutidas no bundle cliente pelo Next.js e ficam visíveis no navegador. Nunca coloque segredos com este prefixo.

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | não | URL base da API NestJS consumida pelo frontend. Padrão em desenvolvimento: `http://localhost:3001` | `https://api.nave.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL pública do projeto Supabase, usada pelo Supabase JS Client no lado cliente para auth e storage | `https://sfkefpoanmoiagwxbwld.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Chave anônima (anon key) do Supabase; sujeita às políticas RLS. Segura para uso no navegador | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | não | URL pública do frontend; usada para gerar links em e-mails (ex: link de manutenção no alerta) | `https://nave.app` |
| `NEXT_PUBLIC_EXPENSE_TEMPLATES_ENABLED` | não | Feature flag da tray de templates de despesas (SPEC-20260601-003). Padrão implícito: desabilitado quando ausente | `true` |

---

## Supabase / infraestrutura

Estas variáveis são necessárias para workflows de CLI local (`supabase start`, `pnpm db:migrate`) e para o pipeline de CI.

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `SUPABASE_ACCESS_TOKEN` | sim (CI) | Token pessoal de acesso à API de gerenciamento do Supabase; usado pelo CLI em pipelines de CI para aplicar migrations | `sbp_...` |
| `SUPABASE_PROJECT_ID` | sim (CI) | ID do projeto Supabase alvo do deploy (`sfkefpoanmoiagwxbwld` para o projeto `Nave`) | `sfkefpoanmoiagwxbwld` |

---

## Desenvolvimento local

Para subir o ambiente local com Docker + Supabase CLI:

```bash
# Copie o exemplo e edite com seus valores
cp .env.example .env.local

# Suba o Supabase local (expõe Studio em localhost:54323) — requer Supabase CLI instalado
supabase start

# Em seguida, inicie todos os serviços
pnpm dev
```

> `pnpm supabase:start` **não existe** como script no `package.json` raiz até 2026-07-13 — use o comando `supabase start` da CLI diretamente, ou adicione o script se preferir essa conveniência.

As variáveis `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` apontam para `http://localhost:54321` e a anon key local quando se usa o Supabase local via Docker.

---

## Pendente de decisão formal

As variáveis a seguir foram identificadas como possivelmente necessárias com base em specs e backlog, mas ainda não há decisão formal de qual provedor/valor usar:

| Variável | Contexto | Status |
|----------|----------|--------|
| `SENTRY_DSN` ou equivalente | Monitoramento de erros em produção | Pendente — nenhum ADR ou spec define o provedor de observabilidade |
| `LOG_LEVEL` | Controle de verbosidade de logs do NestJS | Pendente — `LOG_LEVEL=debug` é prática comum mas não está formalmente especificado |
| Variáveis de rate limit (`THROTTLE_TTL`, `THROTTLE_LIMIT`) | Configuração do `ThrottlerGuard` (S4); atualmente os valores (100 req/60s, 5 req/15min para register, 10 req/15min para login) parecem hardcoded na spec — confirmar se serão externalizados | Pendente de confirmação na implementação de T1.2 |
