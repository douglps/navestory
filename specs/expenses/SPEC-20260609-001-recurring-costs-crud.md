---
id: SPEC-20260609-001
title: "CRUD de Custos Recorrentes de Veículos (IPVA, CRLV, Seguro)"
status: approved
date: 2026-06-09
author: douglps
rules: [R-REC-01, R-REC-02, R-LED-05, R-HUB-01, S1, S2]
security: [S1, S2]
---

# SPEC-20260609-001 — CRUD de Custos Recorrentes

## Objetivo

Permitir ao gestor de frota registrar, visualizar, editar e soft-deletar custos recorrentes anuais por veículo (IPVA, CRLV, Seguro e outros), com vinculação automática ao ledger de despesas no momento do pagamento.

---

## Atores

- Gestor autenticado

---

## Requisitos Funcionais

### RF-01 — Listar custos recorrentes

- `GET /recurring-costs?vehicle_id=&year=&cost_type=&paid=`
- Retorna apenas registros com `deleted_at IS NULL` do `user_id` autenticado
- Filtros opcionais: `vehicle_id`, `year`, `cost_type`, `paid` (boolean)
- Ordenado por `due_date ASC`

### RF-02 — Criar custo recorrente

- `POST /recurring-costs`
- Campos obrigatórios: `vehicle_id`, `cost_type`, `year`, `amount`, `due_date`
- Campos opcionais: `notes`, `paid_at`
- Valida ownership do veículo
- Se `paid_at` é informado no create → chama `ExpensesService.createFromSource()` (R-LED-05)
- R-REC-01: retorna 409 se já existe registro ativo para `(vehicle_id, cost_type, year)`

### RF-03 — Atualizar custo recorrente

- `PATCH /recurring-costs/:id`
- Todos os campos são opcionais
- Se `paid_at` está sendo definido pela primeira vez (era `null`, agora não-null) → cria expense vinculada (R-LED-05)
- Expense vinculada é idempotente (R-HUB-02): se já existe, não cria duplicata

### RF-04 — Soft-delete de custo recorrente

- `DELETE /recurring-costs/:id`
- Soft-delete: `deleted_at = NOW()`
- Se existe expense vinculada (`source_type = 'recurring_cost', source_id = :id`) → soft-deleta também (R-HUB-01)

### RF-05 — Buscar por ID

- `GET /recurring-costs/:id`
- Retorna 404 se não encontrado ou se pertence a outro usuário

---

## Contrato da API

### POST /recurring-costs

**Request:**
```json
{
  "vehicle_id": "uuid",
  "cost_type": "ipva" | "crlv" | "insurance" | "other",
  "year": 2026,
  "amount": 1250.00,
  "due_date": "2026-03-31",
  "notes": "IPVA parcelado — 1ª parcela",
  "paid_at": null
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "vehicle_id": "uuid",
  "cost_type": "ipva",
  "year": 2026,
  "amount": 1250.00,
  "due_date": "2026-03-31",
  "paid_at": null,
  "expense_id": null,
  "notes": null,
  "created_at": "...",
  "updated_at": "...",
  "deleted_at": null
}
```

**Response 409:** `{ "message": "Já existe um registro ativo para este veículo, tipo e ano." }`

### PATCH /recurring-costs/:id

**Request (pagar):**
```json
{ "paid_at": "2026-03-15" }
```

**Response 200:** Registro atualizado com `expense_id` preenchido.

---

## Regras de Negócio Aplicadas

| ID | Aplicação |
|----|-----------|
| R-REC-01 | Unique constraint `(vehicle_id, cost_type, year)` — retorna 409 no service |
| R-LED-05 | `paid_at` preenchido → `createFromSource({ source_type: 'recurring_cost', category: cost_type_as_category })` |
| R-HUB-01 | DELETE → `softDeleteBySource('recurring_cost', id)` |
| R-HUB-02 | `createFromSource` é idempotente via `uq_expenses_source` |
| S1 | `SupabaseAuthGuard` em todas as rotas |
| S2 | RLS em `vehicle_recurring_costs`: `auth.uid() = user_id` |

---

## Mapeamento cost_type → categoria de expense

| cost_type | category em expense |
|-----------|---------------------|
| ipva | tax |
| crlv | tax |
| insurance | insurance |
| other | other |

---

## Testes obrigatórios (TDD)

- CT-REC-01: `create()` válido retorna entidade criada
- CT-REC-02: `create()` com veículo de outro usuário lança `NotFoundException`
- CT-REC-03: `create()` com paid_at → chama `createFromSource`
- CT-REC-04: `create()` com duplicata (mesmo vehicle+cost_type+year) lança `ConflictException`
- CT-REC-05: `update()` transição `paid_at: null → data` → chama `createFromSource`
- CT-REC-06: `update()` `paid_at` já definido → não chama `createFromSource` novamente
- CT-REC-07: `remove()` chama `softDeleteBySource`
- CT-REC-08: `findAll()` filtra por `user_id`, exclui `deleted_at IS NOT NULL`

---

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 2026-06-09 | douglps | Criação inicial |
| 1.1 | 2026-06-22 | douglps | Layout de listagem atualizado para padrão 2 linhas + zebra (ref: SPEC-20260525-001 §7) |
