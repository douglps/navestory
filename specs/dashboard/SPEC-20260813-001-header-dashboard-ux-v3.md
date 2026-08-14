---
id: SPEC-20260813-001
title: "Header + Dashboard UX v3 — Reorganização de Shell, Alertas, KPI Grid e Polimento Visual"
status: approved
date: 2026-08-13
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-NAV-09, R-KPI-01, R-KPI-02]
security: [S1]
camadas: [frontend, design]
---

# SPEC-20260813-001: Header + Dashboard UX v3 — Reorganização de Shell, Alertas, KPI Grid e Polimento Visual

**Status:** approved (RF-01 a RF-09 implementados; RF-10, RF-11, RF-12, RF-14, RF-15, RF-17 implementados; RF-13 bloqueado por regra de backend não definida; RF-16 investigado sem alteração de código, aguarda confirmação visual)
**Criada em:** 2026-08-13 (retroativa — código já existia sem spec formal)
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

> **Nota de processo:** Esta spec foi criada retroativamente em 2026-08-13 para cobrir código já
> implementado que referenciava `@spec SPEC-20260813-001` sem que o documento existisse — violação
> do princípio "specs aprovadas são pré-requisito para implementação" de `.claude/CLAUDE.md`.
> RF-01 a RF-09 reconstituem os requisitos a partir do código fonte via inspeção (grep + leitura
> dos arquivos). RF-10 a RF-17 são novos achados da sessão de auditoria UX de 2026-08-13
> (agentes `ux-researcher` + `ui-layout-reviewer`) ainda não implementados.

---

## Contexto

Em 2026-08-13, uma rodada de auditoria UX cruzou o dashboard e o shell autenticado do navestory
com referências de mercado (Fleetio, Samsara, Drivvo, Driver Profit, Meu KM) e com as personas
Carlos (motorista autônomo, 1 veículo) e Ana (frota pequena, 3–10 veículos). O levantamento
identificou gaps de hierarquia de informação, redundâncias de navegação e inconsistências visuais
que geraram uma série de refatorações no shell (header, sidebar, subheader financeiro) e no corpo
do dashboard (alertas, KPIs, dock de ações, tooltip de gráficos, dialog de contexto de veículo).

As refatorações foram implementadas antes da spec ser escrita. Os requisitos RF-01 a RF-09 foram
reconstituídos a partir da inspeção do código (arquivos `.tsx` e `.ts` em `apps/web`,
`packages/ui` e `packages/validators` que carregam `@spec SPEC-20260813-001`). A sessão de
2026-08-13 acrescentou novos achados (RF-10 a RF-17) que ainda não têm implementação.

**Estado anterior (antes de RF-01 a RF-09):**
- O link "Multas" existia no `FinancialSubheader` e também na sidebar, criando duplicidade.
- O chip de contexto de veículo ficava no header principal, ocupando espaço permanente.
- Os links Despesas/Manutenções/Multas do `FinancialSubheader` duplicavam a sidebar.
- O `ActionDock` desktop ficava no fim da página, abaixo de 5 seções (fora do alcance sem scroll).
- `FleetAlertBar` exibia lista vertical de até 3 linhas — detalhe completo sem ponto global.
- O sino de alertas não existia; não havia cobertura de alertas fora do dashboard.
- O grid de KPIs não diferenciava primários de secundários; teto era 6 KPIs simultâneos.
- `VehicleContextDialog` exibia apenas a lista de seleção, sem preview do veículo em foco.
- Tooltip dos gráficos Recharts usava estilos inline, incompatíveis com dark mode.

---

## Objetivo

1. Eliminar redundâncias de navegação no shell (RF-01, RF-03) sem perder nenhum ponto de acesso.
2. Reorganizar o subheader financeiro para exibir contexto temporal e de veículo no lado direito, com chips de gasto à esquerda (RF-02, RF-03).
3. Tornar as ações de alta frequência e os alertas de frota imediatamente acessíveis sem scroll (RF-04, RF-05, RF-06).
4. Elevar a capacidade e a hierarquia visual do grid de KPIs (RF-07) e o valor informativo do dialog de contexto de veículo (RF-08).
5. Tornar os tooltips de gráficos aderentes ao design system (RF-09).
6. Completar os gaps de UX identificados em 2026-08-13 (RF-10 a RF-17): estado vazio explícito, ordenação por tamanho de frota, posicionamento de widget, sinalização de outlier, largura mínima de card, bug de badge sobreposto, posição do trigger de busca e unificação de iconografia.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Navegação sem duplicidades

**Como** usuário da frota, **quero** que cada destino de navegação apareça em um único lugar,
**para** não me confundir com links repetidos.

- **Dado que** a sidebar exibe o item "Multas", **quando** abro o `FinancialSubheader`,
  **então** não vejo outro link para "Multas" ali.
- **Dado que** o header exibe o chip de contexto de veículo, **quando** abro o
  `FinancialSubheader`, **então** o chip de contexto está no lado direito do subheader (não no header).

### US-02 — Alertas sempre visíveis

**Como** motorista autônomo (Carlos) ou gestor de frota pequena (Ana), **quero** ver um indicador
de alertas em qualquer tela do app, **para** não precisar voltar ao dashboard para saber se há
algo urgente.

- **Dado que** tenho alertas vencidos, **quando** navego para `/expenses` ou qualquer outra rota
  autenticada, **então** o sino no header exibe o badge com a contagem de vencidos.
- **Dado que** não tenho alertas, **quando** abro o dashboard, **então** o `FleetAlertBar` exibe
  "Frota em dia" com badge `variant="success"` (RF-10), não retorna vazio silencioso.

### US-03 — Ações de alta frequência sem scroll

**Como** usuário que registra despesas ou manutenções frequentemente, **quero** acessar as ações
principais imediatamente ao abrir o dashboard, **para** não ter que scrollar até o fim da página.

- **Dado que** estou no dashboard em desktop, **quando** a página carrega, **então** o `ActionDock`
  aparece fixo logo abaixo do header, sempre visível sem scroll.

### US-04 — KPIs com hierarquia clara

**Como** gestor de frota, **quero** ver os KPIs mais importantes destacados dos secundários,
**para** focar no que mais importa sem ser sobrecarregado.

- **Dado que** tenho 6 KPIs ativos, **quando** abro o dashboard, **então** os 4 primários aparecem
  com opacidade normal e os 2 secundários aparecem com divisor e opacidade reduzida (75%).
- **Dado que** quero personalizar meus KPIs, **quando** abro o seletor, **então** posso escolher
  até 8 KPIs (não mais 6).

### US-05 — Dashboard adaptado ao tamanho da frota

**Como** usuário com frota de 2+ veículos (Ana), **quero** ver a grade de veículos antes dos KPIs
numéricos, **para** ter uma visão geral da frota antes de mergulhar nos números.

- **Dado que** tenho 2 ou mais veículos, **quando** abro o dashboard, **então** `VehicleGrid`
  aparece antes de `DashboardKpiGrid`.
- **Dado que** tenho apenas 1 veículo (Carlos), **quando** abro o dashboard, **então**
  `DashboardKpiGrid` aparece antes de `VehicleGrid` (ordem atual mantida).

---

## Requisitos Funcionais

### Retroativos (RF-01 a RF-09) — código já implementado, spec reconstituída

| ID    | Requisito | Arquivo(s) principal(is) | Prioridade | Status |
| ----- | --------- | ------------------------ | ---------- | ------ |
| RF-01 | Link "Multas" migrado do `FinancialSubheader` para a `Sidebar` como item de navegação permanente com badge de contagem (o subheader exibia o link com badge, gerando duplicidade com o item de nav já na sidebar). | `apps/web/src/components/layout/sidebar.tsx` | Alta | Implementado |
| RF-02 | `DashboardDateChip` criado como componente autônomo exibindo data abreviada no formato "Qua, 22 Jul. 26"; posicionado no lado direito do `FinancialSubheader` ao lado do `VehicleContextChip`. O antigo `DashboardDateHeader` no corpo do dashboard é removido. O header principal não exibe mais o chip de contexto de veículo. | `apps/web/src/components/layout/dashboard-date-chip.tsx`, `apps/web/src/components/layout/financial-subheader.tsx`, `apps/web/src/components/layout/header.tsx` | Alta | Implementado |
| RF-03 | Links Despesas, Manutenções e Multas removidos do `FinancialSubheader` (todos já presentes na navegação principal da sidebar, gerando duplicidade). O lado esquerdo do subheader passa a exibir apenas chips de categoria de gasto; o lado direito exibe `VehicleContextChip` + `DashboardDateChip`. | `apps/web/src/components/layout/financial-subheader.tsx` | Alta | Implementado |
| RF-04 | `ActionDock` em desktop saiu da posição no fim da página (abaixo de 5 seções, fora do alcance sem scroll) para uma barra `sticky top-14 z-10` com `backdrop-blur-sm`, exibindo imediatamente as 4 ações mais frequentes. Mobile mantém o FAB inalterado. | `apps/web/src/app/(app)/dashboard/page.tsx` | Alta | Implementado |
| RF-05 | `FleetAlertBar` reformulado de lista vertical de até 3 linhas para uma faixa horizontal de 1 linha com contadores agregados por severidade: badge `variant="danger"` para vencidos (`days_until_due < 0`) e badge `variant="warning"` para próximos. O link "Ver alertas" redireciona para `/maintenance?filter=urgent`. Quando `alerts.length === 0`, o componente retorna `null` (ponto de melhoria: ver RF-10). | `apps/web/src/components/dashboard/FleetAlertBar.tsx` | Alta | Implementado |
| RF-06 | `AlertsBell` criado no header: sino de alertas de cobertura global (todas as rotas autenticadas), em contraste com o `FleetAlertBar` contextual ao dashboard. Tooltip exibe prévia da contagem por severidade. Clique abre Dialog com lista completa de alertas ordenada. Badge `danger` exibido apenas quando `overdueCount > 0`. | `apps/web/src/components/layout/alerts-bell.tsx` | Alta | Implementado |
| RF-07 | `DashboardKpiGrid` dividido em primários (primeiros 4 IDs ativos, opacidade normal) e secundários (IDs restantes, separados por `border-t` com `opacity-75`). Constante `PRIMARY_KPI_COUNT = 4` define o corte. Teto `MAX_ACTIVE_DASHBOARD_KPIS` elevado de 6 para 8 em `packages/validators/src/dashboard.schemas.ts`. | `apps/web/src/components/dashboard/DashboardKpiGrid.tsx`, `packages/validators/src/dashboard.schemas.ts` | Média | Implementado |
| RF-08 | `VehicleContextDialog` ganhou seção `VehicleActivePreview` abaixo da lista de seleção: exibe health score circular, placa e modelo do veículo em foco, até 2 flags de saúde, e links rápidos "Ver despesas" / "Ver manutenção" filtrados pelo `vehicle_id`. Visível apenas quando `selectionMode === "single"` com veículo selecionado. | `apps/web/src/components/layout/vehicle-context-dialog.tsx` | Média | Implementado |
| RF-09 | `ChartTooltip` criado em `packages/ui` para substituir o tooltip padrão do Recharts, que aplica `contentStyle` inline sobrepondo os tokens do design system e quebrando o contraste no dark mode. O novo componente usa `bg-card`, `border-border`, `text-card-foreground` e `text-muted-foreground` — mesmas classes do restante do shell. Consumido via `<Tooltip content={(props) => <ChartTooltip {...props} />} />` nos gráficos em `FleetCharts.tsx`. | `packages/ui/src/components/chart-tooltip.tsx`, `apps/web/src/components/dashboard/FleetCharts.tsx` | Média | Implementado |

### Novos (RF-10 a RF-17) — achados de 2026-08-13, pendentes de implementação

| ID    | Requisito | Contexto / Justificativa | Prioridade | Status |
| ----- | --------- | ------------------------ | ---------- | ------ |
| RF-10 | `FleetAlertBar` deve exibir estado positivo explícito quando não há alertas: mensagem "Frota em dia" com badge `variant="success"`. O estado de loading (dados ainda carregando) deve ser distinguível do estado vazio (dados carregados, zero alertas). Hoje `alerts.length === 0` retorna `null`, impedindo distinguir loading de vazio. | A ausência silenciosa força o usuário a inferir que está tudo bem. Carlos (1 veículo) abre o dashboard frequentemente e precisa de confirmação visual de que nenhuma manutenção está vencida. | Alta | Implementado |
| RF-11 | A ordem das seções do dashboard deve ser condicional ao número de veículos: com 2 ou mais veículos, `VehicleGrid` deve aparecer antes de `DashboardKpiGrid`; com 1 veículo, a ordem atual (KpiGrid → VehicleGrid) é mantida. `UpcomingCostsWidget` segue as regras de RF-12 independentemente desta reordenação. | Para Ana (frota pequena), a visão geral dos veículos é o ponto de entrada mais relevante — identificar qual veículo tem problema antes de olhar os KPIs agregados. Para Carlos (1 veículo), os KPIs numéricos são mais relevantes que o único card de veículo. | Alta | Implementado |
| RF-12 | `UpcomingCostsWidget` deve ser posicionado logo após `DashboardKpiGrid` (3ª seção) em ambos os contextos de frota (1 veículo ou 2+ veículos). Hoje ele aparece após `VehicleSpotlight` (5ª seção), misturado com conteúdo de detalhe de veículo, longe do contexto financeiro. | "Próximos custos" é informação financeira prospectiva — pertence junto dos KPIs financeiros, não do detalhe de veículo. | Alta | Implementado |
| RF-13 | Sinalização visual de outlier de custo/km em dois pontos: (a) flag `cost_outlier` adicionada ao mapa `FLAG_LABEL` de `VehicleHealthCard` como sinal primário no card de veículo; (b) `caption` "Custo acima da média" com `variant="warning"` no `KpiCard` de `cost_per_km` como sinal secundário. **Dependência bloqueante:** o backend precisa emitir o campo `cost_outlier` com um threshold definido (2σ, 50% acima da média ou outro critério — decisão de regra de negócio a ser formalizada em `specs/RULES.md` como regra `R-KPI-*` separada, antes desta implementação). O frontend não deve inferir o outlier localmente. | Outlier de custo é o sinal de maior valor para Carlos — indica possível problema mecânico antes de ele virar manutenção urgente. | Média | Pendente (bloqueado por regra de backend não definida) |
| RF-14 | `KpiCard` em `packages/ui` deve ter largura mínima de 133.25 px. O grid `grid-cols-2 gap-3` em `DashboardKpiGrid.tsx` pode produzir colunas abaixo desse limiar em telas estreitas, quebrando o layout interno do card (número + trend + sparkline). A constraint pode ser implementada como `min-w-[133px]` no próprio `KpiCard` (packages/ui) ou como `min-w-0` + `overflow-hidden` no container do grid (decisão a ser tomada na implementação com inspeção visual). | Evitar quebra de conteúdo interno dos cards em viewports estreitas (ex: iPhone SE 375px com padding). | Média | Implementado |
| RF-15 | Badge de contagem (`NavBadge`) no `AlertsBell` reposicionado para não sobrepor o glifo do ícone `Bell`. Situação atual: botão `h-9 w-9` (36×36px), ícone Bell `size={18}` centralizado (ocupa ~9px a 27px em cada eixo), badge posicionado `absolute right-0.5 top-0.5` (a partir de 2px do canto) com `h-[18px] min-w-[18px]` — o badge cobre a faixa de 16px a 34px, sobrepondo-se à área do ícone (9px a 27px). Solução: aumentar o offset do badge (ex.: `right-0 top-0` com botão ampliado, ou `right-[-2px] top-[-2px]`), ou redesenhar o botão para acomodar o badge na periferia do ícone sem sobreposição. | Bug visual que compromete a legibilidade do ícone quando há alertas urgentes — exatamente o momento mais crítico. | Alta | Implementado |
| RF-16 | `CommandPaletteTrigger` deve estar ancorado de forma previsível no header — à esquerda perto do logo, ou à direita perto dos ícones de ação, nunca aparentando flutuar no centro. Investigação necessária: o wrapper atual é `hidden items-center gap-3 md:flex` sem `flex-1`/`mx-auto`/`justify-center` explícito em `header.tsx`; o efeito de centralização reportado pelo usuário pode ser colateral de algum breakpoint ou herança CSS não capturada em leitura estática. Confirmar visualmente em ambiente rodando antes de implementar. Se confirmado o bug, ancorar o trigger à direita do logo (posição 2, antes do grupo `ml-auto`). | Padrão de mercado: busca fica ancorada — nunca "flutuando" no centro do header. | Média | Investigado, sem alteração de código — análise estática confirmou ausência de `flex-1`/`mx-auto`/`justify-center` em `header.tsx`; DOM já ancorado à esquerda do logo. Confirmação visual em ambiente rodando segue pendente para fechar definitivamente. |
| RF-17 | Migração completa de iconografia para o wrapper `<Icon>` de `packages/ui/src/components/icon.tsx`: (a) eliminar o emoji `🔍` em `apps/web/src/components/layout/command-palette-trigger.tsx` (linha 188) — substituir por `<Icon icon={Search} size="sm" />` ou equivalente; (b) migrar os imports diretos de `lucide-react` restantes no header shell (`alerts-bell.tsx` usa `import { Bell }` direto) para `<Icon icon={Bell} />` via wrapper; (c) auditar demais arquivos do shell que importam Lucide diretamente em vez de passar pelo wrapper. Esta spec não cobre a migração de `kpi-catalog.ts` e `atividades/page.tsx` — já cobertos por SPEC-20260731-007 (approved). Ponto de partida: apenas o shell (header, sidebar, subheader) e `command-palette-trigger.tsx`. | A spec SPEC-20260731-007 escopo incluía apenas kpi-catalog.ts e atividades/page.tsx ("Fora de Escopo" explícito). O wrapper `<Icon>` de packages/ui foi criado na mesma sessão de 2026-08-13 e introduz tokens semânticos de tamanho/cor + regras de acessibilidade (decorativo vs. funcional) que substituem os usos ad-hoc de `size={N} aria-hidden` espalhados pelo código. | Média | Implementado (item (c) migrado também na sidebar: `Car`, `LayoutDashboard`, `FolderTree`, `Receipt`, `Wrench`, `Ticket`, `Shield`, `Settings`, `User`, `PanelLeftOpen/Close`, `LogOut`) |

---

## Requisitos Não-Funcionais

| ID     | Requisito | Métrica de Aceite |
| ------ | --------- | ----------------- |
| RNF-01 | O `AlertsBell` não pode introduzir chamada de API redundante ao já carregado pelo dashboard | Usar query key `["dashboard", "alerts"]` compartilhada com o `FleetAlertBar`; TanStack Query deduplica a requisição por cache |
| RNF-02 | Nenhuma das alterações retroativas (RF-01 a RF-09) pode regredir os testes existentes | `pnpm test` verde no monorepo antes e depois |
| RNF-03 | Acessibilidade: ícones decorativos mantêm `aria-hidden`; ícones funcionais (sino do `AlertsBell`) mantêm `aria-label` descritivo | Verificação por inspeção de código |
| RNF-04 | `ChartTooltip` (RF-09) não pode usar `style` inline que sobreponha as classes Tailwind — usar apenas classes via `cn()` | Nenhum atributo `style` no JSX retornado |
| RNF-05 | RF-15 (reposicionamento do badge): o badge corrigido deve ser visível em WCAG AA — contraste de cor do badge `danger` contra o fundo do botão (`bg-muted` no hover) verificado | Contraste ≥ 3:1 para componente de interface de tamanho pequeno |

---

## Fora de Escopo

- Não inclui: migração de `kpi-catalog.ts` e `atividades/page.tsx` de emoji para Lucide (coberto por SPEC-20260731-007, approved).
- Não inclui: definição do threshold de outlier de custo/km (RF-13 depende disso, mas a definição da regra é responsabilidade de uma entrada separada em `specs/RULES.md` antes da implementação).
- Não inclui: backend para emitir o campo `cost_outlier` (responsabilidade de spec de backend separada).
- Não inclui: testes E2E para os fluxos do dashboard (cobertos por SPEC-20260716-003).
- Não inclui: anonimização de PII em dados de alerta (tratado como spec futura, conforme memória `anonimizacao_spec_futura.md`).
- Não inclui: o persona Roberto (grande frota) — Fase 2, fora de escopo atual.
- Não inclui: alertas por e-mail (adiados para Fase 9, conforme memória `decisao_alertas_email_fase9.md`).

---

## Dependências

| Tipo | Referência | Descrição |
| ---- | ---------- | --------- |
| Spec | SPEC-20260603-001 | Chip de Contexto de Veículo no Subheader — `VehicleContextChip` e `VehicleContextDialog` base que RF-08 estende |
| Spec | SPEC-20260722-004 | Subheader Financeiro — `FinancialSubheader` base que RF-02 e RF-03 modificam |
| Spec | SPEC-20260721-002 | Dashboard v2 — `DashboardKpiGrid`, `FleetAlertBar`, `KpiCard` que RF-05, RF-07 modificam |
| Spec | SPEC-20260730-002 | Shell UX — sidebar e estrutura do `header.tsx` que RF-01, RF-02 tocam |
| Spec | SPEC-20260731-007 | Migração Emoji → Lucide (approved) — RF-17 estende o escopo desta spec ao shell; não duplicar |
| Spec | SPEC-20260804-001 | KPI Spending Window — `MAX_ACTIVE_DASHBOARD_KPIS` compartilhado em `dashboard.schemas.ts` |
| Spec | SPEC-20260730-001 | Vehicle Health Score — `FLAG_LABEL` em `VehicleHealthCard` que RF-13 estende |
| Biblioteca | `recharts` | Integração de `ChartTooltip` (RF-09) via prop `content` do componente `<Tooltip>` do Recharts |
| Biblioteca | `lucide-react` | Wrapper `<Icon>` de `packages/ui` (RF-17) |
| Regra de negócio | A definir em RULES.md | Threshold de outlier de custo/km para RF-13 (ex.: 2σ acima da média histórica do veículo, ou 50% acima da média da frota) — **bloqueante para RF-13** |

---

## Notas Técnicas

### RF-05 e RF-06 — Separação FleetAlertBar / AlertsBell

Os dois componentes consomem a mesma query `["dashboard", "alerts"]` — TanStack Query deduplica a
requisição. A semântica é distinta: `FleetAlertBar` é contextual (aparece só no dashboard, acima
dos KPIs) e exibe contagem resumida. `AlertsBell` é global (header, todas as rotas) e, ao clicar,
expande para lista completa em Dialog. Não criar uma terceira instância do mesmo dado.

### RF-10 — Distinguir loading de vazio no FleetAlertBar

A prop `alerts` hoje é tipada como `FleetAlertItem[]` (nunca `undefined`), pois o componente só é
renderizado quando `alerts && alerts.length > 0` no `dashboard/page.tsx`. Para implementar RF-10,
é necessário inverter a lógica: renderizar `FleetAlertBar` sempre (passando `alerts` como
`FleetAlertItem[] | undefined`), e dentro do componente tratar:

```tsx
if (alerts === undefined) return <FleetAlertBarSkeleton />;     // loading
if (alerts.length === 0) return <FleetAlertBarSuccess />;       // vazio → "Frota em dia"
// ... lógica existente para alerts.length > 0
```

A prop `isLoading: boolean` do `useQuery` deve ser passada ou o componente deve receber
`alerts: FleetAlertItem[] | undefined` e inferir o estado de loading por `alerts === undefined`.

### RF-11 — Ordenação condicional de seções

A lógica de reordenação deve estar na `page.tsx`, não em sub-componentes, para manter o
`DashboardKpiGrid` e `VehicleGrid` como componentes sem opinião sobre sua posição:

```tsx
const isMultiVehicle = (vehicles?.length ?? 0) >= 2;
// Renderizar na ordem correta baseado em isMultiVehicle
```

### RF-13 — Flag de outlier de custo/km

O `FLAG_LABEL` em `VehicleHealthCard` é um dicionário de tipo:
```ts
type FlagType = "overdue_maintenance" | "cost_outlier" | ...;
const FLAG_LABEL: Partial<Record<FlagType, (flag: HealthFlag) => string>> = {...};
```

A extensão de RF-13 requer adicionar `"cost_outlier"` ao enum `FlagType` no schema de validators
e ao `FLAG_LABEL`. Isso não é possível sem que o backend emita o campo — não implementar o frontend
antes da regra de backend estar definida.

### RF-14 — Largura mínima de KpiCards

Cálculo: em viewport de 375px (iPhone SE), com `px-4` no container (8px cada lado = 16px total),
largura disponível = 375 − 16 = 359px. Grid `grid-cols-2 gap-3` (gap = 12px): cada coluna =
(359 − 12) / 2 = 173.5px. Em viewports ainda mais estreitas com `Container` que tenha `max-w`
menor, a coluna pode cair abaixo de 133px. Verificar computando `min-width` no `KpiCard` como
`min-w-[133px]` ou restrição no grid como `grid-cols-2` com `min-w-0` nas células.

### RF-15 — Badge sobreposto ao ícone Bell

Solução recomendada: aumentar o offset do `NavBadge` para `absolute -right-1 -top-1` (fora do
botão) ou converter o botão para `relative overflow-visible` e usar `right-0 top-0` com a badge
com transform negativo. Alternativa: aumentar o botão para `h-10 w-10` e manter o offset atual
— mais espaço para o ícone não ser coberto. Decidir na implementação com inspeção visual.

### RF-16 — Posição do CommandPaletteTrigger

O wrapper em `header.tsx` (linha 93–95) é `hidden items-center gap-3 md:flex` dentro do
fluxo normal do flexbox do header. O header usa `flex h-14 w-full items-center gap-3`. A sequência
de filhos do header é: `[hamburger] [logo] [div: CommandPaletteTrigger] [div.ml-auto: AlertsBell + ...]`.
O `div` do `CommandPaletteTrigger` não tem `flex-1`, mas em função do `gap-3` entre os itens
e do `ml-auto` no grupo direito, o trigger pode parecer centralizado visualmente. Para ancorar
à esquerda (junto do logo), não requer mudança — a posição é correta no DOM. Se o problema
visual for confirmado, investigar se algum `flex-grow` inesperado está expandindo o `div` do trigger.

### RF-17 — Migração de iconografia no shell

Ordem de prioridade de migração (do mais impactante):
1. Emoji `🔍` em `command-palette-trigger.tsx:188` → `<Icon icon={Search} size="sm" />` (bloqueante de coerência visual)
2. `Bell` em `alerts-bell.tsx` → `<Icon icon={Bell} size="md" aria-label="Alertas da frota" />` (ícone funcional, precisa de `aria-label`)
3. Demais ícones Lucide diretos no shell que não passam pelo wrapper (auditar na implementação)

---

## Decisão de Testes

### RF-01 a RF-09 (retroativos)

- RF-05: coberto por `apps/web/src/components/dashboard/FleetAlertBar.spec.tsx` (3 testes) — ✅
- RF-02: coberto por `apps/web/src/components/layout/financial-subheader.spec.tsx` — ✅
- RF-08: coberto por `apps/web/src/components/layout/vehicle-context-dialog.spec.tsx` — ✅
- RF-03, RF-06, RF-07: cobertos indiretamente por suítes existentes; sem teste dedicado — 🔶
- RF-01, RF-04, RF-09: sem teste automatizado (mudanças de posicionamento/CSS e componente de UI puro) — 🔶 aceitável

### RF-10 a RF-17 (novos)

Cada requisito novo deve ter entrada em `specs/TEST_DECISIONS.md` antes de ser implementado.
Sugestão prévia:
- RF-10: teste de componente para `FleetAlertBar` com `alerts={undefined}` (loading) e `alerts={[]}` (vazio)
- RF-11: teste de integração em `dashboard/page.tsx` para verificar ordem dos filhos por contagem de veículos
- RF-15: teste visual (Storybook) ou inspeção de posicionamento CSS
- RF-17: sem teste automatizado (mudança visual); TypeScript valida a tipagem na build

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
| ---- | ----------- | ------- |
| 2026-08-13 | `status: review → approved` | Auditoria técnica (`tech-lead`) do working tree antes do commit; pré-requisito R-KPI-01 v2 (teto 6→8) resolvido em `RULES.md` e ADR-012 (validação JWT local via JWKS) criado para as mudanças de auth relacionadas ao mesmo lote de trabalho. |
| 2026-08-13 | RF-10, RF-11, RF-12, RF-14, RF-15, RF-17 implementados; RF-13 permanece bloqueado; RF-16 investigado (análise estática, sem alteração de código, sem bug confirmado) | Implementação dos requisitos aprovados na mesma data. `matrices/rastreabilidade.md` e `specs/TEST_DECISIONS.md` atualizados como parte do fechamento. |
