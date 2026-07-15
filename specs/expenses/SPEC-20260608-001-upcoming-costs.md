---
id: SPEC-20260608-001
title: "Upcoming Costs — Próximas Despesas"
status: approved
date: 2026-06-08
author: douglps
rules: [R-LED-01, R-LED-02, R-LED-03, R-REC-01, R-REC-02]
security: [S1, S2]
camadas: [backend, frontend, database]
---

# SPEC-20260608-001 — Upcoming Costs — Próximas Despesas

## Contexto

O gestor de frota precisa de visibilidade centralizada sobre o que vai custar nos próximos dias e semanas, sem navegar em múltiplas telas. Manutenções agendadas, multas com prazo e custos recorrentes (IPVA, CRLV, Seguro) devem aparecer em uma única tab "Próximas" na central financeira `/expenses`.

Cobre as user stories: **US-FIN-B01** (8pts), **US-FIN-B03** (3pts), **US-FIN-B04** (3pts).

---

## Requisitos Funcionais

### RF-01 — Endpoint GET /expenses/upcoming

- Requer autenticação (`SupabaseAuthGuard`)
- Query params opcionais:
  - `vehicle_id` (UUID) — filtrar por veículo
  - `horizon_days` (integer, enum: 30 ou 90) — janela de tempo; default 30
- Delega para RPC `get_upcoming_costs(p_vehicle_id, p_horizon_days)`
- Resposta: array de `UpcomingCostItem` ordenado por `due_date ASC`
- Se a tabela de recorrentes estiver vazia, retorna array vazio sem erro

### RF-02 — Fontes de dados do RPC

| Source type | Tabela | Condição de inclusão |
|---|---|---|
| `maintenance` | `maintenances` | `status IN ('pending', 'in_progress')` AND `scheduled_date` dentro do horizonte |
| `fine` | `fines` | `status = 'pending'` AND `due_date` dentro do horizonte AND `due_date IS NOT NULL` |
| `recurring_cost` | `vehicle_recurring_costs` | `paid_at IS NULL` AND `due_date` dentro do horizonte |

### RF-03 — Estrutura de UpcomingCostItem

```typescript
interface UpcomingCostItem {
  source_type: 'maintenance' | 'fine' | 'recurring_cost';
  source_id: string;           // UUID do registro de origem
  title: string;               // descrição/cost_type
  amount: number | null;       // null para manutenções sem custo definido
  due_date: string;            // YYYY-MM-DD
  vehicle_id: string;
  vehicle_plate: string | null;
  is_estimated: boolean;       // true para manutenções sem cost definido
}
```

### RF-04 — Tab "Próximas" no frontend

- URL: `/expenses?tab=proximas`
- Itens agrupados por urgência com badge visual:

| Prazo | Cor do card | Ícone |
|---|---|---|
| Vencido (< hoje) | `bg-danger/10 border-danger` | `AlertOctagon` |
| 0–7 dias | `bg-danger/5 border-danger` | `AlertTriangle` |
| 8–14 dias | `bg-warning/10 border-warning` | `Clock` |
| 15–30 dias | `bg-warning/5` | `Calendar` |
| 31–60 dias | `bg-info/5` | `CalendarDays` |
| +60 dias | `text-muted-foreground` | `CalendarCheck2` |

### RF-05 — Badge de contagem na tab

- Tab "Próximas" exibe contador `①` com total de itens do horizonte de 30 dias
- Badge vermelho quando há itens vencidos (due_date < hoje)

### RF-06 — Navegação da row para origem

- Cada row na tab "Próximas" tem botão "Ver" que navega para:
  - `/maintenance` → para `source_type = 'maintenance'`
  - `/fines` → para `source_type = 'fine'`
  - `/settings` (documentos) → para `source_type = 'recurring_cost'` (Sprint 4)

---

## Requisitos Não-Funcionais

- RNF-01: O endpoint deve responder em < 500ms para horizonte de 30 dias
- RNF-02: Resultado ordenado por `due_date ASC` sempre
- RNF-03: `horizon_days` fora de (30, 90) retorna HTTP 400 com mensagem descritiva

---

## Casos de Teste

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-001 valida RF-01 | `GET /expenses/upcoming` sem params | Retorna array, horizon=30 |
| CT-002 valida RF-01 | `GET /expenses/upcoming?horizon_days=90` | Retorna array com janela de 90 dias |
| CT-003 valida RNF-03 | `GET /expenses/upcoming?horizon_days=15` | HTTP 400 |
| CT-004 valida RF-02 | Manutenção com status=completed não deve aparecer | Ausente do resultado |
| CT-005 valida RF-02 | Fine com status=paid não deve aparecer | Ausente do resultado |
| CT-006 valida RF-03 | Manutenção sem cost → is_estimated=true, amount=null | Campos corretos |
