---
id: SPEC-20260608-003
title: "Alertas de Custos Recorrentes — IPVA, CRLV, Seguro"
status: approved
date: 2026-06-08
author: douglps
rules: [R-REC-01, R-REC-02]
security: [S1, S2]
---

# SPEC-20260608-003 — Alertas de Custos Recorrentes

## Contexto

Documentos veiculares (IPVA, CRLV, Seguro) têm vencimentos anuais que o gestor precisa rastrear. A tabela `vehicle_recurring_costs` armazena esses registros. Quando um vencimento se aproxima e não há registro de pagamento (`paid_at IS NULL`), o sistema deve alertar visualmente o gestor.

**Decisão de produto (G-09):** Alertas apenas visuais dentro do app + in-app badge na navegação lateral.  
**Decisão de produto (G-08):** Pagamento registrado via Módulo de Documentos (Sprint 4). No Sprint 3, os registros de `vehicle_recurring_costs` são gerenciados manualmente via Supabase ou serão gerenciados pelo módulo futuro.

Cobre a user story: **US-FIN-B02** (3pts).

---

## Requisitos Funcionais

### RF-01 — Custos recorrentes na tab "Próximas"

- `vehicle_recurring_costs` com `paid_at IS NULL` e `due_date` dentro do horizonte aparecem na tab "Próximas"
- Renderizados com o mesmo sistema de urgency badges (vencido, 0-7, 8-14, 15-30, 31-60, +60 dias)
- Exibem o tipo: "IPVA", "CRLV", "Seguro", "Outros"
- `source_type = 'recurring_cost'` na listagem
- O link "Ver" direciona para `/settings` (módulo de Documentos — Sprint 4); até lá, o botão é desabilitado com tooltip "Em breve"

### RF-02 — In-app badge na sidebar

- Item "Despesas" na sidebar exibe badge numérico quando há itens com `due_date ≤ 7 dias` (de qualquer source_type: maintenance, fine, recurring_cost)
- Badge cor `bg-danger` quando há itens vencidos (due_date < hoje)
- Badge cor `bg-warning` quando itens urgentes mas não vencidos (0–7 dias)
- Badge desaparece quando count = 0
- Contagem vem da chamada client-side ao RPC `get_upcoming_costs(p_horizon_days=7)`

### RF-03 — Labels de cost_type

| cost_type (DB) | Label exibido |
|---|---|
| `ipva` | IPVA |
| `crlv` | CRLV |
| `insurance` | Seguro |
| `other` | Doc. Recorrente |

---

## Restrições

- R-REC-01: No máximo 1 registro por `(vehicle_id, cost_type, year)` — constraint no banco
- R-REC-02: Alertas são visuais; sem envio de email ou push notification neste sprint
- O CRUD de `vehicle_recurring_costs` é responsabilidade do Módulo de Documentos (Sprint 4)

---

## Casos de Teste

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-001 valida RF-01 | IPVA com `due_date` em 5 dias, `paid_at IS NULL` | Aparece na tab Próximas com badge 0-7 |
| CT-002 valida RF-01 | CRLV com `paid_at` preenchido | Não aparece na tab Próximas |
| CT-003 valida RF-02 | 3 itens vencendo em ≤ 7 dias | Badge "3" na sidebar item Despesas |
| CT-004 valida RF-02 | Nenhum item urgente | Sem badge na sidebar |
| CT-005 valida RF-02 | 1 item vencido (due_date < hoje) | Badge vermelho (danger) |
