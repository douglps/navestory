# Entidades do Sistema — Nave SaaS

> Mapa canônico de todas as entidades do domínio, seus campos, relações e localização no código.
> Atualizar sempre que uma migração SQL nova for aplicada ou um módulo de domínio novo for criado.

---

## Ambientes Supabase

Este projeto possui dois projetos Supabase ativos com papéis distintos:

| Projeto | ID | Região | Criado em | Papel |
|---------|----|--------|-----------|-------|
| **Nave** | `sfkefpoanmoiagwxbwld` | `sa-east-1` | 2026-07-12 | Schema de referência, já higienizado (zero achados de segurança via `get_advisors`). Ainda sem dados de usuário. |
| **NaveSaaS** | `uetaprnvukgqtxlbfedk` | `sa-east-1` | — | Produção legada com 33 migrations aplicadas e dados reais. Achados críticos de segurança do IMPACTO-026 **ainda não corrigidos** neste projeto. Pendente decisão sobre migração de dados ou descomissionamento. |

O schema documentado neste arquivo reflete o estado do projeto **Nave** (referência). Quaisquer divergências do NaveSaaS são desvios legados, não o estado-alvo.

---

## Diagrama de Relações (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           auth.users (Supabase)                         │
│                    id UUID ──────────────────────────┐                  │
└──────────────────────────┬──────────────────────────┘│                  │
                           │ 1:1 (trigger)             │                  │
                           ▼                           │                  │
         ┌─────────────────────────────────────┐       │                  │
         │               PROFILES              │       │                  │
         │  id · name · profile_type           │       │                  │
         │  expense_categories[] · preferences │       │                  │
         └──┬──────────┬──────────┬─────┬──────┘       │                  │
            │ 1:N      │ 1:N      │ 1:N │ 1:1          │                  │
            ▼          ▼          ▼     ▼              │                  │
    ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────────┐      │
    │ VEHICLES │ │VEHICLE_  │ │ AUDIT_LOGS   │ │ USER_PREFERENCES │      │
    │          │ │ GROUPS   │ │              │ │ (1:1 com PROFILES│      │
    └──┬───────┘ └────┬─────┘ └──────────────┘ └──────────────────┘      │
       │ 1:N          │ N:M via                                            │
       │              │ vehicle_group_members                              │
    ┌──┼──────────────┘                                                    │
    │  │ vehicle_id FK                                                     │
    │  ├──────────────────┬──────────────────┬──────────────┐             │
    │  │                  │                  │              │             │
    ▼  ▼                  ▼                  ▼              ▼             │
 ┌──────────┐  ┌──────────────────┐  ┌──────────────┐ ┌────────────────┐ │
 │ EXPENSES │  │  MAINTENANCES    │  │    FINES     │ │VEHICLE_        │ │
 │ source_  │◄─┤ (ao concluir     │  │ (ao criar,   │ │ODOMETER_CYCLES │ │
 │ type/id  │◄─┤  com custo)      │  │ via source_  │ └────────────────┘ │
 │(ledger)  │  └──────────────────┘  │ type='fine') │                    │
 └──────────┘                        └──────────────┘                    │
      ▲                                                                    │
      │ source_type='recurring_cost' + source_id                          │
 ┌────┴──────────────────────┐                                             │
 │  VEHICLE_RECURRING_COSTS  │                                             │
 │ (vehicle_id FK → VEHICLES)│                                             │
 └───────────────────────────┘                                             │
                                                                            │
         ┌──────────────────────────────────────────────────────────────────┘
         │ user_id FK (profiles.id)
         ▼
 ┌──────────────────┐  ┌────────────┐  ┌────────────────┐  ┌───────────────┐
 │ EXPENSE_TEMPLATES│  │  DRIVERS   │  │   DOCUMENTS    │  │USER_CATEGORIES│
 │ (vehicle_id FK ──┼──→ VEHICLES) │  │ (entity_type / │  │(user_id FK →  │
 └──────────────────┘  └─────┬──────┘  │  entity_id)    │  │ profiles.id)  │
                              │ N:M     └────────────────┘  └───────────────┘
                              ▼
                    ┌──────────────────┐
                    │ VEHICLE_DRIVERS  │
                    │ (vehicle_id FK + │
                    │  driver_id FK)   │
                    └──────────────────┘
```

---

## Entidades Principais

### 1. PROFILES

Estende `auth.users` do Supabase. Criada automaticamente via trigger `handle_new_user()`.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | Vinculado a `auth.users(id)` |
| `name` | TEXT | não | Nome do usuário |
| `profile_type` | ENUM | não | `autonomous` · `small_fleet` · `large_fleet` |
| `expense_categories` | TEXT[] | sim | Categorias personalizadas do usuário |
| `preferences` | JSONB | não | Preferências da UI (default `{}`) |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | Atualizado automaticamente por trigger |
| `deleted_at` | TIMESTAMPTZ | sim | Soft delete + anonimização LGPD |

**Relações de saída:**

| Para | Cardinalidade | FK |
|------|--------------|----|
| VEHICLES | 1:N | `vehicles.user_id` |
| EXPENSES | 1:N | `expenses.user_id` |
| MAINTENANCES | 1:N | `maintenances.user_id` |
| FINES | 1:N | `fines.user_id` |
| VEHICLE_GROUPS | 1:N | `vehicle_groups.user_id` |
| EXPENSE_TEMPLATES | 1:N | `expense_templates.user_id` |
| AUDIT_LOGS | 1:N | `audit_logs.user_id` |
| VEHICLE_RECURRING_COSTS | 1:N | `vehicle_recurring_costs.user_id` |
| DRIVERS | 1:N | `drivers.user_id` |
| DOCUMENTS | 1:N | `documents.user_id` |
| USER_CATEGORIES | 1:N | `user_categories.user_id` |
| USER_PREFERENCES | 1:1 | `user_preferences.user_id` |

**Arquivos:** `apps/api/src/modules/users/entities/user.entity.ts` · `packages/validators/src/users.schema.ts`

---

### 2. VEHICLES

Entidade central do domínio. Todos os eventos (despesas, manutenções, multas) pertencem a um veículo.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | não | → profiles.id |
| `plate` | VARCHAR(10) | não | Placa Mercosul ou padrão BR |
| `make` | TEXT | sim | Fabricante (ex: Toyota) |
| `model` | TEXT | sim | Modelo (ex: Corolla) |
| `year` | INTEGER | sim | Ano de fabricação |
| `model_year` | INTEGER | sim | Ano do modelo |
| `nickname` | TEXT | sim | Apelido do veículo |
| `color` | TEXT | sim | — |
| `photo_url` | TEXT | sim | URL da imagem original |
| `photo_thumbnail_url` | TEXT | sim | URL do thumbnail |
| `photo_object_position` | TEXT | não | Default `center` |
| `photo_zoom` | NUMERIC | não | Default `1.0` |
| `odometer` | NUMERIC | sim | Quilometragem atual |
| `fuel_type` | ENUM | sim | Gasolina · Etanol · Flex · Diesel · Elétrico · Híbrido |
| `fuel_efficiency` | NUMERIC | sim | km/l médio |
| `fuel_liters_capacity` | NUMERIC | sim | Capacidade do tanque (litros) |
| `vehicle_type` | ENUM | sim | Carro · Moto · Caminhão · Ônibus · Utilitário · Outro |
| `status` | ENUM | não | `parking` · `workshop` · `accident` · `impounded` (default `parking`) |
| `renavam` | VARCHAR(11) | sim | — |
| `chassi` | VARCHAR(17) | sim | — |
| `fipe_code` | VARCHAR(8) | sim | Código FIPE (6–8 dígitos) |
| `fipe_updated_at` | TIMESTAMPTZ | sim | Data/hora da última consulta FIPE |
| `ipva_due_date` | DATE | sim | Vencimento do IPVA |
| `insurance_expires_at` | DATE | sim | Vencimento do seguro |
| `crlv_expires_at` | DATE | sim | Vencimento do CRLV |
| `engine_displacement_cc` | INTEGER | sim | Cilindrada (cc) |
| `engine_power_cv` | INTEGER | sim | Potência (cv) |
| `engine_torque_kgm` | NUMERIC | sim | Torque (kgf·m) |
| `engine_config` | TEXT | sim | Configuração do motor |
| `is_turbo` | BOOLEAN | não | Default `false` |
| `health_score` | INTEGER | sim | 0–100; calculado por `calculate_vehicle_health()`; `CHECK (health_score >= 0 AND health_score <= 100)` |
| `next_maintenance_km` | INTEGER | sim | Próxima manutenção em km |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |
| `deleted_at` | TIMESTAMPTZ | sim | Soft delete |

**Relações:**

| Para | Cardinalidade | FK |
|------|--------------|----|
| PROFILES | N:1 | `user_id` |
| EXPENSES | 1:N | `expenses.vehicle_id` |
| MAINTENANCES | 1:N | `maintenances.vehicle_id` |
| FINES | 1:N | `fines.vehicle_id` |
| VEHICLE_GROUPS | N:M | via `vehicle_group_members` |
| EXPENSE_TEMPLATES | 1:N | `expense_templates.vehicle_id` |
| VEHICLE_RECURRING_COSTS | 1:N | `vehicle_recurring_costs.vehicle_id` |
| VEHICLE_ODOMETER_CYCLES | 1:N | `vehicle_odometer_cycles.vehicle_id` |
| DRIVERS | N:M | via `vehicle_drivers` |

**Arquivos:** `apps/api/src/modules/vehicles/entities/vehicle.entity.ts` · `packages/validators/src/vehicles.schema.ts`

---

### 3. EXPENSES

Registro de qualquer gasto associado a um veículo.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | não | → profiles.id |
| `vehicle_id` | UUID FK | não | → vehicles.id |
| `category` | TEXT | não | fuel · maintenance · washing · toll · insurance · tax · parking · fine · other (ou categoria personalizada) |
| `amount` | NUMERIC(10,2) | não | Valor em R$ |
| `date` | DATE | não | Data do gasto |
| `description` | TEXT | sim | Observação livre |
| `odometer_km` | INTEGER | sim | Obrigatório quando `category = 'fuel'` (R4) |
| `liters` | NUMERIC | sim | Litros abastecidos (quando combustível) |
| `source_type` | TEXT | sim | Enum de origem: `fine` · `maintenance` · `recurring_cost` (e futuras origens). Quando não-nulo, despesa é gerida pelo ledger unificado (ADR-006). |
| `source_id` | UUID | sim | ID do registro de origem (`fines.id`, `maintenances.id`, `vehicle_recurring_costs.id`). Sem FK real no banco — integridade garantida por `ExpensesService` (R-LED-04). |
| `is_readonly` | BOOLEAN | não | `true` quando `source_type IS NOT NULL`; bloqueia PATCH e DELETE com 403 (R-LED-01). Default `false`. |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |
| `deleted_at` | TIMESTAMPTZ | sim | Soft delete |

**Índice de idempotência:** `UNIQUE INDEX uq_expenses_source (source_type, source_id) WHERE deleted_at IS NULL` — garante no máximo uma expense ativa por origem (R-HUB-02).

**Relações:** N:1 com PROFILES · N:1 com VEHICLES

**Módulos que escrevem no ledger via `ExpensesService.createFromSource()` / `softDeleteBySource()`:**
- `MaintenancesModule` — ao concluir manutenção com `cost IS NOT NULL` (`source_type = 'maintenance'`, R-LED-02)
- `FinesModule` — ao criar multa (`source_type = 'fine'`, R-LED-02)
- `RecurringCostsModule` — ao preencher `paid_at` em custo recorrente (`source_type = 'recurring_cost'`, R-LED-05)

**Arquivos:** `apps/api/src/modules/expenses/entities/expense.entity.ts` · `packages/validators/src/expenses.schema.ts`
**Migração (ledger):** `supabase/migrations/20260608000000_unified_ledger.sql`

---

### 4. MAINTENANCES

Manutenções agendadas ou realizadas em um veículo.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | não | → profiles.id |
| `vehicle_id` | UUID FK | não | → vehicles.id |
| `description` | TEXT | não | Serviço realizado ou a realizar |
| `scheduled_date` | DATE | não | Data prevista |
| `completion_date` | DATE | sim | Data de conclusão |
| `cost` | NUMERIC(12,2) | sim | Custo total |
| `status` | ENUM | não | `scheduled` · `in_progress` · `completed` · `cancelled` (default `scheduled`) |
| `odometer_km` | INTEGER | sim | Quilometragem no momento. **Obrigatório quando `status = 'completed'`** (R-ODO-03, fecha NG-04 de SPEC-20260601-001). |
| `alert_sent` | BOOLEAN | não | Default `false` |
| `metadata` | JSONB | não | Dados extras (default `{}`) |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |
| `deleted_at` | TIMESTAMPTZ | sim | Soft delete |

**Relações:** N:1 com PROFILES · N:1 com VEHICLES

**Nota (ledger):** ao transitar para `status = 'completed'` com `cost IS NOT NULL`, `MaintenancesModule` chama `ExpensesService.createFromSource()` gerando uma expense vinculada com `source_type = 'maintenance'` (R-LED-02). Cancelamento via `status = 'cancelled'` ou soft-delete propagam para a expense vinculada via `softDeleteBySource()` (R-LED-03, R-HUB-01).

**Arquivos:** `apps/api/src/modules/maintenance/entities/maintenance.entity.ts` · `packages/validators/src/maintenance.schema.ts`

---

### 5. FINES

Multas de trânsito associadas a um veículo.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | não | → profiles.id |
| `vehicle_id` | UUID FK | não | → vehicles.id |
| `auto_number` | TEXT | sim | Número do auto de infração |
| `description` | TEXT | não | Descrição da infração |
| `infraction_code` | TEXT | sim | Código CTB |
| `amount` | NUMERIC(10,2) | não | Valor original |
| `amount_with_discount` | NUMERIC(10,2) | sim | Valor com desconto (pagamento antecipado) |
| `occurred_at` | DATE | não | Data da infração |
| `due_date` | DATE | sim | Vencimento do pagamento |
| `paid_at` | DATE | sim | Data de quitação |
| `appeal_deadline` | DATE | sim | Prazo de recurso |
| `location` | TEXT | sim | Local da infração |
| `odometer_km` | INTEGER | sim | Quilometragem no momento |
| `driver_name` | TEXT | sim | Condutor identificado |
| `status` | ENUM | não | `pending` · `paid` · `appealing` · `cancelled` (default `pending`) |
| `notes` | TEXT | sim | Observações |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |
| `deleted_at` | TIMESTAMPTZ | sim | Soft delete |

**Relações:** N:1 com PROFILES · N:1 com VEHICLES

**Nota (ledger):** ao criar uma multa (`POST /fines`), `FinesModule` chama `ExpensesService.createFromSource()` gerando automaticamente uma expense vinculada com `source_type = 'fine'` — usando `amount_with_discount` quando disponível (R-LED-02). Soft-delete da multa propaga para a expense vinculada via `softDeleteBySource()` (R-HUB-01).

**Migração:** `supabase/migrations/20260601000000_vehicle_documents_and_fines.sql`

---

### 6. VEHICLE_GROUPS

Agrupamento lógico de veículos para visualização agregada (frotas, categorias operacionais).

**Tabela `vehicle_groups`:**

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | não | → profiles.id |
| `name` | TEXT | não | 1–60 caracteres |
| `color` | TEXT | não | Hex 6 dígitos (ex: `#6366f1`) |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |

**Tabela `vehicle_group_members` (join N:M):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `group_id` | UUID FK | → vehicle_groups.id (CASCADE DELETE) |
| `vehicle_id` | UUID FK | → vehicles.id (CASCADE DELETE) |

PK composta: `(group_id, vehicle_id)`

**Relações:** N:1 com PROFILES · N:M com VEHICLES

**Arquivos:** `packages/validators/src/vehicle-groups.schema.ts`
**Migração:** `supabase/migrations/20260601100000_vehicle_groups.sql`

---

### 7. EXPENSE_TEMPLATES

Modelos de lançamento rápido de despesas (máximo 20 por usuário).

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | não | → profiles(id) (padrão de consistência com demais tabelas; era `auth.users(id)` na versão anterior — corrigido no projeto Nave) |
| `vehicle_id` | UUID FK | não | → vehicles.id |
| `name` | TEXT | não | 1–60 caracteres |
| `category` | TEXT | não | Mesmas categorias de EXPENSES |
| `amount` | NUMERIC(10,2) | não | > 0 |
| `description` | TEXT | sim | Máx. 255 caracteres |
| `liters` | NUMERIC(6,2) | sim | > 0 (quando combustível) |
| `last_used_at` | TIMESTAMPTZ | não | Default `now()` |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |

**Relações:** N:1 com PROFILES · N:1 com VEHICLES

**Limite:** trigger bloqueia inserção acima de 20 templates por usuário

**Arquivos:** `apps/api/src/modules/expense-templates/entities/expense-template.entity.ts` · `packages/validators/src/expense-templates.schema.ts`
**Migração:** `packages/database/src/supabase/migrations/005_expense_templates.sql`

---

### 8. AUDIT_LOGS

Log imutável de mutações para compliance (C2 — audit log em mutações).

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | sim | → profiles.id (CASCADE DELETE; nullable para ações de sistema) |
| `action` | TEXT | não | `CREATE` · `UPDATE` · `DELETE` · `SOFT_DELETE` |
| `table_name` | TEXT | não | Tabela afetada |
| `record_id` | UUID | não | ID do registro modificado |
| `changes` | JSONB | sim | Diff estrutural — sem PII |
| `created_at` | TIMESTAMPTZ | não | — |

**Relações:** N:1 com PROFILES (nullable)

**Nota LGPD:** Logs são preservados quando um usuário é deletado (user_id torna-se NULL via `ON DELETE SET NULL`).

**Migração:** `supabase/migrations/20260310000000_init_schema_and_rls.sql` · `20260314000000_audit_and_security_fixes.sql`

---

### 9. VEHICLE_RECURRING_COSTS

Custos anuais recorrentes por veículo (IPVA, CRLV, seguro, outros). Ao ser pago (`paid_at` preenchido), gera automaticamente uma expense vinculada no ledger unificado com `source_type = 'recurring_cost'` (R-LED-05). Soft-delete propaga para a expense vinculada (R-HUB-01). Atende R-REC-01 e R-REC-02.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | — |
| `user_id` | UUID FK | não | → profiles.id |
| `vehicle_id` | UUID FK | não | → vehicles.id |
| `cost_type` | ENUM | não | `ipva` · `crlv` · `insurance` · `other` |
| `year` | INTEGER | não | Ano de referência (ex: 2026) |
| `amount` | NUMERIC(10,2) | não | Valor em R$ |
| `due_date` | DATE | não | Data de vencimento |
| `paid_at` | DATE | sim | Data de quitação; quando preenchido pela primeira vez, dispara `createFromSource()` |
| `expense_id` | UUID | sim | ID da expense vinculada no ledger; preenchido após `createFromSource()` |
| `notes` | TEXT | sim | Observações livres |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |
| `deleted_at` | TIMESTAMPTZ | sim | Soft delete; propaga soft-delete à expense vinculada (R-HUB-01) |

**Constraint único:** `(vehicle_id, cost_type, year)` — máximo um registro ativo por veículo, tipo e ano (R-REC-01). Retorna 409 ao violar.

**Mapeamento cost_type → categoria de expense:**

| cost_type | category em expense |
|-----------|---------------------|
| `ipva` | `tax` |
| `crlv` | `tax` |
| `insurance` | `insurance` |
| `other` | `other` |

**Relações:** N:1 com PROFILES · N:1 com VEHICLES

**RLS:** `auth.uid() = user_id` (S2).

**Spec:** `specs/expenses/SPEC-20260609-001-recurring-costs-crud.md`
**Migração:** `supabase/migrations/20260608000000_unified_ledger.sql`

---

### 10. VEHICLE_ODOMETER_CYCLES

Série temporal imutável de marcos de reinício do odômetro de um veículo (troca de painel, revenda, correção de digitação em cascata). Cada linha representa um novo ciclo formal, identificado por `cycle_number >= 2`. O Ciclo 1 é implícito: nenhuma linha é criada para ele — ausência de linhas para um `vehicle_id` mantém comportamento idêntico ao pré-ADR-007 (R-ODO-06). Apenas o dono do veículo pode criar ciclos (R-ODO-05). Registros são imutáveis após criação (sem policy de UPDATE/DELETE no RLS).

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | `DEFAULT gen_random_uuid()` |
| `vehicle_id` | UUID FK | não | → vehicles(id) ON DELETE CASCADE |
| `cycle_number` | INTEGER | não | Calculado no INSERT: `MAX(cycle_number) + 1`; constraint `CHECK (cycle_number >= 2)` |
| `started_at` | TIMESTAMPTZ | não | Timestamp de início do ciclo (`DEFAULT now()`) |
| `starting_value` | INTEGER | não | Valor de odômetro no início do ciclo (geralmente 0); `DEFAULT 0`; constraint `>= 0` |
| `previous_cycle_max` | INTEGER | sim | Máximo registrado no ciclo anterior, para auditoria; `null` quando o veículo nunca teve registros de odômetro antes do reset |
| `reason` | TEXT | não | Motivo do reset (mín. 3, máx. 500 caracteres; obrigatório) |
| `created_by` | UUID FK | não | → auth.users(id) |
| `created_at` | TIMESTAMPTZ | não | `DEFAULT now()` |

**Índice:** `idx_odometer_cycles_vehicle_started ON (vehicle_id, started_at DESC)` — otimiza `get_active_cycle_start()`.

**RLS:**
- `owner_select`: `auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)`
- `owner_insert`: idem + `auth.uid() = created_by`
- Sem policy UPDATE ou DELETE — ciclos são imutáveis.

**Impacto em funções analíticas:** `findMaxOdometerByVehicle` (expenses e maintenances), `fuel_consumption_trend`, `get_vehicle_cost_per_km` e `calculate_vehicle_tco` filtram por `date >= started_at` do ciclo mais recente (via `get_active_cycle_start(vehicle_id)`). Veículos sem linha nesta tabela não sofrem nenhuma alteração de comportamento (R-ODO-04).

**Relações:** N:1 com VEHICLES

**ADR:** `docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md`
**Spec:** `specs/vehicles/SPEC-20260711-001-odometer-cycles.md`
**Migração:** `supabase/migrations/20260711000000_vehicle_odometer_cycles.sql`

---

### 11. DRIVERS

Motoristas cadastrados por um usuário, usados para identificação de condutor em multas e atribuição a veículos.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | `DEFAULT gen_random_uuid()` |
| `user_id` | UUID FK | não | → profiles.id |
| `name` | TEXT | não | Nome completo do motorista |
| `legal_id` | TEXT | sim | CPF ou documento |
| `phone` | TEXT | sim | Telefone de contato |
| `email` | TEXT | sim | Email do motorista |
| `cnh_number` | TEXT | sim | Número da CNH |
| `cnh_category` | TEXT | sim | Categoria da CNH (A, B, AB etc.) |
| `cnh_expires_at` | DATE | sim | Vencimento da CNH |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |
| `deleted_at` | TIMESTAMPTZ | sim | Soft delete |

**Relações:**

| Para | Cardinalidade | FK |
|------|--------------|----|
| PROFILES | N:1 | `user_id` |
| VEHICLE_DRIVERS | 1:N | `vehicle_drivers.driver_id` |

**RLS:** owner-only (`(select auth.uid()) = user_id`).

---

### 12. VEHICLE_DRIVERS

Tabela de junção N:M entre veículos e motoristas. Um veículo pode ter múltiplos motoristas; um motorista pode operar múltiplos veículos. O campo `is_primary` identifica o motorista principal do veículo.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `vehicle_id` | UUID FK | não | → vehicles.id |
| `driver_id` | UUID FK | não | → drivers.id |
| `is_primary` | BOOLEAN | não | Indica motorista principal do veículo (default `false`) |
| `created_at` | TIMESTAMPTZ | não | — |

**PK composta:** `(vehicle_id, driver_id)`

**Relações:**

| Para | Cardinalidade | FK |
|------|--------------|----|
| VEHICLES | N:1 | `vehicle_id` |
| DRIVERS | N:1 | `driver_id` |

**RLS:** via dono do veículo (`(select auth.uid()) = (SELECT user_id FROM vehicles WHERE id = vehicle_id)`).

---

### 13. DOCUMENTS

Documentos digitalizados vinculados a usuários, veículos ou motoristas (apólices, CRLVs, CNHs, contratos etc.).

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | `DEFAULT gen_random_uuid()` |
| `user_id` | UUID FK | não | → profiles.id |
| `entity_type` | TEXT | não | `CHECK (entity_type IN ('user', 'vehicle', 'driver'))` |
| `entity_id` | UUID | não | ID da entidade vinculada (veículo, motorista ou perfil) |
| `document_type` | TEXT | não | Tipo do documento (ex: `crlv`, `cnh`, `apolice`) |
| `file_name` | TEXT | não | Nome original do arquivo |
| `file_url` | TEXT | não | URL de acesso ao arquivo no Storage |
| `file_size` | INTEGER | sim | Tamanho em bytes |
| `mime_type` | TEXT | sim | MIME type do arquivo |
| `expires_at` | DATE | sim | Data de vencimento do documento |
| `metadata` | JSONB | não | Dados extras (default `{}`) |
| `created_at` | TIMESTAMPTZ | não | — |
| `updated_at` | TIMESTAMPTZ | não | — |

**Relações:**

| Para | Cardinalidade | FK |
|------|--------------|----|
| PROFILES | N:1 | `user_id` |

**RLS:** owner-only (`(select auth.uid()) = user_id`).

---

## USER_CATEGORIES — Mecanismo Dual (array legado + tabela real)

Esta entidade existe em dois mecanismos que convivem no schema atual:

### Mecanismo 1 — Array em `profiles` (legado, documentado originalmente)

Categorias personalizadas armazenadas no array `profiles.expense_categories[]`. Não possui tabela própria. Documentado no ADR-003.

**Categorias padrão do sistema (imutáveis):**
`fuel` · `maintenance` · `washing` · `toll` · `insurance` · `tax` · `parking` · `fine` · `other`

### Mecanismo 2 — Tabela `user_categories` (mecanismo real, aplicado no projeto Nave)

A tabela `user_categories` é o mecanismo real usado pela aplicação. Convive com o array em `profiles.expense_categories[]`, que permanece por compatibilidade.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `id` | UUID PK | não | `DEFAULT gen_random_uuid()` |
| `user_id` | UUID FK | não | → profiles.id (ON DELETE CASCADE — conformidade LGPD C1) |
| `value` | TEXT | não | Slug da categoria; `CHECK (value ~ '^[a-z0-9_-]+$')`; UNIQUE por `(user_id, value)` |
| `label` | TEXT | não | Rótulo legível (ex: `Pedágio`) |
| `created_at` | TIMESTAMPTZ | não | — |

**RLS:** owner-only (`(select auth.uid()) = user_id`).

**Referência:** ADR-003 (domínio — decisão original de categorias por usuário) · `packages/validators/src/categories.schema.ts`

> **Nota de implementação:** o ADR-003 documenta a decisão de domínio (categorias por usuário), mas foi originalmente implementado apenas com o array em `profiles`. A tabela `user_categories` é a implementação real adotada de fato, e é o mecanismo canônico no projeto Nave. Futuras decisões arquiteturais devem avaliar se o array em `profiles.expense_categories[]` pode ser descontinuado.

---

### 14. USER_PREFERENCES

Preferências de exibição por usuário (relação 1:1 com PROFILES). Controla campos visíveis no chip de veículo e comportamento do rascunho automático de formulários.

| Campo | Tipo | Nulável | Descrição |
|-------|------|---------|-----------|
| `user_id` | UUID PK FK | não | → profiles.id (relação 1:1; ON DELETE CASCADE — LGPD C1) |
| `vehicle_chip_fields` | TEXT[] | não | Campos exibidos no chip do veículo; `CHECK (array_length(...) >= 1)`; default `'{make,plate,model}'` |
| `auto_draft_enabled` | BOOLEAN | não | Habilita rascunho automático em formulários; default `false` |
| `updated_at` | TIMESTAMPTZ | não | — |

**RLS:** owner-only (`(select auth.uid()) = user_id`).

**Relações:** 1:1 com PROFILES.

**Referência:** SPEC-20260603-003 · SPEC-20260612-003 · IMPACTO-012 · IMPACTO-023

---

## Enums do Sistema

| Enum | Valores | Tabela |
|------|---------|--------|
| `profile_type` | `autonomous` · `small_fleet` · `large_fleet` | profiles |
| `vehicle_type` | `Carro` · `Moto` · `Caminhão` · `Ônibus` · `Utilitário` · `Outro` | vehicles |
| `fuel_type` | `Gasolina` · `Etanol` · `Flex` · `Diesel` · `Elétrico` · `Híbrido` | vehicles |
| `vehicle_status` | `parking` · `workshop` · `accident` · `impounded` | vehicles |
| `maintenance_status` | `scheduled` · `in_progress` · `completed` · `cancelled` | maintenances |
| `fine_status` | `pending` · `paid` · `appealing` · `cancelled` | fines |
| `recurring_cost_type` | `ipva` · `crlv` · `insurance` · `other` | vehicle_recurring_costs |
| `expense_source_type` | `fine` · `maintenance` · `recurring_cost` (CHECK constraint) | expenses |

---

## Funções Stored no Banco

| Função | Propósito | Acionamento |
|--------|-----------|------------|
| `update_updated_at_column()` | Atualiza `updated_at` automaticamente | Trigger BEFORE UPDATE em todas as tabelas |
| `handle_new_user()` | Cria perfil ao registrar usuário no Auth | Trigger AFTER INSERT em `auth.users` |
| `soft_delete_profile()` | Anonimiza perfil deletado (LGPD) | Trigger BEFORE DELETE em `profiles` |
| `set_vehicle_soft_delete()` | Propaga soft delete aos veículos | Trigger na deleção de veículos |
| `get_vehicle_cost_per_km(vehicle_id, month_start)` | Calcula custo por km no mês, **filtrado pelo ciclo ativo** via `get_active_cycle_start` (R-ODO-04, ADR-007) | RPC — chamada explícita |
| `calculate_vehicle_health(vehicle_id)` | Retorna health_score (0–100) e flags de alerta | RPC — chamada explícita |
| `get_active_cycle_start(p_vehicle_id uuid)` | Retorna `MAX(started_at)` de `vehicle_odometer_cycles` para o veículo, ou `NULL` quando nenhum ciclo existe (Ciclo 1 implícito). Usado internamente por `findMaxOdometerByVehicle`, `fuel_consumption_trend`, `get_vehicle_cost_per_km` e `calculate_vehicle_tco` (R-ODO-04). | Função SQL STABLE — chamada interna por outras funções e por `OdometerCyclesService` |
| `fuel_consumption_trend(vehicle_id, limit)` | Tendência de consumo km/L com rolling average, **filtrada pelo ciclo ativo** via `get_active_cycle_start` (R-ODO-04, ADR-007) | RPC — chamada explícita |
| `calculate_vehicle_tco(vehicle_id)` | TCO com breakdown por categoria, `cost_per_km` e `cost_per_month`, **filtrados pelo ciclo ativo** — `total_km` reflete apenas o ciclo mais recente (R-ODO-04, ADR-007) | RPC — chamada explícita |

`calculate_vehicle_health` considera: manutenções vencidas/pendentes · documentos expirando em 30 dias (IPVA/Seguro/CRLV) · multas pendentes. Usa `vehicles.odometer` (snapshot estático) — não é afetado por ciclos de odômetro nesta versão (débito técnico documentado na SPEC-20260711-001).

**Migração das funções analíticas (ADR-007):** `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql` (atualizada com filtro de ciclo) · `supabase/migrations/20260711000000_vehicle_odometer_cycles.sql` (cria `get_active_cycle_start`). A atualização das funções analíticas deve preceder a liberação da UI de criação de ciclos (R-ODO-04, SPEC-20260711-001 §14).

---

## Padrões Transversais

| Padrão | Aplica-se a | Referência |
|--------|------------|-----------|
| Soft delete (`deleted_at`) | Todas as entidades principais | R5 · ADR (todos) |
| RLS `auth.uid() = user_id` | Todas as tabelas | S2 · ADR-002 (infra) |
| Timestamps automáticos | Todas as tabelas | Trigger `update_updated_at_column` |
| Validação Zod | Todos os campos expostos via API | `@nave/validators` |
| Audit trail | Mutações em todas as tabelas | C2 · ADR-005 (domínio) |
