---
id: SPEC-20260729-003
title: "Design System — Fecho de Formulários: Input, Textarea, Checkbox, Switch e Migração de Consumidores Restantes"
status: approved
date: 2026-07-30
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-DS-09, C-DS-01]
security: []
camadas: [frontend, design]
---

# SPEC-20260729-003: Design System — Fecho de Formulários

**Status:** approved
**Criada em:** 2026-07-30
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

O usuário pediu para alinhar todo o produto ao brand showcase da direção Prata (`SPEC-20260729-001`,
`SPEC-20260729-002`). Uma auditoria de código (3 agentes de exploração) confirmou que a migração de
cor/tokens e a migração de `Alert`/`EmptyState`/`Combobox` (`PLANO-MIGRACAO-CONSUMIDORES.md`,
Rodadas 1–4) já estavam concluídas — mas nunca existiu uma rodada para os elementos de formulário
mais básicos: `<input>` de texto, `<textarea>`, `<button>` cru, checkbox e switch. Esses elementos
renderizavam sem nenhuma classe Tailwind, com o estilo padrão do navegador, mesmo em produção — daí
o sintoma relatado: "os formulários estão tão diferentes [do showcase]".

`packages/ui` não tinha `Input`/`Textarea`/`Checkbox`/`Switch` genéricos. `Button` já existia
(`SPEC-20260525-001`) mas boa parte das telas não o usava. Até `CurrencyInput`/`OdometerInput`
(`masked-input.tsx`) renderizavam `<input>` sem className — o mesmo bug, disfarçado dentro de um
componente "pronto". A auditoria mapeou ~25 arquivos afetados: praticamente todo formulário de
escrita do produto (despesas, multas, manutenção, veículos, grupos, preferências, ciclos de
odômetro, autenticação) mais componentes compartilhados (`KpiPicker`, `password-input`).

O padrão tokenizado correto já existia em produção em pelo menos 2 lugares —
`vehicle-switcher-content.tsx` e o trigger do `Combobox` — que serviram de base para os componentes
novos, em vez do `PATTERN_INPUT_CLASS` do protótipo `dashboard/concept` (paleta "Papel/Petróleo"
própria, hardcoded, incompatível com os tokens reais de Prata).

---

## Objetivo

Formalizar como requisitos rastreáveis: (1) os 4 componentes novos de `packages/ui`
(`Input`, `Textarea`, `Checkbox`, `Switch`); (2) a correção de `CurrencyInput`/`OdometerInput` para
aceitar `className` e usar a mesma classe-base; (3) a migração de todos os consumidores reais
identificados na auditoria; (4) a regra `R-DS-09`, que fecha a lacuna que `R-FORM-03` deixava (só
cobria campos monetários).

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P1 — Douglas, mantenedor do Nave.**
**Persona P2 — Gestor de frota**, usuário final.

### US-01 — Formulários com aparência consistente com a marca

**Como** P2, **quero** que todo campo de formulário (texto, checkbox, botão) tenha a mesma aparência
visual do resto do produto, **para** não ter a sensação de estar usando uma tela quebrada ou
inacabada.

- **Dado que** uma tela renderiza um campo de texto livre, número ou data, **quando** inspecionada,
  **então** usa `Input`/`Textarea` de `@nave/ui` (ou `CurrencyInput`/`OdometerInput`, já corrigidos),
  nunca `<input>`/`<textarea>` sem estilo.
- **Dado que** uma tela renderiza um botão de ação, **quando** inspecionada, **então** usa `Button`
  de `@nave/ui`, nunca `<button>` sem estilo (exceções: controles com forma customizada que a API do
  `Button` não cobre, ex.: swatch de cor circular em `vehicle-groups`).
- **Dado que** uma tela renderiza um checkbox, **quando** inspecionada, **então** usa `Checkbox` de
  `@nave/ui`.
- **Dado que** uma tela renderiza um `<select>` nativo, **quando** inspecionada, **então** usa
  `Combobox` de `@nave/ui` (mesmo padrão já estabelecido na Rodada 4 do plano de migração).

### US-02 — Nenhuma regressão de comportamento ou teste

**Como** P1, **quero** que a migração seja puramente visual (troca de elemento por componente
estilizado equivalente), **para** não introduzir bugs funcionais numa varredura de ~25 arquivos.

- **Dado que** um arquivo é migrado, **quando** a suíte de testes correspondente roda,
  **então** passa sem alteração de comportamento — só ajustes de interação onde `<select>` virou
  `Combobox` (mesmo padrão de teste já validado na Rodada 4: `userEvent.click` no trigger + clique na
  `option`, em vez de `fireEvent.change`).

---

## Requisitos Funcionais

| ID | Requisito | Código |
|----|-----------|--------|
| RF-01 | Criar `Input` (texto genérico, `error` opcional) e `Textarea` em `packages/ui/src/components/`, reaproveitando a classe-base já validada em produção (`rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary`) | `packages/ui/src/components/input.tsx`, `textarea.tsx` |
| RF-02 | Criar `Checkbox` (nativo + `accent-primary`) e `Switch` (`role="switch"`, sem dependência Radix nova) | `packages/ui/src/components/checkbox.tsx`, `switch.tsx` |
| RF-03 | Corrigir `CurrencyInput`/`OdometerInput` para aceitar `className` e aplicar a mesma classe-base (`inputBaseClass`, exportada por `input.tsx`) por padrão | `packages/ui/src/components/masked-input.tsx` |
| RF-04 | Migrar os formulários de escrita (`expenses`, `maintenance`, `vehicles`, `vehicle-groups`, `fines`, `settings/preferences`, `settings/vehicles/.../odometer-cycles`) para os componentes novos + `Button`/`Combobox`/`Table` já existentes | `apps/web/src/app/(app)/**/page.tsx` |
| RF-05 | Migrar as telas de autenticação (`login`, `register`, `recover-password`, `reset-password`) e `components/password-input.tsx` | `apps/web/src/app/(auth)/**/page.tsx`, `apps/web/src/components/password-input.tsx` |
| RF-06 | Migrar componentes/telas com elementos crus remanescentes identificados na varredura final: `KpiPicker`, seletor de veículo em `analytics`/`dashboard`, botões de `expenses`/`fines` (listagem e detalhe), `settings/account/delete-account-dialog.tsx` | `apps/web/src/components/dashboard/KpiPicker.tsx`, demais arquivos listados |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Nenhuma regressão | `tsc --noEmit` limpo em `packages/ui`/`apps/web`; suíte `vitest` completa de `packages/ui` (157 testes, 141 + 16 novos) e `apps/web` (329 testes) passando |
| RNF-02 | Nenhum `<input>`/`<button>`/`<select>`/`<textarea>` sem estilo fora das exceções documentadas | `grep` confirmando zero ocorrências fora de `brand-showcase/` e `dashboard/concept/*` |

---

## Fora de Escopo

- Componentes do showcase sem consumidor real hoje: `Badge`, `Avatar`, `Skeleton`, `ProgressBar`,
  `Tooltip`, `Carousel`, `Divider`, `Stack`, `Container` — ficam documentados como "sem ação por ora"
  no `PLANO-MIGRACAO-CONSUMIDORES.md`, mesmo critério já usado para `Steps`/`DateRangePicker`/
  `FileUpload`/`Breadcrumb`.
- `dashboard/concept/page.tsx` e `dashboard/concept/design-system-v2/page.tsx` (protótipos isolados,
  já documentados como exceção em `colors.ts`).
- Cor customizável de `vehicle_groups.color` (dado do usuário, não da marca) — o swatch circular em
  `vehicle-groups/new` permanece com estilo próprio, não migra para `Input`/`Button`.

---

## Dependências

| Tipo | Referência |
|------|-----------|
| Spec | SPEC-20260525-001 (componentes base de `packages/ui`, incl. `Button`) |
| Spec | SPEC-20260729-001, SPEC-20260729-002 (adoção da direção Prata) |
| Documento | `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md` (Rodada 5) |
| Regra | R-FORM-03 (precedente: `CurrencyInput` obrigatório para valores monetários) |

---

## Notas Técnicas

`Checkbox` e `Switch` foram implementados sem nova dependência Radix (`@radix-ui/react-checkbox`/
`react-switch`) — nenhum consumidor atual precisa de estado indeterminado, e o projeto já evita
dependência nova sem necessidade concreta (princípio "não reinvente o que já existe" vale nos dois
sentidos: não adicionar lib nem abstração sem uso real). `Switch` ficou pronto sem consumidor real
ainda, mesmo status de "sem ação por ora" dos demais componentes órfãos.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-30 | Implementação concluída (RF-01 a RF-06) e spec criada já como `approved` — decisão e implementação ocorreram na mesma sessão, mesmo padrão de `SPEC-20260729-002`. | Gate de sincronia exige matriz atualizada com caminhos reais; ver `matrices/rastreabilidade.md`. |
