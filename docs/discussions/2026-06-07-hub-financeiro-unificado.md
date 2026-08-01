# Hub Financeiro Unificado — Plano de Implementação

**Data:** 2026-06-07
**Status:** Aprovado para execução — aguarda resolução de gaps bloqueadores (Sprint 0)
**Gerado por:** Debate multi-agente (navestory-architect + data-integrity + gestor-frota + navestory-ui-pwa + story-generator)
**Referências:** ADR-001, ADR-002, SPEC-20260521-003, specs/RULES.md, specs/expenses/README.md

---

## 1. Contexto e Motivação

O sistema tem hoje três tabelas independentes com valores financeiros que não se comunicam:

| Módulo     | Tabela         | Campo    | Aparece em /expenses? |
| ---------- | -------------- | -------- | --------------------- |
| Despesas   | `expenses`     | `amount` | Sim                   |
| Manutenção | `maintenances` | `cost`   | **Não**               |
| Multas     | `fines`        | `amount` | **Não**               |

Além disso, custos futuros programados (IPVA, CRLV, seguro, manutenções agendadas, multas com prazo) não têm visibilidade centralizada. O gestor precisa navegar em múltiplas telas para ter visão financeira completa da frota.

**Score atual de /expenses como central financeira: 2,5/10** (avaliação pela skill gestor-frota)

Lacunas críticas identificadas:

- Zero visão prospectiva (não mostra o que vai custar)
- Manutenções e multas ausentes do total financeiro real
- Botões de ação com 28px de altura — abaixo dos 44px mínimos do design system
- KPIs passivos e redundantes
- Sem diferenciação visual entre despesas manuais e vinculadas

---

## 2. Decisões Arquiteturais

### 2.1 Padrão de Ledger Unificado

**Adotar** o padrão polimórfico `source_type + source_id + is_readonly` na tabela `expenses`.

- Alternativas avaliadas e descartadas: VIEW de UNION (não paginável eficientemente), tabela de junção `expense_sources` (complexidade desnecessária para time pequeno)
- Lógica de vinculação: **NestJS Service**, não trigger PG — mantém visibilidade no código, testabilidade e rastreabilidade com `@spec`
- Atomicidade: Service chama RPC para operações vinculadas quando necessário
- Idempotência: unique index parcial em `(source_type, source_id) WHERE deleted_at IS NULL`

### 2.2 Despesas Futuras

**Não** adicionar `scheduled_for DATE` na tabela `expenses` — polui o ledger de fatos consumados com um conceito diferente.

**Adotar:** RPC `get_upcoming_costs()` que agrega fontes existentes + nova tabela `vehicle_recurring_costs` para IPVA/CRLV/Seguro.

- Sem recorrência automática via pg_cron — UX exibe banner quando vencimento ≤ 60 dias sem registro correspondente
- `vehicle_recurring_costs`: um registro por `(vehicle_id, cost_type, year)`

### 2.3 navegação de Origem

**Sheet lateral** (`side="bottom"` mobile, `side="right"` desktop) — não modal, não navegação direta.

Motivo: não substitui o contexto visual da lista; comportamento de "gaveta" reconhecível; estado de filtros de /expenses é preservado.

---

## 3. DDL — Mudanças no Banco de Dados

```sql
-- Migration: 20260608000000_unified_ledger.sql

-- 3.1 Campos novos em expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS source_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS source_id   UUID NULL,
  ADD COLUMN IF NOT EXISTS is_readonly BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_source_type_check
  CHECK (source_type IS NULL OR source_type IN (
    'maintenance', 'fine', 'recurring_cost'
  ));

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_source_coherence_check
  CHECK (
    (source_type IS NULL AND source_id IS NULL) OR
    (source_type IS NOT NULL AND source_id IS NOT NULL)
  );

-- Idempotência: uma expense ativa por source
CREATE UNIQUE INDEX IF NOT EXISTS uq_expenses_source
  ON public.expenses (source_type, source_id)
  WHERE deleted_at IS NULL AND source_type IS NOT NULL;

-- Lookup por source (consultas do módulo de origem)
CREATE INDEX IF NOT EXISTS idx_expenses_source
  ON public.expenses (source_type, source_id)
  WHERE source_type IS NOT NULL;

-- 3.2 Tabela de custos recorrentes (IPVA, CRLV, Seguro)
CREATE TYPE recurring_cost_type AS ENUM ('ipva', 'crlv', 'insurance', 'other');

CREATE TABLE public.vehicle_recurring_costs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id   UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  cost_type    recurring_cost_type NOT NULL,
  year         INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  due_date     DATE NOT NULL,
  paid_at      DATE NULL,
  expense_id   UUID NULL REFERENCES public.expenses(id) ON DELETE SET NULL,
  notes        TEXT NULL CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ NULL,
  CONSTRAINT uq_vehicle_recurring_cost UNIQUE (vehicle_id, cost_type, year)
);

CREATE TRIGGER update_vehicle_recurring_costs_modtime
  BEFORE UPDATE ON public.vehicle_recurring_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_vrc_user_id    ON public.vehicle_recurring_costs(user_id);
CREATE INDEX idx_vrc_vehicle_id ON public.vehicle_recurring_costs(vehicle_id);
CREATE INDEX idx_vrc_due_date   ON public.vehicle_recurring_costs(user_id, due_date)
  WHERE deleted_at IS NULL AND paid_at IS NULL;

-- RLS
ALTER TABLE public.vehicle_recurring_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring costs"
  ON public.vehicle_recurring_costs FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create recurring costs"
  ON public.vehicle_recurring_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring costs"
  ON public.vehicle_recurring_costs FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Block direct delete on recurring costs"
  ON public.vehicle_recurring_costs FOR DELETE
  USING (false);
```

```sql
-- Migration: 20260608000001_rpc_upcoming_costs.sql

CREATE OR REPLACE FUNCTION public.get_upcoming_costs(
  p_vehicle_id UUID DEFAULT NULL,
  p_horizon_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  source_type   TEXT,
  source_id     UUID,
  title         TEXT,
  amount        NUMERIC,
  due_date      DATE,
  vehicle_id    UUID,
  vehicle_plate TEXT,
  is_estimated  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_horizon_days NOT IN (30, 90) THEN
    RAISE EXCEPTION 'window deve ser 30 ou 90';
  END IF;

  RETURN QUERY
  -- Manutenções agendadas
  SELECT 'maintenance'::TEXT, m.id, m.description, m.cost,
         m.scheduled_date, m.vehicle_id, v.plate,
         (m.cost IS NULL)
  FROM maintenances m JOIN vehicles v ON v.id = m.vehicle_id
  WHERE m.user_id = auth.uid() AND m.deleted_at IS NULL
    AND m.status IN ('pending', 'in_progress')
    AND m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_horizon_days

  UNION ALL

  -- Multas pendentes com due_date
  SELECT 'fine'::TEXT, f.id, f.description,
         COALESCE(f.amount_with_discount, f.amount),
         f.due_date, f.vehicle_id, v.plate, FALSE
  FROM fines f JOIN vehicles v ON v.id = f.vehicle_id
  WHERE f.user_id = auth.uid() AND f.deleted_at IS NULL
    AND f.status = 'pending' AND f.due_date IS NOT NULL
    AND f.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_horizon_days

  UNION ALL

  -- Custos recorrentes não pagos
  SELECT 'recurring_cost'::TEXT, rc.id, rc.cost_type::TEXT,
         rc.amount, rc.due_date, rc.vehicle_id, v.plate, FALSE
  FROM vehicle_recurring_costs rc JOIN vehicles v ON v.id = rc.vehicle_id
  WHERE rc.user_id = auth.uid() AND rc.deleted_at IS NULL
    AND rc.paid_at IS NULL
    AND rc.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_horizon_days

  ORDER BY due_date ASC;
END;
$$;
```

---

## 4. Regras de Domínio — Adicionar ao RULES.md

| ID       | Regra                                                                                                                                                | Categoria |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R-LED-01 | Expenses com `source_type IS NOT NULL` são `is_readonly = true`; PATCH/DELETE retornam 403                                                           | Domínio   |
| R-LED-02 | Manutenção `→ completed` com `cost IS NOT NULL` cria ou atualiza a expense vinculada via `ExpensesService`                                           | Domínio   |
| R-LED-03 | Manutenção ou multa `→ cancelled` soft-deleta (`deleted_at = NOW()`) a expense vinculada                                                             | Domínio   |
| R-LED-04 | `source_type` e `source_id` são sempre definidos juntos — estado parcial é inválido (constraint no banco)                                            | Domínio   |
| R-LED-05 | `vehicle_recurring_costs` com `paid_at` preenchido cria expense vinculada com `source_type = 'recurring_cost'`                                       | Domínio   |
| R-HUB-01 | Soft-delete individual de manutenção (`deleted_at` preenchido fora de cancelamento) também soft-deleta a expense vinculada                           | Domínio   |
| R-HUB-02 | Criação de expense vinculada é idempotente — `uq_expenses_source` garante no máximo uma expense ativa por `(source_type, source_id)`                 | Domínio   |
| R-REC-01 | `vehicle_recurring_costs` aceita no máximo um registro por `(vehicle_id, cost_type, year)`                                                           | Domínio   |
| R-REC-02 | Recorrência anual é manual; UX exibe banner quando vencimento de documento em `vehicles` está ≤ 60 dias sem `vehicle_recurring_costs` correspondente | UX        |

---

## 5. UX — Estrutura da Central Financeira

### 5.1 Tabs de /expenses

```
[Todas] [Próximas ①] [Em atraso] [Por veículo] [Calendário]
```

| Tab             | Fonte de dados                                                               |
| --------------- | ---------------------------------------------------------------------------- |
| **Todas**       | `expenses` (manual + vinculadas)                                             |
| **Próximas**    | `get_upcoming_costs()` — agrupado por urgência                               |
| **Em atraso**   | `fines` vencidas + `maintenances` com `scheduled_date` passada sem conclusão |
| **Por veículo** | `expenses` GROUP BY vehicle_id — accordion com subtotal                      |
| **Calendário**  | Todas as fontes em grid mensal                                               |

### 5.2 KPIs no topo (zona crítica sem scroll)

1. **Total este mês** — soma `expenses.amount` onde `date = mês corrente` + delta % vs mês anterior
2. **Próximos 30 dias** — soma estimada de `get_upcoming_costs(30)` + contagem de eventos
3. **Em atraso** — total de multas vencidas + pendentes; badge `bg-danger/10` quando > 0
4. **Total acumulado** (desktop only) — soma histórica geral

### 5.3 Sistema de badges de urgência (tab Próximas)

| Prazo      | Cor                                | Ícone lucide     |
| ---------- | ---------------------------------- | ---------------- |
| Vencido    | `bg-danger/10` + `border-danger`   | `AlertOctagon`   |
| 0–7 dias   | `bg-danger/5` + `border-danger`    | `AlertTriangle`  |
| 8–14 dias  | `bg-warning/10` + `border-warning` | `Clock`          |
| 15–30 dias | `bg-warning/5`                     | `Calendar`       |
| 31–60 dias | `bg-info/5`                        | `CalendarDays`   |
| +60 dias   | `text-muted-foreground`            | `CalendarCheck2` |

### 5.4 Sheet de origem

Componente `LinkedExpenseDrawer` (`Sheet side="bottom"` no mobile):

- Cabeçalho: "Origem: [Manutenção | Multa]"
- Dados do registro de origem (descrição, status, data, custo, veículo)
- Callout informativo: "Para alterar, edite no módulo de origem"
- Botão "Abrir [manutenção | multa] completa" → navegação para `/maintenance/:id` ou `/fines/:id`

### 5.5 Despesas readonly na lista

- Badge `via Manutenção` / `via Multa` na coluna de descrição
- Ícone `Lock` (12px) no lugar dos botões de editar/excluir
- `opacity-90 bg-muted/20` na row
- Tooltip: "Gerado por [origem]. Edite pelo módulo de [origem]."

---

## 6. User Stories — Resumo

**Épico:** EPIC-FIN-001 — Hub Financeiro Unificado
**Total:** 11 stories · 53 pontos

### Grupo A — Ledger Unificado

| ID         | Título                                                      | Pts |
| ---------- | ----------------------------------------------------------- | --- |
| US-FIN-A01 | Manutenção concluída gera despesa vinculada automaticamente | 8   |
| US-FIN-A02 | Multa lançada aparece como despesa vinculada em /expenses   | 8   |
| US-FIN-A03 | Despesa vinculada é readonly em /expenses                   | 3   |
| US-FIN-A04 | Drawer de navegação da despesa para o módulo de origem | 5   |

### Grupo B — Despesas Futuras

| ID         | Título                                                     | Pts |
| ---------- | ---------------------------------------------------------- | --- |
| US-FIN-B01 | Calendário financeiro dos próximos 30/90 dias              | 8   |
| US-FIN-B02 | Alertas de vencimento IPVA / CRLV / Seguro                 | 3   |
| US-FIN-B03 | Manutenção agendada com custo estimado visível em Próximas | 3   |
| US-FIN-B04 | Multa com due_date próxima visível em Próximas             | 3   |

### Grupo C — Melhorias em /expenses

| ID         | Título                                         | Pts |
| ---------- | ---------------------------------------------- | --- |
| US-FIN-C01 | KPIs no topo do ledger                         | 5   |
| US-FIN-C02 | Filtro por origem da despesa                   | 3   |
| US-FIN-C03 | Exportação CSV consolidada de todas as origens | 3   |

---

## 7. Gaps a Resolver

### Urgência Alta — bloqueadores de implementação

| Gap      | Problema                                                                                              | Ação                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **G-10** | `Maintenance.entity.ts` usa `'scheduled'` mas banco usa `'pending'` — discrepância de tipo ativa      | Fix técnico imediato (não requer spec)                                |
| **G-02** | Schema Zod de `expenses` não conhece `source_type`, `source_id`, `is_readonly`                        | Atualizar `@navestory/validators` antes de qualquer código de feature |
| **G-01** | `FinesModule` (controller/service/repository) não existe no NestJS                                    | Spec nova obrigatória antes de US-FIN-A02                             |
| **G-05** | Sem regra definida para soft-delete de expense vinculada ao deletar manutenção individualmente        | Registrar R-HUB-01 em `specs/RULES.md`                                |
| **G-06** | Sem constraint de unicidade para `(source_id) WHERE source IS NOT NULL` — double-submit pode duplicar | Unique index + R-HUB-02 em `specs/RULES.md`                           |

### Urgência Média — resolvidos antes do Sprint 3

| Gap      | Problema                                                               | Ação                                               |
| -------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| **G-03** | Spec do contrato de `GET /expenses/upcoming` ausente                   | Nova spec `SPEC-YYYYMMDD-NNN` em `specs/expenses/` |
| **G-04** | Spec do contrato de `GET /expenses/kpis` ausente                       | Nova spec `SPEC-YYYYMMDD-NNN` em `specs/expenses/` |
| **G-07** | Tela `/fines` no frontend não existe (US-FIN-A04 navega para 404) | Spec de UI para módulo de multas                   |
| **G-08** | Pagamento de IPVA/CRLV/Seguro: módulo próprio ou manual em /expenses?  | **Decisão de produto pendente** (ver Seção 9)      |

### Urgência Baixa — backlog

| Gap      | Problema                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- |
| **G-09** | Canal de notificação para alertas de IPVA/CRLV/Seguro não definido (email? in-app badge? nenhum no MVP?) |

---

## 8. Sequência de Entrega

```
Sprint 0 — Gaps bloqueadores (pré-requisito de tudo)
  [ ] G-10: corrigir status 'scheduled' → 'pending' em Maintenance.entity.ts
  [ ] G-02: atualizar @navestory/validators — source_type, source_id, is_readonly em ExpenseRow
  [ ] G-05 + G-06: registrar R-HUB-01 e R-HUB-02 em specs/RULES.md
  [ ] G-01: criar spec do FinesModule (controller + service + repository)
  [ ] Migration 20260608000000_unified_ledger.sql (campos em expenses + vehicle_recurring_costs)

Sprint 1 — Fundação do ledger (21 pts)
  [ ] US-FIN-A01: manutenção concluída → expense vinculada (8pts)
  [ ] US-FIN-A03: guard readonly + badge visual (3pts)
  [ ] US-FIN-C02: filtro por origem em /expenses (3pts)
  [ ] Correção de touch targets: h-7 w-7 → h-11 w-11 nos ExpenseRowActions (1pt — hotfix UX)

Sprint 2 — Módulo de multas + navegação (21 pts)
  [ ] G-01: implementar FinesModule completo
  [ ] US-FIN-A02: multa lançada → expense vinculada (8pts)
  [ ] US-FIN-A04: LinkedExpenseDrawer (Sheet lateral) (5pts)
  [ ] G-07: tela /fines no frontend (básica, listagem + detalhe)

Sprint 3 — Próximas despesas (22 pts)
  [ ] Migration 20260608000001_rpc_upcoming_costs.sql
  [ ] US-FIN-B01: endpoint GET /expenses/upcoming + tab Próximas (8pts)
  [ ] US-FIN-B02: alertas IPVA/CRLV/Seguro (3pts) — paralelo
  [ ] US-FIN-B03: manutenções agendadas em Próximas (3pts) — paralelo
  [ ] US-FIN-B04: multas com due_date em Próximas (3pts) — paralelo
  [ ] US-FIN-C01: KPIs no topo + GET /expenses/kpis (5pts)

Sprint 4 — Fechamento e polimento (9 pts)
  [ ] US-FIN-C03: exportação CSV consolidada (3pts)
  [ ] Tab "Por veículo" com accordion (3pts)
  [ ] vehicle_recurring_costs: CRUD + vinculação ao pagar (3pts)
  [ ] Banner contextual no dashboard (widget "Próximos 7 dias")
```

---

## 9. Decisões de Produto em Aberto

Dois pontos precisam de resposta antes do Sprint 3:

**Decisão 1 — Pagamento de documentos (G-08)**

Como o gestor registra o pagamento real do IPVA ou renovação do seguro?

- **Opção A:** Módulo próprio de Documentos com botão "Registrar pagamento" → cria expense vinculada automaticamente
- **Opção B:** Usuário lança manualmente em /expenses com a categoria correta; `vehicle_recurring_costs` apenas para alertas de vencimento

**Decisão 2 — Canal de notificação de vencimentos (G-09)**

Para gestores que não abrem o app diariamente, os alertas de IPVA/CRLV/Seguro precisam de canal ativo?

- **Opção A:** Apenas visual dentro do app (banner + tab Próximas) — sem canal externo no MVP
- **Opção B:** Email com antecedência de 30 e 7 dias (padrão atual de manutenções em SPEC-20260521-002)
- **Opção C:** In-app badge na navegação quando há itens urgentes

---

## 10. Arquivos de Referência

| Arquivo                                                           | Relevância                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/api/src/modules/expenses/expenses.service.ts`               | Adicionar `createFromSource()`, `softDeleteBySource()`, guard de `is_readonly` |
| `apps/api/src/modules/maintenance/maintenance.service.ts`         | Chamar `createFromSource` na transição `→ completed`                           |
| `apps/web/app/(dashboard)/expenses/page.tsx`                      | Reestruturar tabs, KPIs, filtro de origem                                      |
| `apps/web/components/expenses/expense-row-actions.tsx`            | Adicionar `LinkedExpenseDrawer`, lock visual, touch targets                    |
| `apps/web/components/expenses/expense-filters.tsx`                | Adicionar filtro `source` (origem)                                             |
| `packages/validators/src/expenses.schema.ts`                      | Adicionar `source_type`, `source_id`, `is_readonly` ao schema Zod              |
| `specs/RULES.md`                                                  | Registrar R-LED-01 a R-LED-05, R-HUB-01, R-HUB-02, R-REC-01, R-REC-02          |
| `docs/architecture/decisions/ADR-006-unified-financial-ledger.md` | Criar ADR formal (recomendado)                                                 |
