---
id: SPEC-20260716-002
title: "Observabilidade em Produção"
status: approved
date: 2026-07-16
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: [S3, S5, S10]
camadas: [backend, frontend, devops]
---

# SPEC-20260716-002 — Observabilidade em Produção

## Contexto

O projeto navestory opera em produção sem qualquer mecanismo de observabilidade:

- **Error tracking ausente:** erros não capturados em `apps/api` e `apps/web` passam despercebidos
  até que um usuário reporte. Não há alertas proativos de falha.
- **Logging não estruturado:** `apps/api` usa `console.log` em partes do código (11 ocorrências
  identificadas em IMPACTO-021 #6, registradas em P3 de `specs/RULES.md`), sem contexto rastreável
  (request ID, user ID, módulo).
- **Health check básico:** `apps/api/src/health/health.controller.ts` retorna apenas
  `{ status: "ok", timestamp }` sem verificar se o Supabase (única dependência externa crítica)
  está acessível. Uma falha de conexão com o banco não é detectada por nenhum monitor de
  disponibilidade.

Sem observabilidade, incidentes de produção são detectados tarde e diagnosticados lentamente.
Esta spec introduz as três camadas mínimas necessárias para operar um SaaS com confiança.

## Objetivo

Implantar error tracking (Sentry) em `apps/api` e `apps/web`, substituir `console.log` por
logging estruturado via Pino no NestJS, e evoluir o health check para verificar a conectividade
com o Supabase — sem expor PII nos logs e sem introduzir dependências de observabilidade que
bloqueiem a resposta ao usuário.

## Requisitos Funcionais

### Error Tracking

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                          | Prioridade |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-01 | Integrar o Sentry SDK (`@sentry/nestjs`) ao `apps/api`; inicializar no `main.ts` com DSN via variável de ambiente `SENTRY_DSN`; ausência de `SENTRY_DSN` não deve lançar exceção (Sentry desabilitado silenciosamente)                                                                                                                                                             | Alta       |
| RF-02 | Integrar o Sentry SDK (`@sentry/nextjs`) ao `apps/web`; configurar `sentry.client.config.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts` com DSN via `NEXT_PUBLIC_SENTRY_DSN`; `NEXT_PUBLIC_SENTRY_DSN` **nunca** contém chave com permissão de escrita — apenas DSN público de ingestão (aplica S3: chave secreta do Sentry fica em `SENTRY_AUTH_TOKEN`, backend apenas) | Alta       |
| RF-03 | O `HttpExceptionFilter` existente em `apps/api` integra Sentry: exceções HTTP 5xx são capturadas com `Sentry.captureException()`; exceções 4xx não são capturadas (não são bugs)                                                                                                                                                                                                   | Alta       |
| RF-04 | Erros não capturados (uncaught exceptions, unhandled promise rejections) em `apps/api` são capturados automaticamente via `SentryModule.forRoot()` do `@sentry/nestjs`                                                                                                                                                                                                             | Alta       |
| RF-05 | Em `apps/web`, erros de renderização RSC e client-side são capturados via `error.tsx` global (Next.js error boundary) integrado ao Sentry                                                                                                                                                                                                                                          | Alta       |
| RF-06 | Source maps de produção são enviados ao Sentry no pipeline de build (via `SENTRY_AUTH_TOKEN` como GitHub Secret); source maps não são expostos publicamente                                                                                                                                                                                                                        | Alta       |
| RF-07 | Alertas de erro crítico (issue nova ou regressão de erro resolvido) são configurados no Sentry para notificar via canal de comunicação da equipe (configuração no painel Sentry, não via código)                                                                                                                                                                                   | Média      |

### Logging Estruturado

| ID    | Requisito                                                                                                                                                                                                                                      | Prioridade |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --- | --- | ------------------------------------------------------------------------------ | ---- |
| RF-08 | Integrar Pino ao NestJS substituindo o logger padrão: `pino-http` como middleware de request logging; `nestjs-pino` como provider do `Logger` nativo do NestJS                                                                                 | Alta       |
| RF-09 | Cada log de request inclui: `requestId` (UUID gerado por middleware), `method`, `url`, `statusCode`, `responseTimeMs`, `userId` (quando autenticado)                                                                                           | Alta       |
| RF-10 | Em produção (`NODE_ENV=production`), logs são emitidos em formato JSON (uma linha por evento); em desenvolvimento, `pino-pretty` formata a saída legível para humanos                                                                          | Alta       |
| RF-11 | Logs nunca contêm os campos: `password`, `token`, `accessToken`, `refreshToken`, `jwt`, `authorization`, `service_role_key`, `cpf`, `email` em texto plano, `photo_url` — aplica S10. Qualquer campo com nome que case com o padrão `/password | token      | secret | key | cpf | ssn/i`é redacted para`[REDACTED]` pelo serializer do Pino antes de ser escrito | Alta |
| RF-12 | `console.log`, `console.warn` e `console.error` são substituídos pelo `Logger` do NestJS (via `nestjs-pino`) em todos os arquivos de `apps/api`; aplica P3 de `specs/RULES.md` — zero ocorrências de `console.*` em código de produção         | Alta       |
| RF-13 | `requestId` é propagado no cabeçalho de resposta `X-Request-Id` para correlação em ferramentas externas e no Sentry (`Sentry.setTag('requestId', ...)`)                                                                                        | Média      |

### Health Check com Dependências

| ID    | Requisito                                                                                                                                                                                                                                                                               | Prioridade |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-14 | Evoluir `apps/api/src/health/health.controller.ts` para verificar conectividade com o Supabase executando uma query mínima (`SELECT 1`) com o client service role em cada chamada ao `GET /health`                                                                                      | Alta       |
| RF-15 | A resposta do `GET /health` passa a ter o schema: `{ status: "ok" \| "degraded" \| "down", timestamp: string, checks: { supabase: { status: "ok" \| "error", latencyMs: number, error?: string } } }`                                                                                   | Alta       |
| RF-16 | Se a query ao Supabase retornar em menos de 3 segundos sem erro: `checks.supabase.status = "ok"`, `status = "ok"`                                                                                                                                                                       | Alta       |
| RF-17 | Se a query ao Supabase exceder 3 segundos (timeout) ou retornar erro: `checks.supabase.status = "error"`, `status = "degraded"` (não "down" — o processo da API ainda está saudável); HTTP 200 é retornado mesmo em `degraded` (monitores de uptime não confundem com erro de processo) | Alta       |
| RF-18 | O campo `checks.supabase.error` nunca expõe mensagem de banco bruta em produção; exibe apenas `"connection_timeout"` ou `"query_failed"` — aplica S5 de `specs/RULES.md`                                                                                                                | Alta       |
| RF-19 | O health check tem timeout máximo total de 5 segundos (aplica P5); se o endpoint demorar mais que isso, o load balancer/monitor pode considerar a instância não responsiva                                                                                                              | Alta       |
| RF-20 | `GET /health` é uma rota pública (sem `SupabaseAuthGuard`), necessária para monitores externos e Vercel health check de deploy — comportamento já existente, preservado                                                                                                                 | Alta       |

## Requisitos Não-Funcionais

| ID     | Requisito                         | Métrica de Aceite                                                                    |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------ |
| RNF-01 | Overhead de latência do logging   | p95 do tempo de resposta não aumenta mais de 5ms com Pino (vs. logger padrão NestJS) |
| RNF-02 | Disponibilidade do error tracking | Erros capturados no Sentry em ≤ 30s após ocorrência em produção                      |
| RNF-03 | Tamanho do bundle de `apps/web`   | `@sentry/nextjs` não deve aumentar o bundle inicial em mais de 15 KB gzipped         |
| RNF-04 | Zero PII em logs                  | Auditoria automatizada: nenhum teste de integração pode logar campo listado em RF-11 |
| RNF-05 | Health check performático         | `GET /health` responde em ≤ 5s (P5); query de ping ao Supabase tem timeout de 3s     |

## Critérios de Aceite

- [ ] CA-01: Um erro 5xx lançado em qualquer rota de `apps/api` aparece no painel Sentry em menos de 30 segundos
- [ ] CA-02: Um erro de renderização em `apps/web` aparece no painel Sentry com stack trace mapeado via source map
- [ ] CA-03: `pnpm --filter api lint` passa sem ocorrências de `console.log`/`console.warn`/`console.error` em `apps/api/src/`
- [ ] CA-04: Um request autenticado a qualquer endpoint de `apps/api` gera uma linha de log JSON com `requestId`, `userId`, `statusCode` e `responseTimeMs`
- [ ] CA-05: Um log gerado com um objeto contendo o campo `password: "secret"` resulta em `password: "[REDACTED]"` na saída (aplica S10)
- [ ] CA-06: `GET /health` com Supabase acessível retorna `{ "status": "ok", "checks": { "supabase": { "status": "ok" } } }` com HTTP 200
- [ ] CA-07: `GET /health` com Supabase inacessível (simulado via timeout) retorna `{ "status": "degraded", "checks": { "supabase": { "status": "error" } } }` com HTTP 200 (não 503)
- [ ] CA-08: `SENTRY_DSN` ausente não impede a API de iniciar; `NEXT_PUBLIC_SENTRY_DSN` ausente não impede o build de `apps/web`
- [ ] CA-09: `SENTRY_AUTH_TOKEN` é um GitHub Secret; source maps não são acessíveis via URL pública do `apps/web`

## Fora de Escopo

- Não inclui: distributed tracing (OpenTelemetry, Jaeger) — escopo futuro quando a API crescer para múltiplos serviços
- Não inclui: métricas de infraestrutura (CPU, memória, disco) — responsabilidade da plataforma de hospedagem
- Não inclui: log aggregation/shipping (Datadog, Logtail, Grafana Loki) — Pino emite JSON; pipeline de shipping é infra externa
- Não inclui: alertas de SLA por email ou SMS (T4.1 adiado para Fase 9)
- Não inclui: Real User Monitoring (RUM) do Sentry Performance — pode ser habilitado no painel sem mudança de código

## Dependências

| Tipo            | Referência         | Descrição                                                                                                                                    |
| --------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec            | SPEC-20260716-001  | CD pipeline — `SENTRY_DSN` e `SENTRY_AUTH_TOKEN` devem estar nos GitHub Secrets de staging e produção definidos por essa spec                |
| Biblioteca      | `@sentry/nestjs`   | Error tracking no NestJS — verificar versão compatível com NestJS 11                                                                         |
| Biblioteca      | `@sentry/nextjs`   | Error tracking no Next.js — verificar versão compatível com Next.js 16                                                                       |
| Biblioteca      | `nestjs-pino`      | Integração Pino com NestJS Logger                                                                                                            |
| Biblioteca      | `pino-http`        | Middleware de request logging                                                                                                                |
| Biblioteca      | `pino-pretty`      | Formatação legível em desenvolvimento (devDependency)                                                                                        |
| Serviço externo | Sentry (sentry.io) | DSN provisionado na conta do projeto; plano Free cobre o volume esperado do MVP                                                              |
| Regra           | S3                 | `SUPABASE_SERVICE_ROLE_KEY` usada pelo health check nunca em `NEXT_PUBLIC_*`                                                                 |
| Regra           | S5                 | Stack trace e mensagens de banco nunca expostos em produção (já implementado no `HttpExceptionFilter`; health check segue o mesmo princípio) |
| Regra           | S10                | Logs nunca contêm PII — regra **nova**, introduzida por esta spec                                                                            |
| Regra           | P3                 | Zero `console.*` em produção — já existia; esta spec fecha as 11 ocorrências residuais                                                       |
| Regra           | P5                 | Health check de dependências conclui em ≤ 5s — regra **nova**, introduzida por esta spec                                                     |

## Notas Técnicas

### Sentry no NestJS 11

`@sentry/nestjs` requer que `SentryModule.forRoot()` seja importado no `AppModule` antes de
qualquer outro módulo para garantir a instrumentação completa. O `HttpExceptionFilter` existente
deve ser adaptado para chamar `Sentry.captureException(exception)` apenas quando
`exception instanceof HttpException && exception.getStatus() >= 500` (ou quando não for
`HttpException`).

### Pino e redaction

O serializer de redaction deve ser configurado no `pino-http`:

```ts
// Exemplo conceitual — não é código final
pinoHttp({
  redact: {
    paths: [
      "req.headers.authorization",
      "body.password",
      "body.token",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },
});
```

A lista de campos a redactar (RF-11) deve ser mantida como constante nomeada
(`PINO_REDACT_PATHS`) em `apps/api/src/common/logging/redact-paths.ts` para facilitar
auditoria e extensão.

### Health check sem Repository/Port

O health check usa o `SupabaseAdminClient` (service role) já disponível em `AppModule`
— sem criar Repository ou Port dedicado para uma query tão simples. O timeout de 3s
(RF-17) é implementado com `Promise.race([query, sleep(3000).then(() => { throw new Error('timeout') })])`.

### Variáveis de ambiente novas

| Variável                 | Scope                           | Obrigatória                                             |
| ------------------------ | ------------------------------- | ------------------------------------------------------- |
| `SENTRY_DSN`             | `apps/api` (backend)            | Não — se ausente, Sentry é desabilitado silenciosamente |
| `NEXT_PUBLIC_SENTRY_DSN` | `apps/web` (público)            | Não — se ausente, Sentry é desabilitado no browser      |
| `SENTRY_AUTH_TOKEN`      | CI/CD apenas (nunca em runtime) | Sim, para upload de source maps no pipeline             |

Documentar em `docs/reference/environment-variables.md` (T0.7 do roadmap).

## Histórico de Revisões

| Data       | Versão | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                       | Autor                                   |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 2026-07-16 | 1.0    | Criação inicial                                                                                                                                                                                                                                                                                                                                                                                                                               | Douglas Lopes (lps.doug@protonmail.com) |
| 2026-07-18 | 1.1    | Status promovido de `draft` para `approved`. **Desvio de processo registrado:** a implementação (RF-01 a RF-20, ver `matrices/rastreabilidade.md`) já havia sido codificada em 2026-07-16 com a spec ainda em `draft`, contrariando o gate "spec aprovada antes do código" — código e testes foram revisados nesta rodada, considerados corretos e mantidos; a spec é aprovada retroativamente para sanar o desvio, sem mudança de requisito. | Douglas Lopes (lps.doug@protonmail.com) |
