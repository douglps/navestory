# Matriz de Permissões — Nave SaaS

> Última atualização: 2026-07-31 (rev. 9)
> Responsável: doc-keeper — rev. 9: Dashboard expandido com 6 endpoints de T5.1/SPEC-20260721-002
> (fleet-health, alerts, vehicle-cards, vehicle-history, kpi-catalog, fleet-charts); POST
> /users/me/restore adicionado (SPEC-20260719-002); seção Preferências criada (SPEC-20260603-004 /
> SPEC-20260612-003). Rev. 8 anterior: guards `/admin` reconciliados, rev-password adicionadas.

---

## Roles

| Role | Descrição | Como é identificado |
|------|-----------|---------------------|
| `anonymous` | Não autenticado | Ausência de token JWT |
| `user` | Usuário autenticado com conta ativa | JWT válido do Supabase; `profiles.deleted_at IS NULL` |
| `admin` | Administrador do sistema | JWT com `user_metadata.role = 'admin'` (definido via Supabase Dashboard) |
| `workspace_owner` | Dono de um workspace (plano Frota) | Cria workspace ao assinar plano Frota — **Fase 4** |
| `workspace_member` | Convidado de um workspace | Aceita convite do owner — **Fase 4** |

> **Nota MVP:** A atribuição do role `admin` é manual via Supabase Dashboard. Não há UI de gestão de roles no MVP (previsto para Fase 2).
> **2026-07-13 (fechamento IMPACTO-021 #1):** O `apps/web/middleware.ts` foi implementado e testado na Fase 1 (T1.1). Ele protege rotas SSR, redireciona para `/login` quando não autenticado e renova sessão via `POST /auth/refresh`. O acesso `/api/backend/*` é reescrito para a API local via `apps/web/next.config.ts`, resolvendo o cross-origin de cookie em dev. O arquivo `apps/web/lib/supabase/middleware.ts` não existe neste repositório — era referência de documentação anterior de outro ciclo; nunca foi criado aqui.
> **Nota Fase 4:** Os roles `workspace_owner` e `workspace_member` foram definidos na SPEC-20260620-001 (Business Strategy Stories) e serao implementados na Fase 4 (Enterprise). O `workspace_member` ve apenas veiculos atribuidos pelo owner via `workspace_vehicle_assignments`.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Permitido |
| ❌ | Negado (retorna 401 ou 403) |
| 🔒 | Permitido apenas para os próprios dados (`user_id = auth.uid()`) |
| ⚠️ | Requer confirmação adicional no body |
| — | Não aplicável |

---

## Autenticação (`/auth`)

| Endpoint | Método | anonymous | user | admin | Guard | Rate Limit |
|----------|--------|-----------|------|-------|-------|------------|
| `/auth/register` | POST | ✅ | ✅ | ✅ | — | 5 req/15min por IP |
| `/auth/login` | POST | ✅ | ✅ | ✅ | — | 10 req/15min por IP |
| `/auth/logout` | POST | ❌ | ✅ | ✅ | `SupabaseAuthGuard` | 100 req/60s (global) |
| `/auth/refresh` | POST | ❌ | ✅ | ✅ | `SupabaseAuthGuard` | 100 req/60s (global) |
| `/auth/recover-password` | POST | ✅ | ✅ | ✅ | — | 3 req/15min por IP |
| `/auth/reset-password` | POST | ✅ | ✅ | ✅ | — | 100 req/60s (global) |

---

## Veículos (`/vehicles`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/vehicles` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Lista apenas veículos do usuário |
| `/vehicles` | POST | ❌ | ✅ | ✅ | `user_id` = userId do JWT | — |
| `/vehicles/:id` | GET | ❌ | 🔒 | ✅ | Valida `user_id` | 404 se não pertence ao usuário |
| `/vehicles/:id` | PATCH | ❌ | 🔒 | ✅ | Valida `user_id` | — |
| `/vehicles/:id` | DELETE | ❌ | 🔒 | ✅ | Valida `user_id` | Soft delete |

---

## Grupos de Veículos (Server Actions)

> Grupos de veículos são gerenciados exclusivamente via Server Actions Next.js (não há endpoints REST dedicados). As operações são autenticadas via Supabase session no lado do servidor.

| Server Action | anonymous | user | admin | Isolamento | Observação |
|---------------|-----------|------|-------|------------|-----------|
| `createGroup` | ❌ | ✅ | ✅ | `user_id` = userId da sessão JWT | Cria grupo com `name` e `color`; revalida `/dashboard` |
| `updateGroup` | ❌ | 🔒 | ✅ | Filtra por `id + user_id` | Atualiza `name`/`color` do próprio grupo |
| `deleteGroup` | ❌ | 🔒 | ✅ | Filtra por `id + user_id` | Hard delete; cascade FK remove `vehicle_group_members` |
| `setGroupMembers` | ❌ | 🔒 | ✅ | Filtra veículos por `user_id` + `deleted_at IS NULL` | Replace-all; descarta IDs inválidos silenciosamente; máx. 200 membros (R-GRP-01) |

### Supabase RLS — Tabelas de Grupos

| Tabela | Política | Regra |
|--------|----------|-------|
| `vehicle_groups` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` |
| `vehicle_group_members` | SELECT, INSERT, DELETE | Via CASCADE da FK `group_id → vehicle_groups(id)` (RLS de `vehicle_groups` protege o acesso) |

---

## Despesas (`/expenses`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/expenses` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Suporta filtros: `vehicle_id`, `period`, `source_type`, `is_readonly` |
| `/expenses` | POST | ❌ | ✅ | ✅ | `user_id` = userId do JWT | — |
| `/expenses/:id` | GET | ❌ | 🔒 | ✅ | Valida `user_id` | 404 se não pertence |
| `/expenses/:id` | PATCH | ❌ | 🔒 | ✅ | Valida `user_id` | **403 se `is_readonly = true`** (R-LED-01) — despesa vinculada a multa, manutenção ou custo recorrente não pode ser editada diretamente |
| `/expenses/:id` | DELETE | ❌ | 🔒 | ✅ | Valida `user_id` | Soft delete; **403 se `is_readonly = true`** (R-LED-01) |

> **Regra R-LED-01:** Despesas com `source_type IS NOT NULL` têm `is_readonly = true`. Alterações devem ser feitas no registro de origem (multa, manutenção ou custo recorrente), que propaga as mudanças para a expense via `createFromSource` / `softDeleteBySource`.

---

## Multas (`/fines`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/fines` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Suporta filtro `?status=pending|appealing|paid|cancelled` |
| `/fines` | POST | ❌ | ✅ | ✅ | `user_id` = userId do JWT | Cria expense vinculada automaticamente (`source_type = 'fine'`); usa `amount_with_discount` quando disponível (R-LED-02) |
| `/fines/vehicle/:vehicleId` | GET | ❌ | 🔒 | ✅ | Valida `user_id` no veículo | 404 se veículo não pertence ao usuário |
| `/fines/:id` | GET | ❌ | 🔒 | ✅ | Valida `user_id` | 404 se não pertence |
| `/fines/:id` | PATCH | ❌ | 🔒 | ✅ | Valida `user_id` | Transições: `pending → [paid, appealing, cancelled]`; `appealing → [paid, cancelled]`; `paid` e `cancelled` terminais; cancelar soft-deleta expense vinculada (R-LED-03) |
| `/fines/:id` | DELETE | ❌ | 🔒 | ✅ | Valida `user_id` | Soft delete + soft-delete da expense vinculada (R-HUB-01) |

---

## Custos Recorrentes (`/recurring-costs`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/recurring-costs` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Filtros: `vehicle_id`, `year`, `cost_type`, `paid` |
| `/recurring-costs` | POST | ❌ | ✅ | ✅ | `user_id` = userId do JWT | 409 se já existe `(vehicle_id, cost_type, year)` para o usuário (R-REC-01); cria expense vinculada se `paid_at` informado (R-LED-05) |
| `/recurring-costs/vehicle/:vehicleId` | GET | ❌ | 🔒 | ✅ | Valida `user_id` no veículo | 404 se veículo não pertence ao usuário |
| `/recurring-costs/:id` | GET | ❌ | 🔒 | ✅ | Valida `user_id` | 404 se não pertence |
| `/recurring-costs/:id` | PATCH | ❌ | 🔒 | ✅ | Valida `user_id` | Ao definir `paid_at` pela primeira vez, cria expense vinculada automaticamente (R-LED-05) |
| `/recurring-costs/:id` | DELETE | ❌ | 🔒 | ✅ | Valida `user_id` | Soft delete + soft-delete da expense vinculada (R-HUB-01) |

---

## Ciclos de Odômetro (`/vehicles/:vehicleId/odometer-cycles`) — SPEC-20260711-001

> Sub-recurso de Veículos. Criação de ciclo é restrita ao dono do veículo (R-ODO-05). Ciclos são imutáveis após criação — sem UPDATE ou DELETE via API ou RLS.

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/vehicles/:vehicleId/odometer-cycles` | GET | ❌ | 🔒 | ✅ | Valida `user_id` do veículo via `VehiclesService.findOne()` | Retorna `[]` quando não há ciclos (não 404); paginado (padrão 20, máx 100 — P1) |
| `/vehicles/:vehicleId/odometer-cycles` | POST | ❌ | 🔒 | ✅ | Valida `user_id` do veículo via `VehiclesService.findOne()` | **Restrito ao dono do veículo** (R-ODO-05); aceita `{ starting_value, reason }`; `reason` obrigatório 3–500 chars; cria ciclo com `cycle_number >= 2`; dispara audit fire-and-forget (R-MON-01) |

> **Regra R-ODO-05:** Apenas o `user_id` dono do veículo pode criar ciclos de odômetro. Não há endpoint de update ou delete — ciclos são registros auditáveis imutáveis (RNF-03 da spec). Tentativa de UPDATE ou DELETE via Supabase client retorna 403 por ausência de policy de escrita retroativa no RLS.

> **Nota Fase 4:** Quando workspaces forem implementados, a permissão de `workspace_member` para criar ciclos precisará ser avaliada separadamente. Por ora (Fase 1), não se aplica.

---

## Manutenções (`/maintenance`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/maintenance` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Suporta filtro `vehicle_id` |
| `/maintenance` | POST | ❌ | ✅ | ✅ | `user_id` = userId do JWT | — |
| `/maintenance/:id` | GET | ❌ | 🔒 | ✅ | Valida `user_id` | — |
| `/maintenance/:id` | PATCH | ❌ | 🔒 | ✅ | Valida `user_id` | — |
| `/maintenance/:id` | DELETE | ❌ | 🔒 | ✅ | Valida `user_id` | Soft delete |

---

## Dashboard (`/dashboard`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/dashboard/stats` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Resumo mensal de despesas e manutenções |
| `/dashboard/export` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | CSV; throttle 10 req/5min; parâmetro `period` obrigatório |
| `/dashboard/monitor` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` (aplicado via RLS + redirect programático) | Server Component; exibe audit log do próprio usuário; `force-dynamic`; redirect `/login` se não autenticado |
| `/dashboard/fleet-health` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Executa RPC `calculate_fleet_health`; persiste `vehicles.health_score` como efeito colateral (R-HS-08, R-HS-09); retorna score de frota + scores individuais |
| `/dashboard/alerts` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Alertas de documentos vencidos/a vencer, multas pendentes e manutenções; ResponseDTO em `alerts.dto.ts` |
| `/dashboard/vehicle-cards` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Cards de veículo com score de saúde, flags e indicador de odômetro faltante em abastecimento |
| `/dashboard/vehicle-history` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Parâmetro `vehicle_id` obrigatório; retorna últimas 20 despesas + manutenções combinadas; reaproveitada por VehicleSpotlight (SPEC-20260531-001 RF-DB-04/RF-DB-05) |
| `/dashboard/kpi-catalog` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Computa os 8 KPIs do catálogo via `Promise.allSettled` (falha isolada por métrica); filtra pelos `dashboard_kpi_ids` de `user_preferences`; inclui sparkline + delta com supressão por amostra pequena (R-KPI-01, R-KPI-02) |
| `/dashboard/fleet-charts` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Séries mensais de custo/km, volume de combustível e breakdown de categorias para gráficos inline da frota; reaproveitado por `FleetChartsSection` no frontend (SPEC-20260721-002 RF-08) |

---

## Usuários (`/users`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/users/me` | GET | ❌ | ✅ | ✅ | Retorna apenas o próprio perfil | — |
| `/users/me` | PATCH | ❌ | ✅ | ✅ | Atualiza apenas o próprio perfil | — |
| `/users/me` | DELETE | ❌ | ⚠️✅ | ✅ | Exige `{ confirm: true }` | Soft delete (`profiles.deleted_at = now()`) + audit log `ACCOUNT_DELETION_REQUESTED`; hard delete após 30 dias (SPEC-20260719-002, C1) |
| `/users/me/restore` | POST | ❌ | 🔒 | ✅ | `user_id` do JWT de conta com `deleted_at IS NOT NULL` | Protegida por `SoftDeletedUserGuard` (aceita JWT de conta soft-deleted); zera `deleted_at`; audit log `ACCOUNT_RESTORED`; retorna 200 (restaurada) ou 409 (conta não estava deletada) |

---

## Preferências (`/preferences`) — SPEC-20260603-004, SPEC-20260612-003

> Gerencia as preferências de exibição e comportamento do usuário autenticado: campos exibidos no
> chip de contexto de veículo (`vehicle_chip_fields`), rascunho automático de formulários
> (`auto_draft_enabled`) e KPIs ativos no dashboard (`dashboard_kpi_ids`). Persiste via upsert em
> `user_preferences`. Garantido por `SupabaseAuthGuard`.

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/preferences` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Retorna `vehicle_chip_fields`, `auto_draft_enabled`, `dashboard_kpi_ids` com fallback para defaults quando a linha ainda não existe |
| `/preferences` | PATCH | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Upsert parcial — campos omitidos não são alterados; valida `dashboard_kpi_ids` (1–6 IDs do catálogo canônico, R-KPI-01); valida `vehicle_chip_fields` via `chipFieldsSchema` |

> **Nota:** Os campos de preferências são armazenados em `user_preferences` (RLS owner-only — ver
> tabela de RLS abaixo). A coluna `dashboard_kpi_ids text[]` foi adicionada via migration
> `supabase/migrations/20260721150000_dashboard_kpi_preferences.sql` (SPEC-20260721-002 RF-01).

---

## Categorias Personalizadas (`/categories`)

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/categories` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` (RLS) | Lista apenas as categorias do próprio usuário |
| `/categories` | POST | ❌ | 🔒 | ✅ | `user_id` = userId do JWT | `value` deve seguir `^[a-z0-9_-]+$` (1–50 chars); `label` 1–100 chars; UNIQUE por `(user_id, value)` |
| `/categories/:id` | GET | ❌ | 🔒 | ✅ | RLS owner-only | 404 se não pertence ao usuário (RLS retorna vazio) |
| `/categories/:id` | PATCH | ❌ | 🔒 | ✅ | RLS owner-only | Apenas `label` pode ser atualizado (slug `value` é imutável após criação) |
| `/categories/:id` | DELETE | ❌ | 🔒 | ✅ | RLS owner-only | Hard delete (sem soft-delete na tabela `user_categories`) |

> **Nota:** A tabela `user_categories` convive com `expense_categories` (dados de referência globais, sem RLS de escrita). Ao popular seletores de categoria no frontend, a camada de serviço deve combinar as duas fontes — categorias globais + categorias personalizadas do usuário.

---

## Admin (`/admin`)

| Endpoint | Método | anonymous | user | admin | Guards | Observação |
|----------|--------|-----------|------|-------|--------|-----------|
| `/admin/users` | GET | ❌ | ❌ | ✅ | `SupabaseAuthGuard` + `RolesGuard` + `@Roles('admin')` | Lista todos os usuários (paginado) |
| `/admin/users/:id` | DELETE | ❌ | ❌ | ✅ | `SupabaseAuthGuard` + `RolesGuard` + `@Roles('admin')` | Exclusão de qualquer conta (LGPD); registro em `audit_logs` |
| `/admin/audit-logs` | GET | ❌ | ❌ | ✅ | `SupabaseAuthGuard` + `RolesGuard` + `@Roles('admin')` | Filtros: `user_id`, `period` |

> **Composição de guards:** Não existe uma classe `AdminGuard` única. A proteção de endpoints admin usa a composição `@UseGuards(SupabaseAuthGuard, RolesGuard)` com o decorator `@Roles('admin')` — dois guards distintos, aplicados em sequência. `SupabaseAuthGuard` autentica o JWT; `RolesGuard` verifica `user_metadata.role === 'admin'` no payload.
> **Segurança:** `AdminSupabaseService` usa `SERVICE_ROLE_KEY` (bypass de RLS) — nunca compartilhado com `SupabaseService` (anon key). Isolamento garantido por módulo NestJS. Toda operação admin é registrada em `audit_logs` com o `user_id` do administrador executor.

---

## Supabase RLS (Banco de Dados)

| Tabela | Política | Regra |
|--------|----------|-------|
| `profiles` | SELECT, UPDATE | `auth.uid() = id` |
| `vehicles` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` |
| `expenses` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` |
| `maintenances` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` |
| `audit_logs` | SELECT | `auth.uid() = user_id` |
| `audit_logs` | INSERT | Permitido para qualquer usuário autenticado (service role bypassa) |
| `expense_categories` | SELECT | Público (dados de referência) |
| `expense_categories` | INSERT, UPDATE, DELETE | Somente `service_role` |
| `user_categories` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` — política única `user_categories_owner_policy FOR ALL` com `USING` e `WITH CHECK` (adicionada em migration 003, 2026-06-01) |
| `user_preferences` | SELECT | `auth.uid() = user_id` — `user_preferences_select_own` (adicionada em migration `20260604000000`, 2026-06-04) |
| `user_preferences` | INSERT | `auth.uid() = user_id` — `user_preferences_insert_own` (adicionada em migration `20260604000000`, 2026-06-04) |
| `user_preferences` | UPDATE | `auth.uid() = user_id` — `user_preferences_update_own` (adicionada em migration `20260604000000`, 2026-06-04) |
| `user_preferences` | DELETE | Somente via `ON DELETE CASCADE` de `profiles(id)` — sem policy de DELETE direta (C1 — LGPD) |
| `fines` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` — owner-only com soft-delete (`deleted_at`) (adicionada em migration `20260601000000`, 2026-06-01) |
| `vehicle_recurring_costs` | SELECT | `auth.uid() = user_id AND deleted_at IS NULL` — `"Users can view own recurring costs"` (adicionada em migration `20260608000000`, 2026-06-07) |
| `vehicle_recurring_costs` | INSERT | `auth.uid() = user_id` — `"Users can create recurring costs"` (adicionada em migration `20260608000000`, 2026-06-07) |
| `vehicle_recurring_costs` | UPDATE | `auth.uid() = user_id AND deleted_at IS NULL` — `"Users can update own recurring costs"` (adicionada em migration `20260608000000`, 2026-06-07) |
| `vehicle_recurring_costs` | DELETE | Bloqueado diretamente — `USING (false)`; remoção somente via soft-delete (`deleted_at`) pela aplicação (adicionada em migration `20260608000000`, 2026-06-07) |
| `vehicle_odometer_cycles` | SELECT | `auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)` — owner-only via sub-select (adicionada em migration `20260711000000`, planejada para implementação) |
| `vehicle_odometer_cycles` | INSERT | `auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)` — somente dono do veículo pode criar ciclos (R-ODO-05) (adicionada em migration `20260711000000`, planejada para implementação) |
| `vehicle_odometer_cycles` | UPDATE | Sem policy — bloqueado implicitamente (ciclos são imutáveis após criação, RNF-03 de SPEC-20260711-001) |
| `vehicle_odometer_cycles` | DELETE | Sem policy — bloqueado implicitamente (ciclos são registros auditáveis permanentes) |

> **Nota sobre `fines`:** A tabela de multas usa o mecanismo de soft-delete padrão (`deleted_at`) com RLS `auth.uid() = user_id`. Policy verificada na migration `20260601000000_vehicle_documents_and_fines.sql` e adicionada formalmente na tabela RLS acima (rev. 6).

> **Bypass de RLS:** `AdminSupabaseService` e a Edge Function `send-maintenance-alerts` usam `SERVICE_ROLE_KEY` e bypassam todas as políticas RLS. Esta permissão deve ser usada exclusivamente em contextos server-side auditados.

---

## Analytics (`/analytics`) — SPEC-20260622-001

> Fase 1 implementada (TCO + Fuel Trend). Fases 2-3 planejadas.

### Fase 1 — Implementado

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/analytics/tco/:vehicleId` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` via token no Supabase client + ownership do veiculo | RPC `calculate_vehicle_tco` (R-ANA-04); Cache `max-age=3600, stale-while-revalidate=600` |
| `/analytics/fuel-trend/:vehicleId` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` via token no Supabase client + ownership do veiculo | RPC `fuel_consumption_trend` (R-ANA-01); limit 1-100 (default 20); Cache `max-age=3600` |

### Fases 2-3 — Planejado

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/analytics/anomalies/:vehicleId` | GET | -- | -- | ✅ | `user_id = auth.uid()` + ownership do veiculo | RPC `detect_expense_anomalies` (R-ANA-02) |
| `/analytics/benchmark` | GET | -- | -- | ✅ | `user_id = auth.uid()` | RPC `benchmark_fleet_vehicles` (R-ANA-05) |
| `/analytics/forecast/:vehicleId` | GET | -- | -- | ✅ | `user_id = auth.uid()` + ownership do veiculo | RPC `forecast_costs` (R-ANA-03) |
| `/analytics/seasonal` | GET | -- | -- | ✅ | `user_id = auth.uid()` | RPC `seasonal_analysis` (R-ANA-07) |
| `/analytics/insights` | GET | -- | -- | ✅ | `user_id = auth.uid()` | Insights em linguagem natural (R-ANA-05) |

> **Nota:** Todos os endpoints de analytics sao read-only e cacheaveis com TTL de 1h (R-ANA-06). `SupabaseAuthGuard` protege todos os endpoints. Restricoes por plano de assinatura poderao ser aplicadas na Fase 2 (pos-beta).

---

## Assinaturas e Planos (planejado — SPEC-20260620-001, Fase 2)

> Secao planejada. Sera implementada apos aprovacao da spec e integracao com gateway de pagamento.

| Endpoint | Método | anonymous | user | admin | Isolamento | Observação |
|----------|--------|-----------|------|-------|------------|-----------|
| `/settings/billing` | GET | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Exibe plano atual, status, data de expiracao |
| `/settings/billing/checkout` | POST | ❌ | 🔒 | ✅ | `user_id = auth.uid()` | Inicia checkout com gateway (Stripe/MP) |
| `/settings/billing/cancel` | POST | ❌ | ⚠️🔒 | ✅ | `user_id = auth.uid()` | Cancelamento self-service; exige confirmacao |

### Restricoes por Plano (pos-beta)

| Recurso | Gratis | Pro Mensal | Pro Anual | Frota |
|---------|--------|-----------|----------|-------|
| Veiculos | 3 | Ilimitado | Ilimitado | Ilimitado |
| Historico detalhado | 2 meses | Tudo | Tudo | Tudo |
| Export CSV | Bloqueado | Rate limited | Ilimitado | Ilimitado |
| Membros workspace | — | — | — | 10 (expandivel) |

### Overrides Administrativos de Feature (3 camadas, planejado — R-BIZ-15)

> Mecanismo exclusivo do role `admin` para sobrepor os limites da tabela acima sem mudar o plano do usuario. **Nao** e capacidade do `workspace_owner` (Fase 4) — esse continua restrito a gerenciar membros/veiculos do proprio workspace, nunca a features da plataforma.

| Escopo | Quem aciona | Alcance | Precedencia |
|--------|-------------|---------|-------------|
| Sistema | `admin` | Default global de uma feature; pode ser marcado como `force` (kill-switch) | Mais baixa — exceto quando `force = true`, entao vence sobre tudo |
| Plano | `admin` | Todos os assinantes de um `plan_type` (Gratis/Pro Mensal/Pro Anual/Frota) | Intermediaria |
| Usuario | `admin` | Um assinante individual | Mais alta (quando `force` do Sistema nao esta ativo) |

---

## Workspaces (planejado — SPEC-20260620-001, Fase 4)

> Secao planejada. Sera implementada na Fase 4 (Enterprise) apos validacao do modelo de monetizacao.

| Endpoint | Método | anonymous | user | workspace_owner | workspace_member | admin | Isolamento | Observação |
|----------|--------|-----------|------|-----------------|-----------------|-------|------------|-----------|
| `POST /workspaces` | POST | ❌ | ❌ | ✅ (cria) | ❌ | ✅ | Plano Frota obrigatorio | Cria workspace ao assinar Frota |
| `GET /workspaces/:id/members` | GET | ❌ | ❌ | 🔒 | 🔒 | ✅ | Owner ve todos; member ve a si mesmo | — |
| `POST /workspaces/:id/invite` | POST | ❌ | ❌ | 🔒 | ❌ | ✅ | Apenas owner | Convite por email |
| `DELETE /workspaces/:id/members/:mid` | DELETE | ❌ | ❌ | 🔒 | ❌ | ✅ | Apenas owner | Remove membro |
| `GET /workspaces/:id/vehicles` | GET | ❌ | ❌ | 🔒 (todos) | 🔒 (atribuidos) | ✅ | Member filtra por `workspace_vehicle_assignments.member_id` | BS-ACL-06 |

---

## Auditoria

Ações registradas automaticamente em `audit_logs`:

**Origem: API NestJS (`apps/api`)**

| Ação (`action`) | Disparado por | `table_name` | Observação |
|-----------------|---------------|-------------|-----------|
| `REGISTER` | `POST /auth/register` | `auth` | `record_id = user_id` |
| `LOGIN` | `POST /auth/login` | `auth` | `record_id = user_id` |
| `ACCOUNT_DELETED` | `DELETE /users/me` | `profiles` | `record_id = user_id` |
| `MAINTENANCE_ALERT_SENT` | Edge Function diária | `maintenances` | `record_id = maintenance_id` |
| `ADMIN_USER_DELETED` | `DELETE /admin/users/:id` | `profiles` | `record_id = target_user_id`; `changes.admin_id = admin_user_id` |

**Origem: Web Server Actions (`apps/web`) — adicionado em 2026-05-30 via `lib/actions/audit.ts`**

| Ação (`action`) | Disparado por | `table_name` | Observação |
|-----------------|---------------|-------------|-----------|
| `Criação de Veículo` | Server Action `createVehicle` | `vehicles` | `record_id = vehicle.id` |
| `Atualização de Dados` | Server Action `updateVehicle` | `vehicles` | `record_id = vehicle.id` |
| `Exclusão de Veículo` | Server Action `deleteVehicle` | `vehicles` | `record_id = vehicle.id` |
| `Criação de Despesa` | Server Action `createExpense` | `expenses` | `record_id = expense.id` |
| `Atualização de Despesa` | Server Action `updateExpense` | `expenses` | `record_id = expense.id` |
| `Exclusão de Despesa` | Server Action `deleteExpense` | `expenses` | `record_id = expense.id` |
| `Criação de Manutenção` | Server Action `createMaintenance` | `maintenances` | `record_id = maintenance.id` |
| `Atualização de Manutenção` | Server Action `updateMaintenance` | `maintenances` | `record_id = maintenance.id` |
| `Exclusão de Manutenção` | Server Action `deleteMaintenance` | `maintenances` | `record_id = maintenance.id` |
| `Conclusão de Manutenção` | Server Action `completeMaintenance` | `maintenances` | `record_id = maintenance.id` |

> **Adicionado em 2026-06-04:** Ações de edição de despesas são cobertas pelos `writeAuditLog` existentes em `expense-actions.ts` (`Atualização de Despesa`, `Exclusão de Despesa`). A edição de nome de perfil usa `supabase.auth.updateUser` diretamente do cliente — não gera entrada em `audit_logs` pelo mecanismo atual.

> **Adicionado em 2026-06-07 (Sprint 2):** Operações do `FinesModule` e `RecurringCostsModule` ainda não possuem `writeAuditLog` — gap a resolver na Sprint 3. As operações de ledger (`createFromSource`, `softDeleteBySource`) em expenses geradas por multas e custos recorrentes também não produzem entradas de auditoria próprias (a entrada da operação-pai — multa ou custo — cobre indiretamente).

> **Nota de design:** `writeAuditLog()` nunca propaga exceção — falha silenciosa para não interromper a operação principal. Erros de auditoria devem ser monitorados via logs de servidor.
