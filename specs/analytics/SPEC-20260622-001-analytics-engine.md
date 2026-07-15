---
id: SPEC-20260622-001
title: "Analytics Engine — Motor de Inteligência de Frota"
status: approved
date: 2026-06-22
author: douglps
rules: [R-FUEL-02, R-FUEL-03, R5, R-ANA-01, R-ANA-02, R-ANA-03, R-ANA-04, R-ANA-05, R-ANA-06, R-ANA-07]
security: [S1, S2]
camadas: [database, backend, frontend, data]
---

# SPEC-20260622-001 — Analytics Engine

## Contexto

O Nave SaaS já possui dados ricos de despesas, manutenções, multas, custos recorrentes e odômetro. Porém, esses dados são apresentados apenas em listagens e KPIs básicos (total do mês, delta mês anterior, upcoming costs). O sistema não oferece **análises derivadas** que transformem dados em decisões.

Este motor de analytics transforma o Nave em referência para gestão inteligente de frotas ao oferecer:
- TCO por veículo com breakdown por categoria
- Inteligência de combustível (consumo, tendências, fornecedores)
- Manutenção preditiva baseada em histórico
- Detecção automática de anomalias
- Benchmarking entre veículos da frota
- Projeção de custos futuros
- Análise de sazonalidade
- Insights acionáveis em linguagem natural

**Personas atendidas:** P-001 (Carlos — custo individual), P-002 (Ana — comparativo gerencial), P-004 (Rafael — margem de lucro).

**Relação com Dashboard (SPEC-20260531-001):** A Zona B do dashboard exibe gráficos simplificados de "Despesas por Categoria" e "Consumo km/L". A página `/analytics` oferece versões aprofundadas dessas análises (TCO com breakdown, fuel trend com rolling average). As duas visões coexistem: o dashboard é o resumo rápido, `/analytics` é a análise detalhada. Não há duplicação — são níveis de profundidade diferentes.

---

## Requisitos Funcionais

### RF-01 — RPC `calculate_vehicle_tco(vehicle_id)`

Calcula o TCO (Total Cost of Ownership) de um veículo.

**Input:** `vehicle_id UUID`
**Output:** JSONB
```typescript
interface VehicleTCO {
  total: number;
  breakdown: {
    fuel: number;
    maintenance: number;
    fines: number;
    recurring: number;
    other: number;
  };
  cost_per_km: number | null;
  cost_per_month: number | null;
  total_km: number;
  period_days: number;
}
```

**Mapeamento de categorias do breakdown:**

| Condição na expense | Bucket do breakdown |
|---|---|
| `category = 'fuel'` | `fuel` |
| `source_type = 'maintenance'` | `maintenance` |
| `source_type = 'fine'` | `fines` |
| `source_type = 'recurring_cost'` | `recurring` |
| Qualquer outra combinação | `other` |

> Prioridade: `source_type` prevalece sobre `category` quando ambos estão presentes. Ex: uma expense com `category = 'oil_change'` e `source_type = 'maintenance'` vai para `maintenance`, não para `other`.

**Regras:**
- `cost_per_km` = `total / total_km`; `null` quando `total_km = 0`
- `cost_per_month` = `total / meses_decorridos`; `null` quando menos de 30 dias de dados
- Filtra apenas expenses com `deleted_at IS NULL`
- RLS: `SECURITY DEFINER` com `WHERE vehicles.user_id = auth.uid()` — rejeita com RAISE EXCEPTION 'unauthorized' se o veículo não pertence ao usuário

> **Nota:** Esta RPC estende e supersede `get_vehicle_cost_per_km` (existente) para fins de analytics, adicionando breakdown por categoria e `cost_per_month`. A RPC antiga permanece disponível para uso pontual em outras telas (ex: card de veículo).

### RF-02 — RPC `fuel_consumption_trend(vehicle_id, limit)`

Retorna série temporal de consumo de combustível com rolling average.

**Input:** `vehicle_id UUID`, `limit INTEGER DEFAULT 20`
**Output:** TABLE

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| expense_id | UUID | ID do registro |
| date | DATE | Data do abastecimento |
| liters | NUMERIC | Litros abastecidos |
| amount | NUMERIC | Valor pago |
| odometer_km | INTEGER | Odômetro no momento |
| km_per_liter | NUMERIC | km/L calculado (null se `full_tank != true` ou sem registro anterior) |
| price_per_liter | NUMERIC | R$/litro (`amount / liters`) |
| rolling_avg_kpl | NUMERIC | Média móvel de km/L (janela de 5 registros) |

**Regras:**
- Respeita R-FUEL-02: km/L calculado somente com `full_tank = true`
- Respeita R-FUEL-03: `price_per_liter` derivado, nunca persistido
- Ordenado por data descendente
- RLS: `SECURITY DEFINER` com `WHERE vehicles.user_id = auth.uid()`
- A RPC sempre retorna registros de abastecimento (com `km_per_liter = null` individualmente quando aplicável). O limiar R-ANA-01 (mínimo 5 registros `full_tank = true`) é aplicado apenas no frontend para decidir se exibe a seção de tendência ou o empty state (RF-15). A RPC em si reimplementa o cálculo de km/L na camada SQL para performance em série temporal, enquanto `FuelConsumptionService` continua responsável pelo cálculo pontual na resposta de create/update

### RF-03 — RPC `detect_expense_anomalies(threshold)`

Detecta despesas com valor fora do padrão usando Z-Score.

**Input:** `threshold NUMERIC DEFAULT 2.0` (número de desvios-padrão)
**Output:** TABLE

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| expense_id | UUID | |
| vehicle_id | UUID | |
| category | TEXT | |
| amount | NUMERIC | Valor da despesa |
| date | DATE | |
| z_score | NUMERIC | Desvios-padrão da média |
| avg_amount | NUMERIC | Média da categoria/veículo |
| stddev_amount | NUMERIC | Desvio padrão |

**Regras:**
- Mínimo 5 expenses na combinação `(vehicle_id, category)` para calcular
- `stddev > 0` para evitar divisão por zero
- Ordenado por `|z_score|` descendente
- RLS: `SECURITY DEFINER` — filtra internamente `WHERE expenses.user_id = auth.uid()`. Dados de outros usuários nunca aparecem no resultado (R-ANA-05)

### RF-04 — RPC `fleet_benchmark()`

Ranking comparativo entre veículos da frota do usuário.

**Output:** TABLE

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| vehicle_id | UUID | |
| plate | VARCHAR | |
| vehicle_name | TEXT | `COALESCE(nickname, make \|\| ' ' \|\| model)` |
| total_expenses | NUMERIC | Soma total |
| total_km | INTEGER | Delta de odômetro |
| cost_per_km | NUMERIC | R$/km |
| avg_km_per_liter | NUMERIC | km/L médio |
| maintenance_count | INTEGER | Total de manutenções |
| fines_count | INTEGER | Total de multas |
| health_score | INTEGER | Score atual |
| efficiency_rank | INTEGER | Posição no ranking |

**Regras:**
- Veículos sem odômetro recebem `cost_per_km = NULL` e ficam por último no ranking
- Mínimo 2 veículos para o ranking fazer sentido (frontend exibe empty state se < 2). A RPC retorna dados normalmente mesmo com 1 veículo; o empty state é responsabilidade do frontend
- `health_score` lido diretamente da coluna `vehicles.health_score` (valor persistido por `calculate_vehicle_health`), sem recálculo na RPC
- RLS: `SECURITY DEFINER` — filtra internamente `WHERE vehicles.user_id = auth.uid()`. Dados de outros usuários nunca aparecem no ranking (R-ANA-05)

### RF-05 — RPC `forecast_monthly_costs(vehicle_id?, months_ahead)`

Projeta custos futuros com base em média móvel de 3 meses.

**Input:**
- `vehicle_id UUID DEFAULT NULL` — null = toda a frota
- `months_ahead INTEGER DEFAULT 3`

**Output:** TABLE

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| month | DATE | Mês (1º dia) |
| projected_amount | NUMERIC | Projeção base (média móvel 3 meses) |
| projected_low | NUMERIC | Cenário otimista (base − 1σ, mínimo 0) |
| projected_high | NUMERIC | Cenário pessimista (base + 1σ) |
| is_forecast | BOOLEAN | true para meses futuros |

**Regras:**
- Mínimo 6 meses de histórico para forecast; senão retorna apenas dados históricos
- Banda de confiança = ±1 desvio padrão dos últimos 6 meses
- `projected_low` nunca negativo
- RLS: `SECURITY DEFINER` — filtra internamente `WHERE expenses.user_id = auth.uid()`. Quando `vehicle_id = NULL`, agrega apenas veículos do usuário autenticado (R-ANA-05)

### RF-06 — RPC `seasonal_expense_heatmap(vehicle_id?)`

Mapa de calor de gastos por mês × categoria.

**Output:** TABLE (`month_number`, `category`, `avg_amount`, `occurrence_count`)

**Regras:**
- Mínimo 6 meses distintos de dados para análise sazonal significativa (R-ANA-07); retorna vazio se insuficiente
- Agrupa por mês do calendário (1-12), não por mês sequencial
- RLS: `SECURITY DEFINER` — filtra internamente `WHERE expenses.user_id = auth.uid()`. Quando `vehicle_id = NULL`, agrega toda a frota do usuário (R-ANA-05)

### RF-07 — Endpoint REST `GET /analytics/tco/:vehicleId`

- Autenticação obrigatória (S1)
- Chama `calculate_vehicle_tco`
- Cache: 1h (stale-while-revalidate)
- 404 se veículo não encontrado ou não pertence ao usuário

### RF-08 — Endpoint REST `GET /analytics/fuel-trend/:vehicleId`

- Autenticação obrigatória (S1)
- Query params: `limit` (default 20, max 100)
- Chama `fuel_consumption_trend`
- 404 se veículo não encontrado ou não pertence ao usuário

### RF-09 — Endpoint REST `GET /analytics/anomalies`

- Autenticação obrigatória (S1)
- Query params: `threshold` (default 2.0, min 1.5, max 4.0), `vehicle_id` (opcional — filtra anomalias de um veículo específico)
- Chama `detect_expense_anomalies`
- Quando `vehicle_id` informado, filtra o resultado server-side antes de retornar

### RF-10 — Endpoint REST `GET /analytics/benchmark`

- Autenticação obrigatória (S1)
- Chama `fleet_benchmark`
- Retorna array vazio se < 2 veículos

### RF-11 — Endpoint REST `GET /analytics/forecast`

- Autenticação obrigatória (S1)
- Query params: `vehicle_id` (opcional), `months` (default 3, max 12)
- Chama `forecast_monthly_costs`

### RF-12 — Endpoint REST `GET /analytics/seasonal`

- Autenticação obrigatória (S1)
- Query params: `vehicle_id` (opcional)
- Chama `seasonal_expense_heatmap`

### RF-13 — Página `/analytics` no frontend

Dashboard de analytics com os seguintes componentes:

| Seção | Componente | Dados |
|-------|-----------|-------|
| Header | KPI Cards | TCO resumido, custo/km médio, km/L médio |
| TCO | Stacked Bar + Donut | Breakdown por categoria |
| Combustível | Area Chart | Tendência de km/L + rolling avg |
| Anomalias | Alert Cards | Top 5 despesas anômalas recentes |
| Benchmarking | Horizontal Bar | Ranking de veículos por custo/km |
| Projeção | Area Chart (range) | Forecast 3 meses com banda |
| Sazonalidade | Heatmap | Mês × Categoria |
| Insights | Insight Cards | Recomendações em linguagem natural |

**Regras de exibição:**
- Cada seção exibe empty state quando dados insuficientes (ver RF-15)
- Loading: Skeleton screens em cada seção
- Responsivo: mobile empilha seções verticalmente, desktop usa grid 2 colunas
- Filtro global: seletor de veículo (ou "Toda a frota") no header

**Layout mobile (< 768px):**
- Coluna única, seções empilhadas verticalmente
- Gráficos renderizados em largura total (100% viewport - padding)
- Horizontal bars (benchmarking) convertem para vertical bars
- Heatmap sazonal em container com scroll horizontal
- KPI cards em grid 2×2 (não 4 colunas)

### RF-14 — Geração de Insights em linguagem natural

O backend gera insights acionáveis baseados nas análises:

| Trigger | Insight |
|---------|---------|
| Veículo com custo/km > 1.5× média da frota | "O veículo {plate} tem custo/km {X}% acima da média. Considere revisão." |
| km/L caindo > 15% nos últimos 5 registros | "O consumo do {plate} está piorando. Última média: {X} km/L vs. anterior: {Y} km/L." |
| **[FUTURO]** Manutenção preditiva dentro de 30 dias | ~~"Manutenção preventiva do {plate} prevista para ~{date}. Agende com antecedência."~~ — **Não implementar nesta spec.** Depende do módulo Predictive Maintenance (ver Fora de Escopo). Será habilitado quando a spec de manutenção preditiva for aprovada. |
| Multas pendentes com desconto próximo | "Você tem {N} multas totalizando R$ {X}. Desconto vence em {D} dias." |
| Fornecedor mais barato detectado | "Abastecendo no {supplier}, você economizaria ~R$ {X}/mês vs. média atual." |
| Projeção > 120% do mês anterior | "Projeção de custos para {mês}: R$ {X} (+{Y}% vs. atual). Avalie despesas planejadas." |

### RF-15 — Empty States por seção

Cada seção da página `/analytics` exibe empty state quando dados insuficientes, com mensagem explicativa e CTA:

| Seção | Condição | Mensagem | CTA |
|-------|----------|----------|-----|
| TCO | 0 expenses para o veículo | "Registre despesas para ver o custo total de propriedade." | Registrar Despesa → `/expenses/new` |
| Combustível | < 5 abastecimentos `full_tank=true` (R-ANA-01) | "Registre pelo menos 5 abastecimentos com tanque cheio para ver a tendência de consumo." | Registrar Abastecimento → `/expenses/new` |
| Anomalias | < 5 expenses em qualquer combinação veículo+categoria (R-ANA-02) | "Mais registros são necessários para detectar anomalias." | — |
| Benchmarking | < 2 veículos ativos | "Adicione pelo menos 2 veículos para comparar eficiência." | Adicionar Veículo → `/vehicles/new` |
| Projeção | < 6 meses de histórico (R-ANA-03) | "Projeções requerem pelo menos 6 meses de dados." | — |
| Sazonalidade | < 6 meses distintos (R-ANA-07) | "Análise sazonal requer pelo menos 6 meses de registros." | — |
| Insights | Nenhum insight gerado | "Continue registrando para receber recomendações personalizadas." | — |

### RF-16 — Export de dados analytics

**Endpoint REST:** `GET /analytics/export`

- Autenticação obrigatória (S1)
- Query params: `vehicle_id` (opcional — null = toda a frota), `format` (default `csv`; futuro: `pdf`)
- Throttle: `@Throttle({ default: { limit: 10, ttl: 300000 } })` (mesmo padrão de `DashboardController.exportCsv`)
- Response: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="analytics-{date}.csv"`
- Escopo do CSV: TCO breakdown + forecast mensal (tabelas mais úteis para compartilhar com gestão)
- Botão "Exportar" no header da página `/analytics` dispara este endpoint

---

## Fora de Escopo

Os itens abaixo são relevantes para o ecossistema de analytics mas estão **fora desta spec**:

| Item | Motivo | Referência |
|------|--------|------------|
| Predictive Maintenance (Manutenção Preditiva) | Arquitetura própria com modelo de telemetria, opt-in consent e edge function; será spec separada | `.agents/ia-predictive-maintenance.md` |
| Depreciação implícita | Requer tabela FIPE/referência de valores de mercado não disponível no schema atual | — |
| Idle time (dias ociosos) | Requer tracking de gaps de odômetro com granularidade diária; complexidade alta para pouco valor no MVP | — |
| Decomposição sazonal (trend + seasonal components) | Requer 12+ meses e statsmodels-like; overkill para moving average do MVP | — |

---

## Requisitos Não-Funcionais

### RNF-01 — Performance

- RPCs de TCO e Fuel Trend: < 200ms para veículos com até 1.000 expenses
- Benchmark: < 500ms para frotas de até 50 veículos
- Forecast: < 300ms (cálculo simples, sem ML)
- Anomalias: < 500ms

### RNF-02 — Cache

- Endpoints de analytics devem retornar header `Cache-Control: max-age=3600, stale-while-revalidate=600`
- **Backend:** sem cache server-side no MVP (HTTP headers + browser/CDN cache suficientes)
- **Frontend:** React Query com `staleTime: 60 * 60 * 1000`
- **Invalidação:** mutations em expenses/manutenções/multas chamam `revalidatePath('/analytics')` via helpers existentes em `apps/web/lib/actions/revalidate.ts` + `queryClient.invalidateQueries({ queryKey: ['analytics'] })`
- **Futuro:** Redis ou materialized views com `pg_cron` se performance exigir

### RNF-03 — Dados mínimos

- Cada análise tem um limiar mínimo de dados (documentado por RF)
- Quando dados insuficientes: retornar resultado parcial (nunca erro)
- Frontend exibe empty state com explicação do mínimo necessário

### RNF-04 — Acessibilidade

- Gráficos incluem `aria-label` descritivo
- Dados tabulares disponíveis como alternativa a cada gráfico
- Cores de gráficos com contraste WCAG AA

---

## Faseamento de Implementação

### Fase 1 — Foundation (Sprint 5)
- [ ] RPCs: `calculate_vehicle_tco`, `fuel_consumption_trend`
- [ ] Endpoints REST: `/analytics/tco/:id`, `/analytics/fuel-trend/:id`
- [ ] Página `/analytics` com TCO cards + Fuel chart
- [ ] Migration SQL com RPCs

### Fase 2 — Intelligence (Sprint 6)
- [ ] RPCs: `detect_expense_anomalies`, `fleet_benchmark`
- [ ] Endpoints REST: `/analytics/anomalies`, `/analytics/benchmark`
- [ ] Seções de anomalias e benchmarking na página

### Fase 3 — Prediction (Sprint 7)
- [ ] RPCs: `forecast_monthly_costs`, `seasonal_expense_heatmap`
- [ ] Endpoints REST: `/analytics/forecast`, `/analytics/seasonal`, `/analytics/export`
- [ ] Seções de projeção e sazonalidade na página
- [ ] Geração de insights (RF-14)
- [ ] Export CSV (RF-16)

---

## Casos de Teste

| ID | Cenário | Resultado esperado |
|---|---|---|
| CT-001 valida RF-01 | Veículo com 10 expenses, 3 categorias | TCO com breakdown correto, cost_per_km calculado |
| CT-002 valida RF-01 | Veículo sem expenses | TCO total=0, cost_per_km=null |
| CT-003 valida RF-01 | Veículo de outro usuário | RAISE EXCEPTION 'unauthorized' |
| CT-004 valida RF-02 | 5 abastecimentos full_tank=true | km/L calculado para registros 2-5, rolling_avg para 5º |
| CT-005 valida RF-02 | Abastecimento com full_tank=false | km_per_liter=null para este registro |
| CT-006 valida RF-03 | Despesa com z_score > 2 | Aparece no resultado |
| CT-007 valida RF-03 | Categoria com < 5 registros | Não entra na análise |
| CT-008 valida RF-04 | 3 veículos com expenses | Ranking 1-3 por cost_per_km |
| CT-009 valida RF-04 | 1 veículo apenas | Array com 1 item, efficiency_rank=1 |
| CT-010 valida RF-05 | 8 meses de histórico | 8 meses reais + 3 projetados com is_forecast=true |
| CT-011 valida RF-05 | 3 meses de histórico | 3 meses reais + 0 projetados (dados insuficientes) |
| CT-012 valida RF-06 | 12 meses de dados, 4 categorias | 12×4 = 48 linhas com avg_amount por mês |
| CT-013 valida RF-14 | Veículo com custo/km 2× acima da média | Insight de eficiência gerado |
| CT-014 valida RF-14 | km/L caindo 20% nos últimos 5 registros | Insight de degradação gerado |
| CT-015 valida RNF-01 | 1.000 expenses no veículo | TCO retorna em < 200ms |
| CT-016 valida RF-02 | 8 abastecimentos full_tank=true | `rolling_avg_kpl` calculado com janela de 5 a partir do 5º registro |
| CT-017 valida RF-02 | 3 abastecimentos full_tank=true | Retorna registros com km_per_liter calculado, sem empty state (limiar é do frontend) |
| CT-018 valida RF-03, S2 | Usuário A busca anomalias | Resultado contém apenas despesas do usuário A, nunca do usuário B |
| CT-019 valida RF-04, S2 | Usuário A busca benchmark | Ranking contém apenas veículos do usuário A |
| CT-020 valida RF-07 | Request sem token JWT | HTTP 401 Unauthorized |
| CT-021 valida RF-07 | Request com vehicle_id inexistente | HTTP 404 Not Found |
| CT-022 valida RF-09 | Request com `threshold=1.0` (abaixo do min 1.5) | HTTP 400 Bad Request |
| CT-023 valida RF-09 | Request com `vehicle_id` válido | Retorna apenas anomalias do veículo filtrado |
| CT-024 valida RF-15 | Veículo com 0 expenses | Seção TCO exibe empty state com CTA para `/expenses/new` |
| CT-025 valida RF-16 | Request de export CSV | Response com Content-Type text/csv e dados de TCO + forecast |
| CT-026 valida RF-16 | 11º request de export em 5 min | HTTP 429 Too Many Requests |
| CT-027 valida RF-01 | Expense com `source_type='maintenance'` e `category='oil_change'` | Classificada no bucket `maintenance` (source_type prevalece) |

---

## Dependências

**Runtime (código):**
- `calculate_vehicle_health` / `calculate_fleet_health` RPCs (existentes)
- `get_upcoming_costs` RPC (existente)
- `get_vehicle_cost_per_km` RPC (existente — parcialmente superposta pelo TCO, ver RF-01)
- Expenses KPIs (SPEC-20260608-002 — existente)

**Agentes IA (desenvolvimento, não runtime):**
- Highcharts Visualizer skill (para prototipagem de dashboards standalone)
- Data Analyst skill (`.agents/skills/data-analyst/` — referência de padrões SQL e catálogo de análises)
