---
id: SPEC-20260814-001
title: "FleetAside — Menu Aside Desktop com Aba Agenda (Calendário Interativo de Frota)"
status: approved
date: 2026-08-14
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-AGE-01, R-AGE-02, R-NAV-12, R-NAV-13]
security: [S1]
camadas: [frontend]
---

# SPEC-20260814-001: FleetAside — Menu Aside Desktop com Aba Agenda

**Status:** approved
**Criada em:** 2026-08-14
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

Em 2026-08-14, o usuário identificou que o modelo atual de alertas do navestory — dividido entre
o `FleetAlertBar` (contextual ao dashboard) e o `AlertsBell` (global no header) — não é
suficientemente ergonômico para quem precisa de uma visão prospectiva da frota ao longo do tempo.
Ambos os componentes exibem listas de itens urgentes agrupados por severidade, mas não dão ao
usuário uma perspectiva temporal ("o que vence em cada dia desta semana? e do próximo mês?").

O pedido é por um **painel aside** exclusivo de desktop, adicional à sidebar de navegação existente,
que hospede uma aba "Agenda" com um calendário interativo. Eventos de manutenção, multa e custo
recorrente são marcados nas datas corretas, permitindo ao usuário ver rapidamente quais dias têm
ocorrências sem precisar percorrer listas de alertas.

O usuário solicitou explicitamente que o componente de calendário seja desenhado de forma
reutilizável ("pensar nos detalhes do calendário à parte para que possa ser reaproveitado"),
o que direciona a implementação para um componente `CalendarView` em `packages/ui`, desacoplado
do contexto de Agenda específico.

**Estado anterior:**
- Não existe painel aside no shell autenticado; a sidebar de navegação (`sidebar.tsx`) é a única
  superfície lateral permanente.
- Alertas são apresentados via `FleetAlertBar` (lista horizontal no dashboard) e `AlertsBell`
  (sino no header com Dialog de lista completa).
- Ambos consomem a query `["dashboard", "alerts"]` definida na SPEC-20260813-001 RF-05/RF-06.
- Não existe nenhuma superfície de visão calendário/agenda no app.

---

## Objetivo

1. Criar o `FleetAside` — painel lateral direito exclusivo de desktop — como nova superfície de
   apresentação de dados da frota, extensível com abas futuras.
2. Implementar a aba "Agenda" dentro do `FleetAside`, exibindo um calendário interativo com eventos
   de manutenção, multa e custo recorrente marcados nas datas corretas.
3. Extrair o componente `CalendarView` como peça reutilizável em `packages/ui`, desacoplado da
   semântica de frota — apto a ser usado em outros contextos do produto ou em outros projetos.
4. Definir formalmente o relacionamento entre `FleetAside` + Agenda e os componentes de alerta
   existentes: `FleetAlertBar` é removido do dashboard em desktop (RF-08); `AlertsBell` permanece
   inalterado em todos os breakpoints, como elemento distinto (ver Decisões).

---

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Visão temporal da frota sem sair do dashboard

**Como** gestor de frota (Ana, 3–10 veículos), **quero** ver um calendário com os eventos de
manutenção e vencimentos marcados nas datas corretas, **para** planejar a semana sem precisar
percorrer listas de alertas.

- **Dado que** estou em desktop (≥ `lg`), **quando** abro qualquer rota autenticada, **então**
  o `FleetAside` aparece como coluna lateral direita, já com a aba Agenda visível.
- **Dado que** tenho uma manutenção agendada para o dia 20, **quando** navego o calendário para
  esse mês, **então** o dia 20 aparece com indicador visual de evento.
- **Dado que** clico no dia 20, **quando** o detalhe abre, **então** vejo a lista de eventos
  daquele dia com tipo, veículo e severidade.

### US-02 — Agenda não duplica dados

**Como** desenvolvedor, **quero** que a Agenda consuma as mesmas fontes de dado já disponíveis
no app, **para** não introduzir novas chamadas de API.

- **Dado que** a query `["dashboard", "alerts"]` já carrega vencimentos do período, **quando**
  o `FleetAside` monta, **então** ele reutiliza esse cache via TanStack Query em vez de criar
  uma nova query exclusiva.

### US-03 — Calendário reutilizável

**Como** desenvolvedor, **quero** um componente `CalendarView` em `packages/ui` que aceite
eventos como prop externa, **para** poder reutilizá-lo em outros contextos (ex.: agenda de
manutenções por veículo) sem duplicar a lógica de calendário.

- **Dado que** `CalendarView` está em `packages/ui`, **quando** importado em qualquer parte do
  monorepo, **então** ele não importa nada de `@/components` ou do contexto específico de frota.

---

## Requisitos Funcionais

| ID    | Requisito | Arquivo(s) principal(is) | Prioridade | Status |
| ----- | --------- | ------------------------ | ---------- | ------ |
| RF-01 | Criar o `FleetAside` — container lateral direito exclusivo de desktop (breakpoint ≥ `lg`, 1024 px). Em viewports abaixo de `lg`, o `FleetAside` não é renderizado (não colapsado, não oculto via CSS — simplesmente não existe no DOM mobile/tablet). Largura fixa `w-72` (288 px) — **decidido em D-05**. `FleetAside` é filho da row flex do shell autenticado (`apps/web/src/app/(app)/layout.tsx`), irmão de `<Sidebar />` e do wrapper de `<main />`, posicionado após o conteúdo principal na ordem do DOM. **Pré-condição de implementação:** o componente `FleetAside` atualmente em `apps/web/src/components/layout/fleet-aside.tsx` (detector de staleness de contexto, `@spec SPEC-20260602-001 RF-16`) deve ser renomeado para `VehicleContextWatcher` (arquivo `vehicle-context-watcher.tsx`) antes de criar o novo `fleet-aside.tsx`. O import em `layout.tsx` deve ser atualizado de acordo. | `apps/web/src/app/(app)/layout.tsx` (integração), `apps/web/src/components/layout/fleet-aside.tsx` (novo — após renomeação do arquivo existente) | Alta | Pendente |
| RF-02 | `FleetAside` usa um sistema de abas (`tabs`) para comportar futuras superfícies além da Agenda. Na v1 desta spec, apenas a aba "Agenda" existe — o componente de abas deve aceitar adição de novas abas sem refatoração estrutural. Usar o primitivo `Tabs` de `@radix-ui/react-tabs` (já adotado no projeto em outros componentes) ou o componente `Tabs` de `packages/ui` se disponível. Não criar sistema de tabs proprietário. | `apps/web/src/components/layout/fleet-aside.tsx` | Alta | Pendente |
| RF-03 | Aba "Agenda": renderiza o `CalendarView` (RF-04) passando os eventos da frota como prop. A query de dados é a `["dashboard", "alerts"]` já existente (compartilhada com `FleetAlertBar` e `AlertsBell`, conforme RNF-01 de SPEC-20260813-001). Os eventos do calendário são mapeados a partir dos itens de alerta: `FleetAlertItem` com `days_until_due` é convertido em data absoluta (`new Date(now).setDate(now.getDate() + days_until_due)`) para posicionamento no calendário. | `apps/web/src/components/layout/fleet-aside.tsx`, `apps/web/src/components/layout/agenda-tab.tsx` (novo) | Alta | Pendente |
| RF-04 | Criar o componente `CalendarView` em `packages/ui/src/components/calendar-view.tsx`. Interface pública mínima: `events: CalendarEvent[]` (array de `{ date: Date; title: string; severity?: "danger" \| "warning" \| "info"; id: string }`); `month?: Date` (mês exibido, default mês atual); `onMonthChange?: (date: Date) => void`; `onDayClick?: (date: Date, events: CalendarEvent[]) => void`. O `CalendarView` não pode importar nada específico do contexto de frota — é um componente genérico de calendário com suporte a marcação de eventos. | `packages/ui/src/components/calendar-view.tsx` (novo), `packages/ui/src/index.ts` (exportar) | Alta | Pendente |
| RF-05 | Célula de dia no `CalendarView`: quando há 1 ou 2 eventos, exibir um indicador colorido (ponto ou barra fina) abaixo do número do dia, com cor conforme a maior severidade do dia (vermelho `danger` > amarelo `warning` > azul `info`). Quando há 3 ou mais eventos, exibir o indicador da maior severidade mais um badge "+N" (ex.: "+2") respeitando R-AGE-02. Dia atual destacado com `bg-primary/10 font-medium`. Dias fora do mês exibido com `opacity-40`. | `packages/ui/src/components/calendar-view.tsx` | Média | Pendente |
| RF-06 | Ao clicar em um dia com eventos, `CalendarView` chama `onDayClick(date, events)`. O consumer (`AgendaTab`) exibe um painel ou popover com a lista de eventos daquele dia: tipo de evento (manutenção, multa, custo recorrente), veículo, severidade e link direto para o registro (ex.: `/maintenance?id=<id>` ou `/fines?id=<id>`). O painel de detalhe não é responsabilidade do `CalendarView` — é responsabilidade do consumer. | `apps/web/src/components/layout/agenda-tab.tsx` | Média | Pendente |
| RF-07 | Navegação de mês: botões anterior/próximo (`<`/`>`) no header do `CalendarView` com `aria-label="Mês anterior"` / `aria-label="Próximo mês"`. O estado do mês exibido é gerenciado pelo consumer por padrão (modo controlado via `month` + `onMonthChange`), mas o componente também suporta modo não-controlado com estado interno quando `month` não é passado. | `packages/ui/src/components/calendar-view.tsx` | Média | Pendente |
| RF-08 | Conforme D-01 (confirmado): `FleetAlertBar` deixa de ser renderizado em `dashboard/page.tsx` no breakpoint desktop (≥ `lg`) — a Agenda no `FleetAside` passa a cobrir essa informação nesse breakpoint. Em viewports < `lg`, `FleetAlertBar` permanece inalterado (SPEC-20260813-001 RF-05/RF-10 continuam valendo integralmente para mobile). Implementação: condicionar a renderização por media query (`useMediaQuery`, mesmo hook já usado em `vehicle-context-chip.tsx`/`sidebar.tsx`), não por classe CSS `hidden` (evita montar a query duas vezes desnecessariamente). | `apps/web/src/app/(app)/dashboard/page.tsx` | Alta | Pendente |

---

## Decisões (confirmadas por Douglas em 2026-08-14)

### D-01 — O que acontece com o `FleetAlertBar` quando o `FleetAside` + Agenda estiver disponível?

**Decidido: Opção B.** `FleetAlertBar` é removido do dashboard em desktop (≥ `lg`, onde o
`FleetAside`/Agenda já cobre a mesma informação); permanece inalterado em mobile (< `lg`), como
única superfície de alerta contextual nesse breakpoint.

### D-02 — O que acontece com o `AlertsBell` quando a Agenda existir?

**Decidido: Opção A.** `AlertsBell` mantém o comportamento atual (sino no header, abre Dialog com
lista completa de alertas) em todos os breakpoints, sem nenhuma integração com o `FleetAside`.
Douglas confirmou que são elementos distintos por design — o sino continua sendo o atalho rápido
e global; a Agenda é a visão temporal/planejamento. Não há dependência entre RF-03/RF-06 desta
spec e o `AlertsBell` — nenhuma alteração é feita em `alerts-bell.tsx`.

### D-03 — Breakpoint exato para o `FleetAside`

**Decidido:** `lg:` (1024 px), conforme recomendação — garante que o conteúdo principal tenha ao
menos `1024 − 72 (sidebar) − 288 (aside) = 664 px` de largura útil.

### D-04 — Fontes de evento além dos alertas de manutenção/multa

**Contexto:** R-AGE-01 define manutenções, multas e custos recorrentes como fontes de evento.
A query `["dashboard", "alerts"]` retorna `FleetAlert[]` com `FleetAlertType` =
`maintenance_overdue | maintenance_upcoming | document_overdue | document_upcoming` — confirmado
em `packages/validators/src/dashboard.schemas.ts`. Multas (`fine`) e custos recorrentes
**não estão** cobertos por essa query.

**Decisão (tech-lead, 2026-08-14):** Criar query adicional `["agenda", "recurring-costs"]`
consumindo `GET /recurring-costs` para custos recorrentes — não poluir a query de alertas do
dashboard. Para multas: o `FleetAlertType` não inclui tipo `fine`; verificar na implementação se
existe endpoint de alertas de multa (`/fines/alerts` ou similar) — se não existir, multas ficam
fora da Agenda v1 e R-AGE-01 é atualizada em nova versão para refletir essa restrição. A Agenda
v1 pode ser lançada apenas com manutenções + custos recorrentes se multas não tiverem endpoint
de alerta disponível.

### D-05 — Largura do `FleetAside`

**Contexto:** O `FleetAside` ocupa espaço permanente ao lado do conteúdo. Em 1024px (breakpoint
`lg`), a conta de espaço útil é: `1024 − largura_sidebar − largura_aside`. O calendário mensal
usa grade de 7 colunas — cada célula precisa de pelo menos ~34–36px para ser legível.

**Decisão (tech-lead, 2026-08-14):** `w-72` (288px). Com padding interno de 16px (p-4), a
grade fica com 256px → ~36.5px por coluna — suficiente para o calendário compacto. `w-80`
(320px) adicionaria apenas ~5px/coluna mas reduziria o espaço do conteúdo principal em 32px,
impactando layouts já ajustados no breakpoint exato de 1024px. `w-72` é o mínimo adequado e
o valor a usar em RF-01.

---

## Requisitos Não-Funcionais

| ID     | Requisito | Métrica de Aceite |
| ------ | --------- | ----------------- |
| RNF-01 | `FleetAside` não pode introduzir nova chamada de API para os dados de alerta — deve reutilizar o cache TanStack Query `["dashboard", "alerts"]` já populado por `FleetAlertBar` e `AlertsBell` | Confirmado via React DevTools: uma única requisição de rede para `/dashboard/alerts` por sessão |
| RNF-02 | `CalendarView` em `packages/ui` não pode ter dependência em nenhum pacote interno do monorepo além do próprio `packages/ui` | Build de `packages/ui` em isolamento não gera erro |
| RNF-03 | `FleetAside` é `sticky top-14` (abaixo do header) e `h-[calc(100vh-3.5rem)]` com `overflow-y-auto` para scroll interno — o conteúdo principal não é afetado pelo scroll do aside | Inspeção visual: scroll do aside não move o conteúdo principal |
| RNF-04 | Acessibilidade do calendário: células de dia são `button` com `aria-label="DD de MMMM de AAAA"` (ex.: `"14 de agosto de 2026"`); indicadores de evento têm `aria-label` descritivo com a contagem (ex.: `"2 eventos neste dia"`); header com mês/ano tem `role="heading" aria-level={3}` | Verificação via `axe` ou inspeção de markup |
| RNF-05 | Em viewports `< lg`, o `FleetAside` não existe no DOM — nenhuma classe `hidden` que oculte mas mantenha o render; usar renderização condicional por query de breakpoint ou pelo padrão de server component sem JS de hidratação | Inspeção do DOM em viewport < 1024 px: nenhum elemento com `data-fleet-aside` |

---

## Fora de Escopo

- Não inclui: outras abas do `FleetAside` além de "Agenda" (futuras abas são backlog).
- Não inclui: view semanal ou diária do calendário — apenas view mensal na v1.
- Não inclui: criação/edição de eventos diretamente pelo calendário (read-only na v1).
- Não inclui: sincronização com Google Calendar, iCal ou qualquer serviço externo (Fase 2+).
- Não inclui: notificações push atreladas ao calendário (coberto por RF-008 do PRD, Fase 2).
- Não inclui: alertas por e-mail (adiados para Fase 9, conforme memória `decisao_alertas_email_fase9.md`).
- Não inclui: anonimização de PII em dados de evento (spec futura, conforme `anonimizacao_spec_futura.md`).
- Não inclui: o estado colapsado do `FleetAside` — na v1 é sempre expandido ou ausente.
- Não inclui: a decisão de monetização/billing do botão Upgrade na sidebar (RF-21 de SPEC-20260813-001 trata disso separadamente).

---

## Dependências

| Tipo | Referência | Descrição |
| ---- | ---------- | --------- |
| Spec | SPEC-20260813-001 RF-05/RF-06 | `FleetAlertBar` (removido do dashboard em desktop por RF-08 desta spec, conforme D-01) e `AlertsBell` (inalterado, conforme D-02); a Agenda reutiliza a query `["dashboard","alerts"]` de ambos |
| Spec | SPEC-20260730-002 | Shell UX — estrutura do layout autenticado (`apps/web/src/app/(app)/layout.tsx`) que o `FleetAside` estende como novo filho |
| Spec | SPEC-20260722-003 | Shell Mobile-First — R-NAV-01 (sidebar como drawer em mobile) garante que o aside nunca apareça em mobile sem afetar a sidebar |
| Regra | R-AGE-01 | Fontes canônicas de evento para o CalendarView — **pré-requisito** para implementação de RF-03 |
| Regra | R-AGE-02 | Teto de eventos visíveis por célula de dia — **pré-requisito** para implementação de RF-05 |
| Regra | R-NAV-12 | `FleetAside` é exclusivo de desktop — determina o breakpoint e o comportamento em mobile |
| Biblioteca | `@radix-ui/react-tabs` | Primitivo de tabs para RF-02 (já disponível no projeto via `packages/ui`) |
| Biblioteca | `@tanstack/react-query` | Reutilização da query `["dashboard", "alerts"]` para RF-03 |

---

## Notas Técnicas

### Estrutura de layout com FleetAside

O layout autenticado (`apps/web/src/app/(app)/layout.tsx`) hoje tem a estrutura:

```
<div flex-col>
  <Header />           ← sticky top-0 z-20
  <FinancialSubheader /> ← sticky top-14 z-[19] (após RF-18 da SPEC-20260813-001)
  <div flex>
    <Sidebar />        ← md:sticky md:top-14 h-[calc(100vh-3.5rem)]
    <main>             ← flex-1, conteúdo da rota
  </div>
</div>
```

Com `FleetAside`, a estrutura proposta:

```
<div flex-col>
  <Header />
  <FinancialSubheader />
  <div flex>
    <Sidebar />
    <main>             ← flex-1 min-w-0 (min-w-0 evita overflow em grids)
    <FleetAside />     ← hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto w-72 shrink-0
  </div>
</div>
```

O `shrink-0` no `FleetAside` é essencial para impedir que o `main` cresça e expulse o aside. O `min-w-0` no `main` evita que grids internos causem overflow horizontal.

### CalendarView — estrutura de grade

O calendário mensal é uma grade de 7 colunas (dias da semana) × N linhas (semanas do mês).
Implementação sugerida com CSS Grid:

```tsx
<div role="grid" aria-label="Calendário de eventos">
  {/* cabeçalho dos dias da semana */}
  <div role="row">
    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
      <div role="columnheader" aria-label={...}>{d}</div>
    ))}
  </div>
  {/* células de dias */}
  {weeks.map(week => (
    <div role="row">
      {week.map(day => (
        <button role="gridcell" aria-label={`${day} de ${month} de ${year}, ${count} eventos`}>
          {day}
          {events.length > 0 && <EventIndicator severity={maxSeverity} count={events.length} />}
        </button>
      ))}
    </div>
  ))}
</div>
```

Não usar biblioteca externa de calendário (ex.: `react-calendar`, `react-datepicker`) — a grade
é simples o suficiente para implementação nativa e evita dependência de lib adicional.

### Mapeamento de FleetAlert para CalendarEvent

O tipo canônico confirmado em `packages/validators/src/dashboard.schemas.ts` é `FleetAlert`
(não `FleetAlertItem`), com campos: `id`, `type`, `vehicle_id`, `vehicle_plate`, `description`,
`due_date` (string ISO YYYY-MM-DD) e `days_until_due`.

**Nota técnica (tech-lead, 2026-08-14):** a spec usava `alert.title` em rascunhos anteriores,
mas o campo correto é `alert.description`. O mapeamento de severity deve usar o `type` do alerta
(não apenas `days_until_due < 0`) para fidelidade semântica:

```ts
function alertsToCalendarEvents(
  alerts: FleetAlert[],
  now: Date,
): CalendarEvent[] {
  return alerts.map((alert) => {
    // Preferir due_date (string ISO) quando disponível — mais preciso que days_until_due,
    // que é calculado no momento da requisição e pode driftar entre sessões.
    const date = alert.due_date
      ? new Date(alert.due_date + "T00:00:00") // força meia-noite local, evita off-by-one de fuso
      : (() => {
          const d = new Date(now);
          d.setDate(d.getDate() + alert.days_until_due);
          return d;
        })();
    return {
      id: alert.id,
      date,
      title: alert.description,
      severity: alert.type.endsWith("_overdue") ? "danger" : "warning",
    };
  });
}
```

### Segurança de hydration em RNF-05

O layout autenticado é `"use client"`. Usar `useMediaQuery` com renderização condicional
(`isDesktop && <FleetAside />`) pode causar hydration mismatch: o servidor não tem acesso a
`window.matchMedia` e renderiza como se fosse `false` (sem aside), mas o cliente pode diferir
dependendo de como o hook for implementado.

**Abordagem segura:** inicializar o estado do hook como `false` (não mostra o aside) e
atualizar via `useEffect` — garante que servidor e primeiro render do cliente coincidam; o
aside aparece apenas após o mount, sem flash ou mismatch. O hook `useMediaQuery` já usado em
`sidebar.tsx` deve seguir esse padrão. Verificar na implementação — se não seguir, corrigir
antes de usar para RF-01/RF-08.

---

## Decisão de Testes

Registrar em `specs/TEST_DECISIONS.md` antes de implementar cada RF:

- **RF-04 (`CalendarView`):** teste de componente unitário para: renderização correta do grid
  de dias do mês; navegação prev/next mês; posicionamento de evento no dia correto; badge "+N"
  para 3+ eventos; `aria-label` dos botões de dia.
- **RF-03 (mapeamento de alertas → eventos):** teste unitário da função `alertsToCalendarEvents`
  para datas no futuro, no passado e no dia atual.
- **RF-01/RF-02 (`FleetAside` layout):** sem teste automatizado para CSS/breakpoints; verificação
  visual em ambiente rodando em viewport 1024 px.
- **RF-08 (remoção condicional de `FleetAlertBar`):** teste de integração em `dashboard/page.tsx`
  (mock de `useMediaQuery`) cobrindo: viewport ≥ `lg` → `FleetAlertBar` ausente; viewport < `lg` →
  `FleetAlertBar` presente com o mesmo comportamento de RF-05/RF-10 de SPEC-20260813-001.

---

## Changelog (pós-aprovação)

> Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
| ---- | ----------- | ------- |
| 2026-08-14 | Gate técnico de aprovação (tech-lead). D-04 resolvida: custos recorrentes exigem query adicional `["agenda","recurring-costs"]`; multas não cobertas pelo `FleetAlertType` atual — a cobrir na implementação ou em R-AGE-01 v2. D-05 resolvida: largura `w-72` (288px). RF-01 atualizado com largura definitiva e pré-condição de renomeação do `FleetAside` existente para `VehicleContextWatcher`. Mapeamento `FleetAlertItem`→`FleetAlert` corrigido (`title`→`description`, severity via `type`). Notas técnicas adicionadas: hydration safety de `useMediaQuery`, uso de `due_date` ISO em vez de `days_until_due`, cobertura de multas. Status: `review` → `approved`. | Gate técnico obrigatório (CLAUDE.md: ADR e aprovação de tech-lead antes de `approved`) |
