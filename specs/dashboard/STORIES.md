# Histórias de Usuário — Dashboard v2
> Épico vinculado a [SPEC-20260721-002](SPEC-20260721-002-dashboard-v2.md).
> Mais de 5 histórias — documento separado conforme convenção do projeto.

**Persona P1 — Douglas (mantenedor):** responsável pela implementação e consistência do código.
**Persona P2 — Gestor de frota:** usuário final que consulta o dashboard diariamente para tomar decisões sobre custos e manutenção.

---

## US-01: KPI Cards com Sparkline e Navegação por Clique

**Como** gestor de frota, **quero** ver os KPIs principais (total de veículos, total de despesas do mês, custo médio/veículo) com a tendência percentual em relação ao mês anterior e um minigrafico de evolução, **para** entender rapidamente se os indicadores estão melhores ou piores sem precisar abrir relatórios.

- **Dado que** estou na página `/dashboard` autenticado, **quando** a página carrega, **então** cada KPI card exibe: valor atual, delta percentual colorido (verde para melhora, vermelho para piora), sparkline de 6 pontos e seta direcional.
- **Dado que** clico em um KPI card, **quando** o clique é registrado, **então** sou navegado para a rota correspondente (`/vehicles`, `/expenses` ou `/maintenance`) sem abrir nova aba.
- **Dado que** o componente `KpiCard` de `packages/ui` já existe, **quando** o dashboard renderiza, **então** o componente local `FleetKpis`/`KpiTile` não é mais utilizado — apenas `KpiCard` do pacote compartilhado.

---

## US-02: Indicador Visual de Saúde do Veículo

**Como** gestor de frota, **quero** ver um indicador de saúde circular (score numérico com anel de progresso SVG) em cada card de veículo, **para** identificar visualmente quais veículos precisam de atenção sem precisar entrar em cada um.

- **Dado que** a página `/dashboard` está carregada com ao menos um veículo cadastrado, **quando** visualizo o grid de veículos, **então** cada card exibe o componente `VehicleHealthScore` com anel SVG preenchido proporcionalmente ao score e o número centralizado.
- **Dado que** o score é 0–49 (crítico), **quando** o componente renderiza, **então** o anel usa a cor `danger` do design system (`--color-danger`).
- **Dado que** o score é 50–74 (atenção), **quando** o componente renderiza, **então** o anel usa a cor `warning` (`--color-warning`).
- **Dado que** o score é 75–100 (saudável), **quando** o componente renderiza, **então** o anel usa a cor `success` (`--color-success`).
- **Dado que** o score não está disponível (null/undefined), **quando** o componente renderiza, **então** exibe anel em cor `--muted` com texto "–" em vez de número.

---

## US-03: Cores Semânticas nos Componentes de Alerta e Saúde

**Como** mantenedor, **quero** que `FleetAlertBar` e `VehicleHealthCard` usem tokens semânticos do design system em vez de classes Tailwind literais hardcoded, **para** que ambos os componentes funcionem corretamente no tema escuro sem modificações adicionais.

- **Dado que** o tema escuro (dark mode) está ativo, **quando** `FleetAlertBar` renderiza um alerta de multa vencida, **então** o fundo usa `--color-danger-pastel` e o texto usa `--color-danger-foreground` — sem classes `bg-red-50`/`text-red-800` literais.
- **Dado que** o tema escuro está ativo, **quando** `VehicleHealthCard` exibe status crítico, **então** todas as cores de estado (crítico/atenção/saudável) derivam de tokens semânticos de `packages/ui/src/tokens/colors.ts`.
- **Dado que** o tema é trocado pelo usuário (light ↔ dark), **quando** a mudança ocorre, **então** os componentes afetados re-renderizam com as cores corretas sem flash ou inconsistência visual.

---

## US-04: Tokens de Superfície e Classes Utilitárias em `globals.css`

**Como** mantenedor, **quero** que `globals.css` declare os tokens de superfície (`--surface`, `--surface-elevated`, `--on-surface`, `--on-surface-muted`, `--on-surface-subtle`), a classe `.glass-card`, a classe `.kicker`, os tokens de chart (`--chart-1` a `--chart-5`, `--chart-grid`) e o token `--finance-outgoing`, **para** que os novos componentes do Dashboard v2 e futuros componentes do design system possam consumir uma base de tokens consistente.

- **Dado que** `globals.css` está carregado no tema light, **quando** inspeciono as variáveis CSS, **então** `--surface`, `--surface-elevated`, `--on-surface`, `--on-surface-muted`, `--on-surface-subtle`, `--chart-1` a `--chart-5`, `--chart-grid` e `--finance-outgoing` estão definidas com valores válidos de cor.
- **Dado que** o tema dark está ativo, **quando** inspeciono as variáveis CSS no bloco `.dark`, **então** os mesmos tokens têm valores distintos adequados ao contexto de fundo escuro.
- **Dado que** o elemento tem a classe `.glass-card`, **quando** renderiza sobre um fundo com imagem/gradiente, **então** o `backdrop-filter: blur(...)` e o fundo translúcido são aplicados conforme especificado.
- **Dado que** o elemento tem a classe `.kicker`, **quando** renderiza, **então** o texto aparece em uppercase, espaçamento de letras maior e tamanho de fonte reduzido (label de seção).

---

## US-05: Controles de Exportação com Feedback Visual e Posição Correta

**Como** gestor de frota, **quero** que o botão de exportação CSV esteja posicionado ao final da página e exiba estados de carregamento e erro, **para** que o fluxo de scroll não seja interrompido por um bloco fora de lugar e eu saiba quando a exportação falhou.

- **Dado que** estou na página `/dashboard` com plano Pro, **quando** a página carrega, **então** o bloco `ExportControls` aparece após todos os demais blocos de conteúdo (última seção antes do footer).
- **Dado que** clico em "Exportar CSV", **quando** o download está em progresso, **então** o botão exibe spinner e texto "Exportando..." e fica desabilitado para evitar cliques duplos.
- **Dado que** a exportação falha (erro de rede ou servidor), **quando** o erro ocorre, **então** o botão volta ao estado normal e uma mensagem de erro é exibida inline (sem alert() do browser).
- **Dado que** estou logado com plano Grátis, **quando** visualizo `ExportControls`, **então** o botão está desabilitado com tooltip explicando que exportação requer plano Pro (aplica R-BIZ-12).

---

## US-06: Grid de Veículos Mais Denso

**Como** gestor de frota com múltiplos veículos, **quero** visualizar mais veículos simultaneamente no grid sem precisar rolar, **para** ter uma visão geral da frota de forma mais eficiente em telas maiores.

- **Dado que** estou em viewport mobile (< 640px), **quando** o grid de veículos renderiza, **então** exibe 2 colunas.
- **Dado que** estou em viewport tablet (640px–1023px), **quando** o grid renderiza, **então** exibe 3 colunas.
- **Dado que** estou em viewport desktop (≥ 1024px), **quando** o grid renderiza, **então** exibe 4 colunas.
- **Dado que** o grid é de 4 colunas, **quando** `VehicleHealthScore` é o componente de indicador do card, **então** o score e o anel SVG cabem no card mais estreito sem overflow ou truncamento.

---

## US-07: Cabeçalho de Data Abreviada

**Como** gestor de frota autenticado, **quero** ver a data atual em formato compacto no topo do dashboard, **para** ter contexto temporal sem texto genérico que não agrega informação.

> **Revisado em 2026-07-22:** a saudação personalizada ("Bom dia/Boa tarde/Boa noite, [nome]") foi removida do escopo por decisão do usuário — o nome do usuário nunca ficou disponível client-side sem um novo endpoint (gap documentado em `matrices/impacto.md` IMPACTO-040 #5), e a saudação sem nome era um texto genérico de baixo valor. Os critérios antigos de saudação por horário foram substituídos pelos abaixo.

- **Dado que** o dashboard carrega, **quando** o cabeçalho renderiza, **então** exibe a data atual no formato abreviado "Dia-da-semana, DD Mês. AA" em pt-BR (ex.: "Qua, 22 Jul. 26"), sem saudação nem nome de usuário.
- **Dado que** o cabeçalho renderiza, **quando** inspeciono o DOM, **então** o H1 "Dashboard" existe apenas como `sr-only` (acessível a leitor de tela), sem equivalente visual — a data abreviada é o único conteúdo visível no lugar do H1 estático anterior.

---

## US-08: Gráficos de Frota Inline (condicional — depende de confirmação de backend)

> **Status:** Bloqueado por decisão de backend — ver RF-08 na spec. Não iniciar implementação sem confirmação do time de API.

**Como** gestor de frota, **quero** ver gráficos de custo/km, consumo de combustível e distribuição de despesas por categoria diretamente no corpo do dashboard, **para** ter insights visuais da frota sem precisar selecionar um veículo ou navegar para a tela de analytics.

- **Dado que** o endpoint de dados de charts está disponível e retorna dados, **quando** o dashboard carrega, **então** `CostPerKmChart` (área, 6 meses), `FuelConsumptionChart` (barras por veículo, mês corrente) e `ExpenseCategoryPie` (rosca por categoria, mês corrente) são renderizados.
- **Dado que** `cost_per_km` é `null` para um veículo (R-ANA-04 — `total_km = 0`), **quando** o chart renderiza, **então** aquele veículo é omitido da série — nunca exibe `Infinity` ou `NaN`.
- **Dado que** os gráficos usam cores, **quando** renderizam, **então** usam exclusivamente os tokens `--chart-1` a `--chart-5` e `--chart-grid` definidos em `globals.css` (US-04).
- **Dado que** os dados de chart estão carregando, **quando** o componente está em estado de loading, **então** exibe skeleton na área do gráfico.

---

## US-09: Widget "Próximos 7 Dias" (concluída em 2026-07-22)

> **Status:** Implementada. A RPC `get_upcoming_costs` já existia (desbloqueado em 2026-07-21); a lista de itens individuais (`UpcomingCostsWidget`) foi concluída em 2026-07-22 — ver `matrices/rastreabilidade.md`.

**Como** gestor de frota, **quero** ver uma lista dos próximos eventos (manutenção agendada, multa com prazo, renovação de documento) dos próximos 7 dias, com valor monetário agregado e indicação de urgência, **para** me antecipar a compromissos financeiros e operacionais.

- **Dado que** a RPC `get_upcoming_costs` existe e retorna dados, **quando** o dashboard carrega, **então** o widget lista até 10 eventos (P6) ordenados por data mais próxima.
- **Dado que** um evento está a ≤ 2 dias, **quando** o widget renderiza aquele item, **então** exibe indicador de urgência visual vermelho (cor `danger` do design system).
- **Dado que** um evento está a 3–5 dias, **quando** o widget renderiza, **então** exibe indicador amarelo (cor `warning`).
- **Dado que** um evento está a 6–7 dias, **quando** o widget renderiza, **então** exibe indicador neutro/cinza.
- **Dado que** não há eventos nos próximos 7 dias, **quando** o widget renderiza, **então** exibe empty state com mensagem "Nenhum compromisso nos próximos 7 dias".
- **Dado que** a RPC retorna mais de 10 eventos, **quando** o widget renderiza, **então** exibe apenas os 10 primeiros e um link "Ver todos" — nunca carrega mais de 10 itens no frontend (P6).
