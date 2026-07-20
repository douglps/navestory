# Variáveis de Ambiente — Nave SaaS

> Toda variável de ambiente deve ser configurada antes de iniciar qualquer serviço. Valores reais nunca devem ser commitados no repositório — usar `.env.local` (ignorado pelo `.gitignore`). Copiar `.env.example` como ponto de partida.

**Última atualização:** 2026-07-16 (SPEC-20260716-002 — observabilidade)

---

## Regras de segurança

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** pode ser exposta como `NEXT_PUBLIC_*` nem aparecer em logs, respostas HTTP ou código client-side (regra S3).
- SPEC-20260521-001 RF-SEC-006 exige validação de variáveis obrigatórias na startup via Joi em `apps/api/src/config/env.validation.ts`. **Status real em 2026-07-13 (pós T0.3): ainda não implementado.** O stub atual de `apps/api/src/main.ts` lê `process.env.PORT` diretamente, sem validação nem `ConfigService`. Isso é dívida da Fase 1 (T1.2), não um fato já implementado — não assumir que a validação está ativa.
- Stack trace nunca é exposto ao cliente em `NODE_ENV=production` (regra S5) — também pendente de implementação real; o stub de T0.3 não trata isso ainda.

---

## Backend — `apps/api`

RF-SEC-001 de SPEC-20260521-001 exige que essas variáveis sejam lidas via `ConfigService.getOrThrow()`, nunca `process.env` direto no código de domínio. **Status real em 2026-07-13:** o stub de T0.3 usa `process.env.PORT` diretamente (ver `apps/api/src/main.ts`) — a migração para `ConfigModule`/`ConfigService` é trabalho pendente, não implementado ainda.

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `PORT` | não | Porta em que o servidor NestJS escuta. Padrão: `3001` | `3001` |
| `NODE_ENV` | não | Modo de execução. Controla stack trace (S5), Swagger (SPEC-20260521-005) e logs de debug | `development` ou `production` |
| `SUPABASE_URL` | sim | URL do projeto Supabase (sem prefixo `NEXT_PUBLIC_`). Usada no módulo de auth e no `AdminSupabaseService` | `https://sfkefpoanmoiagwxbwld.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave de serviço do Supabase; bypassa RLS. Usada no `AdminSupabaseService`, na Edge Function de alertas de manutenção e no `SupabaseAuthGuard` (`auth.getUser()` para validar o token de sessão — ver nota abaixo). Nunca compartilhar com o frontend | `<service-role-key-do-dashboard>` |
| `RESEND_API_KEY` | sim* | Chave da API do Resend para envio de e-mails de alerta de manutenção (SPEC-20260521-002). Obrigatória somente quando o módulo de alertas for ativado | `re_...` |
| `SWAGGER_ENABLED` | não | Se `true`, habilita o Swagger UI mesmo em `production` (útil para staging). Por padrão, Swagger só é ativo em `development` (SPEC-20260521-005) | `true` |
| `SENTRY_DSN` | não | DSN do projeto Sentry (backend). Ausente → Sentry desabilitado silenciosamente, API inicia normalmente (SPEC-20260716-002 RF-01, CA-08) | `https://<key>@o<org>.ingest.sentry.io/<project>` |

> **Nota sobre `SUPABASE_URL`:** versões anteriores do repositório usavam `NEXT_PUBLIC_SUPABASE_URL` no backend (achado crítico P1 de SPEC-20260521-001). A variável correta para o backend é `SUPABASE_URL`, sem prefixo.

> **`SUPABASE_JWT_SECRET` removida em 2026-07-19:** o `SupabaseAuthGuard` validava o token localmente contra esse segredo (HS256), mas o Supabase CLI atual assina tokens com chave assimétrica rotacionável (ES256/JWKS) — a verificação local sempre falhava (401 em toda rota autenticada, achado do teste de ambiente local). Corrigido para validar via `auth.getUser()` do próprio Supabase, que não depende de segredo estático nenhum. A variável não é mais lida em nenhum lugar do código.

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
| `NEXT_PUBLIC_SENTRY_DSN` | não | DSN público do projeto Sentry (frontend). Apenas DSN de ingestão — nunca chave com permissão de escrita (S3). Ausente → Sentry desabilitado no browser (SPEC-20260716-002 RF-02, CA-08) | `https://<key>@o<org>.ingest.sentry.io/<project>` |

---

## Supabase / infraestrutura

Estas variáveis são necessárias para workflows de CLI local (`supabase start`, `pnpm db:migrate`) e para o pipeline de CI.

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `SUPABASE_ACCESS_TOKEN` | sim (CI) | Token pessoal de acesso à API de gerenciamento do Supabase; usado pelo CLI em pipelines de CI para aplicar migrations | `sbp_...` |
| `SUPABASE_PROJECT_ID` | sim (CI) | ID do projeto Supabase alvo do deploy (`sfkefpoanmoiagwxbwld` para o projeto `Nave`) | `sfkefpoanmoiagwxbwld` |
| `SUPABASE_DB_PASSWORD` | sim (CD) | Senha do banco Postgres do projeto Supabase, usada pelo job `migrate-db` (`.github/workflows/cd.yml`) para autenticar `supabase db push` em produção. Scoped ao GitHub Environment `production` (S3) | `<senha-do-dashboard-supabase>` |

---

## GitHub Secrets — CD (`.github/workflows/cd.yml`)

> @spec SPEC-20260716-001 RF-09/RF-10 — segredos de deploy, nunca hardcoded em workflow. Scoped por GitHub Environment (`staging`/`production`) conforme a coluna abaixo. **Status em 2026-07-16: nenhum destes secrets está provisionado ainda** — o workflow foi implementado, mas as contas Vercel/Railway e os GitHub Environments precisam ser criados e os secrets preenchidos antes do pipeline funcionar de ponta a ponta.

| Secret | Environment | Descrição |
|--------|-------------|-----------|
| `VERCEL_TOKEN` | (repo-level) | Token de API da Vercel, usado tanto para preview (PR) quanto produção de `apps/web` |
| `VERCEL_ORG_ID` | (repo-level) | ID da organização/conta Vercel |
| `VERCEL_PROJECT_ID` | (repo-level) | ID do projeto Vercel correspondente a `apps/web` |
| `RAILWAY_STAGING_TOKEN` | `staging` | Token de projeto Railway com acesso apenas ao serviço `nave-api-staging` |
| `RAILWAY_PRODUCTION_TOKEN` | `production` | Token de projeto Railway com acesso apenas ao serviço `nave-api-production` — nunca o mesmo token de staging (aplica S3/RF-10) |
| `SUPABASE_ACCESS_TOKEN` | `production` | Ver seção "Supabase / infraestrutura" acima |
| `SUPABASE_DB_PASSWORD` | `production` | Ver seção "Supabase / infraestrutura" acima |
| `SUPABASE_PROJECT_ID` | `production` | Ver seção "Supabase / infraestrutura" acima |
| `SENTRY_AUTH_TOKEN` | (repo-level, CI apenas) | Token de auth do Sentry usado só no pipeline para upload de source maps de `apps/web` (`@sentry/nextjs` via `withSentryConfig`); nunca em runtime. Ausente → upload de source map é pulado silenciosamente, build não quebra (SPEC-20260716-002 RF-06, CA-08/CA-09). Para deploy via Vercel, também precisa estar configurado como env var do projeto no painel Vercel (o `vercel-action` do CD não repassa secrets do GitHub automaticamente para o build da Vercel) |

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
| `LOG_LEVEL` | Controle de verbosidade de logs do NestJS (Pino) | Pendente — `LOG_LEVEL=debug` é prática comum mas não está formalmente especificado; SPEC-20260716-002 não define este nível de controle, Pino usa `info` como default fixo |
| Variáveis de rate limit (`THROTTLE_TTL`, `THROTTLE_LIMIT`) | Configuração do `ThrottlerGuard` (S4); atualmente os valores (100 req/60s, 5 req/15min para register, 10 req/15min para login) parecem hardcoded na spec — confirmar se serão externalizados | Pendente de confirmação na implementação de T1.2 |
