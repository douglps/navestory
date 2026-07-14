---
id: SPEC-20260711-001
title: "Ciclos de Odômetro"
status: approved
date: 2026-07-11
author: douglps
rules: [R-ODO-03, R-ODO-04, R-ODO-05, R-ODO-06]
security: [S1, S2]
---

# SPEC-20260711-001: Ciclos de Odômetro

**Versão:** 1.0
**Status:** Aprovada
**Autor:** douglps
**Data:** 2026-07-11
**Reviewers:** —
**ADR de referência:** [ADR-007](../../docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md)
**Análise de impacto:** IMPACTO-025 (`matrices/impacto.md`) — Risco Alto, estimativa 11–14 dias

---

## 1. Resumo

Introduz a entidade `vehicle_odometer_cycles` para registrar marcos de reinício legítimos do odômetro (troca de painel, revenda, correção) como uma série temporal auditável e imutável. Paralelamente, fecha o Non-Goal NG-04 da SPEC-20260601-001 tornando `odometer_km` obrigatório para manutenções com `status = completed` (R-ODO-03). A validação de sequência existente (soft-warning, exception-based) é estendida para filtrar o máximo histórico apenas dentro do ciclo ativo (R-ODO-04). As funções SQL analíticas (`fuel_consumption_trend`, `get_vehicle_cost_per_km`, `calculate_vehicle_tco`) passam a considerar apenas o ciclo ativo, evitando quilometragens negativas ou distorcidas após um reset. A UI ganha uma tela de Configurações para criação de ciclos e um badge de ciclo exibido a partir do 2º ciclo em diante.

---

## 2. Contexto e Motivação

**Problema:**
O odômetro é a linha do tempo operacional do veículo — base de cálculo de km/L, custo/km, TCO e health score. Hoje existem duas lacunas estruturais:

1. **Manutenções não validam sequência de odômetro (NG-04 de SPEC-20260601-001):** o campo `maintenances.odometer_km` existe na tabela desde a migration `20260522000000_add_odometer_km.sql`, mas nunca foi obrigatório nem validado. Manutenções concluídas sem odômetro produzem gaps silenciosos na série temporal que corrompem gráficos de consumo.

2. **Não existe mecanismo formal para quebras legítimas de sequência:** troca de instrumento, revenda ou correção de digitação propagada geram apenas um warning genérico do padrão R-ODO-01. O usuário não tem como declarar "este é um novo início — não é erro de digitação". Como consequência, funções analíticas como `fuel_consumption_trend` e `calculate_vehicle_tco` calculam quilometragem percorrida cruzando ciclos distintos, produzindo valores negativos ou absurdos após qualquer reset.

**Evidências registradas em IMPACTO-025:**
- `fuel_consumption_trend` usa `LAG(odometer_km)` sem filtro de data: após reset, `prev_odo` cruza ciclos e gera consumo negativo ou infinito.
- `calculate_vehicle_tco` usa `MIN/MAX(odometer_km)` sobre toda a história: `total_km` mistura ciclos, invalidando `cost_per_km`.
- `createMaintenanceAction` em `apps/web/app/actions/maintenance-actions.ts` (linhas 53–63) nunca persiste `odometer_km` mesmo quando preenchido pelo usuário — bug pré-existente a corrigir nesta entrega.

**Por que agora:**
O motor de analytics (SPEC-20260622-001) e o TCO dashboard estão em produção dependendo de dados de odômetro coerentes. Qualquer usuário que precise reconfigurar o odômetro do veículo contamina silenciosamente todo o histórico analítico sem ter caminho de escape.

---

## 3. Goals (Objetivos)

- [ ] G-01: `odometer_km` torna-se obrigatório para manutenções transitando para `status = completed`, fechando NG-04 de SPEC-20260601-001 e implementando R-ODO-03.
- [ ] G-02: A nova tabela `vehicle_odometer_cycles` permite ao dono do veículo declarar formalmente um reinício de odômetro, preservando histórico de todos os resets anteriores.
- [ ] G-03: `findMaxOdometerByVehicle` (expenses e maintenances) filtra por `date >= started_at do ciclo mais recente`; veículos sem linha em `vehicle_odometer_cycles` mantêm comportamento idêntico ao atual — zero regressão (R-ODO-04).
- [ ] G-04: As funções SQL `fuel_consumption_trend`, `get_vehicle_cost_per_km` e `calculate_vehicle_tco` passam a considerar somente o ciclo ativo, eliminando valores negativos ou distorcidos pós-reset.
- [ ] G-05: Quando o valor digitado de odômetro é menor que o máximo do ciclo ativo, a mensagem de confirmação obrigatória segue R-ODO-06 com texto explícito e, quando o valor sugere reset, oferece atalho direto para o fluxo de novo ciclo.
- [ ] G-06: A tela de Configurações de ciclos exibe o histórico de resets e permite criar um novo ciclo com `reason` obrigatório (R-ODO-05).
- [ ] G-07: Badge de ciclo no chip de veículo é exibido somente a partir do 2º ciclo (R-ODO-06).

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Manutenções `completed` sem `odometer_km` aceitas sem aviso | 100% (sem validação) | 0% (todas bloqueadas com 422) | Na entrega da feature |
| Usuários capazes de declarar um reset formal de odômetro | 0% (sem mecanismo) | 100% (tela de Configurações) | Na entrega da feature |
| Registros de analytics com quilometragem negativa pós-reset | Não medido (silencioso) | 0% (filtro de ciclo em todas as funções) | Antes da UI de ciclos |
| Latência adicional por lançamento (expenses e maintenances) | 0 ms | P95 < 60 ms | Na entrega da feature |

---

## 4. Non-Goals (Fora do Escopo)

- **NG-01:** Obrigatoriedade de `odometer_km` em despesas administrativas (multa, seguro, IPVA, licenciamento). Essas categorias captam dados com semântica própria; o campo permanece opcional.
- **NG-02:** Soma vitalícia de quilômetros entre ciclos (TCO cruzando múltiplos ciclos). Cada ciclo é analisado isoladamente nesta versão; TCO vitalício é evolução futura.
- **NG-03:** Conexão de `vehicles.odometer` (campo de cadastro/edição do veículo em `VehicleForm.tsx`) à série de ciclos. O snapshot estático permanece desconectado; sincronização automática fica para sprint futura.
- **NG-04:** Suporte a múltiplos usuários por veículo. A permissão de reset pertence sempre ao `user_id` dono, que hoje é o único usuário possível.
- **NG-05:** Interface pública de API para listar ciclos de terceiros. A API `/vehicles/:id/odometer-cycles` é protegida por `SupabaseAuthGuard` e filtra por dono.
- **NG-06:** Migração automática retroativa de odômetro — nenhum reset implícito é criado para veículos existentes.

---

## 5. Usuários e Personas

**Usuário primário:** Motorista autônomo (P-001) ou gestor de frota (P-002) que acompanha o histórico completo de um veículo com eventos que justificam reinício de odômetro (troca de painel após acidente, venda e recompra do veículo, ou correção de erro de digitação em cascata).

**Jornada atual (sem a feature):**

1. Usuário troca o painel do carro. Odômetro volta ao zero.
2. Usuário registra abastecimento com `odometer_km: 150` (150 km desde a troca).
3. Sistema detecta `150 < 87.000` (máximo anterior) → emite warning genérico R-ODO-01.
4. Usuário confirma com `confirmed: true` sem entender o aviso.
5. `fuel_consumption_trend` calcula `km_delta = 150 - 87000 = -86850` → consumo negativo exibido no dashboard.
6. Não existe forma de declarar "isso é um novo odômetro".

**Jornada futura (com a feature):**

1. Usuário percebe a necessidade do reset. Acessa **Configurações > Veículo > Ciclos de Odômetro**.
2. Clica em "Reiniciar odômetro". Informa `starting_value: 0` e `reason: "Troca de painel após colisão em 10/07/2026"`.
3. Sistema cria linha em `vehicle_odometer_cycles` com `cycle_number: 2`, `started_at: now()`, `previous_cycle_max: 87000`.
4. No próximo abastecimento com `odometer_km: 150`, `findMaxOdometerByVehicle` filtra por `date >= started_at do ciclo 2` → retorna `null` (nenhum registro no ciclo atual) → sem warning.
5. Dashboard de analytics exibe apenas dados do ciclo 2 em diante.
6. Badge "Ciclo 2" aparece no chip do veículo como sinal visual de histórico segmentado.

**Jornada alternativa — retroativo dentro do ciclo ativo:**

1. Usuário registra abastecimento com `odometer_km: 82000` quando o máximo do ciclo ativo é `87000`.
2. Sistema emite warning com mensagem R-ODO-06: **"Odômetro atual: 87.000 km. Odômetro digitado: 82.000 km. Deseja manter o valor retroativo?"**
3. Usuário confirma → expense persiste com `odometer_km: 82000` (lançamento retroativo legítimo).

**Jornada alternativa — valor sugere reset:**

1. Usuário registra despesa com `odometer_km: 45` quando o máximo do ciclo ativo é `87000`.
2. Sistema detecta valor próximo de zero (≤ 100 km) → emite warning R-ODO-06 com segunda opção: **"Valor muito baixo para odômetro atual. Isso parece um reinício de odômetro? → [Criar novo ciclo]"**.
3. Usuário clica em "Criar novo ciclo" → redirecionado para tela de Configurações > Ciclos de Odômetro.

---

## 6. Requisitos Funcionais

### 6.1 Módulo de Validação de Manutenção (R-ODO-03)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O schema Zod `updateMaintenanceInputSchema` em `packages/validators/src/maintenance.schema.ts` deve implementar `superRefine` que torna `odometer_km` obrigatório quando `status === 'completed'`; a mensagem de validação deve ser `"Odômetro é obrigatório para conclusão de manutenção"` aplicada ao path `odometer_km`. | Must | `updateMaintenanceInputSchema.safeParse({ status: 'completed', odometer_km: null })` retorna `success: false` com `issues[0].path === ['odometer_km']`. `updateMaintenanceInputSchema.safeParse({ status: 'completed', odometer_km: 50000 })` retorna `success: true`. |
| RF-02 | `MaintenanceService.update()` deve rejeitar com HTTP 422 (via `UnprocessableEntityException`) quando a payload transitada para `status = 'completed'` não contiver `odometer_km` válido, mesmo que o schema já o capture — a validação no service serve como camada de defesa adicional para payloads chegando por caminhos não-Zod. | Must | `PATCH /maintenances/:id` com `{ status: 'completed' }` sem `odometer_km` retorna 422. `PATCH /maintenances/:id` com `{ status: 'completed', odometer_km: 50000 }` retorna 200. |
| RF-03 | O bug pré-existente em `apps/web/app/actions/maintenance-actions.ts` (`createMaintenanceAction`, linhas ~53–63) que nunca persiste `odometer_km` na payload enviada ao backend deve ser corrigido: o campo deve ser mapeado do FormData/objeto de entrada para o corpo do request, seguindo o padrão de `expense-actions.ts`. | Must | Após a correção, `createMaintenanceAction` com `odometer_km: 50000` resulta em manutenção criada com `odometer_km: 50000` no banco. Coberto por teste em `apps/web/app/actions/maintenance-actions.spec.ts`. |
| RF-04 | A validação de sequência de odômetro em manutenções deve reutilizar o padrão exception-based (`confirmed: true`) já validado em expenses (ADR-001/D2). `MaintenanceService.update()` deve invocar `maintenanceRepository.findMaxOdometerByVehicle()` quando `odometer_km` está presente, e lançar `MaintenanceWarningException` (novo, análogo a `ExpenseWarningException`) quando `odometer_km < máximo do ciclo ativo`. | Must | PATCH para conclusão com `odometer_km: 30000` quando máximo do ciclo ativo é `50000` retorna 409 com `{ warning: 'ODOMETER_REGRESSION', last_km: 50000 }`. Segundo PATCH com `confirmed: true` persiste normalmente. |

### 6.2 Modelo de Dados — Tabela `vehicle_odometer_cycles`

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-05 | A migration `20260711000000_vehicle_odometer_cycles.sql` deve criar a tabela `vehicle_odometer_cycles` com as colunas: `id uuid primary key default gen_random_uuid()`, `vehicle_id uuid not null references vehicles(id) on delete cascade`, `cycle_number int not null`, `started_at timestamptz not null`, `starting_value int not null default 0`, `previous_cycle_max int`, `reason text not null`, `created_by uuid not null references auth.users(id)`, `created_at timestamptz not null default now()`. Constraint `check_cycle_number_gte_2 CHECK (cycle_number >= 2)`. | Must | Migration aplica sem erros em banco limpo e com dados existentes. Constraint `cycle_number >= 2` rejeita INSERT com `cycle_number = 1`. |
| RF-06 | RLS da tabela `vehicle_odometer_cycles`: policy `SELECT` filtra por `auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)`; policy `INSERT` idêntica. Nenhuma policy de `UPDATE` ou `DELETE` — ciclos são imutáveis após criação. | Must | Usuário A não consegue ler ciclos de veículo de usuário B via Supabase client. Tentativa de `UPDATE` ou `DELETE` via Supabase client retorna 403. |
| RF-07 | A função SQL helper `get_active_cycle_start(p_vehicle_id uuid) RETURNS timestamptz` deve ser criada na mesma migration. Ela retorna `MAX(started_at)` de `vehicle_odometer_cycles WHERE vehicle_id = p_vehicle_id`, ou `NULL` quando nenhum ciclo existe (Ciclo 1 implícito). | Must | Para veículo sem ciclos: retorna `NULL`. Para veículo com dois ciclos (`started_at: '2026-01-01'` e `2026-07-01'`): retorna `'2026-07-01'`. |

### 6.3 Backend — `OdometerCyclesModule`

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-08 | O endpoint `POST /vehicles/:vehicleId/odometer-cycles` deve: (a) verificar que o `vehicleId` pertence ao `auth.uid()` via `VehiclesService.findOne()`; (b) aceitar `{ starting_value: number, reason: string }`; (c) calcular `cycle_number = COALESCE(MAX(cycle_number), 1) + 1` no `OdometerCyclesService`; (d) calcular `previous_cycle_max` consultando `findMaxOdometerByVehicle(vehicleId, userId)` antes do INSERT; (e) persistir o novo ciclo; (f) disparar `AuditService.log()` fire-and-forget (R-MON-01). | Must | POST com `reason: "Troca de painel"` e `starting_value: 0` retorna HTTP 201 com `{ id, vehicle_id, cycle_number: 2, started_at, starting_value: 0, previous_cycle_max: <max>, reason, created_by, created_at }`. Sem veículo do usuário: retorna 404. |
| RF-09 | O endpoint `GET /vehicles/:vehicleId/odometer-cycles` deve retornar todos os ciclos do veículo ordenados por `cycle_number ASC`, paginados (padrão 20, máximo 100 — P1). | Must | GET retorna array com os ciclos do veículo. Veículo sem ciclos retorna `[]` (não 404). |
| RF-10 | `OdometerCyclesModule` deve expor `OdometerCyclesService.getActiveCycleStart(vehicleId: string, userId: string): Promise<string | null>` para consumo interno pelos módulos de expenses e maintenance. Retorna o `started_at` ISO 8601 do ciclo mais recente, ou `null` se nenhum ciclo existir. | Must | Chamada interna de `ExpensesService` ao método resulta na `sinceDate` correta. Dado nenhum ciclo: retorna `null` sem lançar exceção. |
| RF-11 | `reason` deve ser obrigatório, mínimo 3 e máximo 500 caracteres, com `.trim().normalize('NFC')` aplicados (R-SAN-01, R-SAN-02). Retorna 400 com `fieldErrors.reason` se ausente ou fora do intervalo. | Must | POST com `reason: ""` retorna 400. POST com `reason: "ok"` (< 3 chars sem trim) retorna 400. POST com `reason: "Troca de painel"` retorna 201. |

### 6.4 Extensão de `findMaxOdometerByVehicle` — Filtro por Ciclo Ativo (R-ODO-04)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-12 | `ExpenseRepositoryPort.findMaxOdometerByVehicle` deve receber o parâmetro opcional `sinceDate?: string` (ISO 8601). Quando presente, a query filtra `AND e.date >= sinceDate`. Parâmetro opcional — zero breaking change para callers existentes que não passam `sinceDate`. | Must | `findMaxOdometerByVehicle(vehicleId, userId, undefined, undefined)` — comportamento idêntico ao atual. `findMaxOdometerByVehicle(vehicleId, userId, undefined, '2026-07-01')` — retorna apenas max de registros com `date >= '2026-07-01'`. |
| RF-13 | `MaintenanceRepositoryPort` deve implementar o método `findMaxOdometerByVehicle(vehicleId: string, userId: string, excludeMaintenanceId?: string, sinceDate?: string): Promise<number \| null>`, análogo ao de expenses. Query: `SELECT MAX(m.odometer_km) FROM maintenances m WHERE m.vehicle_id = vehicleId AND m.user_id = userId AND m.deleted_at IS NULL AND (excludeMaintenanceId IS NULL OR m.id <> excludeMaintenanceId) AND (sinceDate IS NULL OR m.date >= sinceDate)`. | Must | Dado manutenção com `odometer_km: 80000` e `date: '2026-06-01'`, e `sinceDate: '2026-07-01'`: retorna `null`. Dado manutenção com `date: '2026-07-15'`: retorna `80000`. |
| RF-14 | `ExpensesService` deve, antes de verificar sequência de odômetro, consultar `OdometerCyclesService.getActiveCycleStart(vehicleId, userId)` e passar o resultado como `sinceDate` para `expenseRepository.findMaxOdometerByVehicle()`. Veículos sem ciclo registrado recebem `sinceDate: undefined` — comportamento idêntico ao pré-spec (R-ODO-04). | Must | Para veículo com ciclo ativo desde `'2026-07-01'`: expense `date: '2026-06-15'` com `odometer_km: 80000` existente não influencia o warning de expense `date: '2026-07-10'` com `odometer_km: 5000`. Para veículo sem ciclo: comportamento idêntico ao atual. |
| RF-15 | `MaintenanceService` deve aplicar o mesmo padrão de RF-14 para o `findMaxOdometerByVehicle` do repositório de manutenções. | Must | Análogo a RF-14, mas para manutenções. Coberto por testes em `maintenance.service.spec.ts`. |

### 6.5 Mensagem de Confirmação e Atalho para Novo Ciclo (R-ODO-06)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-16 | Quando a exceção de warning de odômetro é capturada (em expenses ou maintenances), a mensagem exibida ao usuário deve seguir exatamente o texto: **"Odômetro atual: {maximo_atual} km. Odômetro digitado: {valor_digitado} km. Deseja manter o valor retroativo?"** com dois botões: "Confirmar retroativo" (reenvio com `confirmed: true`) e "Cancelar". | Must | UI exibe a mensagem com os valores interpolados corretamente formatados (pt-BR, separador de milhar `.`). Botão "Confirmar retroativo" reenvio com `confirmed: true` persiste o registro. |
| RF-17 | Quando o valor digitado sugerir reset — definido como: `odometer_km <= 100` (próximo de zero) OU `maximo_atual - odometer_km >= maximo_atual * 0.5` (queda ≥ 50% do máximo do ciclo ativo) — a UI deve exibir um segundo caminho explícito: **"Valor muito baixo para o histórico atual. Isso pode indicar reinício de odômetro. → [Iniciar novo ciclo]"** (botão que redireciona para `/settings/vehicles/:id/odometer-cycles`). | Must | Com `maximo_atual: 87000` e `odometer_km: 45` (≤ 100): UI exibe o segundo caminho. Com `maximo_atual: 87000` e `odometer_km: 82000` (queda de 5,7%): UI exibe apenas confirmação padrão, sem segundo caminho. Com `maximo_atual: 87000` e `odometer_km: 40000` (queda de 54%): UI exibe segundo caminho. |

### 6.6 Atualização das Funções SQL Analíticas

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-18 | `fuel_consumption_trend` em `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql` deve ser atualizada com `CREATE OR REPLACE` para adicionar a condição `AND e.date >= COALESCE(get_active_cycle_start(p_vehicle_id), '-infinity'::timestamptz)` no `WHERE` principal. O cálculo de `prev_odo` via `LAG()` deve ser restrito à mesma janela. | Must | Veículo com ciclo ativo desde `2026-07-01` e abastecimento `2026-06-01` com `odometer_km: 87000` não afeta cálculo de consumo do abastecimento `2026-07-15` com `odometer_km: 450`. Veículo sem ciclo: comportamento idêntico ao atual. |
| RF-19 | `calculate_vehicle_tco` deve ser atualizada com o mesmo filtro de ciclo: `AND e.date >= COALESCE(get_active_cycle_start(p_vehicle_id), '-infinity'::timestamptz)` (e equivalente para manutenções). `total_km` deve refletir somente o ciclo ativo. | Must | TCO de veículo com ciclo ativo desde `2026-07-01` não inclui despesas de `2026-06-01`. `total_km` é `MAX(odo) - MIN(odo)` dentro do ciclo. |
| RF-20 | `get_vehicle_cost_per_km` deve ser atualizada com o mesmo filtro. | Must | Análogo a RF-19. |
| RF-21 | A atualização das funções SQL (RF-18, RF-19, RF-20) deve ser entregue em migration **separada e anterior** à liberação da UI de criação de ciclos. Ordem de deploy obrigatória: (1) migration de `vehicle_odometer_cycles` + funções SQL; (2) backend `OdometerCyclesModule`; (3) UI de reset. | Must | Não há ponto de tempo em que a UI de ciclos está disponível enquanto as funções SQL ainda operam sem filtro de ciclo. |

### 6.7 Interface — Tela de Configurações e Badge

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-22 | Uma nova rota `/settings/vehicles/[vehicleId]/odometer-cycles` (ou equivalente em `app/(dashboard)/settings/`) deve exibir: (a) histórico de ciclos do veículo em tabela (`cycle_number`, `started_at`, `starting_value`, `previous_cycle_max`, `reason`); (b) botão "Reiniciar odômetro" que abre um modal com campos `starting_value` (default 0) e `reason` (textarea, obrigatório). | Must | Tela renderiza histórico de ciclos. Modal abre ao clicar no botão. Submissão com `reason` vazio exibe erro de validação antes do submit. |
| RF-23 | O chip de veículo (VehicleContextChip) deve exibir o badge "Ciclo {N}" apenas quando o veículo possuir ao menos um registro em `vehicle_odometer_cycles` (ou seja, `cycle_number >= 2`). Veículos no Ciclo 1 (implícito, sem linha na tabela) não exibem badge. | Should | Veículo com ciclo 2: chip exibe "Ciclo 2". Veículo sem ciclos: chip não exibe badge. Badge cresce com ciclos futuros ("Ciclo 3", "Ciclo 4"). |
| RF-24 | O campo `odometer_km` em `MaintenanceForm` (`apps/web/components/maintenance/maintenance-form.tsx`) deve tornar-se obrigatório visualmente (asterisco + mensagem de erro) quando o campo `status` for selecionado como `completed`. Em outros status permanece opcional. | Must | `MaintenanceForm` com `status = 'completed'` e `odometer_km` vazio exibe mensagem "Odômetro é obrigatório para conclusão" e impede o submit. Com `status = 'in_progress'` e `odometer_km` vazio: submit permitido. |

---

## 7. Fluxos Detalhados

### 7.1 Fluxo Principal A — Criar Novo Ciclo de Odômetro

1. Dono do veículo acessa **Configurações > [Veículo] > Ciclos de Odômetro**.
2. Clica em "Reiniciar odômetro". Modal abre com `starting_value` (default `0`) e `reason` (textarea vazia).
3. Usuário preenche `reason: "Troca de painel após colisão em 10/07/2026"` e clica em "Confirmar".
4. Server Action (ou chamada REST) `POST /vehicles/:id/odometer-cycles` é invocada com `{ starting_value: 0, reason: "..." }`.
5. `OdometerCyclesService` valida ownership via `VehiclesService.findOne(vehicleId, userId)` → 404 se não encontrado.
6. Service consulta `findMaxOdometerByVehicle(vehicleId, userId)` (sem `sinceDate`) → captura `previous_cycle_max: 87000`.
7. Service calcula `cycle_number = COALESCE(MAX(cycle_number) FROM vehicle_odometer_cycles WHERE vehicle_id = vehicleId, 1) + 1` → `2`.
8. Service insere `{ vehicle_id, cycle_number: 2, started_at: now(), starting_value: 0, previous_cycle_max: 87000, reason, created_by: userId }`.
9. `AuditService.log()` disparado fire-and-forget (R-MON-01, R-MON-02 — sem PII).
10. Resposta HTTP 201 com o ciclo criado. UI atualiza histórico de ciclos e exibe badge "Ciclo 2" no chip.

### 7.2 Fluxo Principal B — Despesa com Odômetro no Ciclo Ativo

1. Usuário registra despesa `fuel` com `odometer_km: 450` e `date: '2026-07-15'`.
2. `ExpensesService` consulta `OdometerCyclesService.getActiveCycleStart(vehicleId, userId)` → `'2026-07-01T10:30:00Z'`.
3. `expenseRepository.findMaxOdometerByVehicle(vehicleId, userId, undefined, '2026-07-01T10:30:00Z')` → retorna `null` (nenhum registro com `date >= '2026-07-01'` além do que está sendo inserido).
4. Sem warning. Expense persiste normalmente. Resposta HTTP 201.

### 7.3 Fluxo Alternativo C — Odômetro Retroativo no Ciclo Ativo

1. Usuário registra abastecimento com `odometer_km: 82000` quando máximo do ciclo ativo é `87000`.
2. `expenseRepository.findMaxOdometerByVehicle(..., sinceDate: '2026-07-01')` → `87000`.
3. `82000 < 87000` → `ExpenseWarningException` com `{ warning: 'ODOMETER_REGRESSION', last_km: 87000 }`.
4. UI exibe: **"Odômetro atual: 87.000 km. Odômetro digitado: 82.000 km. Deseja manter o valor retroativo?"**
5. Usuário clica "Confirmar retroativo" → reenvio com `confirmed: true`.
6. `ExpensesService` detecta `confirmed: true` → pula verificação de odômetro → persiste. HTTP 201.

### 7.4 Fluxo Alternativo D — Valor Sugere Reset

1. Usuário registra abastecimento com `odometer_km: 45` quando máximo do ciclo ativo é `87000`.
2. `45 < 87000` → `ExpenseWarningException` com `{ warning: 'ODOMETER_REGRESSION', last_km: 87000 }`.
3. UI detecta que `45 <= 100` (condição de "próximo de zero") → exibe segundo caminho.
4. Exibição: **"Odômetro atual: 87.000 km. Odômetro digitado: 45 km. Isso pode indicar reinício de odômetro. → [Iniciar novo ciclo]"**
5. Usuário clica "Iniciar novo ciclo" → redireciona para `/settings/vehicles/:id/odometer-cycles`.

### 7.5 Fluxo Alternativo E — Manutenção Concluída Sem Odômetro

1. Usuário envia `PATCH /maintenances/:id` com `{ status: 'completed' }` sem `odometer_km`.
2. Schema Zod `superRefine` de `updateMaintenanceInputSchema` detecta violação de R-ODO-03.
3. Resposta HTTP 422 com `{ error: "Validation failed", fieldErrors: { odometer_km: ["Odômetro é obrigatório para conclusão de manutenção"] } }`.
4. No frontend, `MaintenanceForm` exibe o erro ao lado do campo `odometer_km` antes mesmo do submit (via validação client-side do mesmo schema Zod compartilhado).

---

## 8. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Latência adicional por operação (expenses + maintenances) incluindo chamada a `getActiveCycleStart` | P95 < 60 ms | `get_active_cycle_start()` é `SELECT MAX(started_at)` com índice em `(vehicle_id)`; deve ser < 5 ms. |
| RNF-02 | Zero regressão para veículos sem ciclo registrado | Comportamento idêntico ao pré-spec | `getActiveCycleStart` retorna `null` → `sinceDate` não é passado → query idêntica à atual. |
| RNF-03 | Ciclos são imutáveis após criação | Sem `UPDATE` ou `DELETE` via API ou RLS | RLS não cria policies de escrita retroativa; API não expõe endpoint de update/delete de ciclos. |
| RNF-04 | Ordem de deploy obrigatória | Funções SQL antes da UI de reset | Qualquer veículo com ciclo criado antes das funções SQL atualizadas corromperia analytics silenciosamente. |
| RNF-05 | Isolamento multi-tenant | `getActiveCycleStart` sempre filtra por `vehicle_id` de propriedade do usuário | `VehiclesService.findOne()` valida ownership antes de qualquer consulta de ciclo. |
| RNF-06 | `AuditService.log()` fire-and-forget | Falha no audit nunca propaga para a operação de criação de ciclo | R-MON-01: try/catch sem re-throw, erro apenas logado. |

---

## 9. Design e Interface

### 9.1 Tela de Configurações — Ciclos de Odômetro

**Rota sugerida:** `/settings/vehicles/[vehicleId]/odometer-cycles` (ou dentro da página de edição do veículo como aba "Histórico de Odômetro")

**Componentes:**
- Tabela `OdometerCycleTable`: colunas `Ciclo`, `Início`, `Valor inicial (km)`, `Máximo anterior (km)`, `Motivo`. Ordenação por `cycle_number ASC`.
- Botão "Reiniciar odômetro" (abre `OdometerResetModal`).
- `OdometerResetModal`: campos `starting_value` (número, default 0, obrigatório ≥ 0) e `reason` (textarea, obrigatório 3–500 chars). Botões "Confirmar" e "Cancelar". Dirty check padrão R-FORM-05.

**Estado vazio:** Quando não há ciclos, exibir card explicativo: "Nenhum reinício de odômetro registrado. Se o odômetro do veículo foi zerado (troca de painel, revenda, etc.), registre um novo ciclo para manter seus analytics precisos."

### 9.2 Badge de Ciclo no Chip

O chip de veículo (`VehicleContextChip`) recebe a prop `cycleNumber?: number` (obtida via query `GET /vehicles/:id/odometer-cycles?limit=1&order=cycle_number.desc` ou campo enriquecido no endpoint `GET /vehicles/:id`). Quando `cycleNumber >= 2`, renderiza um `<Badge>` secundário com texto "Ciclo {N}" em tom neutro (sem cor de alerta — é informativo, não crítico).

### 9.3 Mensagem de Warning de Odômetro

A mensagem de confirmação (RF-16) deve ser exibida em um `AlertDialog` (padrão R-FORM-05) com:
- Título: "Verificação de Odômetro"
- Corpo: texto exato de R-ODO-06 com valores formatados com `Intl.NumberFormat('pt-BR')`
- Ação primária: "Confirmar retroativo" (reenvio com `confirmed: true`)
- Ação secundária (quando RF-17 detecta reset): "Iniciar novo ciclo" (link/redirect)
- Ação terciária: "Cancelar" (fecha sem submeter)

---

## 10. Modelo de Dados

### 10.1 Nova Tabela

```sql
-- migration: supabase/migrations/20260711000000_vehicle_odometer_cycles.sql

CREATE TABLE vehicle_odometer_cycles (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid          NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  cycle_number    int           NOT NULL,
  started_at      timestamptz   NOT NULL DEFAULT now(),
  starting_value  int           NOT NULL DEFAULT 0,
  previous_cycle_max int,                               -- null apenas no 1º reset formal
  reason          text          NOT NULL,
  created_by      uuid          NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT check_cycle_number_gte_2 CHECK (cycle_number >= 2),
  CONSTRAINT check_starting_value_nonnegative CHECK (starting_value >= 0)
);

-- Índice para get_active_cycle_start()
CREATE INDEX idx_odometer_cycles_vehicle_started
  ON vehicle_odometer_cycles (vehicle_id, started_at DESC);

-- RLS
ALTER TABLE vehicle_odometer_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON vehicle_odometer_cycles
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)
  );

CREATE POLICY "owner_insert" ON vehicle_odometer_cycles
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)
    AND auth.uid() = created_by
  );

-- Sem UPDATE/DELETE — ciclos são imutáveis

-- Função helper reutilizada internamente pelas funções analíticas
CREATE OR REPLACE FUNCTION get_active_cycle_start(p_vehicle_id uuid)
RETURNS timestamptz
LANGUAGE sql STABLE
AS $$
  SELECT MAX(started_at)
  FROM vehicle_odometer_cycles
  WHERE vehicle_id = p_vehicle_id;
$$;
```

### 10.2 Extensão do Schema Zod de Manutenção

```typescript
// packages/validators/src/maintenance.schema.ts
// @spec SPEC-20260711-001 RF-01

export const updateMaintenanceInputSchema = baseMaintenanceSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.status === 'completed' && !data.odometer_km) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Odômetro é obrigatório para conclusão de manutenção',
        path: ['odometer_km'],
      });
    }
  });
```

### 10.3 Novo Schema Zod de Ciclo de Odômetro

```typescript
// packages/validators/src/odometer-cycles.schema.ts
// @spec SPEC-20260711-001 RF-11

export const createOdometerCycleInputSchema = z.object({
  starting_value: z.coerce.number().int().nonneg().default(0),
  reason: z.string().trim().normalize('NFC').min(3).max(500),
});
```

### 10.4 Entidades Modificadas

- `ExpenseRepositoryPort`: parâmetro `sinceDate?: string` em `findMaxOdometerByVehicle` (RF-12)
- `SupabaseExpenseRepository`: query estendida com `AND e.date >= sinceDate` quando `sinceDate` presente (RF-12)
- `MaintenanceRepositoryPort`: novo método `findMaxOdometerByVehicle` (RF-13)
- `SupabaseMaintenanceRepository`: implementação do novo método (RF-13)
- `ExpensesService`: consulta `OdometerCyclesService.getActiveCycleStart` antes do `findMaxOdometerByVehicle` (RF-14)
- `MaintenanceService`: idem (RF-15)

---

## 11. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| `VehiclesService.findOne()` | Obrigatória (já existente) | Verificação de ownership falha → 404; ciclo não é criado. |
| `AuditService.log()` | Fire-and-forget (R-MON-01) | Falha no audit não afeta criação do ciclo; apenas logada. |
| `OdometerCyclesService.getActiveCycleStart()` | Obrigatória (nova) | Se falhar, `ExpensesService` e `MaintenanceService` devem degradar graciosamente: tratar exceção, logar erro, e prosseguir sem `sinceDate` (comportamento pré-spec — nunca bloqueia o registro do usuário). |
| `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql` | Obrigatória (atualização) | Se não atualizada antes da UI de ciclos: analytics produz dados errados para veículos com reset. |
| `packages/validators/src/maintenance.schema.ts` | Obrigatória (atualização) | Se schema não for atualizado: R-ODO-03 não é enforced no frontend (mas o service ainda bloqueia no backend). |
| `apps/web/app/actions/maintenance-actions.ts` | Obrigatória (correção de bug) | Sem o fix do bug RF-03: `odometer_km` nunca chega ao backend via Server Actions, mesmo com o schema correto. |

---

## 12. Edge Cases e Tratamento de Erros

| ID | Cenário | Trigger | Comportamento esperado |
|----|---------|---------|----------------------|
| EC-01 | Veículo sem nenhum ciclo registrado | `get_active_cycle_start` retorna `null` | `sinceDate = undefined` → query sem filtro de data — comportamento idêntico ao pré-spec. Zero regressão. |
| EC-02 | Primeiro abastecimento após criação de novo ciclo | `sinceDate` definido, nenhum registro com `date >= sinceDate` | `findMaxOdometerByVehicle` retorna `null` → sem warning. Usuário pode registrar qualquer valor inicial sem obstáculo. |
| EC-03 | Múltiplos ciclos — busca do ciclo mais recente | Veículo com ciclos 2 e 3 | `get_active_cycle_start` retorna `MAX(started_at)` → aplica `started_at` do ciclo 3. Registros do ciclo 2 ficam invisíveis para validação do ciclo 3. |
| EC-04 | `started_at` do ciclo no futuro (não deve ocorrer mas deve ser tratado) | Relógio do servidor desatualizado | `started_at` é `now()` gerado pelo banco — dependência de relógio do Postgres, não do cliente. |
| EC-05 | Tentativa de criar segundo ciclo em menos de 1 minuto | Dois POSTs rápidos | Não há bloqueio por tempo entre ciclos nesta versão. Race condition improvável dado contexto de uso; idempotência garantida pelo `gen_random_uuid()`. |
| EC-06 | `OdometerCyclesService.getActiveCycleStart()` lança exceção | Falha no Supabase | `ExpensesService` / `MaintenanceService` capturam a exceção via try/catch, logam o erro (NestJS Logger), e continuam sem `sinceDate`. O registro do usuário nunca é bloqueado por falha no sistema de ciclos. |
| EC-07 | Expense com `date` anterior ao `started_at` do ciclo atual | Ex: lançamento retroativo de data `2026-06-01` após ciclo iniciado em `2026-07-01` | `date < sinceDate` → `findMaxOdometerByVehicle` retorna `null` para a janela do ciclo atual. O registro histórico é aceito sem warning (lançamento retroativo legítimo de período anterior ao ciclo). |
| EC-08 | Manutenção atualizada de `pending` para `completed` sem odômetro | `PATCH /maintenances/:id` com `{ status: 'completed' }` | HTTP 422 com `fieldErrors.odometer_km`. Usuário deve fornecer o odômetro para concluir (RF-01, RF-02). |
| EC-09 | Manutenção já `completed` sendo editada sem mudar odômetro | `PATCH /maintenances/:id` com apenas `{ notes: "..." }` | `status` não está mudando → `superRefine` não disparado (condicional `data.status === 'completed'` avalia o dado da payload, não o estado atual do banco). Sem regressão em edições parciais. |
| EC-10 | Usuário tenta criar ciclo para veículo de outro usuário | `POST /vehicles/:id/odometer-cycles` com `vehicleId` de outro usuário | `VehiclesService.findOne(vehicleId, userId)` retorna 404 (não expõe existência do veículo). |
| EC-11 | `previous_cycle_max` em `null` no primeiro reset formal | Veículo nunca teve registro de `odometer_km` antes do primeiro reset | `findMaxOdometerByVehicle` retorna `null` → `previous_cycle_max: null` na linha inserida. Permitido (coluna nullable). |

---

## 13. Segurança e Privacidade

- **Autenticação (S1):** `OdometerCyclesController` é protegido por `SupabaseAuthGuard` (padrão de todos os controllers da API).
- **Autorização (S2 + R-ODO-05):** RLS em `vehicle_odometer_cycles` com policy `owner_select` e `owner_insert` baseadas em `auth.uid() = vehicles.user_id`. `OdometerCyclesService` valida ownership via `VehiclesService.findOne()` antes do INSERT — dupla proteção (service + RLS).
- **Imutabilidade:** Ausência de policies `UPDATE` e `DELETE` no RLS; ausência de endpoints de modificação na API. Ciclos registrados são permanentes.
- **Dados sensíveis:** O campo `reason` é texto livre do usuário. Não contém PII estruturado, mas pode conter dados contextuais (ex: "Vendi o carro para João"). O campo é auditado via `AuditService` mas `R-MON-02` exige omissão de PII em `changes` — o `reason` deve ser omitido do payload do audit log, registrando apenas `{ table: 'vehicle_odometer_cycles', action: 'INSERT', record_id: id }`.
- **Proteção contra enumeração:** `GET /vehicles/:id/odometer-cycles` sem ownership retorna 404 (via `VehiclesService.findOne()`) — não 403 — para não revelar existência do veículo.
- **Cascata de exclusão (C1/LGPD):** `vehicle_odometer_cycles.vehicle_id` tem `ON DELETE CASCADE` — exclusão do veículo (R-VEH-01) apaga automaticamente todos os ciclos associados.

---

## 14. Plano de Rollout

**Estratégia:** Entrega em 3 fases sequenciais com janela de segurança entre a fase 1 e a fase 3.

| Fase | Entregável | Pré-requisito | Risco se pulada |
|------|-----------|--------------|-----------------|
| **Fase 1** | Migration `20260711000000_vehicle_odometer_cycles.sql` (tabela + RLS + `get_active_cycle_start` + funções analíticas atualizadas RF-18/RF-19/RF-20) | Nenhum | Funções analíticas corrompem dados após primeiro ciclo criado |
| **Fase 2** | Backend: `OdometerCyclesModule`, extensão de `findMaxOdometerByVehicle`, `MaintenanceService` com odômetro (RF-01..RF-15), correção do bug RF-03 | Fase 1 concluída | Sem impacto no usuário final (UI ainda não exposta) |
| **Fase 3** | Frontend: tela de Configurações (RF-22), badge de ciclo (RF-23), `MaintenanceForm` com odômetro obrigatório (RF-24), mensagens de warning (RF-16, RF-17) | Fases 1 e 2 concluídas | — |

**Rollback:**
- Fase 1 (migration): Requer rollback de migration. Script de `DROP TABLE vehicle_odometer_cycles CASCADE` + `CREATE OR REPLACE` das funções analíticas para versão anterior. Risco Alto — preparar script de rollback antes do deploy.
- Fase 2 (backend): Remoção de `OdometerCyclesModule` do `AppModule`; remoção do parâmetro `sinceDate` dos repositórios (mudança aditiva, zero breaking change). Risco Baixo.
- Fase 3 (frontend): Reverter componentes afetados. Risco Baixo.

**Monitoramento pós-deploy (Fase 1):**
- Verificar execução das funções `fuel_consumption_trend` e `calculate_vehicle_tco` para veículos existentes — resultados não devem mudar antes de qualquer ciclo ser criado (`get_active_cycle_start` retorna `null` → `COALESCE(..., '-infinity')` não filtra nada).
- Alertar se `get_active_cycle_start` consultas excederem 5 ms (índice deve garantir busca em O(log n)).

**Monitoramento pós-deploy (Fase 3):**
- Taxa de criações de ciclo por dia (esperado: muito baixa — evento raro).
- Taxa de warnings de odômetro com `confirmed: true` (deve manter baseline pré-spec para veículos sem ciclo).
- Manutenções 422 por `odometer_km` ausente (esperado: pico inicial, redução após usuários entenderem o novo campo obrigatório).

---

## 15. Open Questions

*Questões resolvidas pelo IMPACTO-025 e ADR-007 — ver seção 16 (Decision Log).*

---

## 16. Decisões Tomadas (Decision Log)

| ID | Decisão | Alternativas consideradas | Racional |
|----|---------|--------------------------|---------|
| D1 | Entidade separada `vehicle_odometer_cycles` (série temporal imutável) | (A) Campo único sobrescrito em `vehicles`; (B) reaproveitamento de `audit_logs` | A preserva histórico de N resets; B mantém `audit_logs` como log genérico, não fonte de verdade. ADR-007 detalha o racional completo. |
| D2 | Ciclo 1 implícito — nenhuma linha é criada até o primeiro reset | Criar linha de Ciclo 1 no cadastro do veículo | Evita migration retroativa de dados para todos os veículos existentes; comportamento é idêntico ao pré-spec quando `vehicle_odometer_cycles` está vazia. |
| D3 | `cycle_number` armazenado, calculado pelo service no INSERT via `MAX(cycle_number) + 1` | `cycle_number` computado via `ROW_NUMBER()` em query de leitura (não armazenado) | Armazenar simplifica leituras e elimina risco de inconsistência se linhas forem eventualmente arquivadas; a resolução A-03 do IMPACTO-025 optou por "calculado", que aqui significa "calculado no momento do INSERT e armazenado". |
| D4 | `sinceDate` como parâmetro opcional em `findMaxOdometerByVehicle` | Nova assinatura de método com ciclo como entidade de domínio | Parâmetro opcional é zero breaking change para callers existentes; mantém a interface mínima e testável sem acoplamento ao `OdometerCyclesService` dentro do repositório. |
| D5 | `OdometerCyclesService.getActiveCycleStart()` consultado no **Service** (não no Repository) | Repository consulta o ciclo diretamente | Resolução A-02 do IMPACTO-025: repositório deve ser stateless; a responsabilidade de compor o filtro de ciclo é do Service, não da camada de persistência. |
| D6 | Degradação graciosa quando `getActiveCycleStart()` falha — continua sem `sinceDate` | Bloquear a operação (retornar 503) | O sistema de ciclos é enriquecimento, não bloqueio. Falha no subsistema de ciclos não deve impedir registro de despesa/manutenção. |
| D7 | Limiar de "valor sugere reset": `≤ 100 km` OU `queda ≥ 50% do máximo` | Limiar fixo de `< 1000 km` ou baseado em percentil histórico | Valores escolhidos para cobrir os casos mais comuns de troca de painel (início em zero) e de venda/recompra (início em quilometragem baixa). Podem ser revisados com base em dados reais de uso. |
| D8 | `reason` omitido do payload do AuditService para evitar potencial PII | Registrar `reason` completo no audit log | R-MON-02 exige ausência de PII em `changes`. `reason` é texto livre e pode conter nomes ou outros dados contextuais. |
| D9 | Funções analíticas usam `COALESCE(get_active_cycle_start(p_vehicle_id), '-infinity'::timestamptz)` como filtro | Subconsulta inline sem `COALESCE` | `-infinity` garante que veículos sem ciclo nunca filtrem registros (equivalente a "sem filtro"), evitando lógica condicional dentro das funções SQL. |

---

## Apêndice

### Referências

- `docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md` — decisão arquitetural que esta spec formaliza
- `docs/architecture/decisions/ADR-001-expense-insertion-rules.md` — D2, soft-warning original estendido sem reverter
- `specs/expenses/SPEC-20260601-001-odometer-validation.md` — NG-04 fechado por esta spec
- `specs/expenses/SPEC-20260612-001-expense-form-ux-improvements.md` — origem de R-ODO-01
- `matrices/impacto.md` — IMPACTO-025, risco Alto, 11–14 dias, ambiguidades A-01/A-02/A-03 resolvidas
- `specs/RULES.md` — R-ODO-03, R-ODO-04, R-ODO-05, R-ODO-06 (já registrados)
- `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql` — funções a atualizar (RF-18, RF-19, RF-20)
- `supabase/migrations/20260615000000_vehicle_health_score_fn.sql` — sem impacto nesta fase (health score usa `vehicles.odometer` — débito técnico separado)

### Contexto para Agentes de IA

Ao implementar esta spec, respeite as seguintes diretrizes para manter consistência com o restante do projeto:

**Ordem obrigatória de implementação:**
1. Migration DB (RF-05, RF-06, RF-07) + atualização das funções analíticas (RF-18, RF-19, RF-20) — **antes de qualquer código de aplicação**.
2. Validators Zod (RF-01, RF-11) em `packages/validators/`.
3. Backend NestJS: `OdometerCyclesModule` (RF-08, RF-09, RF-10, RF-11), extensão de repositories (RF-12, RF-13), lógica de Services (RF-14, RF-15, RF-04).
4. Correção do bug de `maintenance-actions.ts` (RF-03).
5. Frontend: `MaintenanceForm` (RF-24) + tela de Configurações (RF-22) + badge (RF-23) + mensagens de warning (RF-16, RF-17).

**Padrão de Warning obrigatório (não alterar sem nova ADR):**
- `ExpenseWarningException` e o novo `MaintenanceWarningException` usam o padrão exception-based com `confirmed: true` (ADR-001/D2).
- Nunca retornar warning como campo no body 201 — manter consistência com `SPEC-20260601-001` Decision Log D6.

**Convenções de nomenclatura:**
- Método de repositório: `findMaxOdometerByVehicle` (não `findLastOdometer` nem `getMaxOdometer`).
- Parâmetros: `sinceDate?: string` (ISO 8601), `excludeExpenseId?: string`, `excludeMaintenanceId?: string`.
- Service interno: `OdometerCyclesService.getActiveCycleStart(vehicleId, userId): Promise<string | null>`.
- Exception: `MaintenanceWarningException` com shape `{ warning: 'ODOMETER_REGRESSION', last_km: number }`.

**TDD obrigatório (Red → Green → Refactor):**
- Iniciar pelos testes de schema (`packages/validators/src/maintenance.schema.spec.ts` — RF-01).
- `maintenance.service.spec.ts` — criar do zero todos os cenários de odômetro (zero cobertura atual).
- `supabase-maintenance.repository.spec.ts` — `findMaxOdometerByVehicle` com e sem `sinceDate`.
- `analytics.service.spec.ts` — ciclo ativo filtrado vs. sem ciclo (comportamento idêntico ao atual).
- Nomear describes com `RF-XX:` para requisitos e `EC-XX:` para edge cases (padrão do projeto).

**Rastreabilidade no código:**
- Anotar `// @spec SPEC-20260711-001 RF-XX` nos arquivos de implementação relevantes.
- `// valida R-ODO-03` no `superRefine` de `maintenance.schema.ts`.
- `// valida R-ODO-04` no `getActiveCycleStart` e nos ajustes de `findMaxOdometerByVehicle`.
- `// valida R-ODO-05` no `OdometerCyclesService.create()`.
- `// valida R-ODO-06` na lógica de detecção de reset no frontend.

**Atenção especial:**
- O bug RF-03 em `maintenance-actions.ts` é pré-existente e deve ser corrigido na mesma PR, não em separado. Adicionar teste de regressão.
- `calculate_vehicle_health` e `calculate_fleet_health` (migration `20260615000000`) usam `vehicles.odometer` (snapshot estático) — não são afetadas por ciclos nesta versão, mas registrar como débito técnico em comentário no código.

### Histórico de Revisões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-07-11 | douglps | Criação inicial; formaliza ADR-007 como spec de implementação |
| 1.1 | 2026-07-13 | douglps | Mudança pequena (clarificação, sem alterar requisitos): T2.4 implementou Fase 1 (já existente) + Fase 2 parcial (`OdometerCyclesModule`, RF-05 a RF-11) + Fase 3 parcial (tela de configurações, RF-22). RF-01 a RF-04, RF-12 a RF-17, RF-23 e RF-24 continuam ⏳ pois dependem dos módulos de despesas (Fase 3 do roadmap de implementação) e manutenções (Fase 4), que ainda não existem neste repositório greenfield — rastreado em `matrices/rastreabilidade.md`. `previous_cycle_max` foi calculado consultando `expenses.odometer_km` diretamente (não via `ExpenseRepositoryPort.findMaxOdometerByVehicle`, que não existe ainda) — mesmo resultado, implementação provisória a ser substituída quando o módulo de despesas for implementado. |

---

## Relatório de Avaliação de Qualidade

### Score Final: **93 / 100** — Excelente (pronta para implementação imediata)

#### Breakdown por Dimensão

| Dimensão | Peso | Pontos obtidos | Pontos possíveis | Observações |
|----------|------|---------------|-----------------|-------------|
| Completude | 30% | 29 | 30 | Todas as 16 seções preenchidas; 24 RFs com critérios de aceite; 6 non-goals explícitos; Decision Log com 9 entradas cobrindo todas as ambiguidades do IMPACTO-025 (A-01, A-02, A-03). Desconto mínimo: limiar de RF-17 (50% / 100 km) não tem baseline histórico — decisão D7 documenta a provisoriedade. |
| Testabilidade | 25% | 23 | 25 | 5 fluxos detalhados (happy path + 4 alternativos); 11 edge cases com trigger e comportamento; métricas numéricas presentes (P95 < 60 ms, 0% manutenções sem odômetro). Desconto: EC-09 (edição parcial de manutenção já completed) depende de comportamento do `superRefine` com payload parcial que requer validação na implementação. |
| Clareza | 20% | 19 | 20 | Sujeito claro em todos os RFs; parâmetros com tipos explícitos; distinção entre "calculado no INSERT" vs. "calculado em query" esclarecida em D3. Desconto mínimo: a rota sugerida para a tela de Configurações usa "sugerida" — pode requerer alinhamento com a estrutura de rotas existente. |
| Escopo | 15% | 14 | 15 | 6 non-goals que previnem scope creep real; ordem de deploy obrigatória documentada com consequências; débitos técnicos (`vehicles.odometer`, `calculate_vehicle_health`) explicitamente fora de escopo e referenciados. Desconto: rollback da Fase 1 marcado como "Risco Alto" sem detalhamento completo do script de reversão das funções analíticas. |
| Edge Cases | 10% | 9 | 10 | 11 edge cases cobrem: Ciclo 1 implícito, primeiro registro pós-ciclo, múltiplos ciclos, falha de serviço com degradação graciosa, lançamento retroativo de período anterior ao ciclo, manutenção em edição parcial, enumeração de veículos alheios. Desconto: EC-05 (dois POSTs simultâneos) menciona ausência de bloqueio temporal sem prescrever estratégia de deduplicação futura caso isso vire problema. |

#### Gaps Identificados

| Prioridade | Gap | Impacto |
|-----------|-----|---------|
| Baixo | Limiar de RF-17 (≤ 100 km e ≥ 50% de queda) documentado em D7 como provisório, sem baseline histórico | Pode gerar falsos positivos ou negativos; revisível com dados reais sem breaking change |
| Baixo | Rota exata da tela de Configurações marcada como "sugerida" — precisa de alinhamento com estrutura de rotas existente em `app/(dashboard)/` | Sem impacto funcional; apenas localização na árvore de arquivos |
| Baixo | Script de rollback das funções analíticas (Fase 1) não está escrito na spec — deve ser preparado antes do deploy | Risco operacional contido: funções são `CREATE OR REPLACE`, versão anterior deve ser preservada em controle de versão |
| Informativo | EC-09 depende de comportamento do `superRefine` com payload parcial (apenas `notes`, sem `status`) | Verificar na implementação se `data.status === 'completed'` avalia `undefined` corretamente quando `status` não está na payload; caso negativo, ajustar condição para `data.status !== undefined && data.status === 'completed'` |
