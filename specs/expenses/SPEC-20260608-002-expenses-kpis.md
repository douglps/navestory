---
id: SPEC-20260608-002
title: "Expenses KPIs — Central Financeira"
status: approved
date: 2026-06-08
author: douglps
rules: [R-LED-01]
security: [S1, S2]
camadas: [backend, frontend]
---

# SPEC-20260608-002 — Expenses KPIs — Central Financeira

## Contexto

Os KPI cards no topo de `/expenses` precisam mostrar métricas financeiras reais e prospectivas — não apenas contagens passivas. O gestor precisa ver de relance: quanto gastou este mês, quanto vai gastar nos próximos 30 dias e qual é o total histórico acumulado.

Cobre a user story: **US-FIN-C01** (5pts).

---

## Requisitos Funcionais

### RF-01 — Endpoint GET /expenses/kpis

- Requer autenticação
- Query param opcional: `vehicle_id` (UUID) — filtrar por veículo
- Agrega dados de múltiplas fontes
- Resposta: objeto `ExpenseKpis`

### RF-02 — Estrutura de ExpenseKpis

```typescript
interface ExpenseKpis {
  total_this_month: number;       // soma expenses.amount no mês corrente
  total_prev_month: number;       // soma expenses.amount no mês anterior
  delta_percent: number | null;   // ((this - prev) / prev) * 100; null se prev=0
  total_all_time: number;         // soma histórica total de expenses
  upcoming_30_days_total: number; // soma de upcoming costs (horizon=30)
  upcoming_30_days_count: number; // contagem de itens no upcoming
}
```

### RF-03 — Lógica de delta_percent

- `delta_percent = ((total_this_month - total_prev_month) / total_prev_month) * 100`
- Quando `total_prev_month = 0`: `delta_percent = null`
- Arredondado a 1 casa decimal
- Positivo = aumento de gastos (vermelho no UI), negativo = redução (verde)

### RF-04 — KPI Cards no frontend (zona crítica sem scroll)

| Card | Dado | Destaque visual |
|---|---|---|
| Total este mês | `total_this_month` + `delta_percent` | Badge verde/vermelho no delta |
| Próximos 30 dias | `upcoming_30_days_total` + `upcoming_30_days_count` | Badge info quando > 0 |
| Total histórico | `total_all_time` | Neutro |

### RF-05 — Delta badge

- `delta_percent > 0`: badge `bg-danger/10 text-danger` com seta ↑
- `delta_percent < 0`: badge `bg-success/10 text-success` com seta ↓
- `delta_percent = null`: sem badge

### RF-06 — Upcoming no KPI card

- Texto "X itens nos próximos 30 dias"
- Quando `upcoming_30_days_count = 0`: texto "nenhum gasto previsto"

---

## Casos de Teste

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-001 valida RF-02 | Sem despesas no mês atual | `total_this_month = 0`, `delta_percent = null` |
| CT-002 valida RF-03 | Prev=100, this=150 | `delta_percent = 50.0` |
| CT-003 valida RF-03 | Prev=0, this=50 | `delta_percent = null` |
| CT-004 valida RF-03 | Prev=200, this=100 | `delta_percent = -50.0` |
| CT-005 valida RF-01 | Com `vehicle_id` | KPIs filtrados apenas para aquele veículo |
