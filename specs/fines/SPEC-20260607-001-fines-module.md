---
id: SPEC-20260607-001
title: "FinesModule — CRUD de Multas de Trânsito"
status: approved
date: 2026-06-07
author: douglps
rules: [R5, S1, S2, R-LED-02, R-LED-03, R-HUB-01]
security: [S1, S2]
---

# FinesModule — CRUD de Multas de Trânsito

## Contexto

Multas de trânsito devem ser gerenciadas no sistema para alimentar o Hub Financeiro Unificado (EPIC-FIN-001). O módulo inclui CRUD completo, controle de status e vinculação automática ao ledger de expenses no momento da criação.

## Escopo

- Scaffold completo (entity, DTOs, service, controller, module)
- Vinculação automática ao ledger (`US-FIN-A02`) via `ExpensesService.createFromSource()`/`softDeleteBySource()`

## Entidade: Fine

Campos da tabela `fines` (ver migration `20260601000000_vehicle_documents_and_fines.sql`):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | sim | PK auto-gerada |
| `user_id` | UUID | sim | FK → profiles |
| `vehicle_id` | UUID | sim | FK → vehicles |
| `description` | TEXT | sim | Descrição da infração (mín 3, máx 500) |
| `amount` | NUMERIC(10,2) | sim | Valor original da multa |
| `occurred_at` | DATE | sim | Data da ocorrência da infração |
| `auto_number` | TEXT | não | Número do auto de infração |
| `infraction_code` | TEXT | não | Código da infração (ex: 55170) |
| `amount_with_discount` | NUMERIC(10,2) | não | Valor com desconto por antecipação |
| `due_date` | DATE | não | Vencimento para pagamento |
| `paid_at` | DATE | não | Data de pagamento (preenchida ao marcar como `paid`) |
| `appeal_deadline` | DATE | não | Prazo para recurso |
| `location` | TEXT | não | Local da infração (máx 255) |
| `odometer_km` | INTEGER | não | Quilometragem no momento da infração |
| `driver_name` | TEXT | não | Nome do condutor identificado |
| `status` | fine_status | sim | `pending` (default) |
| `notes` | TEXT | não | Observações internas (máx 500) |

## RF — Requisitos Funcionais

### RF-01 — Criação de multa

- `POST /fines`
- Campos obrigatórios: `vehicle_id`, `description`, `amount`, `occurred_at`
- Valida ownership do veículo via `VehiclesService.findOne(vehicle_id, userId)`
- Retorna 400 para dados inválidos, 404 se veículo não encontrado

### RF-02 — Listagem de multas

- `GET /fines` — todas do usuário, ordenadas por `occurred_at DESC`
- `GET /fines?status=pending` — filtro opcional por status
- `GET /fines/vehicle/:vehicleId` — multas de um veículo específico (valida ownership)

### RF-03 — Busca individual

- `GET /fines/:id` — retorna 404 se não encontrada

### RF-04 — Atualização de multa

- `PATCH /fines/:id`
- Validação de transição de status (RF-05)
- Retorna 409 para transição inválida

### RF-05 — Transições de status

Grafo de transições válidas:

```
pending    → [paid, appealing, cancelled]
appealing  → [paid, cancelled]
paid       → []  (terminal)
cancelled  → []  (terminal)
```

- Transições fora do grafo retornam 409 `InvalidStatusTransitionException`

### RF-06 — Soft-delete

- `DELETE /fines/:id` — seta `deleted_at = NOW()`
- Multas soft-deletadas são invisíveis em todas as listagens (R5)

### RF-07 — Contagem de pendentes

- `countPending(userId, vehicleId?)` — método interno para uso em dashboard/KPIs

## Regras de Negócio

- RLS: apenas multas do próprio usuário são visíveis (S2)
- JWT obrigatório em todas as rotas (S1)
- `amount_with_discount` deve ser ≤ `amount` (validado no service)
- Criação de multa (`POST /fines`) sempre cria expense vinculada com `source_type='fine'`, usando `amount_with_discount` quando disponível (R-LED-02)
- Transição para `status=cancelled` ou soft-delete da fine também soft-deleta a expense vinculada, se existir (R-LED-03, R-HUB-01)

## Fora do Escopo desta Spec

- Notificações de vencimento — Sprint 3 (G-09)
- Tela `/fines` no frontend — Sprint 2 (G-07)

---

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 2026-06-07 | douglps | Criação inicial |
| 1.1 | 2026-06-22 | douglps | Layout de listagem atualizado para padrão 2 linhas + zebra (ref: SPEC-20260525-001 §7) |
| 1.2 | 2026-07-14 | douglps | Correção de contradição interna: a seção "Escopo" listava a vinculação ao ledger (Sprint 2) como parte desta spec, mas "Fora do Escopo" já a descrevia como pertencente a uma spec separada — e `createFromSource()`/`softDeleteBySource()` (R-LED-02/03) não existiam em nenhum lugar do código. Implementação (T3.6) escopada apenas ao Sprint 0 (CRUD completo), consistente com "Fora do Escopo"; vinculação ao ledger fica pendente até T3.7/T3.8, quando `createFromSource()` for implementado uma única vez para as três origens (manutenção, multa, custo recorrente). Ver `matrices/rastreabilidade.md`. |
| 1.3 | 2026-07-14 | douglps | Vinculação ao ledger implementada (T3.8, junto de `RecurringCostsModule`/SPEC-20260609-001): "Escopo" e "Fora do Escopo" atualizados para remover a divisão em Sprints, já que `createFromSource()`/`softDeleteBySource()` agora existem em `ExpensesService`. `FinesService.create()` chama `createFromSource` incondicionalmente; `update()` para `status=cancelled` e `remove()` chamam `softDeleteBySource`. Ver `matrices/rastreabilidade.md`. |
