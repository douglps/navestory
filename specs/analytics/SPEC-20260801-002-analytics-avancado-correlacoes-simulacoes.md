---
id: SPEC-20260801-002
title: "Analytics Avançado — Correlações, Simulações e Personalização"
status: approved
date: 2026-08-01
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-ANA-03, R-ANA-07, R-ANA-09, R-ANA-05, R-ANA-06]
security: [S1, S2]
camadas: [frontend, backend, database]
---

# SPEC-20260801-002 — Analytics Avançado: Correlações, Simulações e Personalização

## Contexto

O navestory já possui motor de analytics com TCO, tendência de combustível, anomalias, benchmarking, projeção e sazonalidade (SPEC-20260622-001). A próxima camada de valor para power users é revelar **padrões entre variáveis** (correlações km × consumo, categorias de gasto que se relacionam temporalmente) e permitir **simulações hipotéticas** ("e se eu reduzir X% nos gastos de combustível?") com ajuste interativo de parâmetros.

Esta feature é **anunciada e documentada no produto** — distinta de SPEC-20260801-001 (easter egg), que é mecânica de descoberta não anunciada. Correlação, simulação e personalização foram deliberadamente promovidas de "camada do easter egg" para feature de produto normal, porque um critério de desbloqueio explícito e comunicado deixa de ser mecânica de descoberta (torna-se achievement formal, categoria de gamificação distinta com dinâmica diferente).

A RPC `seasonal_expense_heatmap` (SPEC-20260622-001 RF-06) agrega por `month_number` (1–12), perdendo a dimensão do ano — o que impede correlação temporal real entre anos. Uma nova RPC é necessária para esta feature.

## Objetivo

Adicionar uma seção de "Analytics Avançado" na página `/analytics` expondo: (1) card de correlação km × consumo por veículo, (2) card de correlação categoria × categoria com guardrail estatístico (R-ANA-09), (3) simulador "e se" de impacto de variações percentuais de gastos, e (4) controles de personalização de parâmetros de simulação — recálculo determinístico client-side, sem nova RPC de simulação.

## Histórias de Usuário e Critérios de Aceitação

### US-01: Correlação km × consumo por veículo

**Como** usuário com histórico de abastecimentos, **quero** ver a correlação entre km rodados e eficiência de combustível por veículo, **para** entender se meu padrão de uso afeta a eficiência.

- **Dado que** tenho pelo menos 5 pares válidos `(km_delta, km_per_liter)` em cache, **quando** acesso a seção de correlações, **então** vejo o coeficiente de correlação acompanhado do N utilizado.
- **Dado que** vejo um coeficiente exibido, **quando** leio o texto descritivo, **então** ele diz "Padrão observado com N registros", nunca "descoberta".
- **Dado que** tenho menos de 5 pares válidos para o veículo selecionado, **quando** acesso o card, **então** ele exibe o empty state definido em RF-06.

### US-02: Correlação categoria × categoria com guardrail estatístico

**Como** usuário com histórico de múltiplas categorias de gasto, **quero** saber quais categorias tendem a ocorrer no mesmo mês, **para** planejar meses de gasto alto com antecedência.

- **Dado que** tenho pelo menos 8 pares completos de meses com ambas as categorias ativas (R-ANA-09), **quando** acesso o card de correlação categoria × categoria, **então** o coeficiente é exibido acompanhado do N ao lado.
- **Dado que** tenho menos de 8 pares completos para um par de categorias, **quando** acesso o card, **então** o coeficiente NÃO é exibido para aquele par — apenas dados brutos agregados, se disponíveis.
- **Dado que** qualquer coeficiente é exibido, **quando** leio o texto descritivo, **então** ele nunca usa a palavra "descoberta" — apenas "Padrão observado com N registros".

### US-03: Simulação "e se" com pré-requisito de histórico

**Como** usuário com pelo menos 6 meses de histórico, **quero** ajustar um parâmetro percentual de variação de gasto e ver a projeção mensal recalculada, **para** tomar decisões de economia embasadas nos meus próprios dados.

- **Dado que** tenho 6+ meses de histórico (R-ANA-03), **quando** ajusto o slider de "variação em X%", **então** a projeção é recalculada client-side com debounce de 200ms, sem nova chamada ao backend.
- **Dado que** tenho menos de 6 meses de histórico, **quando** acesso a aba de simulação, **então** vejo o empty state de RF-06 explicando o motivo.

### US-04: Personalização de parâmetros de simulação

**Como** power user, **quero** ajustar categoria alvo, percentual de variação e período de referência da simulação, **para** explorar cenários específicos do meu caso de uso.

- **Dado que** estou na simulação e altero a categoria via `Select` e o percentual via `Slider`, **quando** paro de interagir por 200ms, **então** a projeção é atualizada com os novos parâmetros.
- **Dado que** navego para outra página e retorno à simulação, **quando** a seção é montada, **então** os parâmetros estão nos valores default (`categoria: fuel`, `variação: 0%`, `período: 3m`) — estado efêmero, não persiste no backend.

## Requisitos Funcionais

### RF-01 — Card de correlação km × consumo

Calcula e exibe a correlação entre distância percorrida e eficiência de combustível por veículo, a partir da série `fuel_consumption_trend` (SPEC-20260622-001 RF-02) já em cache React Query:

- **Métrica:** coeficiente de correlação de Pearson calculado client-side sobre os pares `(odometer_km_delta, km_per_liter)` disponíveis
- **Guardrail:** abaixo de 5 pares válidos com `km_per_liter IS NOT NULL`, não exibe coeficiente (consistente com R-ANA-01)
- **Exibição obrigatória:** coeficiente + N utilizado + direção do padrão em linguagem natural (ex: "maior distância mensal associada a menor consumo")
- **Texto proibido:** nunca usar a palavra "descoberta" — padrão: "Padrão observado com N registros"

### RF-02 — Card de correlação categoria × categoria (guardrail R-ANA-09)

Correlação entre pares de categorias de gasto baseada em coocorrência mensal temporal, a partir dos dados de `expense_category_monthly_series` (RF-03):

- Para cada par de categorias `(A, B)`: contar quantos `year_month` distintos têm ambas com `total > 0` → N pares completos
- **Guardrail (R-ANA-09):** se `N < 8`, o coeficiente NÃO é calculado nem exibido para aquele par — apenas dados brutos agregados podem ser mostrados, se houver
- Todo coeficiente exibido acompanha `N` ao lado (ex: "coef. 0,72 — N=11 meses")
- Texto nunca usa "descoberta" — padrão: "Padrão observado com N registros"
- Exibe os 3 pares de categorias com maior coeficiente positivo e N ≥ 8 (se existirem)
- Pares sem N suficiente ficam em empty state inline, não em estado de erro

### RF-03 — Nova RPC `expense_category_monthly_series(vehicle_id?)`

A `seasonal_expense_heatmap` agrega por `month_number` (1–12), perdendo a dimensão do ano — impossibilitando correlação temporal entre anos. Nova RPC necessária:

**Output:** TABLE

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| year_month | DATE | Primeiro dia do mês (ex: `2026-03-01`) |
| category | TEXT | Categoria de gasto |
| total | NUMERIC | Soma de `amount` no mês |
| vehicle_id | UUID | ID do veículo; `NULL` quando agregado de frota |

**Regras:**
- `SECURITY INVOKER` com RLS em `expenses` garantindo isolamento por `auth.uid()` (R-ANA-05)
- Filtro por `vehicle_id` quando fornecido; `NULL` = toda a frota do usuário autenticado
- `HAVING SUM(amount) > 0` — retorna apenas meses com ao menos 1 registro
- Ordenado por `year_month DESC`

**Endpoint REST:** `GET /analytics/category-series`
- Autenticação obrigatória (S1)
- Query param: `vehicle_id` (UUID, opcional)
- Cache: `Cache-Control: max-age=3600, stale-while-revalidate=600` (R-ANA-06); React Query `staleTime: 60 * 60 * 1000`

### RF-04 — Simulador "e se" (client-side determinístico)

Reimplementa client-side a lógica de média móvel de 3 meses de `forecast_monthly_costs` (SPEC-20260622-001 RF-05) com ajuste paramétrico por categoria:

**Lógica:**
1. Obter dados históricos mensais já em cache React Query de `forecast_monthly_costs`
2. Para os meses históricos, substituir o total da categoria alvo pelo valor ajustado: `total_categoria * (1 + variacao_pct / 100)`
3. Recalcular a média móvel de 3 meses sobre a série modificada
4. Exibir projeção recalculada sobreposta à projeção original (para comparação)

**Controles e comportamento:**
- Debounce de 200ms em qualquer mudança de parâmetro antes de recalcular
- Sem chamada ao backend para o caso determinístico — tudo calculado no cliente
- Pré-requisito: 6 meses de histórico (R-ANA-03); abaixo disso, exibe empty state (RF-06)

### RF-05 — Personalização de parâmetros de simulação

Controles da simulação:

| Controle | Componente | Valores | Default |
|----------|-----------|---------|---------|
| Categoria alvo | `Select` | Lista das categorias com dados disponíveis | `fuel` |
| Variação percentual | `Slider` | -50% a +50%, passo 5% | `0%` |
| Período de referência | `Select` | 3 meses / 6 meses | `3 meses` |

- Estado de simulação é **efêmero por sessão** — não é persistido no backend nesta fase
- Ao navegar para outra rota e retornar, parâmetros retornam ao default no mount
- Componentes seguem R-DS-09 (nunca elemento HTML nativo sem estilo)

### RF-06 — Empty states por seção

| Seção | Condição | Mensagem | CTA |
|-------|---------|---------|-----|
| Correlação km × consumo | < 5 pares válidos `(km_delta, km_per_liter)` por veículo | "Registre mais abastecimentos com tanque cheio para ver correlações de consumo." | — |
| Correlação categoria × categoria | N < 8 pares completos para todos os pares | "Dados insuficientes para calcular correlações entre categorias. Continue registrando." | — |
| Simulação | < 6 meses de histórico (R-ANA-03) | "Projeções e simulações requerem pelo menos 6 meses de dados." | — |

Empty states seguem o padrão de RF-15 de SPEC-20260622-001: mensagem explicativa + sem estado de erro.

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Performance — correlação client-side | Cálculo de Pearson sobre série de até 100 pares: < 10ms |
| RNF-02 | Performance — nova RPC | `expense_category_monthly_series`: < 300ms para frotas de até 50 veículos |
| RNF-03 | Performance — recálculo de simulação | Debounce 200ms + recálculo sobre 60 meses: < 50ms |
| RNF-04 | Segurança | Autenticação obrigatória (S1); RLS em `expenses` via `SECURITY INVOKER` (S2) |
| RNF-05 | Acessibilidade | `aria-label` em slider e cards de coeficiente; dados tabulares como alternativa a visualizações gráficas |

---

## Fora de Escopo

- Não inclui: persistência de parâmetros de simulação no backend nesta fase (estado efêmero por sessão)
- Não inclui: correlações envolvendo dados de outros usuários — toda query filtra por `auth.uid()` (R-ANA-05)
- Não inclui: correlações com variáveis externas (preço de combustível de mercado, clima, sazonalidade econômica)
- Não inclui: simulação de múltiplos cenários simultâneos — apenas 1 configuração ativa por vez
- Não inclui: export de resultados de simulação — pode ser adicionado em fase posterior (ver RF-16 de SPEC-20260622-001)
- Não inclui: modelos preditivos de ML — apenas estatística descritiva e média móvel determinística

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260622-001 RF-02 | `fuel_consumption_trend` — série de consumo usada em RF-01 |
| Spec | SPEC-20260622-001 RF-05 | `forecast_monthly_costs` — lógica de média móvel reimplementada client-side em RF-04 |
| Spec | SPEC-20260622-001 RF-06 | `seasonal_expense_heatmap` — padrão de RPC seguido pela nova `expense_category_monthly_series` (RF-03) |
| Regra | R-ANA-03 | 6 meses de histórico como pré-requisito para forecast e simulação |
| Regra | R-ANA-05 | Dados de analytics nunca expõem dados de outros usuários |
| Regra | R-ANA-06 | Cache de 1h para RPCs de analytics; invalidação em mutations de expenses |
| Regra | R-ANA-09 | N mínimo de 8 pares completos de meses para correlação categoria × categoria |
| Biblioteca | recharts (^3.9.2) | Já adotada em SPEC-20260622-001 — scatter chart para correlação km × consumo; line chart dupla para simulação vs. projeção base |

---

## Notas Técnicas

- **Prioridade de implementação:** validar adoção do card de correlações (RF-01, RF-02) antes de investir em personalização avançada de simulação (RF-04, RF-05). Simulação e personalização são features de power user — adoção histórica estimada em 5–15% da base; RF-01/RF-02 têm maior impacto inicial.
- **Coeficiente de Pearson client-side:** função pura de ~10 linhas sobre array de pares numéricos. Não introduzir biblioteca de estatística para isso — implementação direta é mais adequada.
- **Nova RPC vs. reutilização de `seasonal_expense_heatmap`:** a limitação de `month_number` (1–12) é estrutural na RPC existente — não pode ser contornada sem nova RPC. `expense_category_monthly_series` retorna `year_month` como `DATE`, preservando a dimensão temporal completa.
- **`SECURITY INVOKER` obrigatório:** seguir o padrão estabelecido no changelog de SPEC-20260622-001 (2026-07-16) — `SECURITY INVOKER` com RLS das tabelas subjacentes como mecanismo primário de isolamento.
- **Simulação determinística:** os dados históricos já estão em cache React Query de `forecast_monthly_costs`. A lógica de média móvel é reimplementada como função utilitária no frontend — sem nova chamada de rede.
- **Não criar `## Implementação` nesta spec** — o código aponta para a spec via `// @spec SPEC-20260801-002 RF-XX`.
