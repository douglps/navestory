---
id: SPEC-20260807-002
title: "Eventos de Segurança — IP/User-Agent em Audit Log e Tentativas de Acesso Negado"
status: approved
date: 2026-08-07
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: [S15, S16]
camadas: [backend, devops, security]
---

# SPEC-20260807-002: Eventos de Segurança — IP/User-Agent em Audit Log e Tentativas de Acesso Negado

**Status:** Approved — aprovada e implementada em 2026-08-07
**Criada em:** 2026-08-07
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Revisores:** —
**Estende (sem alterar):** [SPEC-20260807-001](SPEC-20260807-001-audit-log-cobertura-taxonomia-retencao.md), [SPEC-20260716-002](../devops/SPEC-20260716-002-observabilidade.md)

---

## Contexto

Levantamento de mercado realizado em 2026-08-07 (OWASP Logging Cheat Sheet, práticas de SIEM/SOC 2, LGPD/GDPR sobre IP como dado pessoal) identificou duas lacunas de segurança explicitamente deixadas fora de escopo em specs anteriores:

**Lacuna 1 — Captura de IP/User-Agent em eventos de auth:** a seção "Fora de Escopo" de `SPEC-20260807-001` registra: _"Captura de IP/user-agent nos eventos... requerem decisão própria sobre coleta de dado adicional — retenção de endereço IP tem implicação LGPD não decidida aqui"_. Esta spec fecha essa decisão. IP é dado pessoal sob LGPD/GDPR quando associável a uma pessoa (aqui: `ip` + `user_id` no mesmo registro de `audit_logs`). A base legal é legítimo interesse (Art. 10 LGPD — detecção de fraude e abuso), sem necessidade de consentimento explícito, mas com obrigação de retenção proporcional e limitada ao necessário — diferente do prazo de 5 anos de C3 para o restante do audit log.

**Lacuna 2 — Tentativas de acesso negado como eventos de segurança:** `SPEC-20260807-001` e `SPEC-20260602-005` mantiveram fora de escopo o registro de tentativas de acesso negado, com a justificativa de que `SPEC-20260716-002` (observabilidade) cobriria isso via Sentry + Pino. A investigação revelou que a cobertura é **parcial**: (a) todo request HTTP — incluindo 401/403 — gera linha de log estruturado via Pino (RF-09/RF-10 de `SPEC-20260716-002`), mas essas linhas não têm semântica de segurança — são linhas genéricas de acesso misturadas ao tráfego normal, sem forma de perguntar "quantas tentativas de acesso admin foram negadas esta semana" sem varredura manual de logs; (b) Sentry captura apenas erros 5xx por decisão explícita (RF-03 de `SPEC-20260716-002`) — tentativas 401/403 nunca geram alerta; (c) log aggregation/shipping está explicitamente fora de escopo de `SPEC-20260716-002`, então as linhas de log existentes ficam presas no stdout do processo sem retenção definida nem UI de consulta.

---

## Objetivo

1. Adicionar `ip` e `user_agent` ao campo `changes` em um subconjunto de eventos de alto risco de segurança já cobertos por `AuditService` — sem ampliar para mutações de negócio (veículos, despesas, etc.).
2. Definir retenção diferenciada de 12 meses para os campos `ip` e `user_agent` dentro do registro de `audit_logs`, via extensão do job de arquivamento já especificado em `SPEC-20260807-001` RF-08.
3. Promover tentativas de acesso negado de alto risco (3 cenários — ver RF-B01 a RF-B03) a eventos Sentry com nível `warning` — não `captureException` — para gerar visibilidade e alerta independente de log shipping.
4. Registrar explicitamente que log aggregation/shipping centralizado continua fora de escopo de código desta spec — é pendência operacional a resolver separadamente, com impacto diferente entre `apps/web` (Vercel, que tem Log Drains nativos) e `apps/api` (plataforma de hospedagem distinta da Vercel, sem solução já definida).

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Rastreabilidade de IP em evento de login suspeito

**Como** responsável por segurança do produto, **quero** que tentativas de login bem-sucedidas e falhas registrem o IP e o User-Agent da requisição no audit log, **para** poder identificar logins de localizações inesperadas em uma investigação de incidente.

- **Dado que** um usuário autentica com sucesso em `POST /auth/login`, **quando** `auditService.log()` é chamado para o evento `LOGIN`, **então** o campo `changes` do registro em `audit_logs` contém `{ ..., ip: "<ip-do-cliente>", user_agent: "<header-User-Agent>" }`.
- **Dado que** um usuário completa o cadastro em `POST /auth/register`, **quando** `auditService.log()` é chamado para o evento `REGISTER`, **então** o campo `changes` contém `ip` e `user_agent`.
- **Dado que** um registro de `audit_logs` para evento `LOGIN` ou `REGISTER` tem `created_at` com mais de 12 meses, **quando** o job de arquivamento/expurgo de IP executa, **então** as chaves `ip` e `user_agent` são removidas do JSON de `changes` desse registro, mantendo os demais campos intactos.

### US-02: Alerta de tentativa de acesso admin negada

**Como** administrador do sistema, **quero** receber um alerta no Sentry quando alguém tentar acessar uma rota administrativa sem ter o papel de admin, **para** detectar tentativas de escalação de privilégio ou tokens mal configurados.

- **Dado que** um usuário autenticado sem papel `admin` faz uma requisição a qualquer rota decorada com `@Roles("admin")`, **quando** o `RolesGuard` nega o acesso (retorna `false`), **então** um evento `Sentry.captureMessage()` com nível `warning` é emitido com contexto `{ userId, route, requiredRole: "admin" }` — antes de retornar o 403 normal ao cliente.
- **Dado que** o evento é capturado pelo Sentry, **quando** o painel de Issues do Sentry é consultado, **então** o evento aparece sob a tag `security_event: true` e com nível `warning`, não como `error`.

### US-03: Alerta de possível ataque de força bruta

**Como** responsável por segurança do produto, **quero** que o sistema emita um alerta quando o rate limit de tentativas de login for atingido por um IP ou usuário, **para** detectar ataques de força bruta antes que comprometam contas.

- **Dado que** um IP excede 10 tentativas de login em 15 minutos (limite de S4), **quando** o `ThrottlerGuard` rejeita a próxima tentativa com 429, **então** um evento `Sentry.captureMessage()` com nível `warning` é emitido com contexto `{ ip, endpoint: "/auth/login", throttle_limit: 10, window_ms: 900000 }`.

### US-04: Rastreabilidade de tentativa de auto-rebaixamento de admin

**Como** administrador do sistema, **quero** que tentativas de auto-rebaixamento de role (bloqueadas por S14) gerem um evento de segurança registrado, **para** ter visibilidade de quando alguém — mesmo que acidentalmente — tenta executar uma operação que poderia criar lockout.

- **Dado que** um administrador tenta rebaixar o próprio role via `PATCH /admin/users/:id/role`, **quando** a operação é bloqueada com 422 (S14), **então** um evento `Sentry.captureMessage()` com nível `warning` é emitido com contexto `{ userId, action: "ADMIN_SELF_DEMOTION_ATTEMPT" }` — além do 422 já retornado ao cliente.

---

## Bloco A — IP/User-Agent em Eventos de Segurança

### RF-A01 — Extração de IP real atrás de proxy (Pré-requisito)

O servidor NestJS precisa extrair o IP real do cliente quando a API roda atrás de proxy ou CDN. Hoje `main.ts` **não configura** `trust proxy` no Express subjacente — `req.ip` em ambiente de produção retornaria o IP do proxy, não do cliente.

**Requisito:** adicionar em `main.ts`, antes de `app.listen()`:

```typescript
// @spec SPEC-20260807-002 RF-A01
app.getHttpAdapter().getInstance().set('trust proxy', 1);
```

O valor `1` instrui o Express a confiar no primeiro salto de `X-Forwarded-For` (adequado para um único proxy/load balancer na frente da API). Se a topologia de rede usar mais de um nível de proxy, o valor deve ser ajustado — documentar como pendência operacional em `important/PENDENCIAS-E-PROCESSOS.md` para revisão ao definir a plataforma de hospedagem da API.

Após essa configuração, `req.ip` retornará o IP do cliente corretamente.

### RF-A02 — Campos `ip` e `user_agent` nos eventos de alto risco

Adicionar `ip` e `user_agent` ao `changes` nos eventos de segurança de maior risco, nas chamadas a `auditService.log()` já existentes ou planejadas:

| Arquivo | Evento | Status atual |
|---|---|---|
| `auth.service.ts` | `LOGIN` | Já logado (sem IP/UA) — **estender** `changes` |
| `auth.service.ts` | `REGISTER` | Já logado (sem IP/UA) — **estender** `changes` |
| `auth.service.ts` | `LOGOUT` | Planejado em SPEC-20260807-001 RF-01 — **incluir** IP/UA na implementação |
| `auth.service.ts` | `PASSWORD_RESET` | Planejado em SPEC-20260807-001 RF-01 — **incluir** IP/UA na implementação |
| `admin.service.ts` | `ADMIN_ROLE_GRANTED` | Já logado (sem IP/UA) — **estender** `changes` |
| `admin.service.ts` | `ADMIN_ROLE_REVOKED` | Já logado (sem IP/UA) — **estender** `changes` |
| `admin.service.ts` | `ADMIN_USER_DELETED` | Já logado (sem IP/UA) — **estender** `changes` |

**Não aplicar** IP/UA a eventos de negócio (EXPENSE_CREATED, VEHICLE_GROUP_DELETED, PREFERENCES_UPDATED, etc.) — misturar dado de rastreamento de rede com dado de negócio amplia desnecessariamente o escopo de coleta de PII.

**Estrutura do `changes` com IP/UA:**

```typescript
changes: {
  // campos já existentes do evento
  timestamp: new Date().toISOString(),
  // campos novos (S15):
  ip: req.ip ?? 'unknown',
  user_agent: req.headers['user-agent'] ?? 'unknown',
}
```

**Propagação do `req` até o service:** `auth.service.ts` e `admin.service.ts` hoje recebem apenas DTOs dos controllers — não têm acesso ao objeto `Request`. Duas abordagens válidas; a spec não prescreve a implementação final, mas exige a decisão documentada no PR:

- **Opção A (preferida):** criar um DTO de contexto de segurança `SecurityContextDto { ip: string; userAgent: string }` e passá-lo como parâmetro extra dos métodos de service onde necessário.
- **Opção B:** extrair IP/UA diretamente nos controllers que já têm `@Req() req: Request` (ex: `logout`) e injetar nos serviços por parâmetro.

Não usar `REQUEST`-scoped providers (mudaria o escopo de DI do módulo inteiro, impacto de performance).

### RF-A03 — Retenção diferenciada de 12 meses para IP/User-Agent

Os campos `ip` e `user_agent` são dados pessoais com retenção mais curta do que o restante do registro de `audit_logs` (C3 define 5 anos para o evento em si). Base legal: legítimo interesse para detecção de fraude/abuso — proporcional a um prazo de 12 meses, faixa comum citada por frameworks de compliance de segurança (SOC 2, guias OWASP).

**Implementação:** extensão direta do job de arquivamento já especificado em `SPEC-20260807-001` RF-08, sem novo mecanismo. O job que processa registros da camada quente para a fria (ou que já estão na fria) deve, ao encontrar um registro com `created_at < NOW() - INTERVAL '12 months'`, remover as chaves `ip` e `user_agent` do JSONB de `changes` antes de persistir/mover, mantendo o restante do registro intacto:

```sql
-- Remoção das chaves dentro do job de arquivamento (pg_cron / PL/pgSQL)
-- @spec SPEC-20260807-002 RF-A03
UPDATE audit_logs
SET changes = changes - 'ip' - 'user_agent'
WHERE created_at < NOW() - INTERVAL '12 months'
  AND (changes ? 'ip' OR changes ? 'user_agent');
```

A operação de remoção deve ocorrer **antes** do arquivamento para a camada fria — os arquivos `.ndjson.gz` no bucket `audit-logs-archive` não devem conter IP/UA de registros com mais de 12 meses.

**Referência regulatória:** refletir essa retenção diferenciada na política de privacidade do produto — dependência direta de [SPEC-20260720-001](SPEC-20260720-001-paginas-privacidade-termos.md) (Páginas de Privacidade e Termos), que deve ser atualizada quando esta spec for implementada.

---

## Bloco B — Tentativas de Acesso Negado como Eventos de Segurança

### RF-B01 — Acesso a rota admin negado pelo `RolesGuard` (Cenário 1)

O `RolesGuard` (`src/common/guards/roles.guard.ts`) hoje retorna `false` quando o role do usuário não satisfaz a restrição `@Roles("admin")`, o que faz o NestJS retornar 403. Nenhum evento de segurança é gerado.

**Requisito:** quando `canActivate()` retornar `false` para uma rota com restrição de role, emitir:

```typescript
// @spec SPEC-20260807-002 RF-B01 — valida S16
Sentry.captureMessage('Acesso admin negado: role insuficiente', {
  level: 'warning',
  tags: { security_event: true, scenario: 'unauthorized_admin_access' },
  extra: {
    userId: request.user?.sub ?? 'unknown',
    route: request.url,
    method: request.method,
    requiredRole: requiredRoles,
    actualRole: role ?? null,
  },
});
```

Usar `captureMessage`, não `captureException` — não é um erro do sistema, é um evento de segurança. Isso é uma **exceção justificada** à regra geral de RF-03 de `SPEC-20260716-002`, que define que Sentry captura apenas erros 5xx: esta spec amplia o escopo de captura do Sentry especificamente para eventos de segurança de alto risco com resposta 4xx, sem revogar a regra geral para o restante da aplicação.

**O que não é RF-B01:** não emitir evento para qualquer 403 genérico — somente quando `RolesGuard` nega acesso a rota com `@Roles("admin")` explícito. Outros 403 (ex: tentativa de acessar recurso de outro usuário, bloqueado por RLS ou por validação de posse no service) não são cobertos por este requisito.

### RF-B02 — Rate limit de login atingido (Cenário 2 — possível força bruta)

O `ThrottlerGuard` (APP_GUARD, S4) rejeita a 11ª tentativa de login do mesmo IP em 15 minutos com 429. Hoje nenhum alerta é gerado — o cliente recebe o 429 e o log estruturado do Pino registra a linha, mas sem semântica de segurança.

**Requisito:** criar um `ThrottlerExceptionFilter` (ou interceptar o evento de `ThrottlerException` via filtro global já existente `HttpExceptionFilter`) que, quando `status === 429` e o endpoint é `/auth/login`, emita:

```typescript
// @spec SPEC-20260807-002 RF-B02 — valida S16
Sentry.captureMessage('Rate limit de login atingido: possível força bruta', {
  level: 'warning',
  tags: { security_event: true, scenario: 'brute_force_login' },
  extra: {
    ip: req.ip,
    endpoint: '/auth/login',
    throttle_limit: 10,
    window_ms: 900_000,
  },
});
```

O valor `10 req/15min` (confirmado em `auth.controller.ts` linha 87) deve ser reutilizado como constante nomeada — não hardcoded novamente aqui. Usar a mesma constante exportada pelo decorator `@Throttle` ou criar uma constante compartilhada em `auth.constants.ts`.

**Escopo restrito:** apenas o endpoint `/auth/login`. O endpoint `/auth/register` tem limit 5/15min e `/auth/recover-password` tem limit 3/15min — tentativas de abuso nesses endpoints são capturadas pelo throttler como 429 genérico mas não justificam alerta de segurança dedicado neste momento (menor risco de força bruta direcionada a conta existente).

### RF-B03 — Tentativa de auto-rebaixamento de admin (Cenário 3)

`PATCH /admin/users/:id/role` com `:id` igual ao ID do próprio admin autenticado é bloqueado por S14 com 422. Hoje o endpoint retorna 422 sem gerar nenhum evento de segurança — a tentativa é silenciosa do ponto de vista de observabilidade.

**Requisito:** no ponto onde a validação de S14 rejeita a operação em `admin.service.ts` (antes de lançar o `UnprocessableEntityException`), emitir:

```typescript
// @spec SPEC-20260807-002 RF-B03 — valida S16
Sentry.captureMessage('Tentativa de auto-rebaixamento de admin bloqueada (S14)', {
  level: 'warning',
  tags: { security_event: true, scenario: 'admin_self_demotion_attempt' },
  extra: {
    adminUserId: adminUserId,
    targetUserId: targetUserId, // mesmo que adminUserId neste cenário
    requestedRole: role,
  },
});
```

O evento é emitido **antes** de lançar a exceção — garantindo que o evento Sentry seja registrado mesmo que o tratamento de erro posterior falhe.

---

## Bloco C — Pendência Operacional: Log Aggregation/Shipping

Esta spec **não implementa** log aggregation ou shipping centralizado. O status atual é:

- `apps/api` (NestJS + Pino): logs estruturados em JSON vão para `stdout` do processo. Sem shipping configurado, essas linhas dependem da infraestrutura de hospedagem da API para retê-las — plataforma não definida publicamente nas specs (a spec de CD menciona "staging + produção" sem nomear o provedor). Vercel Log Drains **não se aplica** à API, pois `apps/api` não está hospedado na Vercel (apenas `apps/web` usa a Vercel, conforme SPEC-20260716-001 RF-01/RF-02).
- `apps/web` (Next.js na Vercel): a Vercel oferece Log Drains nativos (disponíveis no plano Pro), que poderiam fazer shipping para Logtail, Datadog ou Grafana Loki. Isso resolveria a retenção e busca dos logs do frontend, mas não dos logs da API.

**Ação desta spec:** registrar em `important/PENDENCIAS-E-PROCESSOS.md` do projeto:

> **Log aggregation/shipping centralizado — pendência de infraestrutura**
>
> Sem esse shipping, os logs técnicos brutos de `apps/api` (incluindo linhas de 401/403 que não foram promovidas a evento Sentry pelos RF-B01..RF-B03 desta spec) não são pesquisáveis nem retidos de forma confiável além da janela de retenção da plataforma de hospedagem da API (desconhecida até a plataforma ser definida). Para investigações de incidente que precisem ir além dos eventos promovidos ao Sentry, o log shipping é bloqueante.
>
> Opções a avaliar:
> - **Para `apps/web`:** Vercel Log Drains (plano Pro) integrando com Logtail, Datadog ou Grafana Loki.
> - **Para `apps/api`:** depende da plataforma de hospedagem final (ainda não definida nas specs). Avaliar soluções agnósticas de plataforma (ex: agente Logtail/Better Stack, Grafana Alloy, ou SDK da plataforma escolhida).
> - Ambos os canais devem ser configurados juntos para dar visibilidade unificada.

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|---|---|---|
| RNF-01 | IP/UA não adicionam latência à operação principal | Captura de `req.ip` e `req.headers['user-agent']` é síncrona e O(1); a chamada a `auditService.log()` continua fire-and-forget (R-MON-01) |
| RNF-02 | Campos IP/UA nunca vazam em logs de Pino ou stack traces | S10 já redact campos com padrão `/password\|token\|secret\|key\|cpf\|ssn/i`; `ip` e `user_agent` não casam com esse padrão — não são redacted pelo serializer. Isso é correto: IP em log estruturado de acesso é esperado. O que **não** deve aparecer em log é `ip` dentro de payloads de request que contenham senha (separação já garantida pela arquitetura de camadas) |
| RNF-03 | Eventos Sentry de RF-B01..RF-B03 não geram ruído excessivo | Em circunstância normal de produção (sem ataque), espera-se 0 eventos/dia. Em caso de ataque ativo, o volume de eventos deve ser limitado via rate limiting do próprio Sentry (`sampleRate` ou `beforeSend` com deduplicação por IP+endpoint) — configuração a definir na implementação |
| RNF-04 | Retenção de 12 meses para IP/UA não impede consulta do restante do registro | A remoção de `ip`/`user_agent` do JSONB `changes` não afeta outros campos do mesmo registro (ex: `action`, `user_id`, `table_name`, `record_id`) |
| RNF-05 | `trust proxy` configurado antes de qualquer `app.use()` em `main.ts` | A instrução `set('trust proxy', 1)` deve preceder os middlewares (`helmet`, `cookieParser`, etc.) para que `req.ip` seja resolvido corretamente em todos eles |

---

## Critérios de Aceite

### Bloco A

- [x] CA-A01: `trust proxy` configurado em `main.ts` — `req.ip` retorna o IP do cliente (não do proxy) quando `X-Forwarded-For` está presente
- [x] CA-A02: Registro de `LOGIN` em `audit_logs` contém `changes.ip` e `changes.user_agent` com valores reais (não `null`, não `undefined`)
- [x] CA-A03: Registro de `REGISTER` em `audit_logs` contém `changes.ip` e `changes.user_agent`
- [ ] CA-A04: **Pendente** — depende de SPEC-20260807-001 RF-01 (LOGOUT/PASSWORD_RESET ainda não gravam em `audit_logs`), não implementado em código ainda
- [x] CA-A05: Registros de `ADMIN_ROLE_GRANTED`, `ADMIN_ROLE_REVOKED` e `ADMIN_USER_DELETED` em `audit_logs` contêm `changes.ip` e `changes.user_agent`
- [x] CA-A06: Job de expurgo de IP/UA remove chaves `ip` e `user_agent` de registros com `created_at` anterior a 12 meses, sem alterar outros campos do `changes`
- [x] CA-A07: Após remoção de IP/UA, o registro permanece em `audit_logs` com `action`, `user_id`, `table_name`, `record_id` e demais campos de `changes` intactos
- [ ] CA-A08: **Pendente** — depende do job de arquivamento de SPEC-20260807-001 RF-08, ainda sem implementação em código (ver changelog)

### Bloco B

- [x] CA-B01: Requisição de usuário sem role `admin` a `GET /admin/*` ou `PATCH /admin/*` → `RolesGuard` emite `Sentry.captureMessage()` com `level: 'warning'` e `tags.security_event: true` antes de retornar 403 ao cliente
- [x] CA-B02: O evento Sentry de CA-B01 contém `userId`, `route` e `requiredRole` em `extra`
- [x] CA-B03: 11ª tentativa de login do mesmo IP em 15 minutos → ThrottlerGuard retorna 429 E emite `Sentry.captureMessage()` com `level: 'warning'` e `scenario: 'brute_force_login'`
- [x] CA-B04: O evento Sentry de CA-B03 contém `ip` e `endpoint: '/auth/login'` em `extra`
- [x] CA-B05: Admin tentando rebaixar o próprio role via `PATCH /admin/users/:id/role` → retorna 422 (comportamento preexistente de S14) E emite `Sentry.captureMessage()` com `scenario: 'admin_self_demotion_attempt'`
- [x] CA-B06: Eventos Sentry de RF-B01..RF-B03 aparecem como `warning` no painel Sentry, nunca como `error` ou `fatal`
- [x] CA-B07: Erros 403 de origem diferente de `RolesGuard` (ex: posse de recurso validada no service) **não** geram evento Sentry de segurança — apenas os casos cobertos por RF-B01..RF-B03

---

## Fora de Escopo

- **Log aggregation/shipping centralizado:** conforme Bloco C, é decisão de infraestrutura registrada como pendência operacional, não código nesta spec.
- **Alertas por e-mail para eventos de segurança:** bloqueado até a Fase 9 (domínio próprio / Resend), mesma restrição já documentada em R-FLEET-03 e em `important/PENDENCIAS-E-PROCESSOS.md`.
- **Captura de IP em todos os eventos de `audit_logs`:** escopo deliberadamente restrito a eventos de alta relevância de segurança. Eventos de negócio (EXPENSE_CREATED, VEHICLE_GROUP_UPDATED, etc.) não recebem IP/UA.
- **Geolocalização de IP:** não está no escopo desta spec. IP é capturado como dado bruto para investigação manual, não para enriquecimento automático com localização geográfica.
- **Dashboard de segurança ou UI de eventos negados:** visualização dos eventos Sentry via painel nativo do Sentry. Não há endpoint novo na API nem tela nova no frontend.
- **Anonimização de PII no restante do audit log:** estratégia de anonimização de PII (além dos campos `ip`/`user_agent` cobertos aqui) é assunto de spec dedicada futura, conforme memória registrada em 2026-07-20.
- **Cobertura de todos os 4xx como eventos de segurança:** somente os 3 cenários de RF-B01..RF-B03 justificam alerta ativo. Os demais 401/403 continuam gerando apenas linhas de log via Pino (RF-09/RF-10 de SPEC-20260716-002).

---

## Dependências

| Tipo | Referência | Descrição |
|---|---|---|
| Spec | SPEC-20260807-001 | Base do audit log — define `AuditService`, schema de `audit_logs` e o job de arquivamento RF-08 que esta spec estende com a lógica de remoção de IP/UA em 12 meses. Esta spec **não** altera aquela — apenas adiciona comportamento ao job já especificado |
| Spec | SPEC-20260716-002 | Observabilidade — define infraestrutura Sentry (RF-01/RF-03) que é reutilizada pelos RF-B01..RF-B03. RF-B01..RF-B03 são extensão justificada e específica de RF-03 (que captura só 5xx): ampliam o escopo para eventos de segurança 4xx, sem revogar a regra geral |
| Spec | SPEC-20260521-001 | Hardening — S4 define os limites do throttler de login (10 req/15min) referenciados em RF-B02 |
| Spec | SPEC-20260731-008 | Admin — S14 define o bloqueio de auto-rebaixamento referenciado em RF-B03 |
| Spec | SPEC-20260720-001 | Privacidade e Termos — deve ser atualizada para refletir a coleta de IP/user-agent em eventos de auth, com base legal (legítimo interesse, S15) e prazo de retenção (12 meses) |
| Spec | SPEC-20260716-001 | CD/Deploy — confirma que `apps/web` está na Vercel e `apps/api` em plataforma distinta; relevante para a pendência de log shipping do Bloco C |
| Regra | S15 | Nova regra de segurança — coleta seletiva de IP/UA em eventos de alto risco; definida em `specs/RULES.md` como parte desta spec |
| Regra | S16 | Nova regra de segurança — promoção de tentativas de acesso negado de alto risco a eventos Sentry; definida em `specs/RULES.md` como parte desta spec |
| Infra | Express trust proxy | Configuração `set('trust proxy', 1)` em `main.ts` é pré-requisito para que `req.ip` funcione corretamente atrás de proxy/CDN (RF-A01). Ausente hoje. |

---

## Notas Técnicas

### IP real atrás de proxy — situação atual do código

O `main.ts` atual **não configura `trust proxy`**. Em produção, com a API atrás de um load balancer ou CDN, `req.ip` retornaria o IP interno do proxy, não o do cliente. O header `X-Forwarded-For` está presente mas não é processado automaticamente pelo Express sem a configuração de trust. Nenhum outro ponto do código atual lida com IP de cliente (o `ThrottlerGuard` do `@nestjs/throttler` usa a abstração interna do NestJS que por sua vez lê `req.ip`, mas sem `trust proxy` também estaria capturando o IP do proxy em produção).

Isso significa que o rate limiting de login (S4) em produção provavelmente já está contando requests pelo IP do proxy, não do cliente — todos os usuários compartilhariam o mesmo "IP" para fins de throttle. Este é um achado adjacente relevante: a configuração `trust proxy` é benéfica tanto para esta spec quanto para o funcionamento correto do throttler existente.

### Separação semântica: audit trail vs. observabilidade de segurança

Esta spec mantém a separação já estabelecida em specs anteriores:

- **`audit_logs` / `AuditService`**: trilha de compliance orientada ao usuário — "quem fez o quê com quais dados". IP/UA são dados auxiliares de contexto de segurança, não o propósito principal.
- **Sentry `captureMessage`**: observabilidade técnica de segurança — "o sistema detectou comportamento de alto risco". Não vai para `audit_logs`; não é audit trail de compliance.

Os cenários RF-B01..RF-B03 vão exclusivamente para Sentry, não para `audit_logs`. IP/UA (RF-A02) vão exclusivamente para `audit_logs` (nos campos `changes`), não como campos de primeiro nível de log do Pino.

### Sentry `captureMessage` vs. `captureException`

O Sentry distingue entre `captureException` (erro inesperado do sistema, normalmente com stack trace) e `captureMessage` (mensagem estruturada com contexto, sem stack trace obrigatório). Para eventos de segurança, `captureMessage` é o correto: não é erro do sistema — é comportamento detectado e tratado.

Nível `warning` no Sentry corresponde ao nível entre `info` e `error`. Com a configuração padrão de alertas do Sentry, eventos de nível `warning` podem disparar notificações se assim configurado — verificar e configurar alertas no painel do Sentry como parte da implementação desta spec.

---

## Critérios de Aceite Consolidados (Checklist)

> Cópia compacta para uso em PR description.

- [ ] CA-A01..CA-A08: IP/UA em eventos de segurança e retenção de 12 meses
- [ ] CA-B01..CA-B07: Eventos Sentry para os 3 cenários de acesso negado
- [ ] `trust proxy` configurado corretamente em `main.ts`
- [ ] `SPEC-20260720-001` identificada para atualização (não implementado aqui)
- [ ] Pendência de log shipping adicionada em `important/PENDENCIAS-E-PROCESSOS.md`

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|---|---|---|
| 2026-08-07 | Spec aprovada e implementada: `trust proxy` em `main.ts` (RF-A01); `SecurityContext` (ip/user_agent) propagado de `auth.controller`/`admin.controller` para `auth.service`/`admin.service` e incluído em `changes` de LOGIN, REGISTER, ADMIN_ROLE_GRANTED, ADMIN_ROLE_REVOKED, ADMIN_USER_DELETED (RF-A02); migration `20260807120000_audit_log_ip_ua_retention_job.sql` com job `pg_cron` diário de expurgo de `ip`/`user_agent` após 12 meses (RF-A03); `RolesGuard` emite `Sentry.captureMessage` em acesso admin negado (RF-B01); `HttpExceptionFilter` emite `Sentry.captureMessage` em 429 de `/auth/login` via constantes compartilhadas `LOGIN_THROTTLE_LIMIT`/`LOGIN_THROTTLE_TTL_MS` (RF-B02); `AdminService.updateUserRole` emite `Sentry.captureMessage` antes do 422 de auto-rebaixamento (RF-B03). Pendência de log shipping (Bloco C) já registrada em `important/PENDENCIAS-E-PROCESSOS.md`. | Implementação completa dos Blocos A e B. |
| 2026-08-07 | **Ressalva conhecida — CA-A08 não satisfeito:** o job de RF-A03 remove `ip`/`user_agent` do JSONB `changes` (CA-A06/CA-A07 atendidos), mas **não** move/arquiva o registro para o bucket `audit-logs-archive` — esse mecanismo de arquivamento hot/cold é escopo de `SPEC-20260807-001` RF-08, que ainda não tem código implementado (nenhuma migration de arquivamento existe no projeto). Quando RF-08 for implementado, deve reutilizar a mesma condição de expurgo desta migration antes de mover o registro. | RF-A03 pede extensão de um job que ainda não existe como código — implementado como job mínimo autocontido em vez de bloquear esta spec pela dependência incompleta. |
| 2026-08-07 | **CA-A04 (LOGOUT/PASSWORD_RESET) não satisfeito:** esses dois eventos ainda não são gravados em `audit_logs` — dependem de `SPEC-20260807-001` RF-01, também sem implementação em código nesta sessão. Quando RF-01 for implementado, incluir `ip`/`user_agent` desde o início, conforme já determinado pela tabela do RF-A02. | Fora do escopo de código desta spec — apenas documentar. |
