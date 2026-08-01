---
id: SPEC-20260722-005
title: "Tela /fines — Frontend do Módulo de Multas"
status: approved
date: 2026-07-22
author: Douglas Lopes (lps.doug@protonmail.com)
rules:
  [
    R5,
    S1,
    S2,
    R-CTX-01,
    R-CTX-06,
    R-TZ-01,
    R-FORM-01,
    R-FORM-02,
    R-FORM-03,
    R-FORM-04,
    R-FORM-05,
    R-FORM-06,
    R-FORM-07,
    R-SAN-01,
    R-SAN-02,
    R-SAN-04,
    R-DS-03,
    R-DS-04,
    R-SUB-03,
    R-SUB-04,
  ]
security: [S1, S2]
camadas: [frontend]
---

# Tela /fines — Frontend do Módulo de Multas

## Contexto

O backend do módulo de multas (SPEC-20260607-001) está completo: CRUD, transições de status, vínculo automático ao ledger de expenses via `ExpensesService.createFromSource`/`softDeleteBySource`. No entanto, a rota `/fines` no frontend não existe — qualquer acesso resulta em 404.

Há dois débitos técnicos ativos que dependem desta spec:

1. O link "Multas" em `apps/web/src/components/layout/financial-subheader.tsx` aponta para `/fines` (SPEC-20260722-004 RF-07), mas a rota não existe; o 404 foi aceito temporariamente em 2026-07-22.

2. O botão "Ver" na tab "Próximas" de `/expenses` (componente `UpcomingCostsTab`, SPEC-20260608-001 RF-06) está desabilitado com tooltip "Em breve" para `source_type='fine'` — desvio deliberado registrado em `matrices/rastreabilidade.md` rev. 44, aguardando esta spec para ser fechado.

Esta spec cobre as três rotas novas: `/fines` (listagem + KPIs), `/fines/new` (criação) e `/fines/[id]` (detalhe e edição), além do ajuste no botão "Ver" de `/expenses`.

## Referências de Implementação

- **Padrão de estrutura de página:** `apps/web/src/app/(app)/expenses/page.tsx` — KpiCard + Tabs (`@navestory/ui`), `useVehicleContext`, `usePreferences`/`formatDateInTz`.
- **Padrão de formulário de criação:** `apps/web/src/app/(app)/expenses/new/page.tsx` — validação client-side com schemas Zod de `@navestory/validators`, `CurrencyInput`, `useMutation` + `apiClient`.
- **Padrão de detalhe/edição:** `apps/web/src/app/(app)/expenses/[id]/page.tsx` — carregamento individual por ID, edição de campos, retorno via `revalidate()` sem redirect.
- **API disponível:** endpoints `GET /fines`, `GET /fines/:id`, `POST /fines`, `PATCH /fines/:id`, `DELETE /fines/:id` em `apps/api/src/modules/fines/fines.controller.ts`.
- **Schemas:** `createFineInputSchema`, `updateFineInputSchema`, `FINE_STATUS_TRANSITIONS`, `FineStatus` em `packages/validators/src/fine.schemas.ts`.
- **RPC de KPIs:** `get_fines_status_summary()` (retorna `active_count`, `earliest_pending_due_date`) em `supabase/migrations/20260722120000_category_spending_and_fines_status.sql`.

## Escopo

- Rota `/fines`: listagem paginada com KpiCards, Tabs, filtro por veículo via `useVehicleContext` modo `single`
- Rota `/fines/new`: formulário de criação (página própria, não modal)
- Rota `/fines/[id]`: detalhe com todos os campos + edição + mudança de status
- Ações de mudança de status inline na listagem (respeitando `FINE_STATUS_TRANSITIONS`)
- Ajuste do botão "Ver" em `UpcomingCostsTab` para `source_type='fine'`
- Ajuste do botão "Ver" em `UpcomingCostsTab` para `source_type='maintenance'` permanece `⏳` — fora do escopo desta spec

## Requisitos Funcionais

### RF-01 — Listagem com KpiCards

A rota `/fines` exibe três KpiCards no topo:

| KPI                   | Fonte                                                                                                                   | Regra    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| **Total pendente**    | Soma de `amount_with_discount ?? amount` de multas com `status IN ('pending', 'appealing')`                             | R-SUB-03 |
| **Multas vencidas**   | Contagem de multas com `status = 'pending'` AND `due_date < hoje` (fuso do usuário — R-TZ-01, R-SUB-04)                 | R-SUB-04 |
| **Total pago no ano** | Soma de `amount_with_discount ?? amount` de multas com `status = 'paid'` e `paid_at` no ano corrente do fuso do usuário | —        |

Os valores são calculados no cliente a partir do array retornado por `GET /fines` (sem endpoint de KPIs dedicado nesta fase — volume por usuário não justifica). Multas em recurso (`appealing`) com `due_date` vencida **não entram no contador de vencidas** (R-SUB-04).

### RF-02 — Filtro por veículo ativo

Quando `useVehicleContext` retornar `selectionMode === 'single'` e `activeVehicleId != null`, a listagem exibe apenas multas do veículo em foco (filtro client-side sobre o array já carregado, mesmo padrão de `expenses/page.tsx`). Nos demais modos a listagem não é filtrada.

### RF-03 — Tabs da listagem

A página `/fines` apresenta duas tabs (componente `Tabs` de `@navestory/ui`, variante `underline`):

- **Lista** (default): listagem de todas as multas ordenadas por `occurred_at DESC`.
- **Em aberto**: apenas multas com `status IN ('pending', 'appealing')`, com badge de urgência baseado em `due_date` (mesma escala de cores de `urgencyBadge` já usada em `/expenses`).

### RF-04 — Ações de status inline na listagem

Cada item da listagem expõe as transições válidas a partir do `status` atual conforme `FINE_STATUS_TRANSITIONS`:

| Status atual | Ações disponíveis         |
| ------------ | ------------------------- |
| `pending`    | Pagar, Recorrer, Cancelar |
| `appealing`  | Pagar, Cancelar           |
| `paid`       | — (nenhuma ação)          |
| `cancelled`  | — (nenhuma ação)          |

A ação dispara `PATCH /fines/:id` com `{ status }`. Transições para `paid` não exigem `paid_at` explícito — o service preenche automaticamente (SPEC-20260607-001 RF-04). As ações são renderizadas como botões compactos (ou menu de ações por linha) respeitando R-DS-04 (`rounded-md`, não `rounded-full`). Estados terminais (`paid`, `cancelled`) não exibem controles de ação — apenas rótulo de status.

### RF-05 — Empty state

Quando não houver multas (array vazio após filtro de veículo), exibir mensagem de estado vazio com CTA "Registrar multa" linkando para `/fines/new`. Quando não houver veículos cadastrados, exibir CTA para cadastrar veículo em vez do formulário (R-FORM-07).

### RF-06 — Rota /fines/new (criação)

Formulário de página própria (não modal), seguindo o padrão de `expenses/new/page.tsx`:

**Campos obrigatórios:**

- `vehicle_id` — select de veículos do usuário; pré-preenchido via `useVehicleContextField` quando contexto `single` ativo (R-CTX-06)
- `description` — texto livre (mín 3, máx 500, R-SAN-01, R-SAN-02)
- `amount` — monetário via `CurrencyInput` (R-FORM-03)
- `occurred_at` — data da infração (formato `YYYY-MM-DD`)

**Campos opcionais (exibidos em seção colapsável "Detalhes da infração"):**

- `auto_number` — número do auto de infração
- `infraction_code` — código da infração (ex: 55170)
- `amount_with_discount` — via `CurrencyInput`; validado client-side: deve ser ≤ `amount`
- `due_date` — vencimento
- `appeal_deadline` — prazo para recurso
- `location` — local (máx 255)
- `odometer_km` — quilometragem (inteiro, máx 9.999.999)
- `driver_name` — nome do condutor (máx 255)
- `notes` — observações (máx 500)

Validação usa `createFineInputSchema` de `@navestory/validators` (R-FORM-01, R-FORM-02). Em sucesso, redireciona para `/fines` (R-FORM-04). Dirty check ao cancelar (R-FORM-05). Erro de API exibido em banner `role="alert"` (R-FORM-06).

### RF-07 — Rota /fines/[id] (detalhe e edição)

Carrega `GET /fines/:id`. Exibe todos os campos da entidade `Fine`, incluindo os que não aparecem na listagem: `auto_number`, `infraction_code`, `appeal_deadline`, `odometer_km`, `driver_name`, `notes`.

Permite edição dos campos editáveis (exceto `vehicle_id` — não editável pós-criação, conforme `updateFineInputSchema` que omite `vehicle_id`) via `PATCH /fines/:id`. Em sucesso, faz `revalidate()` sem redirect (R-FORM-04).

Exibe as mesmas ações de mudança de status da listagem (RF-04), caso o usuário queira rever após agir diretamente na lista. Estados terminais não exibem ações.

Exibe rótulo do status atual com cor semântica (R-DS-03):

- `pending` → `warning`
- `appealing` → `info`
- `paid` → `success`
- `cancelled` → `muted`

### RF-08 — Fechamento da dívida técnica: link do subheader

O link "Multas" em `financial-subheader.tsx` já aponta corretamente para `/fines`. A rota criada por esta spec encerra o 404 aceito temporariamente em 2026-07-22. Nenhuma alteração no componente `FinancialSubheader` é necessária.

### RF-09 — Fechamento da dívida técnica: botão "Ver" da tab Próximas

O componente `UpcomingCostsTab` em `apps/web/src/app/(app)/expenses/page.tsx` deve habilitar o link "Ver" para `source_type='fine'`, apontando para `/fines/:source_id`. A condição atual:

```typescript
item.source_type === "expense"
  ? <Link href={`/expenses/${item.source_id}`}>Ver</Link>
  : <button disabled title="Em breve">Ver</button>
```

Deve ser expandida para:

```typescript
item.source_type === "expense"
  ? <Link href={`/expenses/${item.source_id}`}>Ver</Link>
  : item.source_type === "fine"
  ? <Link href={`/fines/${item.source_id}`}>Ver</Link>
  : <button disabled title="Em breve">Ver</button>
```

`source_type='maintenance'` e `source_type='recurring_cost'` permanecem desabilitados até que suas respectivas telas existam.

## Requisitos Não-Funcionais

### RNF-01 — Consistência visual

Seguir integralmente o padrão atual de `/expenses/page.tsx`: `KpiCard` + `Tabs` de `@navestory/ui`, `max-w-2xl`, `gap-4`, `p-8`. Não usar padrão de lista simples de `/maintenance/page.tsx`.

### RNF-02 — Timezone

Datas de ocorrência, vencimento e pagamento são exibidas via `formatDateInTz(date, tz)` onde `tz = preferences?.timezone` (R-TZ-01). A classificação de "vencida" para o KPI de multas vencidas (RF-01) usa `today` no fuso do usuário.

### RNF-03 — Sem endpoint de KPIs dedicado nesta fase

Os KpiCards são calculados client-side a partir do array de `GET /fines`. Nenhuma RPC ou endpoint adicional de KPI é criado nesta spec. Caso o volume por usuário justifique no futuro, uma spec de otimização poderá criar endpoint dedicado.

### RNF-04 — Filtro client-side por veículo

O filtro por `activeVehicleId` é aplicado client-side sobre o array já carregado, sem chamada extra a `GET /fines/vehicle/:vehicleId`. Isso mantém consistência com o padrão de `/expenses`.

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Ver resumo e lista de multas

**Como** gestor de frota, **quero** acessar `/fines` e ver um resumo dos meus débitos e a lista completa de multas, **para** ter visão rápida da exposição financeira e de risco.

**Critérios de Aceitação (BDD):**

**CA-01**

- Dado que o usuário acessa `/fines`
- Quando há multas cadastradas
- Então a página exibe três KpiCards: "Total pendente", "Multas vencidas" e "Total pago no ano"

**CA-02**

- Dado que o usuário está com contexto `single` ativo para o Veículo A
- Quando acessa `/fines`
- Então somente multas do Veículo A são exibidas na listagem e computadas nos KpiCards

**CA-03**

- Dado que não há multas cadastradas (ou nenhuma no veículo em foco)
- Quando o usuário acessa `/fines`
- Então a página exibe empty state com CTA "Registrar multa" apontando para `/fines/new`

**CA-04**

- Dado que o usuário está na tab "Em aberto"
- Quando existem multas `paid` e `cancelled`
- Então essas multas não aparecem na tab — somente `pending` e `appealing` são exibidas

### US-02 — Agir sobre uma multa diretamente da lista

**Como** gestor, **quero** marcar uma multa como paga ou em recurso diretamente na listagem, **para** não precisar entrar na tela de detalhe para ações simples.

**Critérios de Aceitação (BDD):**

**CA-05**

- Dado que uma multa com `status = 'pending'` aparece na listagem
- Quando o usuário clica na ação "Pagar"
- Então `PATCH /fines/:id` é chamado com `{ status: 'paid' }`, a linha atualiza para `paid` e nenhum redirect ocorre

**CA-06**

- Dado que uma multa com `status = 'paid'` aparece na listagem
- Quando o usuário visualiza a linha
- Então nenhuma ação de transição é exibida — apenas o rótulo "Paga"

**CA-07**

- Dado que uma multa com `status = 'appealing'` aparece na listagem
- Quando o usuário vê as ações disponíveis
- Então somente "Pagar" e "Cancelar" são exibidas (não "Recorrer")

### US-03 — Registrar nova multa

**Como** gestor, **quero** registrar uma multa recém-recebida em `/fines/new`, **para** que ela entre no ledger financeiro automaticamente.

**Critérios de Aceitação (BDD):**

**CA-08**

- Dado que o usuário preenche veículo, descrição, valor e data de ocorrência
- Quando submete o formulário
- Então `POST /fines` é chamado, a multa é criada com `status = 'pending'` e o usuário é redirecionado para `/fines`

**CA-09**

- Dado que o usuário informa `amount_with_discount` maior que `amount`
- Quando tenta submeter
- Então a validação client-side exibe erro no campo `amount_with_discount` e o envio é bloqueado

**CA-10**

- Dado que o usuário preenche o formulário com dados válidos e clica em "Cancelar"
- Quando `isDirty === true`
- Então exibe `AlertDialog` "Descartar alterações?" antes de sair (R-FORM-05)

### US-04 — Ver e editar os detalhes de uma multa

**Como** gestor, **quero** acessar `/fines/:id` e ver todos os campos de uma multa, **para** revisar informações completas (código, auto, prazo de recurso, condutor) e corrigir dados incorretos.

**Critérios de Aceitação (BDD):**

**CA-11**

- Dado que o usuário acessa `/fines/:id`
- Quando a multa existe e pertence ao usuário
- Então todos os campos são exibidos: `description`, `amount`, `occurred_at`, `auto_number`, `infraction_code`, `amount_with_discount`, `due_date`, `paid_at`, `appeal_deadline`, `location`, `odometer_km`, `driver_name`, `status`, `notes`

**CA-12**

- Dado que o usuário edita o campo `notes` e salva
- Quando `PATCH /fines/:id` retorna sucesso
- Então os dados são revalidados sem redirect e a edição é refletida na tela (R-FORM-04)

**CA-13**

- Dado que a multa tem `status = 'pending'`
- Quando o usuário acessa `/fines/:id`
- Então o status é exibido com cor semântica `warning` e as ações "Pagar", "Recorrer" e "Cancelar" estão disponíveis

### US-05 — navegar para multa pela tab "Próximas" de /expenses

**Como** gestor, **quero** clicar em "Ver" numa multa listada na tab "Próximas" de `/expenses`, **para** ir diretamente ao detalhe da multa sem precisar navegar manualmente.

**Critérios de Aceitação (BDD):**

**CA-14**

- Dado que a tab "Próximas" de `/expenses` exibe um item com `source_type = 'fine'`
- Quando o botão "Ver" é exibido
- Então o botão é um link ativo apontando para `/fines/:source_id` (não um botão desabilitado)

**CA-15**

- Dado que o link "Multas" no subheader financeiro é clicado
- Quando a rota `/fines` existe
- Então o usuário chega à página de listagem de multas sem 404

### US-06 — Nenhum veículo cadastrado

**Como** usuário novo, **quero** ver uma mensagem orientativa ao acessar `/fines/new` sem veículos cadastrados, **para** entender o que preciso fazer antes de registrar uma multa.

**Critérios de Aceitação (BDD):**

**CA-16**

- Dado que o usuário não tem veículos cadastrados
- Quando acessa `/fines/new`
- Então o formulário não é exibido; aparece empty state com CTA para cadastrar veículo (R-FORM-07)

## Fora do Escopo

- **Notificações de vencimento por e-mail/push** — adiado para Fase 9 / G-09, já fora do escopo da SPEC-20260607-001.
- **Endpoint de KPIs dedicado** (`GET /fines/kpis` no backend) — os KPIs são calculados client-side nesta fase; endpoint fica para otimização futura se volume justificar.
- **Botão "Ver" para `source_type='maintenance'`** em `UpcomingCostsTab` — aguarda tela de manutenções (Fase 4).
- **Botão "Ver" para `source_type='recurring_cost'`** em `UpcomingCostsTab` — aguarda tela de custos recorrentes.
- **Filtro por status na URL** (`?status=pending`) — a tab "Em aberto" substitui esse filtro; deep-link por status via URL pode ser adicionado em spec de UX futura.
- **Exportação CSV de multas** — segue o mesmo roadmap de `/expenses` (SPEC-20260521-003).
- **Soft-delete pela UI** — `DELETE /fines/:id` não está exposto na interface desta spec; a funcionalidade de remover via UI pode ser adicionada em spec futura.
- **Anonimização de PII** — não decidir estratégia ad hoc; aguarda spec dedicada (ver memory `anonimizacao_spec_futura.md`).

## Dependências

| Dependência                                                                                           | Estado          | Bloqueante?                                  |
| ----------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------- |
| `GET /fines`, `POST /fines`, `PATCH /fines/:id` (SPEC-20260607-001)                                   | ✅ Implementado | Sim                                          |
| `@navestory/validators` — `createFineInputSchema`, `updateFineInputSchema`, `FINE_STATUS_TRANSITIONS` | ✅ Implementado | Sim                                          |
| `@navestory/ui` — `KpiCard`, `Tabs`, `CurrencyInput`                                                  | ✅ Implementado | Sim                                          |
| `useVehicleContext`, `usePreferences`, `formatDateInTz`                                               | ✅ Implementado | Sim                                          |
| RPC `get_fines_status_summary()` (migration `20260722120000`)                                         | ✅ Implementado | Não — KPIs calculados client-side nesta fase |

---

## Histórico de Revisões

| Versão | Data       | Autor   | Descrição       |
| ------ | ---------- | ------- | --------------- |
| 1.0    | 2026-07-22 | douglps | Criação inicial |
