---
id: SPEC-20260715-001
title: "CRUD Base de Manutenções (MaintenancesModule)"
status: approved
date: 2026-07-15
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R5, R7, R-ODO-03, R-LED-02, R-LED-03, R-HUB-01, R-SAN-01, R-SAN-02, R-SAN-04, R-VEH-01]
security: [S1, S2, C2]
camadas: [backend, frontend, database]
---

# SPEC-20260715-001: CRUD Base de Manutenções (MaintenancesModule)

**Status:** Aprovada
**Criada em:** 2026-07-15
**Atualizada em:** 2026-07-15
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Revisores:** douglps

---

## Contexto

A tabela `public.maintenances` está aplicada em produção desde `supabase/migrations/20260712171830_core_tables.sql` (recuperada do banco remoto em T0.2), mas **nenhum módulo de aplicação existe ainda** — `apps/api/src/modules/maintenances/` não existe. As duas specs existentes do domínio (`SPEC-20260521-002`, alertas por email; `SPEC-20260603-002`, transições de status) assumem implicitamente que `MaintenancesService` já existe, o mesmo gap identificado em despesas antes de `SPEC-20260714-001`/T3.0 e resolvido com o mesmo padrão: uma spec de CRUD base formaliza o contrato que as demais specs estendem.

Diferente do CRUD base de despesas (que deliberadamente deixou a integração com o ledger polimórfico — ADR-006 — para uma spec futura, T3.8), esta spec **inclui** a integração com o ledger desde o início, porque:
- `ExpensesService.createFromSource()` e `ExpensesService.softDeleteBySource()` já existem (implementados em T3.8 para multas e custos recorrentes).
- `specs/RULES.md` já documenta R-LED-02, R-LED-03 e R-HUB-01 esperando que manutenções participem do ledger — essas regras foram registradas antes do módulo existir, então adiar a integração criaria uma nova spec futura só para "ligar o fio" que já é conhecido.
- O padrão já foi validado duas vezes (multas em T3.6/T3.8, custos recorrentes em T3.8) — replicar aqui não é decisão nova, é aplicação do padrão estabelecido.

Esta spec também absorve o enforcement de transição de status já especificado por `SPEC-20260603-002` (T4.2), pelo mesmo motivo que fez `FinesModule` (T3.6) combinar CRUD e transições em um único módulo: o `update()` precisa validar a transição de qualquer forma, e separar as duas specs em módulos ou PRs diferentes criaria uma dependência artificial entre elas.

## Objetivo

Implementar o `MaintenancesModule` no backend NestJS, cobrindo CRUD completo, enforcement do grafo de transições de status (R7, `SPEC-20260603-002`), integração com o ledger financeiro unificado (R-LED-02, R-LED-03, R-HUB-01) e as páginas mínimas de listagem e formulário no frontend Next.js.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | `POST /maintenances` cria uma manutenção com campos obrigatórios: `vehicle_id` (UUID de veículo do usuário), `description` (texto, 3–500 chars), `scheduled_date` (`YYYY-MM-DD`) | Alta |
| RF-02 | `POST /maintenances` aceita campos opcionais: `cost` (numeric), `odometer_km` (inteiro), `completion_date` (`YYYY-MM-DD`), `metadata` (jsonb livre) | Alta |
| RF-03 | `status` nunca é aceito em `POST /maintenances` — toda criação nasce com `status = 'scheduled'` (R7); se enviado, é ignorado | Alta |
| RF-04 | `GET /maintenances` retorna lista paginada (`page`, `limit`, default 20, máx 100 — P1) de manutenções ativas (`deleted_at IS NULL`) do usuário, ordenadas por `scheduled_date` ascendente; filtros opcionais: `vehicle_id`, `status` | Alta |
| RF-05 | `GET /maintenances/:id` retorna os dados completos de uma manutenção ativa do usuário; 404 se inexistente, soft-deletada ou de outro usuário | Alta |
| RF-06 | `PATCH /maintenances/:id` atualiza campos editáveis (`description`, `scheduled_date`, `cost`, `odometer_km`, `completion_date`, `metadata`, `status`); operação parcial; 404 se não encontrada ou de outro usuário | Alta |
| RF-07 | `PATCH /maintenances/:id` com `status` presente no payload valida a transição contra `MAINTENANCE_STATUS_TRANSITIONS` antes de qualquer escrita; transição inválida retorna `HTTP 409` com `"Transição inválida: {de} → {para}"` (R7, SPEC-20260603-002 RF-01 a RF-10) | Alta |
| RF-08 | `PATCH /maintenances/:id` com `status: "completed"` exige `odometer_km` não-nulo (no payload ou já persistido); ausência retorna `HTTP 422` (R-ODO-03) | Alta |
| RF-09 | `odometer_km` informado (create ou update) é comparado contra `findMaxOdometerByVehicle` (mesmo padrão non-blocking de `ExpensesService`, sem filtro de ciclo ativo — R-ODO-04 permanece ⏳ em ambos os módulos, gap pré-existente); resposta enriquecida com `odometer_warning`/`odometer_previous_max_km`, nunca bloqueia | Alta |
| RF-10 | `PATCH /maintenances/:id` com transição para `completed` e `cost IS NOT NULL` (após aplicar o update) chama `ExpensesService.createFromSource()` com `source_type: 'maintenance'`, vinculando a despesa (R-LED-02) | Alta |
| RF-11 | `PATCH /maintenances/:id` com transição para `cancelled` chama `ExpensesService.softDeleteBySource()` para a despesa vinculada, se existir (R-LED-03) | Alta |
| RF-12 | `DELETE /maintenances/:id` aplica soft-delete (`deleted_at = NOW()`); retorna 204; também soft-deleta a despesa vinculada via `softDeleteBySource()`, se existir (R-HUB-01) | Alta |
| RF-13 | `POST /maintenances` com `vehicle_id` que não pertence ao usuário autenticado retorna 404 | Alta |
| RF-14 | Toda mutação (create, update, delete) registra entrada em `audit_logs` (C2); transições de status rejeitadas (409/422) não geram entrada (SPEC-20260603-002 RF-10) | Alta |
| RF-15 | Página `/maintenance` (frontend) exibe lista de manutenções com colunas: data agendada, descrição, veículo, status (badge); link para `/maintenance/new` | Média |
| RF-16 | Página `/maintenance/new` (frontend) exibe formulário mínimo com os campos obrigatórios e opcionais; ao salvar, redireciona para `/maintenance` (R-FORM-04) | Média |
| RF-17 | Página `/maintenance/[id]` (frontend) permite editar campos e mudar status via seletor restrito às transições válidas a partir do status atual (UX progressiva — não substitui o enforcement de backend) | Média |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|--------------------|
| RNF-01 | Performance | `GET /maintenances` com até 200 registros em p95 < 300 ms |
| RNF-02 | Segurança | Toda rota exige JWT via `SupabaseAuthGuard` (S1); RLS `auth.uid() = user_id` ativo em `maintenances` (S2) |
| RNF-03 | Isolamento | Filtros por `user_id` sempre aplicados no service, reforçados por RLS |
| RNF-04 | Sem roundtrip extra | A validação de transição reutiliza o `findOne()` de ownership já necessário para o update; nenhuma query adicional (RNF-01 de SPEC-20260603-002) |
| RNF-05 | Soft-delete | Registros com `deleted_at IS NOT NULL` invisíveis em listagens e buscas por ID (R5) |
| RNF-06 | Cascade de veículo | Soft-delete de veículo (R-VEH-01) propaga `deleted_at` para manutenções vinculadas — responsabilidade do `VehiclesService`, já implementada |

---

## Critérios de Aceite

- [ ] CA-01: `POST /maintenances` com `{ vehicle_id, description: "Troca de óleo", scheduled_date: "2026-08-01" }` retorna 201 com `status: "scheduled"`
- [ ] CA-02: `POST /maintenances` com `status: "completed"` no payload é ignorado — registro criado com `status: "scheduled"`
- [ ] CA-03: `GET /maintenances` não retorna manutenções com `deleted_at IS NOT NULL`
- [ ] CA-04: `GET /maintenances/:id` de manutenção de outro usuário retorna 404
- [ ] CA-05: `PATCH /maintenances/:id` com `{ status: "in_progress" }` em manutenção `scheduled` retorna 200
- [ ] CA-06: `PATCH /maintenances/:id` com `{ status: "in_progress" }` em manutenção `completed` retorna 409 com `"Transição inválida: completed → in_progress"`
- [ ] CA-07: `PATCH /maintenances/:id` com `{ status: "completed" }` sem `odometer_km` (nem no payload nem já persistido) retorna 422
- [ ] CA-08: `PATCH /maintenances/:id` com `{ status: "completed", odometer_km: 50000, cost: 350.00 }` cria despesa vinculada com `source_type: "maintenance"`, `source_id` = id da manutenção
- [ ] CA-09: `PATCH /maintenances/:id` com `{ status: "cancelled" }` soft-deleta a despesa vinculada, se existir
- [ ] CA-10: `DELETE /maintenances/:id` retorna 204 e soft-deleta a despesa vinculada, se existir
- [ ] CA-11: Transição rejeitada (409 ou 422) não grava entrada em `audit_logs`
- [ ] CA-12: `PATCH /maintenances/:id` sem campo `status` atualiza outros campos sem acionar validação de transição
- [ ] CA-13: `POST /maintenances` com `vehicle_id` de outro usuário retorna 404

---

## Fora de Escopo

- Alertas de manutenção por email (pg_cron + Edge Function) — `SPEC-20260521-002`
- Restrições de negócio baseadas em data (ex.: impedir `completed` com `completion_date` futuro) — spec futura
- Validação de transição no frontend além de UX progressiva (RF-17) — o enforcement real é sempre no backend
- Upload de comprovante/nota fiscal de manutenção
- Recorrência automática de manutenções (agendamento preditivo) — `RPC predict_maintenance_needs`, Fase 6 (Analytics)

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260714-001 | `ExpensesModule` — `createFromSource()`/`softDeleteBySource()` reutilizados para o ledger (R-LED-02, R-LED-03, R-HUB-01) |
| Spec | SPEC-20260607-001 | `FinesModule` — padrão de referência replicado (CRUD inline + transição de status + ledger no mesmo módulo) |
| Spec | SPEC-20260603-002 | Grafo de transições de status (R7) — enforcement implementado aqui, satisfazendo RF-01 a RF-10 daquela spec |
| Spec | SPEC-20260711-001 | Ciclos de odômetro (R-ODO-04) — filtro por ciclo ativo ainda não consumido nem por `ExpensesService`; fica ⏳ para ambos os módulos, tratamento unificado em spec futura |
| Spec | SPEC-20260602-002 | `VehiclesModule` — `vehicle_id` referencia veículo do usuário; cascade de soft-delete |
| ADR | ADR-006 | Ledger financeiro unificado |
| DB | `public.maintenances`, `enum maintenance_status` | `20260712171830_core_tables.sql`, `20260712171800_extensions_and_enums.sql` — schema aplicado, não alterar |
| Validador | `@nave/validators` | `packages/validators/src/maintenance.schemas.ts` (a criar) — segue o padrão de `fine.schemas.ts` |

---

## Notas Técnicas

### Camadas de implementação

Seguir o padrão inline já estabelecido em `FinesModule`/`ExpensesModule` (sem Repository/Port):

```
MaintenancesController (apps/api/src/modules/maintenances/)
  → MaintenancesService
    → SupabaseClient (via createUserScopedClient)
```

`MaintenancesModule` importa `ExpensesModule` (mesmo padrão de `FinesModule`) para injetar `ExpensesService`.

### Grafo de transições

```typescript
// packages/validators/src/maintenance.schemas.ts
export const MAINTENANCE_STATUS_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  scheduled:   ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed:   [],
  cancelled:   [],
};
```

### Odômetro obrigatório em `completed` (R-ODO-03)

No `update()`, ao validar a transição para `completed`, verificar `dto.odometer_km ?? existing.odometer_km`; se `null`/`undefined`, lançar `UnprocessableEntityException` (422) antes de qualquer escrita.

### Ledger (R-LED-02, R-LED-03, R-HUB-01)

Mesmo padrão de `FinesService.update()`/`remove()`:
- Transição bem-sucedida para `completed` com `cost` não-nulo → `ExpensesService.createFromSource({ source_type: 'maintenance', source_id: maintenance.id, vehicle_id, category: 'maintenance', amount: cost, date: completion_date ?? scheduled_date, description })`.
- Transição para `cancelled` ou `remove()` → `ExpensesService.softDeleteBySource(accessToken, userId, 'maintenance', maintenanceId)`.

### Erro de domínio

Consistente com a decisão já tomada em `FinesService` (changelog de `SPEC-20260607-001`, T3.6): usar `ConflictException` diretamente para 409 e `UnprocessableEntityException` diretamente para 422, sem criar `InvalidStatusTransitionException` dedicada — nenhum outro módulo do projeto usa exceções de domínio customizadas.

### Schema Zod

`maintenanceBaseSchema` segue o mesmo padrão de sanitização de `fineBaseSchema` (`.trim().normalize('NFC')` em texto livre — R-SAN-01, R-SAN-02; `vehicle_id` como UUID — R-SAN-04).

---

## Regras de Domínio Referenciadas

> Ver `specs/RULES.md` para definição completa.

| ID | Resumo |
|----|--------|
| R5 | Soft-delete via `deleted_at`; invisível por padrão em listagens |
| R7 | Grafo de transições de status de manutenção (`scheduled` como estado inicial) |
| R-ODO-03 | `odometer_km` obrigatório quando `status = completed` |
| R-LED-02 | Manutenção completada com `cost` cria/atualiza despesa vinculada |
| R-LED-03 | Manutenção cancelada soft-deleta a despesa vinculada |
| R-HUB-01 | Soft-delete de manutenção soft-deleta a despesa vinculada, se existir |
| R-SAN-01, R-SAN-02, R-SAN-04 | Sanitização de texto livre e validação de UUID |
| R-VEH-01 | Cascade de soft-delete de veículo |

---

## Histórico de Revisões

| Data | Versão | Mudança | Autor |
|------|--------|---------|-------|
| 2026-07-15 | 1.0 | Criação inicial — spec base para Fase 4; formaliza CRUD que `SPEC-20260521-002` e `SPEC-20260603-002` assumem como pré-existente; absorve o enforcement de transição de status (T4.2) e a integração com o ledger (R-LED-02/03, R-HUB-01) no mesmo módulo, replicando o padrão já validado em `FinesModule` (T3.6/T3.8) | Douglas Lopes (lps.doug@protonmail.com) |
