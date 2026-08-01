# Plano de Migração de Consumidores — Design System

> Documento de execução, não uma spec nova. Os componentes (`Alert`, `EmptyState`, `Combobox`,
> `KpiCard`, `Tabs`, `ChartWrapper`) já estão implementados e aprovados em
> [SPEC-20260525-001](SPEC-20260525-001.md) §10. O que falta é migrar as telas consumidoras que
> ainda usam o padrão ad hoc antigo. Ver `matrices/rastreabilidade.md` §SPEC-20260525-001 para o
> estado atual de cada componente.

**Última revisão:** 2026-07-30 (Rodada 6 concluída — plano encerrado novamente, resta só a lista "Sem ação por ora")

## Como usar este documento

Cada rodada abaixo é uma unidade de trabalho isolada (pode virar uma tarefa/PR própria). Ao
concluir uma rodada: marcar os checkboxes, atualizar `matrices/rastreabilidade.md`
§SPEC-20260525-001 trocando `⏳` por `✅` na linha do componente, e rodar a suíte de testes do(s)
arquivo(s) tocado(s) (`vitest`/`jest-axe` conforme o pacote).

---

## Rodada 1 — `/fines` nasce já com os componentes do design system

**Por quê primeiro:** as rotas `apps/web/src/app/(app)/fines/*` foram criadas nesta sessão de
trabalho e ainda não foram commitadas. Elas já reproduzem o padrão ad hoc de alerta/empty state
(apareceram na varredura junto dos arquivos legados abaixo). Corrigir agora custa uma edição;
deixar commitar assim vira mais uma duplicata para a Rodada 2/3 desfazer depois.

- [x] `apps/web/src/app/(app)/fines/page.tsx` — usar `Alert`/`EmptyState` de `@navestory/ui` (2026-07-22)
- [x] `apps/web/src/app/(app)/fines/new/page.tsx` — usar `Alert`/`EmptyState` de `@navestory/ui` (2026-07-22)
- [x] `apps/web/src/app/(app)/fines/[id]/page.tsx` — usar `Alert` de `@navestory/ui` (2026-07-22)

---

## Rodada 2 — Migração de `Alert` (~30 arquivos)

Trocar `<div className="rounded border ...">` (ou variações com `bg-red-*`/`bg-amber-*`/
`bg-green-*`/`role="alert"` manual) por `<Alert variant="...">` de `@navestory/ui`.

Sem lógica de negócio envolvida — mudança mecânica e de baixo risco. Ordem sugerida: telas de
formulário primeiro (maior densidade de mensagens de erro visitadas pelo usuário), depois telas
de listagem/detalhe, depois componentes compartilhados.

### Formulários (prioridade alta)

- [x] `apps/web/src/app/(app)/expenses/new/page.tsx` (2026-07-22) — `Alert`+`EmptyState`; bloco de duplicata mantido ad hoc (2 ações: link + botão, fora da API de ação única do `Alert`)
- [x] `apps/web/src/app/(app)/maintenance/new/page.tsx` (2026-07-22) — `Alert`+`EmptyState`
- [x] `apps/web/src/app/(app)/vehicles/new/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/vehicle-groups/new/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(auth)/login/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(auth)/register/page.tsx` (2026-07-22) — aviso de e-mail duplicado (2 links) mantido ad hoc, mesmo motivo do bloco de duplicata acima
- [x] `apps/web/src/app/(auth)/reset-password/page.tsx` (2026-07-22)

### Listagem / detalhe

- [x] `apps/web/src/app/(app)/analytics/page.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas: 5 seções "sem dados suficientes" + lista de anomalias + banner de erro + estado sem veículo)
- [x] `apps/web/src/app/(app)/atividades/page.tsx` (2026-07-22) — `EmptyState` de `@navestory/ui` no lugar do componente local homônimo
- [x] `apps/web/src/app/(app)/dashboard/page.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas)
- [x] `apps/web/src/app/(app)/expenses/page.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas)
- [x] `apps/web/src/app/(app)/expenses/[id]/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/maintenance/page.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas)
- [x] `apps/web/src/app/(app)/maintenance/[id]/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/settings/account/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/settings/preferences/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/settings/vehicles/[vehicleId]/odometer-cycles/page.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas)
- [x] `apps/web/src/app/(app)/vehicle-groups/page.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas)
- [x] `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/vehicles/page.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas)
- [x] `apps/web/src/app/(app)/vehicles/[id]/odometer/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/vehicles/[id]/page.tsx` (2026-07-22)

### Componentes compartilhados

- [x] `apps/web/src/components/dashboard/KpiPicker.tsx` (2026-07-22)
- [x] `apps/web/src/components/dashboard/VehicleHealthCard.tsx` (2026-07-22) — avaliado: badge inline de aviso (`role="alert"`, compacto, dentro do card) mantido ad hoc, `Alert` quebraria o layout denso do card
- [x] `apps/web/src/components/dashboard/VehicleSpotlight.tsx` (2026-07-22) — `Alert`+`EmptyState` (Rodada 2+3 juntas: 4 seções)
- [x] `apps/web/src/components/layout/sidebar.tsx` (2026-07-22) — avaliado: nenhum padrão de alerta/empty state ad hoc encontrado, nada a migrar
- [x] `apps/web/src/components/layout/vehicle-context-chip.tsx` (2026-07-22) — avaliado: chip compacto, nenhum padrão de alerta/empty state ad hoc
- [x] `apps/web/src/components/layout/vehicle-switcher-content.tsx` (2026-07-22) — `Alert` no aviso offline e no erro com retry; "Nenhum veículo/grupo encontrado" (busca inline) mantido ad hoc — `EmptyState` é grande demais para uma lista de resultados estreita
- [x] `apps/web/src/components/pwa/connectivity-indicator.tsx` (2026-07-22) — avaliado: pill compacto de status no header, não é alerta de conteúdo

Extras da Rodada 3 (EmptyState) resolvidos junto por sobreposição de arquivo:

- [x] `apps/web/src/components/dashboard/DashboardKpiGrid.tsx` (2026-07-22) — avaliado: card "unavailable" mantém o formato do `KpiCard`, não é um empty state
- [x] `apps/web/src/components/dashboard/UpcomingCostsWidget.tsx` (2026-07-22)
- [x] `apps/web/src/components/layout/command-palette-trigger.tsx` (2026-07-22) — avaliado: `emptyMessage` já delegado ao `CommandPalette` de `@navestory/ui`, nada a migrar aqui

---

## Rodada 3 — Migração de `EmptyState` (~14 arquivos, forte sobreposição com a Rodada 2)

A maioria destes arquivos já aparece na Rodada 2 — fazer as duas trocas na mesma edição por
arquivo em vez de duas passagens separadas.

Todos os itens abaixo foram resolvidos junto com a Rodada 2 (mesma edição por arquivo, conforme
a nota acima) — ver checklist da Rodada 2 e da seção "Componentes compartilhados" para o detalhe
de cada um. Marcados aqui só para fechar o rastreamento desta rodada:

- [x] `apps/web/src/app/(app)/analytics/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/atividades/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/dashboard/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/expenses/new/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/expenses/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/maintenance/new/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/maintenance/page.tsx` (2026-07-22)
- [x] `apps/web/src/app/(app)/settings/vehicles/[vehicleId]/odometer-cycles/page.tsx` (2026-07-22)
- [x] `apps/web/src/components/dashboard/DashboardKpiGrid.tsx` (2026-07-22) — avaliado, nada a migrar
- [x] `apps/web/src/components/dashboard/UpcomingCostsWidget.tsx` (2026-07-22)
- [x] `apps/web/src/components/dashboard/VehicleSpotlight.tsx` (2026-07-22)
- [x] `apps/web/src/components/layout/command-palette-trigger.tsx` (2026-07-22) — avaliado, nada a migrar
- [x] `apps/web/src/components/layout/vehicle-switcher-content.tsx` (2026-07-22)

---

## Rodada 4 — Migração de `Combobox` (3 telas, substitui `<select>` nativo)

Ganho real de acessibilidade (busca, navegação por teclado) — escopo pequeno e isolado.

- [x] `apps/web/src/app/(app)/expenses/new/page.tsx` (2026-07-22) — `Combobox` nos 3 `<select>` da tela: Veículo, Categoria, Tipo de combustível
- [x] `apps/web/src/app/(app)/maintenance/new/page.tsx` (2026-07-22) — `Combobox` no `<select>` de Veículo
- [x] `apps/web/src/app/(app)/expenses/[id]/page.tsx` (2026-07-22) — `Combobox` no `<select>` de Tipo de combustível

---

## Rodada 5 — `Input`/`Textarea`/`Checkbox`/`Button`/`Combobox` em elementos crus sem estilo (`SPEC-20260729-003`)

**Por quê:** o usuário pediu para alinhar "tudo" ao brand showcase da direção Prata. Uma auditoria
confirmou que Rodadas 1–4 cobriram `Alert`/`EmptyState`/`Combobox`, mas nunca existiu rodada para os
elementos de formulário mais básicos — `<input>` de texto, `<textarea>`, `<button>` cru, checkbox.
Esses elementos renderizavam sem nenhuma classe Tailwind (estilo padrão do navegador), mesmo em
produção. `packages/ui` ganhou 4 componentes novos (`Input`, `Textarea`, `Checkbox`, `Switch`) e
`CurrencyInput`/`OdometerInput` foram corrigidos para aceitar `className`. Ver `SPEC-20260729-003`
para o detalhamento completo.

### Componentes novos em `packages/ui`

- [x] `Input`, `Textarea`, `Checkbox`, `Switch` (2026-07-30) — `packages/ui/src/components/{input,textarea,checkbox,switch}.tsx`, testes com `jest-axe`
- [x] `CurrencyInput`/`OdometerInput` corrigidos para aceitar `className` (2026-07-30) — `packages/ui/src/components/masked-input.tsx`

### Formulários de escrita

- [x] `expenses/new`, `expenses/[id]` (2026-07-30) — `Input`/`Button`
- [x] `maintenance/new` (2026-07-30) — `Input`/`Button`
- [x] `maintenance/[id]` (2026-07-30) — `Input`/`Button`/`Combobox` (select de status)
- [x] `vehicles/new` (2026-07-30) — `Input`/`Button`/`Combobox` (select de tipo)
- [x] `vehicles/[id]`, `vehicles/[id]/odometer` (2026-07-30) — `Input`/`Button`
- [x] `vehicle-groups/new`, `vehicle-groups/[id]` (2026-07-30) — `Input`/`Button`/`Checkbox`; swatch de cor circular mantido ad hoc (dado do usuário, `vehicle_groups.color`, forma customizada fora da API do `Input`)
- [x] `fines/new`, `fines/[id]` (2026-07-30) — `Input`/`Button`/`Combobox` (select de veículo em `new`)
- [x] `settings/preferences` (2026-07-30) — `Input`/`Button`/`Checkbox`
- [x] `settings/vehicles/[vehicleId]/odometer-cycles` (2026-07-30) — `Input`/`Textarea`/`Button`/`Table` (tabela crua migrada para os primitivos já existentes)
- [x] `settings/account/delete-account-dialog.tsx` (2026-07-30) — `Input` (já tinha className manual equivalente, normalizado para o componente)

### Autenticação

- [x] `login`, `register`, `recover-password`, `reset-password` (2026-07-30) — `Input`/`Button`/`Checkbox`
- [x] `components/password-input.tsx` (2026-07-30) — `inputBaseClass` de `@navestory/ui`, corrige input sem borda/rounded que já estava em produção

### Componentes compartilhados e ajustes finos

- [x] `components/dashboard/KpiPicker.tsx` (2026-07-30) — `Button`/`Checkbox` no diálogo
- [x] `analytics/page.tsx` (2026-07-30) — `Combobox` no select de veículo (antes só parcialmente estilizado)
- [x] `dashboard/page.tsx` (2026-07-30) — `Input` (mês), `Combobox` (veículo), `Button` (exportar CSV, "ver mais")
- [x] `expenses/page.tsx`, `fines/page.tsx` (2026-07-30) — botões de ação (`Ver` desabilitado, transições de status) migrados para `Button`

Testes ajustados: `maintenance/[id]/page.spec.tsx` e `fines/new/page.spec.tsx` (interação com
`<select>` virou `userEvent.click` no trigger + clique na `option`, mesmo padrão da Rodada 4);
`analytics/page.spec.tsx` (`findByDisplayValue` não se aplica a `Combobox` — trocado por
`waitFor` + `toHaveTextContent`). Suíte completa: `packages/ui` 157/157, `apps/web` 329/329.

Avaliados e mantidos ad hoc, sem migração (formas customizadas fora da API dos componentes,
consistente com decisões já registradas nas Rodadas 2/3): botão FAB circular do dock
(`action-dock.tsx`), botão hambúrguer do header (`header.tsx`), card selecionável de
`VehicleSpotlight.tsx`, badge/botão de `VehicleHealthCard.tsx`, botão fechar de contexto em foco
(`vehicle-context-chip.tsx`).

---

## Rodada 6 — `Badge`/`Skeleton`/`Container`/`Tooltip` (`SPEC-20260730-001`)

**Por quê:** o usuário pediu para padronizar todo o design system conforme o showcase Prata. Uma
auditoria comparou os 9 componentes do showcase ainda sem análogo em `@navestory/ui` contra uso real em
produção; só 4 tinham consumidor real convergente hoje (os outros 5 ficam em "Sem ação por ora"
abaixo). Ver `SPEC-20260730-001` para o detalhamento completo.

### Componentes novos em `packages/ui`

- [x] `Badge`, `Skeleton`, `Container`, `Tooltip` (2026-07-30) — `packages/ui/src/components/{badge,skeleton,container,tooltip}.tsx`, testes com `jest-axe`
- [x] `@radix-ui/react-tooltip` adicionado como dependência de `packages/ui` (2026-07-30)
- [x] `kpi-card.tsx`/`chart-wrapper.tsx` refatorados internamente para compor `Skeleton` (2026-07-30)

### Badge (5 arquivos com badge pill real; 3 casos avaliados e mantidos ad hoc)

- [x] `apps/web/src/lib/fines/status-badge.ts` (2026-07-30) — `FINE_STATUS_BADGE_CLASS` → `FINE_STATUS_BADGE_VARIANT`
- [x] `fines/page.tsx`, `fines/[id]/page.tsx` (2026-07-30)
- [x] `atividades/page.tsx` (2026-07-30) — badge de ação (create/update/delete); normalizado de `rounded-full` para `rounded-md` (consistência com os demais badges do sistema)
- [x] `maintenance/page.tsx` (2026-07-30)
- [x] `VehicleHealthCard.tsx` (2026-07-30) — `DocumentBadge` (documentos IPVA/Seguro/CRLV)
- [x] `UpcomingCostsWidget.tsx`, `FleetAlertBar.tsx`, urgência de `expenses/page.tsx` (2026-07-30) — avaliados: tingem a linha/card inteiro da lista, não um pill isolado; `Badge` quebraria o layout. Mantidos com classe semântica ad hoc (exceção de R-DS-10)
- [x] `connectivity-indicator.tsx` (2026-07-30) — avaliado: pill de status único no header, proporções (`rounded-lg`, `px-2.5`, `h-8`) e contexto distintos de um badge de item de lista; mantido ad hoc

### Skeleton (3 consumidores em apps/web)

- [x] `financial-subheader.tsx`, `vehicle-context-chip.tsx`, `vehicle-switcher-content.tsx` (2026-07-30)

### Container (28 arquivos, 32 ocorrências)

- [x] Todas as rotas `page.tsx` de `(app)/` e `(auth)/` com o wrapper `<main className="mx-auto flex max-w-{size} flex-col gap-{n} p-8">` migradas para `<Container size gap>` (2026-07-30) — `pb-24` extra de `atividades`/`dashboard` preservado via `className`

### Tooltip (2 usos reais de `title=` nativo; 4 falsos-positivos identificados)

- [x] `sidebar.tsx` (2026-07-30) — label ao colapsar (nav items + botão Sair)
- [x] `VehicleHealthCard.tsx` (2026-07-30) — detalhe dos flags de saúde
- [x] `atividades/page.tsx` (2026-07-30) — timestamp completo do log
- [x] `analytics/page.tsx`, `restore-account/page.tsx` (2026-07-30) — avaliados: os `title=` da auditoria inicial eram na verdade a prop `title` de `ChartWrapper`/`EmptyState`/`Alert`, não o atributo HTML nativo; nada a migrar

Testes ajustados: `VehicleHealthCard.spec.tsx` (asserção de `getByTitle` → `userEvent.hover` + `findByText` no conteúdo do `Tooltip`). Suíte completa: `packages/ui` 179/179 (157+22 novos), `apps/web` 329/329.

---

## Sem ação por ora (aguardam feature de fase posterior)

Componentes prontos, sem consumidor real ainda — não antecipar migração sem a feature que os
justifica:

| Componente        | Aguarda                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Steps`           | wizard de cadastro de veículo                                                                                                         |
| `DateRangePicker` | filtros de relatório                                                                                                                  |
| `FileUpload`      | feature de anexos                                                                                                                     |
| `Breadcrumb`      | navegação hoje é só via sidebar                                                                                                  |
| `Switch`          | nenhum toggle on/off genérico de formulário ainda — telas atuais usam checkbox                                                        |
| `Avatar`          | nenhuma tela de perfil/foto de usuário existe hoje                                                                                    |
| `ProgressBar`     | só existe em `dashboard/concept/*` (protótipo isolado), sem consumidor real de produção                                               |
| `Divider`         | 2 ocorrências reais (`dashboard/page.tsx`, `system-footer.tsx`) — não justifica componente dedicado                                   |
| `Stack`           | uso disperso (`gap-1`/`gap-3`/`gap-4` combinados com outras classes) — cada caso já tem contexto próprio, extrair não traz ganho real |
| `Carousel`        | specimen do brand showcase sem consumidor real em nenhuma tela de produto hoje                                                        |

---

## Changelog

| Data       | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-22 | Criação do plano, a partir do levantamento de pendências em `matrices/rastreabilidade.md` §SPEC-20260525-001                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-07-22 | Rodada 1 concluída: `fines/page.tsx`, `fines/new/page.tsx`, `fines/[id]/page.tsx` migrados para `Alert`/`EmptyState` de `@navestory/ui`. Teste de `fines/new/page.spec.tsx` ajustado — CTA de "Nenhum veículo cadastrado" era um `<Link>` com `href`, virou botão de `EmptyState.action` com `router.push` (mesmo padrão de navegação programática já usado no restante da página). 17/17 testes passam.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-07-22 | Rodadas 2 e 3 concluídas juntas (forte sobreposição de arquivo, conforme a nota da Rodada 3): todos os formulários, telas de listagem/detalhe e componentes compartilhados migrados para `Alert`/`EmptyState`. Testes ajustados em `expenses/new/page.spec.tsx`, `dashboard/page.spec.tsx` e `analytics/page.spec.tsx` (CTA de empty state virou botão + `router.push` em vez de `<Link>`; `analytics/page.spec.tsx` e `dashboard/page.spec.tsx` ganharam mock de `useRouter`). Exceções documentadas (mantidas ad hoc por não caberem na API do `Alert`/`EmptyState`): bloco de duplicata em `expenses/new/page.tsx` (link + botão, duas ações); aviso de e-mail duplicado em `register/page.tsx` (dois links); badge inline em `VehicleHealthCard.tsx` (card denso, `Alert` quebraria o layout); busca sem resultado em `vehicle-switcher-content.tsx` (lista estreita, `EmptyState` é grande demais); card "unavailable" em `DashboardKpiGrid.tsx` (mantém o formato do `KpiCard`, não é empty state). `sidebar.tsx`, `vehicle-context-chip.tsx`, `connectivity-indicator.tsx` e `command-palette-trigger.tsx` avaliados sem padrão ad hoc a migrar. Suíte completa de `apps/web`: 62 arquivos, 321 testes, todos passando.                                     |
| 2026-07-22 | Rodada 4 concluída: todos os `<select>` nativos das 3 telas (`expenses/new`, `maintenance/new`, `expenses/[id]`) migrados para `Combobox` de `@navestory/ui` — Veículo (2 telas) e Categoria/Tipo de combustível (2 telas). Label visual trocado de `<label htmlFor>` para `<span>` + `aria-label` no `Combobox` (mesmo padrão já usado no grupo "Tanque cheio?" desta tela — `Combobox` não expõe `id`/`htmlFor`, então `<label htmlFor>` sem alvo violava `jsx-a11y/label-has-associated-control`). Prop `loading={vehiclesLoading}` adicionada ao `Combobox` de Veículo para dar um estado observável de "carregando" (usado pelos testes para aguardar o fetch antes de abrir o dropdown). Testes reescritos: interações via `fireEvent.change` em `<select>` viraram `userEvent.click` no trigger + `click` na opção (`role="option"`) do `Cmdk`; asserções `toHaveValue` em campo selecionado viraram `toHaveTextContent` no trigger. `apps/web/vitest.setup.ts` ganhou os stubs de `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`/`scrollIntoView` que `@radix-ui/react-popover`/`cmdk` exigem em jsdom (mesmo stub já existente em `packages/ui/vitest.setup.ts`). Suíte completa de `apps/web`: 62 arquivos, 321 testes, todos passando. |
| 2026-07-30 | Rodada 5 concluída (`SPEC-20260729-003`): 4 componentes novos (`Input`, `Textarea`, `Checkbox`, `Switch`) + correção de `CurrencyInput`/`OdometerInput` (aceitam `className`) em `packages/ui`; ~25 arquivos migrados (formulários de escrita, autenticação, `KpiPicker`, selects de `analytics`/`dashboard`/`maintenance/[id]`/`fines/new`, botões de `expenses`/`fines` listagem). Testes ajustados: `maintenance/[id]/page.spec.tsx` e `fines/new/page.spec.tsx` (select→Combobox, mesmo padrão da Rodada 4); `analytics/page.spec.tsx` (`findByDisplayValue`→`waitFor`+`toHaveTextContent`, já que Combobox fechado não expõe o texto do option no DOM antes de abrir). Suíte completa: `packages/ui` 157/157 (141+16 novos), `apps/web` 329/329.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-07-30 | Rodada 6 concluída (`SPEC-20260730-001`): 4 componentes novos (`Badge`, `Skeleton`, `Container`, `Tooltip`, este sobre `@radix-ui/react-tooltip` nova dependência) em `packages/ui`, com `kpi-card.tsx`/`chart-wrapper.tsx` refatorados para compor `Skeleton`. Badge migrado em 5 arquivos (`status-badge.ts`, `fines/page.tsx`, `fines/[id]/page.tsx`, `atividades/page.tsx`, `maintenance/page.tsx`, `VehicleHealthCard.tsx`); 3 casos avaliados e mantidos ad hoc por tingirem a linha/card inteiro em vez de um pill isolado (`UpcomingCostsWidget.tsx`, `FleetAlertBar.tsx`, urgência de `expenses/page.tsx`). Skeleton migrado em 3 arquivos. Container migrado em 28 arquivos `page.tsx` (32 ocorrências). Tooltip migrado em 3 arquivos (`sidebar.tsx`, `VehicleHealthCard.tsx`, `atividades/page.tsx`) — a auditoria inicial apontou 5-6 usos de `title=`, mas 2 eram falsos-positivos (props `title` de componentes próprios, não o atributo nativo). Teste ajustado: `VehicleHealthCard.spec.tsx` (`getByTitle` → `userEvent.hover` + `findByText`). Suíte completa: `packages/ui` 179/179 (157+22 novos), `apps/web` 329/329.                                                                                                                         |
