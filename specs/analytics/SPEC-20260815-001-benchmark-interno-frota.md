---
id: SPEC-20260815-001
title: "Benchmark Interno de Frota"
status: draft
date: 2026-08-15
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-ANA-01, R-ANA-04, R-ANA-05, R-ANA-06, R-BENCH-01, R-BENCH-02, R-BENCH-03, R-BENCH-04]
security: [S1, S2, S7, S9, S18]
camadas: [backend, database, frontend]
---

# SPEC-20260815-001 — Benchmark Interno de Frota

## Contexto

O navestory já coleta e expõe métricas por veículo: consumo km/L (`fuel_consumption_trend`), custo por km (`get_vehicle_cost_per_km`), preço médio por litro (`computed.price_per_liter`). Porém, essas métricas existem isoladas por veículo — o usuário não tem como saber se o Fiat Strada da frota consome mais ou menos do que os outros veículos da empresa.

Gestores de frota (persona Ana, P-002) tomam decisões de manutenção, substituição ou reconfiguração de rota baseadas em comparações relativas ("qual veículo está custando mais por km?"), não em valores absolutos. Sem o benchmark, Ana precisa abrir cada veículo manualmente e comparar na cabeça.

Quatro oportunidades de diferenciação foram levantadas em análise técnica do módulo de despesas. Após avaliação conjunta de product-owner e tech-lead, apenas o **Benchmark Interno de Frota** foi aprovado para avançar à spec agora. As outras três oportunidades (OCR de comprovante, geolocalização de abastecimentos, detecção de anomalias com ML) foram bloqueadas/adiadas e **não fazem parte desta spec**.

O benchmark é viável sem infraestrutura nova: os dados de consumo e custo já existem nas tabelas de `expenses` e nas funções analíticas de SPEC-20260622-001. A feature é uma nova agregação inter-veículo sobre dados já disponíveis.

---

## Objetivo

Permitir que o usuário compare o consumo de combustível e o custo operacional de cada veículo da frota contra a média e o percentil dos demais veículos do mesmo workspace, usando dados já existentes — sem infraestrutura nova, API externa, ou processamento assíncrono.

**Exemplo de output:** "Seu Fiat Strada consome 15 km/L; média da frota = 16,2 km/L; percentil 92 (acima da média)."

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Comparar veículo contra a frota

**Como** gestora de frota, **quero** ver como o consumo e o custo de cada veículo se comparam com a média da frota, **para** identificar veículos com desempenho fora do padrão e priorizar ações.

- **Dado que** meu workspace tem 3 veículos com dados suficientes, **quando** acesso a seção "Benchmark da Frota" em `/analytics`, **então** vejo uma tabela com os 3 veículos, seus valores de `avg_km_per_liter`, `avg_price_per_liter` e `cost_per_km`, a média da frota para cada métrica e o percentil de cada veículo.
- **Dado que** o Veículo A tem `avg_km_per_liter = 15` e a média da frota é 12, **quando** visualizo o benchmark, **então** o Veículo A aparece com label "Acima da média" (percentil entre 70 e 89) sem ranking posicional numerado.
- **Dado que** o veículo selecionado no contexto global é o Veículo B, **quando** visualizo o benchmark, **então** a linha do Veículo B está destacada visualmente em relação aos demais.

### US-02: Visualizar percentil sem gamificação

**Como** gestora de frota, **quero** entender rapidamente se um veículo está entre os mais ou menos eficientes da frota, **para** não precisar calcular comparações manualmente.

- **Dado que** o Veículo C tem o maior `cost_per_km` da frota, **quando** visualizo o benchmark, **então** ele aparece com label "Abaixo da média" — sem badge de "último colocado", sem número de posição, sem elementos de ranking competitivo.
- **Dado que** um veículo tem dados insuficientes para calcular km/L (menos de 5 abastecimentos `full_tank`), **quando** visualizo o benchmark, **então** a célula de km/L desse veículo exibe "—" (em dash) com tooltip explicativo; as demais métricas do veículo aparecem normalmente se disponíveis.

### US-03: Workspace com veículo único (Carlos, P-001)

**Como** motorista autônomo com apenas 1 veículo cadastrado, **quando** acesso a seção de benchmark, **então** vejo uma mensagem informativa "Benchmark disponível com 2 ou mais veículos na frota" — sem erro, sem gráfico vazio, sem dado parcial enganoso.

- **Dado que** meu workspace tem apenas 1 veículo, **quando** carrego a seção de benchmark, **então** a seção exibe o empty state informativo e não tenta renderizar tabela ou gráfico.

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                                                                      | Prioridade | História |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|----------|
| RF-01 | Nova RPC PostgreSQL `get_fleet_benchmark(p_user_id uuid DEFAULT NULL)` retorna, para cada veículo ativo do workspace do usuário autenticado: `vehicle_id uuid`, `vehicle_label text` (placa + make + model concatenados), `avg_km_per_liter numeric` (null se count de abastecimentos `full_tank` < 5 — R-BENCH-03), `avg_price_per_liter numeric` (null se sem dados), `cost_per_km numeric` (null conforme R-ANA-04), `percentile_km_per_liter numeric` (0–100, via `PERCENT_RANK() OVER (ORDER BY avg_km_per_liter)`, null quando a métrica base é null), `percentile_price_per_liter numeric` (idem, ordem inversa — preço menor = melhor percentil), `percentile_cost_per_km numeric` (idem, ordem inversa) | Alta | US-01, US-02 |
| RF-02 | A RPC valida internamente que todos os veículos retornados pertencem ao workspace do `auth.uid()` — nunca expõe veículo de workspace diferente no conjunto de comparação (R-BENCH-01, S18). Para usuário sem workspace, usa `vehicles.user_id = auth.uid()` como escopo. Para usuário em workspace (owner ou member), usa os veículos visíveis via `workspace_vehicle_assignments` ou todos os veículos do workspace (owner) | Alta | US-01 |
| RF-03 | Novo endpoint `GET /analytics/benchmark` no NestJS (`AnalyticsModule`) chama a RPC com o `accessToken` do usuário e retorna: `{ vehicles: BenchmarkEntry[], fleet_avg: FleetAvg \| null, vehicle_count: number, insufficient_data: boolean }`. A struct `FleetAvg` contém médias apenas dos veículos com dados não-nulos para cada métrica | Alta | US-01 |
| RF-04 | Quando `vehicle_count < 2`, o endpoint retorna HTTP 200 com `{ vehicles: [], fleet_avg: null, vehicle_count: N, insufficient_data: true }` — nunca um erro 4xx/5xx (R-BENCH-02). O frontend trata `insufficient_data: true` com o empty state de US-03 | Alta | US-03 |
| RF-05 | As médias da frota (`fleet_avg`) excluem veículos com valor `null` para aquela métrica: `fleet_avg.avg_km_per_liter` é a média aritmética apenas dos veículos com ≥ 5 abastecimentos `full_tank`; `fleet_avg.cost_per_km` exclui veículos com `total_km = 0` (R-ANA-04) | Alta | US-01 |
| RF-06 | A resposta do endpoint é cacheável com TTL de 1 hora (R-ANA-06). No frontend, `staleTime` do TanStack Query = 3.600.000 ms. Invalidação (`queryClient.invalidateQueries(['analytics', 'benchmark'])`) ocorre como side-effect no callback `onSuccess` de mutações de criação/atualização de expenses `category = fuel` e de criação/atualização de manutenções — mesma lista de invalidação de `calculate_vehicle_tco` em SPEC-20260622-001 | Média | US-01 |
| RF-07 | Nova seção "Benchmark da Frota" na página `/analytics`, renderizada após as seções de TCO e fuel trend existentes. Exibe: tabela com os veículos (linhas) × métricas (colunas) + linha de rodapé "Média da frota". Visível apenas quando `vehicle_count >= 2` e `insufficient_data: false` | Alta | US-01, US-02 |
| RF-08 | Quando `insufficient_data: true`, a seção exibe empty state com texto "Benchmark disponível com 2 ou mais veículos na frota" e ícone informativo — sem badge de erro, sem mensagem de "nenhum dado" genérica, sem gráfico vazio | Alta | US-03 |
| RF-09 | A linha do veículo com `vehicle_id` igual ao `activeVehicleId` do contexto global (store `useDashboardStore`) é destacada visualmente (ex: `background` levemente diferente ou borda de acento), quando contexto `single` está ativo. Sem contexto ou em contexto `group`/`multi`, todas as linhas aparecem sem destaque | Média | US-01 |
| RF-10 | Percentil exibido com label textual além do valor numérico: ≥ 90 → "Top 10%"; 70–89 → "Acima da média"; 30–69 → "Na média"; < 30 → "Abaixo da média". Exibição como chip/badge semântico usando tokens de cor (`success`, `info`, `warning`, `danger`) conforme R-DS-03 — sem ranking posicional numerado ("1º", "2º"), sem troféus, sem metáforas competitivas (R-BENCH-04) | Alta | US-02 |
| RF-11 | Métricas com valor `null` exibem "—" (U+2014, em dash) na célula. Hover/tap sobre "—" exibe tooltip: para `avg_km_per_liter` → "Mín. 5 abastecimentos completos (tanque cheio) necessários"; para `avg_price_per_liter` → "Sem abastecimentos registrados"; para `cost_per_km` → "Odômetro insuficiente para calcular custo/km" | Média | US-01 |

---

## Requisitos Não-Funcionais

| ID     | Requisito        | Métrica de Aceite |
|--------|------------------|--------------------|
| RNF-01 | Performance      | `GET /analytics/benchmark` retorna em p95 < 400ms (query inter-veículo com `PERCENT_RANK()` e múltiplos JOINs; índice em `expenses(vehicle_id, category, occurred_at)` já existe na migration consolidada; criar índice em `expenses(vehicle_id, full_tank)` se ausente — confirmar antes de implementar) |
| RNF-02 | Segurança        | RPC `get_fleet_benchmark` usa `SECURITY DEFINER` com `SET search_path = ''` fixo (S9); `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated` obrigatórios (S7); predicado de isolamento de workspace é a primeira cláusula executada antes de qualquer JOIN custoso (S18) |
| RNF-03 | Cache            | `staleTime: 3_600_000` no TanStack Query do frontend; invalidação explícita via `queryClient.invalidateQueries` em mutações de expense fuel e manutenção (R-ANA-06) |
| RNF-04 | Sem PII          | A RPC não retorna `user_id`, email nem nome de motorista — apenas `vehicle_id` e label derivado de placa/make/model (R-ANA-05, R-MON-02) |
| RNF-05 | Sem NaN/Infinity | `cost_per_km` é `null` quando `total_km = 0`; médias da frota calculadas somente sobre valores não-nulos; nunca exibir `Infinity`, `NaN` ou `0` enganoso ao usuário (R-ANA-04) |

---

## Fora de Escopo

- Gamificação: badges de conquista, ranking posicional ("1º lugar"), pontos, "melhor motorista do mês", streaks ("X dias sem anomalia") — descartado explicitamente pelo product-owner como escopo creep para produto B2B/B2SMB em validação (R-BENCH-04)
- Comparação cross-workspace: benchmark nunca cruza tenants diferentes (R-BENCH-01 — proibido)
- Benchmark histórico: evolução do posicionamento percentil ao longo do tempo
- Comparação contra médias externas: dados de mercado, médias nacionais, referências FIPE ou de indústria
- OCR de comprovante, geolocalização de abastecimento, detecção de anomalias com ML — aprovação não concedida, não fazem parte desta spec
- Alertas ou notificações por email baseados em resultado de benchmark (bloqueado até Fase 9 — infraestrutura de email depende de domínio próprio)
- Exportação do benchmark em CSV (funcionalidade de export da página `/analytics` pode incluir no futuro, fora de escopo agora)
- Filtro por período de tempo no benchmark (sempre usa o histórico completo disponível, sem janela de data configurável)

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260622-001 | Analytics Engine — RPCs `calculate_vehicle_tco`, `fuel_consumption_trend`, `get_vehicle_cost_per_km` e `fuel_stats` já implementados; endpoint `GET /analytics/fuel-trend/:vehicleId` a ser reutilizado como padrão de módulo |
| Spec | SPEC-20260804-004 | Workspace Foundation — modelo de workspace, `workspace_members`, `workspace_vehicle_assignments` |
| Spec | SPEC-20260606-001 | Fuel Enrichment — campo `full_tank`, `liters`, `odometer_km` nas expenses; lógica de km/L já definida |
| Spec | SPEC-20260602-002 | Vehicles — modelo, `deleted_at` para soft-delete, campos `make`, `model`, placa |
| Regra | R-ANA-01 | Mínimo 5 registros `full_tank = true` para km/L confiável — R-BENCH-03 herda esse limiar |
| Regra | R-ANA-06 | RPCs de analytics pesadas cacheáveis com TTL 1h |
| Regra | R-BENCH-01 a 04 | Novas regras criadas por esta spec; definidas em `specs/RULES.md` |
| Regra | S18 | Nova regra de segurança criada por esta spec; definida em `specs/RULES.md` |

---

## Notas Técnicas

### Estrutura da RPC `get_fleet_benchmark`

A função deve:
1. Resolver o conjunto de veículos a comparar (workspace do `auth.uid()` ou veículos próprios do usuário solo)
2. Para cada veículo ativo (`deleted_at IS NULL`), calcular:
   - `avg_km_per_liter`: `AVG` dos `computed_km_per_liter` já existentes nas expenses, filtrado por `full_tank = true` e `computed_km_per_liter IS NOT NULL`; retornar `null` se `COUNT(*) < 5` (R-BENCH-03, R-ANA-01)
   - `avg_price_per_liter`: `AVG(amount / NULLIF(liters, 0))` nas expenses `category = 'fuel'`, `liters > 0`; retornar `null` se sem dados
   - `cost_per_km`: reutilizar a lógica de `get_vehicle_cost_per_km` (SPEC-20260622-001); retornar `null` quando `total_km = 0` (R-ANA-04)
3. Calcular percentis com `PERCENT_RANK()` em window function sobre o conjunto de veículos com valores não-nulos
4. Retornar a tabela

```sql
-- Pseudocódigo estrutural (não normativo — implementador decide detalhes de CTE/subquery)
CREATE OR REPLACE FUNCTION public.get_fleet_benchmark()
RETURNS TABLE (
  vehicle_id       uuid,
  vehicle_label    text,
  avg_km_per_liter numeric,
  avg_price_per_liter numeric,
  cost_per_km      numeric,
  percentile_km_per_liter    numeric,
  percentile_price_per_liter numeric,
  percentile_cost_per_km     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- 1. Validar autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- 2. Resolver veículos do workspace (ou próprios do usuário solo)
  --    Retornar resultado com PERCENT_RANK() sobre o conjunto
  RETURN QUERY
    WITH fleet_vehicles AS (
      -- Veículos do workspace ou próprios do usuário
      ...
    ),
    vehicle_metrics AS (
      -- Cálculo de avg_km_per_liter, avg_price_per_liter, cost_per_km por veículo
      ...
    )
    SELECT
      vm.*,
      PERCENT_RANK() OVER (ORDER BY vm.avg_km_per_liter)      * 100 AS percentile_km_per_liter,
      PERCENT_RANK() OVER (ORDER BY vm.avg_price_per_liter DESC) * 100 AS percentile_price_per_liter,
      PERCENT_RANK() OVER (ORDER BY vm.cost_per_km DESC)        * 100 AS percentile_cost_per_km
    FROM vehicle_metrics vm;
END;
$$;

REVOKE ALL ON FUNCTION public.get_fleet_benchmark() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fleet_benchmark() TO authenticated;
```

**Nota:** `PERCENT_RANK()` sobre conjunto com valores `null` requer atenção — linhas com valor `null` devem ser excluídas da janela de cálculo de percentil para aquela métrica específica. O percentil de um veículo com `avg_km_per_liter = null` deve ser `null` (não 0).

### Isolamento de workspace (S18, R-BENCH-01)

O predicado de filtragem por workspace deve ser a cláusula executada primeiro, antes de JOINs com `expenses` ou outras tabelas custosas. O isolamento deve funcionar em dois caminhos:

1. **Usuário sem workspace** (solo): `WHERE v.user_id = auth.uid() AND v.deleted_at IS NULL`
2. **Owner do workspace**: todos os veículos cujo `user_id` é o owner do workspace ao qual `auth.uid()` pertence
3. **Member do workspace**: veículos visíveis via `workspace_vehicle_assignments` para `auth.uid()`

A distinção entre os caminhos (1), (2) e (3) deve ser feita na RPC — o endpoint NestJS passa apenas o `accessToken` do usuário.

### Posição na página `/analytics`

A seção "Benchmark da Frota" vai após as seções de TCO e Fuel Trend já existentes (SPEC-20260622-001), seguindo a estrutura de seções já estabelecida em `analytics/page.tsx`. Não é necessário criar nova rota.

### Reutilização de `get_vehicle_cost_per_km`

A função `get_vehicle_cost_per_km` já existe na migration `20260712172020_analytics_functions.sql`. O benchmark pode chamar essa função por veículo via `LATERAL JOIN` ou subquery, em vez de reimplementar a lógica de TCO/km. Decisão de implementação fica com o implementador (trade-off: clareza vs. overhead de chamada por linha).

### Índice de suporte (a verificar)

Antes de implementar, verificar se existe índice em `expenses(vehicle_id, category, full_tank)` ou se o índice existente em `expenses(vehicle_id, category, occurred_at)` é suficiente para o filtro de `full_tank = true`. Criar índice partial se ausente:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_vehicle_fuel_full_tank
  ON public.expenses (vehicle_id, occurred_at)
  WHERE category = 'fuel' AND full_tank = true AND deleted_at IS NULL;
```

---

## Critérios de Aceite (Sumário)

| CA    | Critério                                                                                                                                           | Regra            |
|-------|----------------------------------------------------------------------------------------------------------------------------------------------------|------------------|
| CA-01 | Frota com ≥ 2 veículos e dados suficientes: seção exibe tabela com veículos, métricas e percentis                                                 | R-BENCH-01, R-BENCH-02 |
| CA-02 | Frota com 1 veículo: empty state informativo, sem erro, sem tabela vazia                                                                          | R-BENCH-02       |
| CA-03 | Veículo com < 5 abastecimentos `full_tank`: km/L = "—" com tooltip; demais métricas exibem dados disponíveis                                       | R-BENCH-03, R-ANA-01 |
| CA-04 | Nenhum dado de outro workspace aparece no conjunto de comparação                                                                                   | R-BENCH-01, S18  |
| CA-05 | Percentil exibido como chip semântico com label textual; sem ranking posicional numerado nem metáfora competitiva                                   | R-BENCH-04, R-DS-03 |
| CA-06 | RPC tem `SECURITY DEFINER` + `SET search_path = ''` + `REVOKE FROM PUBLIC; GRANT TO authenticated`                                                | S7, S9, S18      |
| CA-07 | `cost_per_km` é `null` quando `total_km = 0`; nunca exibe `Infinity` nem `NaN`                                                                    | R-ANA-04         |
| CA-08 | Resposta do endpoint inclui `TTL 1h` via `staleTime`; invalidação ao criar/atualizar expense fuel ou manutenção                                    | R-ANA-06         |
| CA-09 | Linha do veículo ativo (contexto `single`) destacada visualmente; sem destaque quando não há contexto ou contexto é coletivo                       | RF-09            |
| CA-10 | Médias da frota calculadas apenas sobre veículos com dados não-nulos para cada métrica; nunca calcula média incluindo `null` como zero             | RF-05, R-ANA-04  |

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
|      |             |         |
