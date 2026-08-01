---
id: SPEC-20260603-001
title: "Chip de Contexto de Veículo no Subheader + Dialog/Sheet de Seleção"
status: approved
date: 2026-06-03
author: Douglas Lopes (lps.doug@protonmail.com)
rules:
  [
    R5,
    R-CTX-01,
    R-CTX-02,
    R-CTX-03,
    R-CTX-04,
    R-CTX-05,
    R-CTX-06,
    R-CTX-07,
    R-GRP-03,
  ]
security: [S1, S2]
camadas: [frontend, backend]
---

# SPEC-20260603-001: Chip de Contexto de Veículo no Subheader + Dialog/Sheet de Seleção

**Status:** Aprovada
**Criada em:** 2026-06-03
**Aprovada em:** 2026-07-16 (T5.4)
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Revisores:** —

> **Atualização 2026-07-16 (T5.4):** promovida de `draft` para `approved` e implementada na
> mesma tarefa (mesmo padrão de SPEC-20260714-001/SPEC-20260715-001). Um levantamento de código
> pré-implementação encontrou divergências grandes entre esta spec (escrita antes de o
> `FocusSlot`/`Header` reais existirem) e o estado atual do repositório — ver changelog no
> rodapé para o detalhamento completo de cada desvio (RF-18, RF-19, RF-20 e a inexistência de
> `FluidFleetHeader`/`VehicleSwitcherContent`/`Header` citados pela v0.1/v0.2).

> Esta spec implementa os gaps documentados em `docs/user-stories.md §19` (seções 19.1 a 19.12), especificamente os itens G-CTX-01 a G-CTX-99. Consultar aquela seção para o racional de UX completo.

---

## Contexto

A [SPEC-20260602-001](SPEC-20260602-001-em-foco-contexto-global.md) (aprovada e implementada) definiu o "Sistema Em Foco" com o `FocusSlot` posicionado **no sidebar** entre o cabeçalho e os itens de navegação. Após análise de UX registrada em `docs/user-stories.md §19`, identificou-se que o sidebar não é o ponto de interação adequado para o controle de contexto pelas seguintes razões:

1. **Mobile (< 768px)**: o sidebar é um drawer oculto por padrão — o `FocusSlot` fica inacessível exatamente quando o gestor de frota mais precisa trocar de contexto (ex.: persona P-001 em campo, verificando manutenção pelo celular).
2. **Ruído visual**: os cards coloridos (âmbar, azul) criam hierarquia visual errada no sidebar, que é canal de navegação, não de estado de aplicação.
3. **Overflow de Popover**: o `Popover side="right"` pode vazar fora do viewport em viewports estreitos, gerando elemento parcialmente inacessível.
4. **Frequência de uso**: a troca de contexto ocorre múltiplas vezes ao dia (personas P-001 e P-002); o ponto de acesso deve estar sempre visível e acessível, não escondido em um drawer.

### Decisão de migração

O ponto de interação de contexto migra do sidebar para o subheader (`FluidFleetHeader`, componente `fleet-subheader.tsx`). O chip de contexto (`VehicleContextChip`) passa a ser o elemento de entrada para um `Dialog` centralizado no desktop e um `Sheet` bottom-up no mobile. O `FocusSlot` é removido do sidebar; o sidebar retorna a ser canal de navegação puro.

Esta spec **não revoga** as regras R-CTX-01 a R-CTX-06 definidas na SPEC-20260602-001 — todas permanecem válidas. A única diferença é o **ponto de interação** na UI.

### Estado atual dos componentes relevantes

| Componente               | Arquivo                                                       | Situação                                                                                                        |
| ------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `FocusSlot`              | `apps/web/src/components/layout/focus-slot.tsx`               | Implementado; removido do sidebar e do repositório nesta tarefa (lógica extraída para `use-vehicle-context.ts`) |
| `FluidFleetHeader`       | `apps/web/components/layout/fleet-subheader.tsx`              | **Nunca existiu no código real** — ver atualização abaixo                                                       |
| `Sidebar`                | `apps/web/src/components/layout/sidebar.tsx`                  | Importava e renderizava `FocusSlot`; import removido, substituído por dot passivo (RF-16)                       |
| `VehicleSwitcherContent` | `apps/web/src/components/layout/vehicle-switcher-content.tsx` | **Não existia** — criado nesta tarefa a partir da lógica de `focus-slot.tsx`                                    |

> **Atualização 2026-07-16:** o levantamento de código pré-implementação encontrou que **nenhum
> componente de Header/subheader existia no projeto** (`FluidFleetHeader`/`fleet-subheader.tsx`
> citados pela v0.1/v0.2 nunca foram implementados — o app shell tinha apenas `Sidebar` + conteúdo,
> ver `apps/web/src/app/(app)/layout.tsx`). Criado um `Header` novo e mínimo
> (`apps/web/src/components/layout/header.tsx`), renderizado acima do conteúdo no layout `(app)`,
> com o `VehicleContextChip` à direita do logo "navestory". Decisão tomada com o usuário: sem
> hambúrguer/menu mobile (fora de escopo — o sidebar não é drawer hoje, é sempre visível).
> `VehicleSwitcherContent` também não existia; a lógica equivalente (fetch de veículos/grupos,
> resolução de label/ícone, hidratação) estava em `focus-slot.tsx` e foi extraída para o hook
> compartilhado `apps/web/src/lib/context/use-vehicle-context.ts`, reaproveitado a 100% pelo
> `VehicleContextChip` e pelo `VehicleSwitcherContent` novo.

---

## Objetivo

1. Tornar o chip de contexto de veículo permanentemente visível no subheader em todos os breakpoints, inclusive mobile.
2. Substituir o `Popover` lateral (que pode vazar de viewport) por `Dialog` centralizado no desktop e `Sheet` bottom-up no mobile.
3. Remover o `FocusSlot` do sidebar, restaurando o sidebar como canal de navegação puro.
4. Adicionar indicador passivo no sidebar colapsado sem criar um segundo ponto de interação (R-CTX-07).
5. Corrigir os problemas de backend (`limit`, `memberCount` inflado, resposta 404 para soft-delete) que impactam a qualidade dos dados exibidos no switcher.
6. Reforçar a persistência e limpeza de contexto via `sessionStorage` por aba e limpeza no logout.

---

## Requisitos Funcionais

### RF-01 — Chip de contexto no header superior (sempre visível)

O header superior (`Header`, `header.tsx`) deve exibir um `VehicleContextChip` à **esquerda**, imediatamente após o logo (e após o toggle de menu mobile). O chip deve ser visível em todas as páginas autenticadas e em todos os breakpoints (mobile, tablet, desktop).

**Prioridade:** Must

> **Atualização 2026-06-15:** o chip foi movido do subheader (`FluidFleetHeader`) para o header superior (`Header`), à esquerda. O subheader mantém apenas os chips de categoria e os botões de filtro. O botão de ajuste do chip (`ChipSettingsPopover`) foi removido; a configuração de campos exibidos permanece em Perfil → Preferências (SPEC-20260603-003), apenas com a ordem padrão alterada para `['make', 'plate', 'model']`.

---

### RF-02 — Estados visuais do chip por modo

O chip deve refletir o modo de contexto ativo com visual diferenciado, mantendo a convenção de sólido = permanente e tracejado = temporário estabelecida na SPEC-20260602-001:

| Modo        | Fundo                       | Borda                     | Estilo borda | Ícone               | Texto                          |
| ----------- | --------------------------- | ------------------------- | ------------ | ------------------- | ------------------------------ |
| `none`      | transparente                | `border-border/40`        | tracejada    | —                   | "+ Selecionar veículo" (muted) |
| `single`    | `amber-50 / amber-900/20`   | `amber-300 / amber-700`   | sólida       | `Car` âmbar         | placa · make model             |
| `group`     | `blue-50 / blue-900/20`     | `blue-300 / blue-700`     | sólida       | `Boxes` azul        | nome do grupo + count          |
| `multi`     | `amber-100 / amber-800/20`  | `amber-400 / amber-600`   | tracejada    | `Car`               | count de veículos              |
| `attribute` | `violet-50 / violet-900/20` | `violet-300 / violet-700` | tracejada    | `SlidersHorizontal` | label do filtro ativo          |

**Prioridade:** Must

---

### RF-03 — Dimensões e área de toque do chip

O chip deve:

- Ocupar altura total do subheader: `h-11` (44px) para garantir área de toque WCAG 2.5.5 (mínimo 44×44px).
- Ter `max-width: 140px` com `text-overflow: ellipsis` para textos longos (placas, nomes de grupos).
- Não causar layout shift ao navegar entre páginas (vide RNF-03).

**Prioridade:** Must

---

### RF-04 — Botão X para limpar contexto

O chip deve conter um botão "×" visível **somente quando `mode !== 'none'`**. O botão deve:

- Chamar `clearAllSelection()` do `useDashboardStore` ao ser clicado.
- Ter área de toque ampliada via `padding` invisível (mínimo 20×20px de padding além do ícone `X` de 12px).
- Ter `aria-label="Ver toda a frota"` (usando o termo canônico da SPEC-20260602-001).
- Interromper a propagação do evento de clique para não abrir o Dialog/Sheet.

**Prioridade:** Must

---

### RF-05 — Atributo `aria-label` dinâmico no chip

O chip inteiro (excluindo o botão X, que tem `aria-label` próprio) deve ter `aria-label` dinâmico descrevendo o contexto ativo:

- `none`: `"Sem contexto — clique para selecionar veículo"`
- `single`: `"Em foco: [PLACA] — [MAKE MODEL]"`
- `group`: `"Em foco: grupo [NOME] — [N] veículos"`
- `multi`: `"Em foco: seleção personalizada — [N] veículos"`
- `attribute`: `"Em foco: filtro de frota — [LABEL]"`

**Prioridade:** Must

---

### RF-06 — Estado hover e focus-visible do chip

O chip deve ter estado visual de hover e focus-visible claramente distinguível:

- `hover:ring-1 hover:ring-border/60`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`

**Prioridade:** Must

---

### RF-07 — Dialog de seleção no desktop (≥ 768px)

Clicar na área do chip (excluindo o botão X) em viewport ≥ 768px deve abrir um `Dialog` do Radix UI com:

- Posicionamento centralizado na tela com backdrop blur (`backdrop-blur-sm bg-black/20`).
- Largura `w-[calc(100%-2rem)] max-w-[380px]`.
- Conteúdo: `VehicleSwitcherContent` existente (sem modificação de props ou lógica interna).
- Sem título visível — apenas o campo de busca como primeiro elemento focado.

**Prioridade:** Must

---

### RF-08 — Captura do evento Esc no Dialog

O Dialog deve capturar o evento `Escape` com `event.stopPropagation()` para não conflitar com o handler global do sidebar (que fecha o drawer mobile no Esc).

**Prioridade:** Must

---

### RF-09 — Skeleton e tratamento de erro no Dialog

Enquanto a lista de veículos carrega, o Dialog deve exibir skeleton animado (`animate-pulse`) no lugar dos itens. Se a chamada de API falhar após 8 segundos de timeout, deve exibir mensagem de erro com botão "Tentar novamente" que reexecuta o fetch.

**Prioridade:** Must

---

### RF-10 — Animação de fechamento do Dialog

O Dialog deve fechar com animação de saída de 150ms (`animate-out fade-out duration-150`) ao selecionar um item (o `VehicleSwitcherContent` já chama `onClose()` após seleção).

**Prioridade:** Should

---

### RF-11 — Sheet de seleção no mobile (< 768px)

Clicar na área do chip em viewport < 768px deve abrir um `Sheet` implementado com `vaul` que:

- Desliza de baixo para cima cobrindo aproximadamente 70% da altura da tela (`snap-points: [0.7]`).
- Exibe um `handle` de drag visível no topo do Sheet (barra cinza 32×4px, `rounded-full`).
- Contém o `VehicleSwitcherContent` existente.

**Prioridade:** Must

---

### RF-12 — Safe area no rodapé do Sheet

O rodapé do Sheet (área abaixo da lista de veículos) deve aplicar `padding-bottom: env(safe-area-inset-bottom)` para suporte a iPhone com notch e Dynamic Island.

**Prioridade:** Must

---

### RF-13 — Contenção de scroll no Sheet

O Sheet deve ter `overscroll-behavior: contain` no container de lista para evitar que o scroll da lista propague para o conteúdo de página por trás do Sheet.

**Prioridade:** Must

---

### RF-14 — Modo offline no Sheet

O Sheet deve exibir a lista cacheada (`staleTime: 60000ms`) com um banner "Sem conexão — dados podem estar desatualizados" quando o hook `useOnlineStatus` detectar `navigator.onLine === false`. O banner não bloqueia a interação com a lista cacheada.

> **Nota:** o projeto usa TanStack Query, não SWR (ADR-008) — `staleTime: 60_000` na config do
> `useQuery` implementa a mesma ideia com a lib real do projeto. Isso não é um desvio de escopo,
> apenas terminologia; `useOnlineStatus` não existia e foi criado (`apps/web/src/lib/hooks/use-online-status.ts`).

**Prioridade:** Should

---

### RF-15 — Remoção do FocusSlot do sidebar

O componente `FocusSlot` deve ser removido completamente do `sidebar.tsx`:

- Remover o `import { FocusSlot }` e a renderização `<FocusSlot ... />` (linha ~421 do arquivo atual).
- Remover o callback `onManageGroups` passado ao `FocusSlot` (que chamava `toggleAside()`).
- O sidebar passa a exibir apenas: logo/cabeçalho, navegação (section1), ajustes (section2) e botão de logout.
- O cálculo de `fixedElementsHeight` no `ResizeObserver` deve ser ajustado: remover os ~56px do FocusSlot (de 280px para ~224px).

**Prioridade:** Must

---

### RF-16 — Dot passivo de contexto no sidebar colapsado

No sidebar colapsado (`w-16`), adicionar na área do logo (abaixo do botão toggle desktop) um dot circular passivo (sem interação, sem cursor pointer, `aria-hidden="true"`) que indica visualmente o modo de contexto ativo por cor:

| Modo        | Cor do dot               |
| ----------- | ------------------------ |
| `none`      | `bg-muted-foreground/30` |
| `single`    | `bg-amber-400`           |
| `group`     | `bg-blue-400`            |
| `multi`     | `bg-amber-500`           |
| `attribute` | `bg-violet-400`          |

O dot é `w-2 h-2 rounded-full` e não deve receber cliques nem foco — R-CTX-07 proíbe este componente de abrir o switcher.

**Prioridade:** Should

---

### RF-17 — Limpeza de contexto no hold-para-logout

O handler `startHolding()` no sidebar já chama `useDashboardStore.getState().clearAllSelection()` antes de submeter o formulário de logout (anotado `// @spec SPEC-20260602-001 RF-19`). A anotação deve ser atualizada para referenciar também esta spec:

```ts
// @spec SPEC-20260602-001 RF-19, SPEC-20260603-001 RF-17
```

> **Atualização 2026-07-16:** não existe gesto de "hold" no botão de logout do sidebar real — é
> um `onClick` simples chamando `logout()`. Nenhum gesto de hold novo foi implementado (fora do
> escopo desta tarefa e não solicitado pelo usuário); o requisito já está satisfeito pelo `onClick`
> existente, que chama `logout()` (corrigido por RF-21/RF-23 nesta mesma tarefa). Anotação
> atualizada em `apps/web/src/components/layout/sidebar.tsx`.

**Prioridade:** Must

---

### RF-18 — Ajuste de limite de veículos na query

A query de veículos e de grupos deve usar `.limit(100)`, alinhado com P1 (listagens paginadas, máximo 100/página).

> **Atualização 2026-07-16:** o texto original supunha uma migração de `.limit(20)` para
> `.limit(100)` em `VehicleSwitcherContent` (client-side, Supabase direto). Levantamento de
> código encontrou que: (1) o projeto não faz queries Supabase direto do browser — `VehiclesService.findAll`
> e `VehicleGroupsService.findAll` (NestJS, `apps/api`) já filtram e retornam os dados via REST;
> (2) nenhuma das duas queries tinha **qualquer** `.limit()` antes desta tarefa — não era
> "20→100", e sim "sem limite→100". Corrigido em `apps/api/src/modules/vehicles/vehicles.service.ts::findAll`
> e `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts::findAll`.

**Prioridade:** Must

---

### RF-19 — Filtro de membros deletados na query de grupos

A query de grupos em `VehicleSwitcherContent` deve filtrar membros com `deleted_at IS NULL` no join para evitar que o `memberCount` inclua veículos soft-deleted:

```ts
// Atual (linha 61):
.select('id, name, color, vehicle_group_members(vehicle_id)')

// Esperado:
.select('id, name, color, vehicle_group_members!inner(vehicle_id, vehicles!inner(id, deleted_at))')
// + filtro: .eq('vehicle_group_members.vehicles.deleted_at', null)
```

Ou alternativamente, contar apenas `memberIds` que estejam presentes na lista de `vehicles` ativos retornada pelo primeiro fetch. O método exato fica a critério do implementador, desde que R-GRP-03 seja satisfeita.

> **Atualização 2026-07-16:** implementado no backend (`VehicleGroupsService.findAll`), não no
> `VehicleSwitcherContent` (que não faz query direta ao Supabase — ver nota de RF-18). Usada a
> segunda alternativa descrita acima: busca-se em paralelo os grupos (com `vehicle_group_members(vehicle_id)`)
> e os veículos ativos do usuário (`.is("deleted_at", null)`), e o `member_count` é calculado em
> memória filtrando membros cujo `vehicle_id` está no conjunto de veículos ativos.

**Prioridade:** Must

---

### RF-20 — Resposta 404 para veículo soft-deleted

Uma request para o veículo em foco deve retornar 404 quando ele está soft-deletado (`deleted_at IS NOT NULL`), permitindo que o frontend detecte o 404 e chame `clearAllSelection()` automaticamente (RF-22).

> **Atualização 2026-07-16:** o endpoint `GET /dashboard/stats?vehicleId=X` citado pelo texto
> original **não existe e não foi criado** para esta tarefa — não há nenhum `DashboardController`
> com essa rota, e criá-la só para este fim contradiria o padrão já estabelecido no projeto.
> O comportamento já existe de forma equivalente e mais geral em
> `VehiclesService.findOne` (`apps/api/src/modules/vehicles/vehicles.service.ts`): a query já
> filtra `.is("deleted_at", null).maybeSingle()` e lança `NotFoundException` (404) quando o
> registro não existe ou está soft-deletado. RF-22 foi implementado para reagir a **qualquer**
> 404 de `GET /vehicles/:id` cujo `:id` bata com o `activeVehicleId` do store, não apenas a um
> endpoint de stats dedicado.

**Prioridade:** Must

---

### RF-21 — Persistência via sessionStorage por aba

O store Zustand deve usar `zustand/persist` com `storage: sessionStorage` para os campos `single` (`activeVehicleId`, `activeVehicleData`) e `group` (`activeGroupId`, `activeGroupData`). Os modos `multi` e `attribute` permanecem efêmeros (sem persistência), conforme já definido em R-CTX-02.

A mudança de `localStorage` para `sessionStorage` isola o contexto por aba do navegador, evitando que duas abas abertas simultaneamente compartilhem e sobrescrevam o contexto uma da outra.

> Nota: a SPEC-20260602-001 especificou `localStorage` para `single` e `group`. Esta spec corrige a decisão de storage para `sessionStorage`. A regra R-CTX-02 deve ser atualizada pelo `doc-keeper` para refletir esta mudança.

**Prioridade:** Must

---

### RF-22 — Limpeza automática de contexto em resposta a 404

Quando qualquer request autenticado retorna HTTP 404 e o `vehicleId` da resposta (ou do contexto ativo) corresponde ao `activeVehicleId` no store, o frontend deve:

1. Chamar `clearAllSelection()`.
2. Exibir toast: `"O veículo selecionado não está mais disponível"` (duração 4s, descartável).

Este comportamento deve ser implementado em um interceptor global (ex.: `axios interceptor` ou middleware de SWR `onError`), não duplicado em cada componente.

**Prioridade:** Must

---

### RF-23 — Limpeza de sessionStorage no logout

O handler de logout deve chamar explicitamente `sessionStorage.clear()` (ou `sessionStorage.removeItem(STORE_KEY)`) além de `clearAllSelection()` antes de submeter o formulário `POST /auth/signout`, prevenindo vazamento de contexto quando dois usuários utilizam o mesmo dispositivo em sessões alternadas.

**Prioridade:** Must

---

### RF-24 — Prevenção de flash de hidratação do store (G-CTX-09)

O `VehicleContextChip` não deve exibir o estado `none` transitório antes de o store Zustand hidratar o contexto salvo no `sessionStorage`. Para isso:

1. O store deve ser configurado com `skipHydration: true` na opção `persist`, impedindo a hidratação automática no SSR.
2. O store deve expor um campo `_hasHydrated: boolean` (inicializado como `false`) e um setter `setHasHydrated(true)` chamado no callback `onRehydrateStorage`.
3. O `VehicleContextChip` deve renderizar um skeleton estático (`w-32 h-11 rounded-lg bg-muted animate-pulse`) enquanto `_hasHydrated === false`, em vez de renderizar o estado `none`.
4. A chamada `useStore.persist.rehydrate()` deve ocorrer em um `useEffect` de montagem no provider raiz do dashboard (ex.: `apps/web/app/(dashboard)/layout.tsx`), garantindo que a hidratação aconteça uma única vez por sessão de aba.

O skeleton deve ter a mesma largura mínima do chip (`min-w-[80px]`) para evitar layout shift quando o conteúdo real for exibido.

**Prioridade:** Must

---

## Requisitos Não-Funcionais

| ID     | Requisito                                                                                                                                                                              | Métrica de Aceite                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| RNF-01 | Touch target do chip ≥ 44×44px (WCAG 2.5.5) em qualquer viewport                                                                                                                       | Auditoria Lighthouse Accessibility + teste manual em iOS Safari                        |
| RNF-02 | Contraste dos estados âmbar/azul/violeta do chip ≥ 4.5:1 em light mode e dark mode (WCAG 1.4.3)                                                                                        | Verificado com ferramenta de contraste (ex.: `axe-core`)                               |
| RNF-03 | O chip não causa layout shift ao navegar entre páginas                                                                                                                            | CLS = 0 medido via DevTools Performance tab                                            |
| RNF-04 | A lista de veículos no Dialog/Sheet usa cache do TanStack Query com `staleTime: 60000ms` (60s), não SWR (ver nota RF-14) — evita requests desnecessários em trocas rápidas de contexto | Network tab sem requests duplicados em menos de 60s                                    |
| RNF-05 | Busca client-side no Dialog/Sheet normaliza diacríticos via `String.prototype.normalize('NFD')` e remove hífens de placa antes de comparar com a query                                 | Busca por "ABC1234" encontra "ABC-1234"; busca por "Hilux" encontra "Hilux" com acento |

---

## Critérios de Aceite

- [ ] O chip de contexto aparece no subheader em todas as páginas autenticadas, em todos os breakpoints (320px a 1440px+).
- [ ] No modo `none`, o chip exibe "+ Selecionar veículo" com borda tracejada muted e sem fundo colorido.
- [ ] No modo `single`, o chip exibe ícone `Car` âmbar + placa + "· make model" truncado, borda sólida âmbar.
- [ ] No modo `group`, o chip exibe ícone `Boxes` azul + nome do grupo + count, borda sólida azul.
- [ ] No modo `multi`, o chip exibe count de veículos selecionados, borda tracejada âmbar.
- [ ] No modo `attribute`, o chip exibe label do filtro ativo, borda tracejada violeta.
- [ ] O botão X aparece somente quando `mode !== 'none'` e chama `clearAllSelection()`.
- [ ] O botão X tem `aria-label="Ver toda a frota"` e não abre o Dialog/Sheet.
- [ ] Em desktop (≥ 768px), clicar no chip abre o Dialog centralizado com `VehicleSwitcherContent`.
- [ ] Em mobile (< 768px), clicar no chip abre o Sheet bottom-up com handle de drag.
- [ ] O Dialog fecha com animação de 150ms ao selecionar um item.
- [ ] O Sheet aplica `env(safe-area-inset-bottom)` no rodapé.
- [ ] O Sheet exibe banner "Sem conexão" quando offline, sem bloquear a lista cacheada.
- [ ] O `FocusSlot` não aparece mais no sidebar em nenhum breakpoint ou estado.
- [ ] O sidebar colapsado exibe o dot passivo de cor correspondente ao modo ativo (sem interatividade).
- [ ] O handler de logout chama `clearAllSelection()` e limpa o `sessionStorage`.
- [ ] A query de veículos usa `.limit(100)`.
- [ ] O `memberCount` de grupos exclui veículos com `deleted_at IS NOT NULL`.
- [ ] `GET /dashboard/stats?vehicleId=X` retorna 404 quando X está soft-deleted.
- [ ] Receber 404 com `vehicleId` ativo no store limpa o contexto e exibe o toast correto.
- [ ] O contexto `single` e `group` sobrevivem a um reload da mesma aba (sessionStorage).
- [ ] O contexto `single` e `group` NÃO persistem ao abrir uma nova aba (sessionStorage, não localStorage).
- [ ] `aria-label` do chip descreve corretamente o contexto ativo em cada modo.
- [ ] Contraste de todos os estados do chip ≥ 4.5:1 em light e dark mode.
- [ ] CLS do subheader ao navegar entre páginas = 0.
- [ ] O chip exibe skeleton animado durante a hidratação do store e nunca exibe o estado `none` antes de `_hasHydrated === true`.

---

## Fora de Escopo

Esta spec não cobre:

- **Persistência cross-device** via `profiles.preferences.lastVehicleId` (fase 2).
- **Busca server-side** para frotas com > 100 veículos — o `limit(100)` client-side é suficiente para MVP (fase 2).
- **Export CSV com `groupId`** — integração de contexto no export (fase 2).
- **Modos `multi` e `attribute` no switcher** — já definidos na SPEC-20260602-001; o Dialog/Sheet desta spec foca em `single` e `group`.
- **Animações de transição entre modos do chip** — transição simples via `transition-colors duration-200` é suficiente.
- **Tooltip no dot passivo do sidebar colapsado** — dot é indicador silencioso, sem tooltip.

---

## Dependências

| ID                                                                | Tipo             | Descrição                                                                                                                                                                           |
| ----------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SPEC-20260602-001](SPEC-20260602-001-em-foco-contexto-global.md) | Spec predecessor | Define R-CTX-01 a R-CTX-06, os 5 modos de contexto, a nomenclatura canônica e o `VehicleSwitcherContent`. Esta spec não altera essas definições — apenas move o ponto de interação. |
| SPEC-20260602-003                                                 | Spec relacionada | Grupos de veículos; `memberCount` correto depende do fix de RF-19 desta spec.                                                                                                       |
| [SPEC-20260525-001](../design-system/SPEC-20260525-001.md)        | Design system    | Tokens visuais de paleta (âmbar, azul, violeta, espresso) usados nos estados do chip.                                                                                               |
| `apps/web/components/layout/vehicle-switcher-content.tsx`         | Código           | Reutilizado sem modificação como conteúdo interno do Dialog e do Sheet.                                                                                                             |
| `useDashboardStore`                                               | Store            | Store Zustand existente; esta spec adiciona a configuração `zustand/persist` com `sessionStorage` e garante limpeza no logout (RF-21, RF-23).                                       |
| `vaul`                                                            | Biblioteca       | Primitivo de Sheet/Drawer para mobile. Verificar se já está no `package.json` de `apps/web`; adicionar se ausente.                                                                  |
| `@radix-ui/react-dialog`                                          | Biblioteca       | Primitivo de Dialog para desktop. Já presente via `@navestory/ui`.                                                                                                                  |
| SWR                                                               | Biblioteca       | Cache de dados no Dialog/Sheet com `staleTime: 60000ms` (RNF-04).                                                                                                                   |

---

## Notas Técnicas

### Estrutura de componentes novos

```
apps/web/src/components/layout/
  header.tsx                   ← novo — header fixo do app shell (logo + chip)
  vehicle-context-chip.tsx      ← chip visual + botão X, consome use-vehicle-context.ts
  vehicle-context-dialog.tsx    ← Dialog desktop (≥ 768px)
  vehicle-context-sheet.tsx     ← Sheet mobile (< 768px)
  vehicle-switcher-content.tsx  ← lista + busca, consome use-vehicle-context.ts
apps/web/src/lib/context/
  use-vehicle-context.ts        ← novo — hook compartilhado (hidratação, queries, labels)
apps/web/src/lib/hooks/
  use-media-query.ts            ← novo
  use-online-status.ts          ← novo
```

> **Atualização 2026-07-16:** o `Header` (não `FluidFleetHeader`) importa `VehicleContextChip`
> diretamente — ver nota em "Estado atual dos componentes relevantes" acima. O chip internamente
> renderiza `VehicleContextDialog` ou `VehicleContextSheet` conforme o breakpoint detectado via
> `useMediaQuery('(min-width: 768px)')`.

### Posição do chip no header

> **Atualização 2026-07-16:** como não existe `FluidFleetHeader`/subheader de categorias de
> despesa no projeto real, a seção original ("chip antes dos chips de despesa de categoria,
> separado por divisor") não se aplica. O `Header` novo é mínimo: logo "navestory" à esquerda,
> `VehicleContextChip` imediatamente ao lado, `h-14` de altura total. O chip mantém `h-11` (RF-03).

### Ícones (atualização 2026-07-16)

O projeto não usa `lucide-react` nem nenhuma lib de ícones — o padrão existente (`VEHICLE_TYPE_ICONS`
em `apps/web/src/lib/context/context-labels.ts`) usa emojis. Mantido o mesmo padrão para os
ícones de modo do chip (RF-02): 🚗 `single`, ⬡ `group`, 🚗 `multi`, 🎚️ `attribute` — em vez de
`Car`/`Boxes`/`SlidersHorizontal`. `lucide-react` **não** foi adicionado como dependência (só
`@radix-ui/react-dialog` e `vaul`, decisão já aprovada com o usuário).

### Resolução de breakpoint

Usar `useMediaQuery` (hook a ser criado ou importado de `@navestory/ui`) para detectar o breakpoint de forma reativa. Não usar `window.innerWidth` diretamente em renders — causa hydration mismatch em SSR.

```ts
const isDesktop = useMediaQuery("(min-width: 768px)");
// isDesktop === true → Dialog; false → Sheet
```

### Reutilização de resolveMode()

A lógica de resolução de label/modo já existia em `focus-slot.tsx` (`getModeLabel`, hidratação,
queries de veículos/grupos). Ao criar o `VehicleContextChip`, essa lógica foi extraída para o hook
compartilhado `apps/web/src/lib/context/use-vehicle-context.ts` (não um módulo `context-mode.ts`
separado, como o texto original previa) — reaproveitado tanto pelo `VehicleContextChip` quanto
pelo `VehicleSwitcherContent`, sem duplicação. Como o `FocusSlot` foi removido e deletado do
repositório nesta mesma tarefa (não apenas do sidebar), não houve necessidade de atualizá-lo para
importar do novo local antes da remoção.

### Rastreabilidade no código

Todos os arquivos que implementam requisitos desta spec devem anotar no topo ou no método correspondente:

```ts
// @spec SPEC-20260603-001 RF-XX
```

### Impacto no sidebar — cálculo de fixedElementsHeight

> **Atualização 2026-07-16:** este mecanismo não existe no código real (`sidebar.tsx` não tem
> `ResizeObserver` nem `fixedElementsHeight` — é resíduo da spec original, que descrevia um
> sidebar diferente do implementado em SPEC-20260602-001/T5.3). Ignorado; nenhum ajuste
> necessário além da remoção do `<FocusSlot />` em si (RF-15) e da adição do dot passivo (RF-16).

---

## Histórico de Revisões

| Versão | Data       | Autor                                   | Descrição                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ---------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1    | 2026-06-03 | douglps                                 | Criação inicial — migração do FocusSlot do sidebar para chip no subheader; análise de gaps UX documentados em `docs/user-stories.md §19`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 0.2    | 2026-06-03 | douglps                                 | Adicionado RF-24: prevenção de flash de hidratação do store Zustand (G-CTX-09); critério de aceite correspondente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 0.3    | 2026-07-16 | Douglas Lopes (lps.doug@protonmail.com) | Promovida de `draft` para `approved` (T5.4). Levantamento de código pré-implementação encontrou divergências grandes entre a spec e o código real (mesmo padrão de T3.9/T5.1/T3.6): `FluidFleetHeader`/`fleet-subheader.tsx`/`VehicleSwitcherContent` nunca existiram (criados do zero); RF-18 corrigido de "20→100" para "sem limite→100" em `VehiclesService.findAll`/`VehicleGroupsService.findAll` (não no client-side); RF-19 implementado no backend via contagem em memória sobre veículos ativos, não em `VehicleSwitcherContent`; RF-20 corrigido — não existe `GET /dashboard/stats?vehicleId=X`, reaproveitado o 404 já existente de `GET /vehicles/:id`; ícones do RF-02 trocados de `lucide-react` (nunca adicionado ao projeto) para emojis, seguindo o padrão de `VEHICLE_TYPE_ICONS`; RF-14/RNF-04 trocam SWR por TanStack Query (`staleTime`, mesma ideia, lib real do projeto); RF-17 confirmado já satisfeito pelo `onClick` simples de logout (sem gesto de hold, fora de escopo); "Impacto no sidebar — fixedElementsHeight" descartado (ResizeObserver não existe no código real). Ver `matrices/rastreabilidade.md` para os caminhos reais de código/teste. |
