# Schema de Banco de Dados — Nave SaaS

> **Fonte de verdade real, validada contra o banco.** A Tarefa T0.2 auditou o projeto Supabase `Nave` (`sfkefpoanmoiagwxbwld`) em 2026-07-13 e trouxe as 16 migrations já aplicadas para `supabase/migrations/` — esse diretório é agora a fonte canônica de DDL (colunas, constraints, triggers, RLS). Este documento adiciona a camada de significado de negócio (regras R/S/P/C, referência de spec) em cima do schema real; ele não substitui a leitura das migrations quando o detalhe exato de uma coluna importar.

**Última atualização:** 2026-07-13 (T0.2 — auditoria e correção pós-divergência)  
**Referências canônicas:** `supabase/migrations/`, `docs/architecture/decisions/`, `specs/`, `specs/RULES.md`

---

## Visão geral das entidades

O projeto possui **13 entidades** organizadas em torno do veículo como agregado raiz. Toda tabela de domínio aplica RLS com a policy padrão `(select auth.uid()) = user_id` (regra S2).

> **Correção T0.2 (2026-07-13):** as entidades `drivers`, `vehicle_drivers` e `documents` haviam sido implementadas diretamente no Supabase sem spec aprovada em `specs/`. Por decisão de douglps, foram removidas via `supabase/migrations/20260713173240_drop_unspecced_driver_document_tables.sql`. Se essas features forem retomadas, precisam nascer de uma spec aprovada (gate de sincronia do `.claude/CLAUDE.md`), não retornar direto como migration.

```
auth.users (Supabase Auth)
    └── profiles          (1:1 com auth.users)
    └── vehicles          (N por usuário)
            └── expenses                  (N por veículo)
            └── maintenances              (N por veículo)
            └── fines                     (N por veículo)
            └── vehicle_recurring_costs   (N por veículo)
            └── vehicle_odometer_cycles   (N por veículo)
            └── vehicle_group_members     (M:N via vehicle_groups)
    └── expense_templates (N por usuário)
    └── user_categories   (N por usuário)
    └── user_preferences  (1:1 por usuário)
    └── audit_logs        (N por usuário — user_id SET NULL em exclusão)
    └── vehicle_groups    (N por usuário)
```

---

## Padrões transversais

| Padrão | Descrição |
|--------|-----------|
| Soft Delete | Campo `deleted_at TIMESTAMPTZ` em todas as entidades de domínio; `IS NULL` = ativo |
| RLS multi-tenant | `(SELECT auth.uid()) = user_id` em todas as políticas (forma otimizada — regra P4) |
| Auditoria | Toda mutação relevante registra entrada em `audit_logs` (regra C2) |
| UUID como PK | Todas as PKs são `uuid DEFAULT gen_random_uuid()` |
| Timestamps | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ` (atualizado por trigger) |

---

## Tabelas

### `profiles`

Extensão de `auth.users` (1:1). Criada via trigger `on_auth_user_created` → `handle_new_user()` no `INSERT` em `auth.users`.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK, FK → `auth.users.id` ON DELETE CASCADE |
| `name` | TEXT | sim | Nome completo (populado do `raw_user_meta_data->>'full_name'` ou email no signup) |
| `profile_type` | `profile_type` (enum) | sim | `autonomous` (padrão), `small_fleet` ou `large_fleet` |
| `expense_categories` | TEXT[] | não | Categorias de despesa customizadas do usuário (legado — ver também `user_categories`, que é o mecanismo atual de ADR-003) |
| `preferences` | JSONB | sim | Default `{}` |
| `deleted_at` | TIMESTAMPTZ | não | Soft-delete via trigger `soft_delete_profile()` (anonimiza `name`/`preferences`) |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | sim | — |

**RLS:** `(select auth.uid()) = id`

> **Colunas de billing planejadas, ainda não implementadas no banco:** `plan`, `trial_ends_at`, `terms_accepted_at`, `is_banned` (R-BIZ-03/06/07) pertencem à spec de monetização `SPEC-20260620-001`, que está em `draft` (Fase 9 do roadmap, imatura — ver `docs/IMPLEMENTATION_STRATEGY.md`). Não existem em `supabase/migrations/` até 2026-07-13; não assumir que estão disponíveis.

---

### `vehicles`

Agregado raiz de todo o domínio operacional.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `plate` | VARCHAR(10) | sim | Nome real da coluna é `plate` (não `license_plate` — corrigido em T0.2 após divergência com o banco); normalização uppercase/sem hífens é responsabilidade da camada de aplicação (R-VEH-02) |
| `make` | TEXT | não | Marca (ex: Toyota) |
| `model` | TEXT | não | Modelo (ex: Corolla) |
| `year` | INTEGER | não | Ano do modelo |
| `vehicle_type` | `vehicle_type` (enum) | sim | `carro` (padrão), `moto`, `caminhao`, `onibus`, `utilitario`, `outro` |
| `nickname` | TEXT | não | Apelido do veículo, máx 50 chars (R-DISP-02) |
| `color` | TEXT | não | Cor |
| `model_year` | INTEGER | não | Ano de fabricação (distinto do ano do modelo) |
| `photo_url` | TEXT | não | URL da foto de capa |
| `photo_thumbnail_url` | TEXT | não | URL da miniatura |
| `photo_object_position` | TEXT | sim | Default `'center'` |
| `photo_zoom` | FLOAT8 | sim | Default `1.0` |
| `odometer` | NUMERIC | não | Snapshot estático do odômetro (desconectado de `vehicle_odometer_cycles` — deliberado, ver ADR-007) |
| `fuel_type` / `favorite_fuel_type` | TEXT | não | Enum de fato via CHECK (`gasoline`, `gasoline_premium`, `ethanol`, `diesel`, `diesel_s10`, `gnv`, `electric`, `hybrid`); `favorite_fuel_type` é usado para pré-preenchimento (R-FUEL-07) |
| `fuel_efficiency` / `fuel_liters_capacity` / `fuel_liters_current` / `fuel_level` | NUMERIC/INTEGER | não | Dados de combustível — capacidade, nível e eficiência estimada |
| `status` | `vehicle_operational_status` (enum) | sim | `parking` (padrão), `workshop`, `accident` ou `impounded` |
| `ipva_due_date` / `insurance_expires_at` / `crlv_expires_at` | DATE | não | Vencimentos usados em R-REC-02 |
| `renavam` | VARCHAR(11) | não | RENAVAM (sanitizado: R-SAN-03) |
| `chassi` | VARCHAR(17) | não | Número do chassi (sanitizado: R-SAN-03) |
| `fipe_code` / `fipe_updated_at` | TEXT/TIMESTAMPTZ | não | Código FIPE e data da última consulta |
| `engine_*`, `brake_*`, `suspension_type`, `steering_type`, `cooling_type`, `tire_size`, `transmission`, `drive_type`, `is_turbo`, `weight_*_kg`, `dimension_*_mm`, `oil_capacity_l` | vários | não | Ficha técnica detalhada do veículo — colunas existem no banco mas não são cobertas por nenhuma regra R/S/P/C até 2026-07-13; ver `supabase/migrations/20260712171830_core_tables.sql` para a lista exata |
| `health_score`, `eco_score`, `current_level`, `current_xp`, `max_xp`, `streak_days`, `achievements`, `next_maintenance_km` | vários | não | Campos de gamificação/health score, computados por `calculate_vehicle_health()` — ver seção Funções armazenadas |
| `deleted_at` | TIMESTAMPTZ | não | Soft-delete via trigger `set_vehicle_soft_delete()` (também anonimiza `plate` para `'DELETED'`); cascata para `expenses` e `maintenances` vinculados (R-VEH-01) |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | sim | — |

**RLS:** `(select auth.uid()) = user_id`  
**Unicidade de placa:** não há `UNIQUE` constraint em `(user_id, plate)` no banco atual — se R-VEH-02 exige placa única por usuário, isso precisa virar uma migration própria antes de ser considerado garantido pelo banco (hoje a garantia, se existir, é só a nível de aplicação).

---

### `expenses`

Fonte central do ledger financeiro unificado (ADR-006). Contém lançamentos manuais e despesas geradas automaticamente por outros módulos.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `vehicle_id` | UUID | sim | FK → `vehicles.id` |
| `category` | TEXT | sim | Categoria da despesa (padrão ou personalizada — R-CAT-02) |
| `amount` | NUMERIC(10,2) | sim | Valor entre 0,01 e 100.000.000,00 (R-EXP-01) |
| `date` | DATE | sim | Data da despesa |
| `odometer_km` | INTEGER | não | Obrigatório se `category = fuel` (R4); máx 9.999.999 (R-ODO-02) |
| `description` | TEXT | não | Observações — a coluna real chama-se `description`, não `notes` (`.trim()` + `.normalize('NFC')` — R-SAN-01, R-SAN-02) |
| `fuel_type` | TEXT | não | Enum `FuelType` quando `category = fuel` (R-FUEL-01) |
| `liters` | NUMERIC | não | Litros abastecidos |
| `full_tank` | BOOLEAN | não | Tri-state: `true` / `false` / `null` (R-FUEL-06) |
| `supplier` | TEXT | não | Fornecedor de combustível, máx 100 chars (R-FUEL-04) |
| `source_type` | TEXT | não | Origem polimórfica: `maintenance`, `fine` ou `recurring_cost` (ADR-006) |
| `source_id` | UUID | não | ID do registro de origem (ADR-006) |
| `is_readonly` | BOOLEAN | não | `true` quando `source_type IS NOT NULL` — PATCH/DELETE retornam 403 (R-LED-01) |
| `deleted_at` | TIMESTAMPTZ | não | Soft-delete |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | não | — |

**RLS:** `(select auth.uid()) = user_id`

**Constraints reais (verificadas em `supabase/migrations/`):**
- `expenses_source_coherence_check`: `source_type` e `source_id` devem ser definidos juntos ou ambos nulos (R-LED-04)
- `uq_expenses_source`: UNIQUE INDEX PARCIAL `(source_type, source_id) WHERE deleted_at IS NULL` — máx uma expense ativa por origem (R-HUB-02)
- `idx_expenses_user_id`, `idx_expenses_vehicle_id`: índices de cobertura de FK (IMPACTO-026)

> Os índices `idx_expenses_dup_check` e `idx_expenses_odometer` citados em versão anterior deste documento **não existem** em nenhuma migration aplicada — eram aspiracionais. Se a detecção de duplicata (R-HUB, SPEC-20260601-002) e a validação de sequência de odômetro (SPEC-20260601-001) precisarem desses índices para performance, isso é trabalho pendente da Fase 3, não algo já implementado.

**Campos calculados (nunca persistidos):** `computed.km_per_liter` (R-FUEL-02), `computed.price_per_liter` (R-FUEL-03), `duplicate_warning`, `duplicate_id`, `odometer_warning`, `last_odometer_km` — retornados apenas nas respostas de criação (ADR-001).

---

### `expense_templates`

Templates reutilizáveis de despesas (R3, R6).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `vehicle_id` | UUID | sim | FK → `vehicles.id` — obrigatório no banco (não opcional como versão anterior deste doc indicava) |
| `name` | TEXT | sim | Nome do template (1–60 chars) |
| `category` | TEXT | sim | Categoria pré-preenchida |
| `amount` | NUMERIC(10,2) | sim | Valor padrão, `> 0` |
| `description` | TEXT | não | Observações — a coluna real chama-se `description`, não `notes` (máx 255 chars) |
| `liters` | NUMERIC(6,2) | não | Litros, `> 0` quando presente |
| `fuel_type` | TEXT | não | Tipo de combustível (R-FUEL-05) |
| `supplier` | TEXT | não | Fornecedor (R-FUEL-05) |
| `last_used_at` | TIMESTAMPTZ | sim | Atualizado fire-and-forget (P2) |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | sim | — |

> **Sem `deleted_at`:** ao contrário do que a versão anterior deste documento afirmava, `expense_templates` **não tem soft-delete** no banco real — exclusão é hard-delete. Se R6 exigir soft-delete, é uma migration pendente, não algo já implementado.

**Regras:** máx 20 templates por usuário, garantido pelo trigger `enforce_expense_templates_limit()` (R3); nunca persiste `date` nem `odometer_km` (R6); `full_tank` não persiste em templates de abastecimento (R-FUEL-05).  
**RLS:** `(select auth.uid()) = user_id`

---

### `maintenances`

Agendamentos e registros de manutenção.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `vehicle_id` | UUID | sim | FK → `vehicles.id` |
| `description` | TEXT | sim | Descrição do serviço (a coluna chama-se `description`, não `service_type`) |
| `scheduled_date` | DATE | sim | Data agendada |
| `completion_date` | DATE | não | Data de conclusão efetiva |
| `odometer_km` | INTEGER | não | Obrigatório quando `status = completed` — `CHECK maintenances_odometer_required_when_completed` (R-ODO-03) |
| `cost` | NUMERIC(12,2) | não | Custo realizado; ao transicionar para `completed`, cria expense vinculada (R-LED-02) |
| `status` | `maintenance_status` (enum) | sim | `scheduled` (padrão), `in_progress`, `completed` ou `cancelled` — grafo R7 |
| `alert_sent` | BOOLEAN | sim | Default `false`; controla envio único de alerta por email (SPEC-20260521-002) |
| `metadata` | JSONB | sim | Default `{}` |
| `deleted_at` | TIMESTAMPTZ | não | Soft-delete; ao `cancelled`, soft-deleta a expense vinculada (R-LED-03) |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | sim | — |

**RLS:** `(select auth.uid()) = user_id`

---

### `fines`

Multas de trânsito (SPEC-20260607-001).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `vehicle_id` | UUID | sim | FK → `vehicles.id` |
| `description` | TEXT | sim | Descrição da infração (3–500 chars) |
| `amount` | NUMERIC(10,2) | sim | Valor original |
| `occurred_at` | DATE | sim | Data da ocorrência |
| `auto_number` | TEXT | não | Número do auto de infração |
| `infraction_code` | TEXT | não | Código da infração |
| `amount_with_discount` | NUMERIC(10,2) | não | Valor com desconto por antecipação |
| `due_date` | DATE | não | Vencimento |
| `paid_at` | DATE | não | Data de pagamento |
| `appeal_deadline` | DATE | não | Prazo para recurso |
| `location` | TEXT | não | Local da infração (máx 255) |
| `odometer_km` | INTEGER | não | Quilometragem na ocorrência |
| `driver_name` | TEXT | não | Nome do condutor identificado |
| `status` | `fine_status` | sim | `pending` (padrão), `paid`, `appealing` ou `cancelled` |
| `notes` | TEXT | não | Observações internas (máx 500) |
| `deleted_at` | TIMESTAMPTZ | não | Soft-delete; soft-deleta a expense vinculada (R-HUB-01) |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | não | — |

**Criação de expense vinculada:** ao criar uma multa, `ExpensesService.createFromSource()` é chamado com `source_type = 'fine'`, usando `amount_with_discount` quando disponível (R-LED-02).  
**RLS:** `auth.uid() = user_id`

---

### `vehicle_recurring_costs`

Custos anuais recorrentes por veículo (IPVA, CRLV, seguro etc.).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `vehicle_id` | UUID | sim | FK → `vehicles.id` |
| `cost_type` | `recurring_cost_type` (enum) | sim | `ipva`, `crlv`, `insurance` ou `other` |
| `year` | INTEGER | sim | Ano de referência, 2000–2100 |
| `amount` | NUMERIC(10,2) | sim | Valor, `> 0` |
| `due_date` | DATE | sim | Vencimento — obrigatório no banco (versão anterior deste doc indicava opcional) |
| `paid_at` | DATE | não | Data de pagamento; quando preenchido, cria expense vinculada com `source_type = 'recurring_cost'` (R-LED-05) |
| `expense_id` | UUID | não | FK → `expenses.id` ON DELETE SET NULL — não estava documentada na versão anterior deste doc |
| `notes` | TEXT | não | Observações, máx 500 chars |
| `deleted_at` | TIMESTAMPTZ | não | Soft-delete |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | sim | — |

**Unique:** `(vehicle_id, cost_type, year)` — máx um registro por tipo por ano (R-REC-01).  
**UX:** banner exibido quando `ipva_due_date` em `vehicles` está a menos de 60 dias sem linha correspondente (R-REC-02).  
**RLS:** `auth.uid() = user_id`

---

### `vehicle_odometer_cycles`

Série temporal de marcos de reinício do odômetro (ADR-007).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `vehicle_id` | UUID | sim | FK → `vehicles.id` |
| `cycle_number` | INTEGER | sim | Sequencial: 2, 3, 4... O ciclo 1 é implícito — nunca gravado (R-ODO-06) |
| `started_at` | TIMESTAMPTZ | sim | A partir de quando este ciclo é válido |
| `starting_value` | INTEGER | sim | Valor declarado no reset (geralmente 0) |
| `previous_cycle_max` | INTEGER | não | Máximo do ciclo anterior, para auditoria |
| `reason` | TEXT | sim | Motivo do reset (ex: "troca de painel") — obrigatório (R-ODO-05) |
| `created_by` | UUID | sim | FK → `auth.users.id`; apenas dono do veículo pode criar (R-ODO-05) |
| `created_at` | TIMESTAMPTZ | sim | — |

**Regras:** ausência de linhas mantém comportamento pré-ADR; `findMaxOdometerByVehicle` filtra por `date >= started_at` do ciclo mais recente (R-ODO-04). Criação é auditada via `AuditService` (R-MON-01, R-MON-02, R-ODO-05).  
**Sem `deleted_at`:** registros de ciclo são imutáveis — nunca soft-deletados.  
**RLS:** acesso restrito ao dono do veículo (validação via `vehicle_id`)

---

### `vehicle_groups`

Agrupamento lógico de veículos (SPEC-20260602-003).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `name` | TEXT | sim | Nome do grupo, 1–60 chars |
| `color` | TEXT | sim | Cor em hex (`^#[0-9a-fA-F]{6}$`), default `#6366f1` — a coluna real é `color`, não `description` (que não existe nesta tabela) |
| `created_at` | TIMESTAMPTZ | sim | — |
| `updated_at` | TIMESTAMPTZ | sim | — |

**Exclusão:** hard-delete do grupo; membros removidos por cascade FK (R-GRP-04).  
**RLS:** `(select auth.uid()) = user_id`

---

### `vehicle_group_members`

Tabela de junção M:N entre `vehicle_groups` e `vehicles`.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `group_id` | UUID | sim | FK → `vehicle_groups.id` ON DELETE CASCADE |
| `vehicle_id` | UUID | sim | FK → `vehicles.id` |

**Regras:** máx 200 veículos por grupo (R-GRP-01); apenas veículos ativos do próprio usuário (R-GRP-03); `setGroupMembers` é replace-all — histórico não é preservado (R-GRP-02).  
**PK composta:** `(group_id, vehicle_id)`

---

### `user_categories`

Categorias personalizadas de despesa por usuário (ADR-003, SPEC-20260602-004).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | sim | FK → `profiles.id` |
| `label` | TEXT | sim | Rótulo exibido na UI, 1–100 chars — a coluna real é `label`, não `name` |
| `value` | TEXT | sim | Slug `^[a-z0-9_-]+$` (R-CAT-02); único por usuário, não coincide com categorias padrão (R-CAT-03) |
| `created_at` | TIMESTAMPTZ | sim | — |

> **Sem `updated_at`:** a tabela real não tem coluna de atualização — categorias são criadas e excluídas, não editadas em campo.

**Regras:** máx 20 por usuário (R-CAT-01); exclusão via hard-delete — despesas existentes com o `category` value não são afetadas (campo TEXT, sem FK) (R-CAT-04).  
**RLS:** `(select auth.uid()) = user_id`

---

### `user_preferences`

Preferências de UX por usuário (SPEC-20260603-004).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `user_id` | UUID | sim | PK real da tabela é `user_id` (não `id`), FK → `profiles.id` (1:1) |
| `vehicle_chip_fields` | TEXT[] | sim | Tipo real é `TEXT[]`, não JSONB. Default `{make, plate, model}`; 1–3 campos do chip de veículo; placa sempre obrigatória (R-DISP-01, R-DISP-03) |
| `auto_draft_enabled` | BOOLEAN | sim | Padrão `false`; controla rascunho automático em `sessionStorage` (R-PREF-02) |
| `updated_at` | TIMESTAMPTZ | sim | — |

> **Sem `created_at`:** a tabela real não tem essa coluna (linha nasce via upsert na primeira gravação de preferência).

**Regra geral:** ausência de preferência retorna padrão seguro, nunca gera erro (R-PREF-01).  
**RLS:** `(select auth.uid()) = user_id`

---

### `audit_logs`

Registro de auditoria de todas as mutações (C2, ADR-005).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | sim | PK |
| `user_id` | UUID | não | FK → `profiles.id` ON DELETE SET NULL (R-MON-03); preservado após exclusão de conta |
| `action` | TEXT | sim | Tipo da ação (ex: `create`, `update`, `delete`) |
| `table_name` | TEXT | sim | Tabela afetada |
| `record_id` | UUID | sim | ID do registro alterado |
| `changes` | JSONB | não | Campos alterados sem PII (`user_id`, `photo_url`, tokens omitidos — R-MON-02) |
| `created_at` | TIMESTAMPTZ | sim | — |

> **Sem `ip_address`:** a tabela real não tem essa coluna. Se R-MON exigir registro de IP no futuro, é uma migration nova, não algo já implementado.

**Operação:** sempre fire-and-forget; erros nunca propagam (R-MON-01).  
**Deduplicação:** por `(user_id, action, created_at)` no `AuditService` (ADR-005).  
**RLS:** apenas leitura pelo próprio usuário; escrita exclusiva via backend (sem RLS INSERT de usuário).

---

## Funções armazenadas relevantes

Todas as funções SQL devem definir `search_path` fixo (S9) e validar `auth.uid()` internamente antes de retornar dados (S7).

| Função | Propósito | Referência |
|--------|-----------|------------|
| `calculate_vehicle_health` | Health score do veículo | S7 — corrigir EXECUTE para anon no projeto `Nave` |
| `calculate_fleet_health` | Health score da frota | S7 — idem |
| `get_upcoming_costs` | Custos previstos próximos | S7 — idem |
| `get_vehicle_cost_per_km` | Custo por km | ADR-007 (filtrar por ciclo ativo) |
| `fuel_consumption_trend` | Tendência de consumo | ADR-007 (filtrar por ciclo ativo) |
| `calculate_vehicle_tco` | TCO do veículo | ADR-007 (filtrar por ciclo ativo) |

---

## Enums e valores restritos

| Nome | Implementação real | Valores | Tabelas |
|------|--------------------|---------|---------|
| `profile_type` | Enum Postgres (`create type`) | `autonomous`, `small_fleet`, `large_fleet` | `profiles` |
| `vehicle_type` | Enum Postgres | `carro`, `moto`, `caminhao`, `onibus`, `utilitario`, `outro` | `vehicles` |
| `vehicle_operational_status` | Enum Postgres | `parking`, `workshop`, `accident`, `impounded` | `vehicles` |
| `maintenance_status` | Enum Postgres | `scheduled`, `in_progress`, `completed`, `cancelled` | `maintenances` |
| `fine_status` | Enum Postgres | `pending`, `paid`, `appealing`, `cancelled` | `fines` |
| `recurring_cost_type` | Enum Postgres | `ipva`, `crlv`, `insurance`, `other` | `vehicle_recurring_costs` |
| "FuelType" | **Não é enum Postgres** — é `TEXT` com `CHECK (fuel_type = ANY (ARRAY[...]))` | `gasoline`, `gasoline_premium`, `ethanol`, `diesel`, `diesel_s10`, `gnv`, `electric`, `hybrid` | `expenses`, `expense_templates`, `vehicles` (`fuel_type` e `favorite_fuel_type`) |

> Versão anterior deste documento tratava todos os valores restritos como "enum" indistintamente. Só os 6 primeiros são `CREATE TYPE ... AS ENUM` reais (migration `20260712171800_extensions_and_enums.sql`); combustível é validado via `CHECK`, não enum.

---

## Políticas RLS — padrão

```sql
-- Usar sempre (SELECT auth.uid()) — não auth.uid() direto (regra P4)
CREATE POLICY "owner_select" ON <tabela>
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "owner_insert" ON <tabela>
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "owner_update" ON <tabela>
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "owner_delete" ON <tabela>
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

Buckets do Supabase Storage nunca devem ter policy de LIST público — apenas acesso por URL/path direto (S8).
