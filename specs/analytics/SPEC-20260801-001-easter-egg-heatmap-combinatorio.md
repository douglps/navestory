---
id: SPEC-20260801-001
title: "Easter Egg — Heatmap Sazonal e Análise Combinatória"
status: approved
date: 2026-08-01
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-ANA-07, R-ANA-08, R-DS-07, R-NAV-06]
security: [S1, S2]
camadas: [frontend, backend]
---

# SPEC-20260801-001 — Easter Egg: Heatmap Sazonal e Análise Combinatória

## Contexto

O navestory já disponibiliza o heatmap sazonal de gastos (mês × categoria) na página `/analytics`, alimentado pela RPC `seasonal_expense_heatmap` (SPEC-20260622-001 RF-06). Esses mesmos dados contêm informação de coocorrência entre categorias — saber que "combustível e manutenção aparecem juntos em julho" é um insight relevante, mas entregá-lo como feature anunciada reduziria sua descoberta a uma apresentação de dado convencional.

Esta spec formaliza o comportamento validado em protótipo interativo aprovado (artefato HTML de showcase): um widget discreto, não anunciado, que revela uma análise combinatória ao usuário que desenvolve hábito de uso. A mecânica é de descoberta orgânica — distinta de um sistema de achievements formal com barra de progresso ou critério explícito. Decisões de design contidas no protótipo estão fechadas e não devem ser reabertas.

## Objetivo

Adicionar um widget miniaturizado de heatmap no bloco `FleetChartsSection` do dashboard que permanece latente até que o usuário atinja 40% de presença mensal (R-ANA-08), momento em que revela um diagrama de coocorrência de categorias de gasto — sem nova rota, sem layout adicional e respeitando `prefers-reduced-motion`.

## Histórias de Usuário e Critérios de Aceitação

### US-01: Descoberta orgânica do widget

**Como** usuário do navestory com histórico de uso crescente, **quero** descobrir organicamente uma visualização escondida, **para** sentir que o produto me recompensa pelo hábito de registrar dados regularmente.

- **Dado que** estou na primeira semana de uso (≤ 7 dias desde `auth.user.created_at`), **quando** o widget é renderizado no dashboard, **então** um ponto pulsante discreto aparece sobreposto ao widget — sem título, sem tooltip, sem texto explicativo sobre o critério de desbloqueio.
- **Dado que** realizei hover (desktop) ou tap (mobile) sobre o widget pela primeira vez, **quando** retorno ao dashboard, **então** o ponto pulsante não aparece mais (estado permanente via `localStorage`).
- **Dado que** passaram 7 dias desde o primeiro login sem interação com o widget, **quando** acesso o dashboard, **então** o ponto pulsante não aparece mais (expiração por data).

### US-02: Transição para estado desbloqueado

**Como** usuário com pelo menos 40% de presença mensal nos últimos 12 meses, **quero** que o widget transite para um estado expandido sem interrupção de fluxo, **para** acessar o diagrama de coocorrência sem sair do dashboard.

- **Dado que** atingi ≥ 40% de presença mensal (R-ANA-08), **quando** o widget é carregado/reavaliado, **então** ele transiciona em ~550ms com easing suave do estado latente para o desbloqueado, sem novo layout ou rota.
- **Dado que** tenho `prefers-reduced-motion: reduce` ativado, **quando** a transição ocorre, **então** ela é instantânea — sem animação, sem pulsação (RF-05).
- **Dado que** o widget está desbloqueado, **quando** clico ou toco sobre ele, **então** um drawer embutido no mesmo card exibe o diagrama de coocorrência de categorias.

### US-03: Resiliência visual

**Como** usuário com baixa atividade registrada, **quero** que o widget não me mostre um estado de erro ou elemento quebrado, **para** não gerar confusão sobre o estado do sistema.

- **Dado que** não atingi o limiar de desbloqueio e não há dados suficientes, **quando** o widget é renderizado, **então** ele aparece em estado latente puro (grid miniaturizado, opacidade ~28%) sem mensagem de erro e sem empty state explícito.

## Requisitos Funcionais

### RF-01 — Widget miniaturizado em estado latente

Widget de grid 12×5 (12 meses × 5 categorias top) posicionado discretamente no canto do bloco `FleetChartsSection` do dashboard. Em estado latente:

- Sem título, sem tooltip, sem label, sem legenda
- Opacidade CSS: `opacity: 0.28`
- Usa exclusivamente a paleta categórica `--categorical-1..5` (R-DS-07) — nunca tokens de status semântico (`success`, `warning`, `danger`, `info`)
- Alimentado pelos dados já disponíveis no React Query cache da `seasonal_expense_heatmap` (SPEC-20260622-001 RF-06) — sem nova chamada de backend
- Nunca renderiza um estado de erro visível: sem atividade suficiente permanece em estado latente puro

### RF-02 — Ponto pulsante de sinalização (primeira semana)

Durante os primeiros 7 dias após o primeiro login do usuário (comparação client-side entre `Date.now()` e `auth.user.created_at + 7 dias`):

- Um ponto pulsante (classe `animate-pulse`, ~6×6 px, opacidade ~60%) é sobreposto ao canto do widget
- Ao primeiro hover (desktop) ou tap (mobile) sobre o widget: o ponto desaparece permanentemente — estado persistido em `localStorage` com chave `nave_easter_egg_heatmap_seen = true`
- Ao expirar 7 dias sem interação: ponto desaparece sem ação do usuário
- O ponto não é exibido após o desbloqueio (RF-03 toma precedência)
- Não há texto, tooltip ou elemento que explique o significado do ponto — a ambiguidade é intencional

### RF-03 — Desbloqueio por presença mensal (R-ANA-08)

**Presença mensal** = percentual de meses distintos, nos últimos 12 meses de calendário (janela calculada no fuso do usuário, R-TZ-01), com pelo menos 1 registro de despesa ou abastecimento.

- Calculado client-side a partir dos dados já em cache React Query da `seasonal_expense_heatmap` (SPEC-20260622-001 RF-06) — sem nova chamada ao backend
- Ao atingir **≥ 40%** (≥ 5 de 12 meses com ao menos 1 registro), o widget transiciona para o estado desbloqueado
- **Racional do limiar 40%:** abastecimentos reais ocorrem a cada 13–20 dias; presença diária seria inatingível organicamente (R-ANA-08)
- Transição: ~550ms de duração, `ease-out`, sem redimensionamento de layout, sem nova rota ou URL
- `prefers-reduced-motion: reduce` → transição instantânea, sem animação (RF-05)
- O critério de desbloqueio nunca é exibido ao usuário em nenhum momento (barra de progresso, texto explicativo, tooltip ou qualquer indicador de "falta X% para desbloquear")

### RF-04 — Estado desbloqueado: drawer de coocorrência embutido

Ao desbloqueio, o widget abre inline (sem nova rota) um drawer embutido no mesmo card exibindo:

**Diagrama de coocorrência:**
- Nós: categorias de gasto com ao menos 1 ocorrência nos dados disponíveis
- Arcos: ligam pares de categorias que aparecem em pelo menos 1 mês em comum
- Espessura e opacidade do arco: proporcionais à frequência de coocorrência (número de meses em que ambas as categorias têm `occurrence_count > 0`)
- Dados derivados do cache da `seasonal_expense_heatmap` — sem nova RPC
- Cores dos nós: `--categorical-1..5` (R-DS-07)

O diagrama nunca exibe coeficiente numérico (é análise de coocorrência visual, não correlação estatística — a distinção é intencional).

### RF-05 — Acessibilidade e motion safety

- Widget: `aria-label="Visualização de padrões de gasto"` (ou equivalente descritivo)
- Drawer de coocorrência: `aria-label="Diagrama de categorias relacionadas"`
- `prefers-reduced-motion: reduce` elimina toda animação: pulsação do ponto (RF-02) e transição de desbloqueio (RF-03) tornam-se instantâneas — sem fallback parcial
- Contraste dos nós do diagrama validado contra `--background` do tema ativo (WCAG AA mínimo)

### RF-06 — Limpeza de estado no logout

- A chave `nave_easter_egg_heatmap_seen` em `localStorage` é removida no evento de logout, na mesma lista de limpeza que `navestory-dashboard-context` e `navestory-ui-state` (R-NAV-06 por analogia)
- Em nova sessão ou outro dispositivo, o ponto pulsante pode reaparecer (localStorage é por dispositivo — comportamento aceito nesta fase)

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Performance — cálculo client-side | Cálculo de presença mensal e coocorrência sobre array de até 72 itens (`seasonal_expense_heatmap`): < 5ms |
| RNF-02 | Acessibilidade | `aria-label` em widget e drawer; contraste WCAG AA nos nós do diagrama |
| RNF-03 | Motion safety | `prefers-reduced-motion: reduce` elimina toda animação — sem estado intermediário ou fallback parcial |
| RNF-04 | Sem regressão de layout | Widget em estado latente não altera o layout do `FleetChartsSection`; estado desbloqueado não cria nova rota |

---

## Fora de Escopo

- Não inclui: sistema de achievements formal, barra de progresso ou qualquer indicador explícito de critério de desbloqueio
- Não inclui: texto em qualquer momento explicando o critério de 40% — a mecânica de descoberta é intencional e não deve ser reabierta
- Não inclui: nova RPC de backend — reaproveita `seasonal_expense_heatmap` já existente (SPEC-20260622-001 RF-06)
- Não inclui: nova rota ou página — drawer é embutido no card existente
- Não inclui: persistência do estado de desbloqueio no backend nesta fase
- Não inclui: sincronização cross-device do estado `seen` (aceito nesta fase com localStorage por dispositivo)
- Não inclui: coeficiente numérico de correlação — isso é escopo de SPEC-20260801-002

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260622-001 | RPC `seasonal_expense_heatmap` (RF-06) — dados já em cache React Query; widget reaproveita sem nova chamada |
| Regra | R-ANA-07 | Mínimo 6 meses distintos para `seasonal_expense_heatmap` retornar dados; abaixo disso, widget fica latente |
| Regra | R-ANA-08 | Limiar de 40% de presença mensal para desbloqueio do easter egg |
| Regra | R-DS-07 | Paleta `--categorical-1..5` para dados sem status real — obrigatória para nós e arcos do diagrama |
| Regra | R-NAV-06 | Limpeza de `localStorage` no logout — `nave_easter_egg_heatmap_seen` entra na lista |
| Regra | R-TZ-01 | Janela de 12 meses calculada no fuso do usuário |
| Biblioteca | recharts (^3.9.2) | Já adotada em SPEC-20260622-001 — arco de coocorrência pode requerer SVG manual se `recharts` não cobrir o formato |

---

## Notas Técnicas

- **Cálculo de coocorrência:** a partir do array retornado por `seasonal_expense_heatmap`, agrupar por `(month_number, category)` e, para cada par de categorias, contar quantos `month_number` distintos têm ambas com `occurrence_count > 0`. Sem chamada de rede adicional.
- **Cálculo de presença mensal:** contar `month_number` distintos com ao menos 1 registro nos últimos 12 meses de calendário (janela relativa ao fuso do usuário, R-TZ-01). A `seasonal_expense_heatmap` agrega por `month_number` 1-12, não por `year_month` — se o projeto ainda não tiver dados de dois anos, a janela de 12 meses e os 12 buckets de `month_number` são equivalentes. Para usuários com histórico > 12 meses, considerar apenas o subconjunto dos últimos 12 meses calendar via filtro no frontend.
- **Estado latente determinístico:** não há estado intermediário de carregamento para o easter egg em si — ou os dados do React Query estão disponíveis e o limiar é avaliado, ou o widget exibe sua grade latente.
- **Protótipo aprovado como referência visual canônica:** aparência, animação e comportamento de hover foram definidos no artefato HTML de showcase — não reabrir decisões de design nesta spec.
- **Não criar `## Implementação` nesta spec** — o código aponta para a spec via `// @spec SPEC-20260801-001 RF-XX`.
