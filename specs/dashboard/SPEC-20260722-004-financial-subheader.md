---
id: SPEC-20260722-004
title: "Subheader Financeiro — Chips de Categoria e Indicador de Multas"
status: approved
date: 2026-07-22
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-SUB-01, R-SUB-02, R-SUB-03, R-SUB-04, P7, S1, S2]
security: [S1, S2]
camadas: [frontend, backend]
---

# SPEC-20260722-004: Subheader Financeiro — Chips de Categoria e Indicador de Multas

**Status:** approved
**Criada em:** 2026-07-22
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

O shell autenticado do navestory exibe um header fixo no topo seguido diretamente pelo conteúdo da
página. Não existe atualmente nenhuma barra de acesso rápido a informação financeira contextual
nem a módulos de uso frequente.

O projeto de referência `navestory-SaaS-main` possui um `FluidFleetHeader` (subheader de 44 px) que
exibe, abaixo do header principal: até 3 chips das categorias com maior gasto no mês corrente,
atalhos de navegação para Despesas e Manutenções, e um link de Multas com indicador dinâmico de
status. A lógica de dados nessa implementação usa Supabase client direto no browser — padrão que
o navestory não adota; aqui o backend (NestJS) faz a agregação e a expõe via REST.

Estado atual sem esta spec:

- Nenhuma agregação de despesas por categoria está disponível no `DashboardModule`.
- A tela `/fines` (listagem de multas no frontend) **não existe** — o `FinesModule` REST
  (SPEC-20260607-001) existe no backend, mas nenhuma rota de frontend foi criada.
- O shell autenticado (`apps/web/src/app/(app)/layout.tsx`) não possui subheader.

---

## Objetivo

Adicionar uma barra fina persistente abaixo do header do shell autenticado que apresente, em
tempo real e com respeito ao contexto de veículo/grupo ativo do usuário, os três maiores gastos
do mês por categoria (como chips clicáveis) e atalhos de navegação — incluindo um link de Multas
cujo estilo reflete o status agregado das multas pendentes/vencidas do usuário.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Chips de categoria contextual

**Como** usuário autenticado, **quero** ver rapidamente quais categorias consumiram mais orçamento
no mês corrente (filtrado pelo veículo ou grupo em foco, se houver), **para** ter visibilidade
financeira imediata sem navegar até a tela de despesas.

- **Dado que** não há veículo ou grupo em foco, **quando** o subheader carrega, **então** exibe
  até 3 chips das categorias com maior total de despesas de todos os veículos do usuário no mês
  corrente, ordenados por valor total decrescente.
- **Dado que** um veículo está em foco (contexto `single`), **quando** o subheader carrega ou o
  contexto muda, **então** os chips refletem apenas as despesas daquele veículo.
- **Dado que** um grupo está em foco (contexto `group`), **quando** o subheader carrega ou o
  contexto muda, **então** os chips refletem apenas as despesas dos veículos membros do grupo.
- **Dado que** não há despesas no mês corrente (ou o filtro não retorna resultado), **quando** o
  subheader carrega, **então** nenhum chip é exibido (área de chips vazia, sem erro).
- **Dado que** a requisição ainda está em andamento, **quando** o subheader renderiza,
  **então** exibe 3 skeletons animados no lugar dos chips.
- **Dado que** um chip está visível, **quando** o usuário clica nele, **então** navega para
  `/expenses?category=<slug>` com os parâmetros adicionais `vehicleId=<id>` ou `group=<ids>`
  conforme o contexto ativo.

### US-02: Atalhos de navegação

**Como** usuário autenticado, **quero** atalhos de acesso rápido para Despesas e Manutenções
no subheader, **para** navegar sem abrir o menu lateral.

- **Dado que** o usuário está em qualquer tela do shell autenticado, **quando** clica em
  "Despesas" no subheader, **então** navega para `/expenses`.
- **Dado que** o usuário está em qualquer tela do shell autenticado, **quando** clica em
  "Manutenções" no subheader, **então** navega para `/maintenance`.

### US-03: Indicador dinâmico de multas

**Como** usuário autenticado, **quero** um link de "Multas" no subheader que indique
visualmente se tenho multas pendentes ou vencidas, **para** não perder prazos de pagamento.

- **Dado que** o usuário não tem multas ativas (`pending` ou `appealing`), **quando** o
  subheader renderiza, **então** o link "Multas" aparece com estilo neutro (texto secundário),
  sem badge de contagem.
- **Dado que** o usuário tem multas ativas mas nenhuma vencida (`due_date >= hoje`), **quando**
  o subheader renderiza, **então** o link "Multas" aparece com estilo de aviso (`warning`) e
  exibe um badge com a contagem total de multas ativas.
- **Dado que** o usuário tem pelo menos uma multa vencida (`status = pending` e
  `due_date < hoje`), **quando** o subheader renderiza, **então** o link "Multas" aparece com
  estilo de perigo (`danger`) e exibe o badge com a contagem total de multas ativas
  (pendentes + em recurso).
- **Dado que** o usuário clica no link "Multas", **quando** a tela `/fines` não existe no
  frontend, **então** o link aponta para `/fines` (rota reservada) — ver seção Fora de Escopo
  e Dependências.

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Prioridade | História            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------- |
| RF-01 | Criar endpoint `GET /dashboard/spending-highlights` no `DashboardModule` (NestJS). O endpoint recebe como query params opcionais: `vehicleId` (UUID) e `groupIds` (array de UUID, formato `groupIds[]=...`). Retorna as **até 3 categorias** com maior `total_amount` nas despesas do usuário no **mês corrente** (do dia 1 até hoje), filtradas pelo contexto quando fornecido. Cada item da resposta inclui: `category` (string slug), `label` (nome amigável em pt-BR), `total_amount` (number), `count` (number). Registros com `deleted_at IS NOT NULL` são excluídos. Aplica R-SUB-01 e R-SUB-02. | Alta       | US-01               |
| RF-02 | Criar endpoint `GET /dashboard/fines-status` no `DashboardModule`. Retorna o status agregado das multas ativas do usuário: `{ status: 'none' \| 'open' \| 'overdue', count: number }`. Multas consideradas: `status IN ('pending', 'appealing')` e `deleted_at IS NULL`. Vencida: `status = 'pending'` AND `due_date < hoje` (data no fuso do usuário, aplica R-TZ-01). Aplica R-SUB-03 e R-SUB-04.                                                                                                                                                                                                     | Alta       | US-03               |
| RF-03 | Criar componente React `FinancialSubheader` em `apps/web/src/components/layout/financial-subheader.tsx`. O componente é montado no layout autenticado (`apps/web/src/app/(app)/layout.tsx`), abaixo do header existente, com altura fixa de 44 px. Usa TanStack Query para buscar os dados dos endpoints RF-01 e RF-02. Enquanto carrega, exibe 3 skeletons animados na área de chips. Aplica os parâmetros de contexto (veículo/grupo ativo) vindos do `useDashboardStore`.                                                                                                                            | Alta       | US-01, US-02, US-03 |
| RF-04 | Os chips de categoria (área esquerda do subheader) renderizam, para cada item retornado por RF-01: nome curto da categoria (label), valor total formatado em BRL (`R$ X` ou `R$ X,Xk` quando ≥ 1.000), e badge de contagem. Cada chip é um `<Link>` para `/expenses?category=<slug>` com parâmetros adicionais de contexto conforme R-SUB-02. Aplica R-DS-04 (raio `rounded-[6px]`, não `rounded-full`) e tokens semânticos de borda/fundo/hover conforme design system existente.                                                                                                                      | Alta       | US-01               |
| RF-05 | Os atalhos de navegação (área direita do subheader) incluem: "Despesas" → `/expenses`; "Manutenções" → `/maintenance`. São links estáticos, sem lógica de contexto.                                                                                                                                                                                                                                                                                                                                                                                                                                | Alta       | US-02               |
| RF-06 | O link "Multas" (adjacente aos atalhos de navegação, após um separador visual) aplica estilo dinâmico conforme o `status` retornado por RF-02: `'none'` → cor neutra (`text-muted-foreground`); `'open'` → cor de aviso (token `warning`); `'overdue'` → cor de perigo (token `danger`). Quando `count > 0`, exibe badge de contagem aplicando R-DS-01 (`≤ 9` mostra o número real; `> 9` mostra `"9+"`; `0` oculta o badge). O `href` do link é `/fines`, independentemente de a tela existir no frontend.                                                                                        | Alta       | US-03               |
| RF-07 | O componente `FinancialSubheader` observa o store `useDashboardStore` (já existente em `apps/web/src/lib/stores/use-dashboard-store.ts`) e re-executa a query de RF-01 sempre que `activeVehicleId`, `activeGroupData` ou `selectionMode` mudarem. Aplica R-CTX-01.                                                                                                                                                                                                                                                                                                                                     | Alta       | US-01               |
| RF-08 | Adicionar schemas Zod em `packages/validators` para validação dos query params de RF-01 (`categorySummaryQuerySchema`) e da resposta de RF-02 (`finesStatusResponseSchema`).                                                                                                                                                                                                                                                                                                                                                                                                                            | Média      | US-01, US-03        |
| RF-09 | Separador visual (`<div>` de 1 px de largura e ~18 px de altura, cor `border/20`) posicionado entre a área de chips (esquerda) e os atalhos de navegação (direita).                                                                                                                                                                                                                                                                                                                                                                                                                                | Baixa      | US-02               |

---

## Requisitos Não-Funcionais

| ID     | Requisito                                                 | Métrica de Aceite                                                                                                                                                                                        |
| ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Latência do endpoint `GET /dashboard/spending-highlights` | p95 < 300 ms; query com `LIMIT 3` e `GROUP BY category` aplicados na camada de banco, nunca no JavaScript do service                                                                                     |
| RNF-02 | Latência do endpoint `GET /dashboard/fines-status`        | p95 < 200 ms; query filtra somente `status IN ('pending','appealing')` e agrega `COUNT + MIN(due_date)` numa única passagem                                                                              |
| RNF-03 | Autenticação obrigatória                                  | Ambos os endpoints exigem `SupabaseAuthGuard`; 401 para request sem JWT válido; `user_id` derivado do JWT, nunca de query param (S1)                                                                     |
| RNF-04 | Isolamento por usuário                                    | Queries dos dois endpoints filtram por `user_id = auth.uid()` (S2); nenhum dado de outro usuário é acessível, mesmo com `vehicleId` de outro usuário — retorna resultado vazio sem 403                   |
| RNF-05 | Reatividade do subheader                                  | O componente `FinancialSubheader` não bloqueia o render do conteúdo da página; usa `Suspense` ou estado de loading local (skeletons), nunca wrapper de Suspense no layout                                |
| RNF-06 | Consistência visual com design system                     | Cores, raios e tokens do subheader usam exclusivamente os tokens semânticos definidos em SPEC-20260721-001 e SPEC-20260722-001; nenhuma classe Tailwind literal de cor (`text-red-*`, `bg-green-*` etc.) |
| RNF-07 | Contraste WCAG AA                                         | Texto sobre o fundo do subheader (`bg-card/90`) atinge contraste ≥ 4.5:1; aplica C-DS-01                                                                                                                 |

---

## Fora de Escopo

- **Criação da tela `/fines`** (listagem de multas no frontend): o link "Multas" aponta para
  `/fines`, mas a tela em si é uma feature independente — não está no escopo desta spec. O link
  pode resultar em 404 até que a tela seja criada; isso é aceitável em `draft`/`review` e deve
  ser resolvido como dependência ao aprovar esta spec (ver Dependências abaixo).
- **Filtragem de multas por veículo/grupo no indicador**: o indicador de status de multas
  (`/dashboard/fines-status`) reflete **todas** as multas ativas do usuário, sem filtro de
  contexto — o status de multas é uma visão agregada da conta, não por frota em foco.
- **Contagem de multas por veículo individualmente**: exibir multas separadas por veículo é
  escopo da futura tela `/fines`, não do subheader.
- **Exibição de templates ou sugestões de categoria**: os chips mostram apenas as categorias com
  maior gasto real, não sugestões ou categorias vazias.
- **Notificações push derivadas do status de multas**: fora de escopo desta fase (ver
  decisão registrada em `important/PENDENCIAS-E-PROCESSOS.md`).
- **Scroll horizontal na área de chips em mobile**: se os 3 chips não couberem horizontalmente
  em viewports menores que 360 px, o overflow é `hidden` (chips parcialmente visíveis) — sem
  scroll horizontal na barra por hora. Refinamento mobile fica para iteração futura.
- **Atualização em tempo real (WebSocket/SSE)**: a query é executada no mount e ao mudar o
  contexto; sem polling automático nem push de dados.
- **Categorias personalizadas no label do chip**: nesta fase, os labels de categoria seguem o
  mapa estático do projeto (igual ao `CATEGORY_LABELS` do projeto de referência). Integração com
  categorias personalizadas do usuário (`CategoriesModule`) fica para iteração futura.

---

## Dependências

| Tipo       | Referência                                            | Descrição                                                                                                                                                                                                                                                        |
| ---------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec       | SPEC-20260607-001 (approved)                          | `FinesModule` REST — fonte de dados para RF-02 (`/dashboard/fines-status`); tabela `fines` com campos `status`, `due_date`, `deleted_at` deve existir no banco                                                                                                   |
| Spec       | SPEC-20260602-001 (approved)                          | Store `useDashboardStore` com `activeVehicleId`, `activeGroupData`, `selectionMode` — RF-07 observa esses campos; R-CTX-01 se aplica                                                                                                                             |
| Spec       | SPEC-20260721-001 (draft)                             | Design System Fundamentos — tokens semânticos `warning`, `danger`, `muted-foreground` e `border` devem estar definidos antes da implementação de RF-04 e RF-06                                                                                                   |
| Spec       | SPEC-20260722-001 (draft)                             | Direção criativa Canvas Quente — R-DS-03 (cor semântica reservada a status real) e R-DS-04 (raio `rounded-[6px]`) aplicados no subheader                                                                                                                         |
| Spec       | SPEC-20260722-003 (approved)                          | Shell Mobile-First — o subheader deve respeitar os tokens de layout responsivo e não introduzir padding fixo incompatível com R-NAV-03                                                                                                                           |
| Spec       | **TELA `/fines` — decisão registrada (2026-07-22)**   | O link "Multas" aponta para `/fines` mesmo sem a rota existir no frontend hoje (404 temporário aceito pelo usuário). Dívida técnica registrada em `important/PENDENCIAS-E-PROCESSOS.md` — resolve-se quando a tela `/fines` ganhar spec e implementação próprias |
| Backend    | `DashboardModule` (`apps/api/src/modules/dashboard/`) | RF-01 e RF-02 estendem este módulo existente com dois endpoints novos                                                                                                                                                                                            |
| Biblioteca | TanStack Query (já presente em `apps/web`)            | Não adicionar nova dependência; usar a versão instalada                                                                                                                                                                                                          |

---

## Notas Técnicas

### Endpoint de agregação de categoria (RF-01)

A query SQL subjacente ao `GET /dashboard/spending-highlights` deve:

1. Filtrar `expenses` por `user_id`, `deleted_at IS NULL`, e `occurred_at >= INÍCIO_DO_MÊS_NO_FUSO_DO_USUÁRIO` (aplica R-TZ-01 via `user_preferences.timezone`).
2. Quando `vehicleId` fornecido: adicionar `AND vehicle_id = :vehicleId`.
3. Quando `groupIds` fornecido: adicionar `AND vehicle_id = ANY(:groupIds)`.
4. Agrupar por `category`, agregar `SUM(amount)` e `COUNT(*)`.
5. Ordenar por `SUM(amount) DESC`.
6. Aplicar `LIMIT 3` **na query**, não no JavaScript (aplica P7).

A responsabilidade de mapear `category` → `label` amigável em pt-BR é do backend (service), não do frontend — mantém o label consistente em toda a aplicação.

**Verificação de ownership de veículo/grupo**: quando `vehicleId` ou `groupIds` forem fornecidos, o endpoint **não** rejeita com 403 se o recurso pertencer a outro usuário — simplesmente inclui o filtro `user_id` na query de `expenses`, o que garante isolamento natural sem expor a existência de entidades alheias (aplica RNF-04).

### Endpoint de status de multas (RF-02)

A query deve ser uma única passagem sobre `fines WHERE user_id = :userId AND status IN ('pending','appealing') AND deleted_at IS NULL`, retornando `COUNT(*)` e `MIN(due_date)`. A classificação de `'overdue'` vs `'open'` é feita no service comparando `MIN(due_date)` com a data atual no fuso do usuário (aplica R-TZ-01). Não executar duas queries separadas para contar e para verificar vencimento.

### Componente `FinancialSubheader`

- Posicionar no layout em `apps/web/src/app/(app)/layout.tsx`, entre o `<Header />` e o `{children}`, como elemento irmão (não wrapper).
- Não converter o layout para RSC por conta desta feature.
- As duas queries TanStack Query (`useSpendingHighlights`, `useFinesStatus`) são independentes — não usar `Promise.all` no cliente; deixar o cache do TanStack Query gerenciar o paralelismo.
- O `staleTime` recomendado para ambas as queries é de 5 minutos; `refetchOnWindowFocus: true` para atualizar ao retornar ao app.
- O badge de multas aplica R-DS-01: nenhuma string `"9+"` extra deve ser inserida se o valor for ≤ 9.

### Relação com o projeto de referência

A implementação de `FluidFleetHeader` em `navestory-SaaS-main/apps/web/components/layout/fleet-subheader.tsx` é a referência de **comportamento e UX**, não de código. As divergências obrigatórias são:

| Aspecto                | navestory-SaaS-main                            | navestory (esta spec)                                     |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| Fonte de dados         | Supabase client direto no browser              | NestJS REST (RF-01, RF-02)                                |
| Agregação de categoria | `useEffect` + `for` loop no client             | SQL `GROUP BY + SUM + LIMIT 3` no backend                 |
| Status de multas       | Supabase `.from('fines').select()` no client   | `GET /dashboard/fines-status`                             |
| "Hoje" para vencimento | `new Date().toISOString().split('T')[0]` (UTC) | Fuso do usuário via `user_preferences.timezone` (R-TZ-01) |

### Ausência de tela `/fines`

A tela de listagem de multas não existe no frontend do navestory. Decisão do usuário (2026-07-22): o link do subheader aponta para `/fines` mesmo assim — o 404 temporário é aceito até a tela ganhar spec e implementação próprias. Ver dívida registrada em `important/PENDENCIAS-E-PROCESSOS.md`.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data       | O que mudou                                                                                                                                                                                                                                                                                                   | Por quê                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 2026-07-22 | Débito técnico resolvido: a tela `/fines` foi criada e implementada (SPEC-20260722-005). O link "Multas" do subheader não resulta mais em 404. Seções "Ausência de tela `/fines`" e a linha de Dependências correspondente tornam-se históricas — mantidas para registro, sem impacto no comportamento atual. | Fechamento da SPEC-20260722-005, que criou `/fines`, `/fines/new` e `/fines/[id]` no frontend. |
