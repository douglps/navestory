# Referência de API — Nave SaaS

> Este documento lista os módulos e endpoints da API REST (`apps/api`, NestJS 11). Contratos detalhados de request/response são descritos nas specs referenciadas. Onde a spec não detalha o contrato, o endpoint é listado com status "contrato detalhado pendente de implementação".

**Convenções gerais:** ver `specs/API-SPEC.md`  
**Códigos de erro:** ver `docs/reference/error-codes.md`  
**Última atualização:** 2026-07-13

---

## Configuração base

| Aspecto | Valor |
|---------|-------|
| Base URL (desenvolvimento) | `http://localhost:3001` |
| Base URL (produção) | `https://api.nave.app` |
| Versionamento | Sem prefixo de versão na URL (v0/MVP) |
| Formato | JSON em todas as requisições e respostas |
| Autenticação | `Authorization: Bearer <access_token>` em todas as rotas privadas (S1, ADR-003) |
| Refresh de token | `POST /auth/refresh` com `{ refreshToken }` no body |

---

## Saúde do serviço

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/health` | Público | Verificação de disponibilidade; retorna `{ status: "ok", timestamp: "..." }` |

---

## Módulo: Auth

**@spec SPEC-20260524-001, SPEC-20260524-002**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| POST | `/auth/register` | Público | Registro com e-mail/senha. Rate limit: 5 req/15min por IP (S4). Valida e-mail não descartável (R-BIZ-01, R-BIZ-07) |
| POST | `/auth/login` | Público | Login, retorna `access_token` (15min) e `refresh_token` (7d). Rate limit: 10 req/15min por IP (S4) |
| POST | `/auth/logout` | Privado | Invalida sessão |
| POST | `/auth/refresh` | Público | Renova `access_token` usando `refreshToken` no body |
| POST | `/auth/recover-password` | Público | Envia e-mail de recuperação de senha |
| POST | `/auth/reset-password` | Público | Aplica novo password via token do e-mail |

---

## Módulo: Vehicles

**@spec SPEC-20260602-002**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/vehicles` | Privado | Lista veículos ativos do usuário autenticado (sem `deleted_at`) |
| POST | `/vehicles` | Privado | Cria veículo; normaliza placa (R-VEH-02); registra em `audit_logs` (C2) |
| GET | `/vehicles/:id` | Privado | Detalhe do veículo (404 se soft-deleted ou de outro usuário) |
| PATCH | `/vehicles/:id` | Privado | Atualiza campos editáveis; registra em `audit_logs` (C2) |
| DELETE | `/vehicles/:id` | Privado | Soft-delete com cascata para despesas e manutenções vinculadas (R-VEH-01, R5) |

---

## Módulo: Vehicle Groups

**@spec SPEC-20260602-003**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/vehicle-groups` | Privado | Lista grupos do usuário |
| POST | `/vehicle-groups` | Privado | Cria grupo |
| GET | `/vehicle-groups/:id` | Privado | Detalhe do grupo com lista de membros |
| PATCH | `/vehicle-groups/:id` | Privado | Atualiza nome/descrição |
| DELETE | `/vehicle-groups/:id` | Privado | Hard-delete; membros removidos por cascade FK (R-GRP-04) |
| PUT | `/vehicle-groups/:id/members` | Privado | Replace-all de membros (R-GRP-02); máx 200 veículos (R-GRP-01); apenas veículos ativos do usuário (R-GRP-03) |

---

## Módulo: Odometer Cycles

**@spec SPEC-20260711-001 (ADR-007)**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/vehicles/:vehicleId/odometer-cycles` | Privado | Lista ciclos do veículo (R-ODO-06: badge só exibido a partir do 2º ciclo) |
| POST | `/vehicles/:vehicleId/odometer-cycles` | Privado | Registra novo ciclo de reset; exige `reason` obrigatório e ownership (R-ODO-05); auditado via `AuditService` |

---

## Módulo: Expenses

**@spec SPEC-20260601-001, SPEC-20260601-002, SPEC-20260601-003, SPEC-20260606-001, SPEC-20260606-002, SPEC-20260612-001, SPEC-20260612-002**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/expenses` | Privado | Lista despesas com filtros (`vehicle_id`, `category`, `date_from`, `date_to`); paginada (P1: máx 100/página, padrão 20) |
| POST | `/expenses` | Privado | Cria despesa; aplica validações R1, R2, R4, R-EXP-01, R-FUEL-01; retorna warnings de duplicata e odômetro (ADR-001) |
| GET | `/expenses/:id` | Privado | Detalhe da despesa |
| PATCH | `/expenses/:id` | Privado | Atualiza despesa; 403 se `is_readonly = true` (R-LED-01) |
| DELETE | `/expenses/:id` | Privado | Soft-delete (R5); 403 se `is_readonly = true` (R-LED-01) |

---

## Módulo: Expense Templates

**@spec SPEC-20260601-003**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/expense-templates` | Privado | Lista templates do usuário |
| POST | `/expense-templates` | Privado | Cria template; 422 se limite de 20 atingido (R3); não persiste `date` nem `odometer_km` (R6) |
| PATCH | `/expense-templates/:id` | Privado | Atualiza template |
| DELETE | `/expense-templates/:id` | Privado | Hard-delete |

---

## Módulo: Categories

**@spec SPEC-20260602-004 (ADR-003)**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/categories` | Privado | Lista categorias padrão + categorias personalizadas do usuário |
| POST | `/categories` | Privado | Cria categoria personalizada; 422 se limite de 20 atingido (R-CAT-01); 409 se `value` coincide com categoria padrão (R-CAT-03) |
| PATCH | `/categories/:id` | Privado | Atualiza categoria personalizada |
| DELETE | `/categories/:id` | Privado | Hard-delete; despesas existentes não são afetadas (R-CAT-04) |

---

## Módulo: Maintenance

**@spec SPEC-20260521-002, SPEC-20260603-002**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/maintenance` | Privado | Lista agendamentos do usuário; paginada (P1) |
| POST | `/maintenance` | Privado | Cria agendamento de manutenção |
| GET | `/maintenance/:id` | Privado | Detalhe do agendamento |
| PATCH | `/maintenance/:id` | Privado | Atualiza ou transiciona status (R7); ao concluir com `cost`, cria expense vinculada (R-LED-02, R-ODO-03) |
| DELETE | `/maintenance/:id` | Privado | Soft-delete (R5) |

---

## Módulo: Fines

**@spec SPEC-20260607-001**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/fines` | Privado | Lista multas do usuário; suporte a filtro `?status=pending` |
| POST | `/fines` | Privado | Cria multa; cria expense vinculada automaticamente (R-LED-02) |
| GET | `/fines/:id` | Privado | Detalhe da multa |
| GET | `/fines/vehicle/:vehicleId` | Privado | Multas de um veículo específico |
| PATCH | `/fines/:id` | Privado | Atualiza ou transiciona status; ao cancelar, soft-deleta expense vinculada (R-LED-03) |
| DELETE | `/fines/:id` | Privado | Soft-delete; soft-deleta expense vinculada (R-HUB-01) |

---

## Módulo: Recurring Costs

**@spec SPEC-20260608-001, SPEC-20260609-001, SPEC-20260609-002, SPEC-20260609-003**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/recurring-costs` | Privado | Lista custos recorrentes do usuário |
| POST | `/recurring-costs` | Privado | Cria custo recorrente; unique por `(vehicle_id, cost_type, year)` (R-REC-01) |
| GET | `/recurring-costs/:id` | Privado | Detalhe |
| PATCH | `/recurring-costs/:id` | Privado | Atualiza; ao preencher `paid_at`, cria expense vinculada (R-LED-05) |
| DELETE | `/recurring-costs/:id` | Privado | Soft-delete |
| GET | `/recurring-costs/export` | Privado | Export CSV consolidado — contrato detalhado pendente de implementação (T3.8) |

---

## Módulo: Dashboard

**@spec SPEC-20260521-003**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/dashboard/stats` | Privado | KPIs e agregações; inclui upcoming costs (SPEC-20260608-001) |
| GET | `/dashboard/export` | Privado | Export CSV de despesas (SPEC-20260521-003); bloqueado no plano Gratuito (R-BIZ-12) |

---

## Módulo: Analytics

**@spec SPEC-20260622-001**

Endpoints de analytics pesados devem ser cacheados com TTL de 1h (R-ANA-06). Exigem mínimos de dados históricos antes de retornar projeções (R-ANA-01 a R-ANA-07).

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/analytics/tco/:vehicleId` | Privado | TCO do veículo (custo/km, custo/mês); `null` se dados insuficientes (R-ANA-04) |
| GET | `/analytics/fuel/:vehicleId` | Privado | Tendência de consumo de combustível; mín 5 registros `full_tank = true` (R-ANA-01) |
| GET | `/analytics/anomalies/:vehicleId` | Privado | Detecção de anomalias Z-Score por categoria; mín 5 registros (R-ANA-02) |
| GET | `/analytics/forecast/:vehicleId` | Privado | Previsão de custos; mín 6 meses de histórico (R-ANA-03) |
| GET | `/analytics/seasonal/:vehicleId` | Privado | Heatmap sazonal; mín 6 meses distintos (R-ANA-07) |
| GET | `/analytics/insights/:vehicleId` | Privado | Insights em linguagem natural; nunca expõe dados de outros usuários (R-ANA-05) |
| GET | `/analytics/benchmark` | Privado | Comparativo de custos — contrato detalhado pendente de implementação (T6.1) |

---

## Módulo: Users

**@spec SPEC-20260521-004 (parcial), SPEC-20260603-004**

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/users/me` | Privado | Perfil do usuário autenticado |
| PATCH | `/users/me` | Privado | Atualiza perfil |
| DELETE | `/users/me` | Privado | Exclusão de conta com cascata em todas as tabelas (C1); período de graça de 30 dias (R-BIZ-05) |
| GET | `/users/me/preferences` | Privado | Preferências de UX (SPEC-20260603-004) |
| PATCH | `/users/me/preferences` | Privado | Atualiza preferências; ausência retorna padrão silencioso (R-PREF-01) |

---

## Módulo: Admin

**@spec SPEC-20260521-004, SPEC-20260521-005, SPEC-20260602-005**

Todas as rotas de admin exigem role `admin` verificado pelo `AdminGuard` com `AdminSupabaseService` (SERVICE_ROLE_KEY — regra S3).

| Verbo | Rota | Acesso | Propósito |
|-------|------|--------|-----------|
| GET | `/admin/users` | Admin | Lista usuários (apenas `id`, `email`, `created_at`, `last_sign_in_at`, `profile_type` — sem dados financeiros) |
| DELETE | `/admin/users/:id` | Admin | Exclusão de conta por admin (operação LGPD — C1) |
| GET | `/admin/audit-logs` | Admin | Dashboard de audit log (SPEC-20260602-005) |
| GET | `/api/docs` | Público em dev; Admin ou `SWAGGER_ENABLED=true` em prod | Swagger UI (SPEC-20260521-005) |

---

## Formato de paginação

Listagens paginadas seguem o padrão (P1: máx 100 registros/página, padrão 20):

```json
{
  "data": [ "..." ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20
  }
}
```

Suporte a paginação por cursor disponível via parâmetro `cursor`.

---

## Formato de warning não-bloqueante

Operações bem-sucedidas podem retornar avisos no campo `warnings` (HTTP 201 ou 200):

```json
{
  "data": { "...": "..." },
  "warnings": [
    { "code": "ODOMETER_REGRESSION", "message": "Odômetro atual: 52.000 km. Digitado: 48.000 km." }
  ]
}
```

Ver `docs/reference/error-codes.md` para lista completa de códigos de warning.
