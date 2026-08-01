---
id: SPEC-20260730-001
title: "Design System — Padronização do Showcase Prata: Badge, Skeleton, Container, Tooltip"
status: approved
date: 2026-07-30
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-10, C-DS-01]
security: []
camadas: [frontend, design]
---

# SPEC-20260730-001: Design System — Padronização do Showcase Prata

**Status:** approved
**Criada em:** 2026-07-30
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

O usuário pediu para "padronizar todo o design system de acordo com o showcase Prata". Uma
auditoria (2 agentes de exploração) comparou os 9 componentes do brand showcase
(`apps/web/src/app/(app)/brand-showcase/_components/*-specimens/`) ainda sem análogo em
`@navestory/ui` contra o uso real em produção. O usuário confirmou construir só os que têm consumidor
real hoje: **Badge, Skeleton, Container, Tooltip**. `Avatar`, `ProgressBar`, `Divider` e `Stack`
ficam sem ação por ora (nenhuma tela real os usa hoje, só aparecem no showcase) — mesmo critério já
aplicado a `Switch`/`Steps`/`DateRangePicker`/`FileUpload`/`Breadcrumb`.

Achados da auditoria:

- **Badge** — 8+ arquivos já convergiam no padrão `border-{semantic} bg-{semantic}-pastel
text-foreground`, com um precedente de extração já existente
  (`apps/web/src/lib/fines/status-badge.ts`).
- **Skeleton** — `animate-pulse rounded-* bg-muted` idêntico em 5 lugares, incluindo dois já
  dentro do próprio `packages/ui` (`kpi-card.tsx`, `chart-wrapper.tsx`).
- **Container** — `<main className="mx-auto flex max-w-{size} flex-col gap-{n} p-8">` idêntico em
  32 ocorrências através de quase toda rota `page.tsx`.
- **Tooltip** — a auditoria inicial contou ~5-6 usos de `title=`, mas 4 desses eram na verdade a
  prop `title` de componentes próprios (`ChartWrapper`, `EmptyState`, `Alert`), não o atributo
  HTML nativo. Só 2 usos reais de tooltip nativo do navegador existiam:
  `VehicleHealthCard.tsx` (`flagsTooltip`) e `atividades/page.tsx` (timestamp completo). Migrados
  ambos, mais o label ao colapsar a sidebar (que usava `title=` condicional, não contado no
  levantamento inicial).

Durante a implementação, uma segunda correção de escopo: nem todo "badge de urgência" encontrado
na auditoria é um badge de fato. `UpcomingCostsWidget.tsx`, `FleetAlertBar.tsx` e a urgência de
`expenses/page.tsx` tingem a linha/card **inteiro** (`className` no `<li>`/`<div>` do item da
lista), não um pill isolado — usar `Badge` ali quebraria o layout (o componente é
`inline-flex ... px-1.5 py-0.5 text-xs`, muito menor que uma linha de lista). Esses 3 casos
permanecem com a classe semântica ad hoc no wrapper, documentados como exceção de `R-DS-10`.

---

## Objetivo

Formalizar como requisitos rastreáveis: (1) os 4 componentes novos de `packages/ui`; (2) a
migração dos consumidores reais identificados; (3) a regra `R-DS-10`, incluindo a exceção de
"tingimento de linha inteira" que não é badge.

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                 | Código                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| RF-01 | `Badge` criado (`variant`: success/warning/danger/info/neutral)                                                                                                                                                                                                           | `packages/ui/src/components/badge.tsx`                                         |
| RF-02 | `Skeleton` criado; `kpi-card.tsx`/`chart-wrapper.tsx` refatorados internamente para compor `Skeleton` em vez de reimplementar `animate-pulse rounded-* bg-muted`                                                                                                          | `packages/ui/src/components/skeleton.tsx`, `kpi-card.tsx`, `chart-wrapper.tsx` |
| RF-03 | `Container` criado (`size`: sm/md/2xl/3xl/4xl/5xl; `gap`: 4/8)                                                                                                                                                                                                            | `packages/ui/src/components/container.tsx`                                     |
| RF-04 | `Tooltip` criado sobre `@radix-ui/react-tooltip` (nova dependência de `packages/ui/package.json`, mesma família Radix de `dialog.tsx`/`combobox.tsx`/`tabs.tsx`)                                                                                                          | `packages/ui/src/components/tooltip.tsx`                                       |
| RF-05 | Badge migrado em `apps/web/src/lib/fines/status-badge.ts` (`FINE_STATUS_BADGE_CLASS` → `FINE_STATUS_BADGE_VARIANT`) e nos consumidores: `fines/page.tsx`, `fines/[id]/page.tsx`, `atividades/page.tsx`, `maintenance/page.tsx`, `VehicleHealthCard.tsx` (`DocumentBadge`) | arquivos citados                                                               |
| RF-06 | Skeleton migrado em `financial-subheader.tsx`, `vehicle-context-chip.tsx`, `vehicle-switcher-content.tsx`                                                                                                                                                                 | arquivos citados                                                               |
| RF-07 | Container migrado em 28 arquivos `page.tsx` de `(app)/` e `(auth)/` (32 ocorrências)                                                                                                                                                                                      | arquivos citados                                                               |
| RF-08 | Tooltip migrado em `sidebar.tsx` (label ao colapsar), `VehicleHealthCard.tsx` (flags), `atividades/page.tsx` (timestamp)                                                                                                                                                  | arquivos citados                                                               |

## Requisitos Não-Funcionais

| ID     | Requisito                                                                                                                                          | Métrica de Aceite                                                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Nenhuma regressão                                                                                                                                  | `tsc --noEmit` limpo; `vitest` completo — `packages/ui` 179/179 (157+22 novos), `apps/web` 329/329                                                 |
| RNF-02 | Zero `animate-pulse`/`<main className="mx-auto flex max-w-`/badge pill inline fora de `Skeleton`/`Container`/`Badge`, exceto exceções documentadas | `grep` confirmando ocorrências restantes só em `brand-showcase/`, `dashboard/concept/*`, e os 3 casos de "tingimento de linha inteira" (não-badge) |

---

## Fora de Escopo

- `Avatar`, `ProgressBar`, `Divider`, `Stack` — sem consumidor real hoje, só aparecem no showcase.
  Documentados em `PLANO-MIGRACAO-CONSUMIDORES.md`, tabela "Sem ação por ora".
- `UpcomingCostsWidget.tsx`, `FleetAlertBar.tsx`, urgência de `expenses/page.tsx` — tingimento de
  linha/card inteiro, não um badge pill; permanecem com classe semântica ad hoc (exceção de
  `R-DS-10`).
- `connectivity-indicator.tsx` — pill de status único no header (contexto e proporções distintas
  de um badge de item de lista); mantido ad hoc.
- `analytics/page.tsx`/`restore-account/page.tsx` — os `title=` encontrados na auditoria inicial
  eram props nomeadas `title` de `ChartWrapper`/`EmptyState`/`Alert`, não o atributo HTML nativo;
  nada a migrar ali.

---

## Changelog (pós-aprovação)

| Data       | O que mudou                                                                                                                                                              | Por quê                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 2026-07-30 | Implementação concluída (RF-01 a RF-08) e spec criada já como `approved` — decisão e implementação ocorreram na mesma sessão, mesmo padrão de `SPEC-20260729-002`/`003`. | Gate de sincronia exige matriz atualizada com caminhos reais; ver `matrices/rastreabilidade.md`. |
