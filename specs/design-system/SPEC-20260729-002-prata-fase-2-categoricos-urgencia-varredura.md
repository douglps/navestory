---
id: SPEC-20260729-002
title: "Design System — Prata Fase 2: Paleta Categórica, Escala de Urgência e Varredura de Cor Hardcoded"
status: approved
date: 2026-07-29
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-07, R-DS-08, C-DS-01]
security: []
camadas: [frontend, design]
---

# SPEC-20260729-002: Design System — Prata Fase 2

**Status:** approved
**Criada em:** 2026-07-29
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

`SPEC-20260729-001` (adoção da direção Prata, `ADR-009`) deixou "Fora de Escopo" duas frentes: a varredura de cor hardcoded fora do sistema de tokens, e o realinhamento dos tokens `--surface*`/`--chart-*`/`--finance-outgoing` (`SPEC-20260721-002`, dashboard v2), que ainda carregavam valores pré-Prata.

O usuário pediu para implementar isso por completo. Duas explorações de código mapearam o trabalho real: a maior parte é migração mecânica (Tailwind ad hoc → tokens semânticos já existentes), mas duas situações não tinham token correspondente — indicadores de "modo/contexto" sem status real (chip/legenda de veículo) e a escada de urgência de vencimento de despesas (5 níveis de intensidade, modelo atual só tem estados "flat"). O agente `design-system` foi consultado para essas duas decisões (Okabe-Ito, ColorBrewer, ISO 11064-4) — ver `ADR-010` para o racional completo.

---

## Objetivo

Formalizar como requisitos rastreáveis: (1) a paleta categórica `--categorical-1..5` e seu mapeamento no indicador de contexto de veículo; (2) a escala de urgência de 4 níveis; (3) o realinhamento de `--surface*`/`--finance-outgoing`/`--primary` (dark) à direção Prata; (4) a varredura de cor hardcoded restante (chrome estrutural, PWA, badges de status semântico).

---

## Material de Referência (não duplicar aqui)

| Documento | Conteúdo | Caminho |
|-----------|----------|---------|
| ADR-010 | Racional de Okabe-Ito/ColorBrewer/ISO 11064-4, trade-offs | `docs/architecture/decisions/ADR-010-paleta-categorica-e-escala-urgencia.md` |
| ADR-009 / SPEC-20260729-001 | Adoção da direção Prata (tokens de marca) | `docs/architecture/decisions/ADR-009-adocao-direcao-prata.md` |

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P1 — Douglas, mantenedor do Nave.**
**Persona P2 — Gestor de frota**, usuário final.

### US-01 — Indicador de contexto sem apropriar semântica de status

**Como** P1, **quero** que o indicador de modo de contexto de veículo (single/group/multi/attribute) use uma paleta própria, **para** não confundir "categoria sem status" com `success`/`warning`/`danger`/`info`.

- **Dado que** o chip de contexto (`VehicleContextChip`) ou a legenda da sidebar renderizam qualquer modo, **quando** inspecionados, **então** usam `--categorical-1`/`--categorical-4`/`--categorical-5` (nunca tokens semânticos de status).
- **Dado que** o modo é `single` ou `multi`, **quando** renderizado, **então** ambos usam `--categorical-4`, diferenciados apenas por borda sólida (permanente) vs. tracejada (temporário) — mesma convenção pré-existente.

### US-02 — Gráficos com paleta categórica acessível

**Como** P2 (incluindo usuários com deuteranopia/protanopia), **quero** que gráficos multi-série usem cores distinguíveis mesmo sob daltonismo, **para** conseguir ler um gráfico de pizza/barras sem depender só da legenda de texto.

- **Dado que** um gráfico (`FleetCharts`, `analytics/page.tsx`, `TcoBreakdownChart`, `FuelTrendChart`) renderiza múltiplas séries/categorias, **quando** inspecionado, **então** usa `CHART_CATEGORY_COLORS` (`apps/web/src/lib/chart-colors.ts`), nunca hex hardcoded independente.

### US-03 — Urgência de vencimento em no máximo 4 níveis

**Como** P2, **quero** identificar rapidamente o quão urgente é o vencimento de uma despesa, **para** decidir o que tratar primeiro sem precisar ler cada data.

- **Dado que** uma despesa recorrente futura é listada, **quando** o badge de urgência é calculado, **então** usa exatamente 4 níveis codificados por cor (Vencido/`danger`, ≤7d/`urgency-hot`, ≤30d/`warning`, ≤60d/`info`), cada um sempre acompanhado do label numérico (`Nd`) ou "Vencido" — nunca só cor.

### US-04 — Nenhuma cor de marca hardcoded fora do sistema de tokens

**Como** P1, **quero** que toda cor de UI (exceto dados do usuário e protótipos isolados) venha do sistema de tokens, **para** que uma futura mudança de marca não exija varrer o código de novo.

- **Dado que** um componente de chrome estrutural, badge de status ou banner PWA é revisado, **quando** inspecionado, **então** usa classes Tailwind ligadas a tokens (`bg-card`, `border-border`, `text-muted-foreground`, `bg-{success,warning,danger,info}-pastel`, etc.) — exceto `dashboard/concept/*` (protótipos isolados, documentados em `colors.ts`) e a cor customizável de `vehicle-groups` (dado do usuário).
- **Dado que** `manifest.ts`/`layout.tsx` precisam de hex literal (meta tags não aceitam `var()`), **quando** inspecionados, **então** o hex corresponde ao hex-fonte documentado da paleta Prata (`#1B3A6B`/`#F4F6F8`), não a um valor pré-Prata esquecido.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História |
|----|-----------|------------|----------|
| RF-01 | Realinhar `--surface`/`--surface-elevated`/`--on-surface*` e `--primary` (dark, chroma reforçada) à direção Prata em `globals.css` | Alta | US-04 |
| RF-02 | Introduzir `--categorical-1..5` (substitui `--chart-1..5`) em `globals.css`/`tailwind.config.ts`; criar `apps/web/src/lib/chart-colors.ts`; migrar `FleetCharts.tsx`, `analytics/page.tsx`, `TcoBreakdownChart`, `FuelTrendChart`, `VehicleContextChip`, `sidebar.tsx` | Alta | US-01, US-02 |
| RF-03 | Introduzir `--urgency-hot`/`--urgency-hot-pastel`; migrar `urgencyBadge()` em `expenses/page.tsx` para 4 níveis; realinhar `--finance-outgoing` | Alta | US-03 |
| RF-04 | Migrar badges de status semântico 1:1 (`atividades`, `maintenance`, `fines` list+detail via helper compartilhado, `VehicleSpotlight`) para `success`/`warning`/`danger`/`info` + pastel, seguindo o padrão `bg-{variant}-pastel text-foreground` já usado por `Alert`/`KpiCard` | Alta | US-04 |
| RF-05 | Migrar chrome estrutural (`vehicle-context-dialog.tsx`, `vehicle-context-sheet.tsx`, `vehicle-switcher-content.tsx`, banners PWA, `offline/page.tsx`, avisos soltos de `register`/`recover-password`, grays de `page.tsx`/`password-input.tsx`) para tokens | Média | US-04 |
| RF-06 | Recalcular `manifest.ts`/`layout.tsx` (theme-color/background-color) para o hex-fonte da paleta Prata; corrigir comentário de exceção do `gold` em `colors.ts` (protótipos) | Baixa | US-04 |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Nenhuma regressão | `tsc --noEmit` limpo e suítes `vitest` completas de `packages/ui` (141 testes) e `apps/web` (329 testes) passando; `pnpm build` sem erros |
| RNF-02 | Nenhum consumidor órfão de `--chart-1..5` | `grep` confirmando zero ocorrências fora do comentário histórico |

---

## Fora de Escopo

- Varredura de cor da cor customizável de `vehicle_groups.color` (dado do usuário, não da marca).
- `dashboard/concept/page.tsx` e `dashboard/concept/design-system-v2/page.tsx` (protótipos isolados, já documentados como exceção em `colors.ts`).
- Recalibração de `success`/`warning`/`info` em dark mode (segue fora de escopo desde `SPEC-20260721-001`).

---

## Dependências

| Tipo | Referência |
|------|-----------|
| Spec | SPEC-20260729-001 (adoção da direção Prata) |
| Spec | SPEC-20260721-002 (dashboard v2, origem dos tokens `--surface*`/`--chart-*`/`--finance-outgoing`) |
| ADR | ADR-009, ADR-010 |
| Regra | R-DS-03 (paleta decorativa só via `gold`), C-DS-01 (contraste AA) |

---

## Notas Técnicas

Ver `ADR-010` para a tabela completa de valores OKLCH e o racional de acessibilidade cromática (Okabe-Ito/ColorBrewer/ISO 11064-4). Todos os pares texto/fundo novos (`urgency-hot`/`urgency-hot-pastel`) seguem o padrão `bg-{token}-pastel text-foreground` já estabelecido por `Alert`/`KpiCard` — nunca texto colorido direto sobre a pastel, garantindo contraste AA sem recalcular caso a caso.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-29 | Implementação concluída (RF-01 a RF-06) e spec criada já como `approved` — decisão e implementação ocorreram na mesma sessão. | Gate de sincronia exige matriz atualizada com caminhos reais; ver `matrices/rastreabilidade.md`. |
