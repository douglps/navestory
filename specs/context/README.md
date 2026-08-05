# Specs — Contexto Global (Sistema Em Foco)

Regras: R5, R-CTX-01, R-CTX-02, R-CTX-03, R-CTX-04, R-CTX-05, R-CTX-06, R-CTX-07, R-CTX-08, R-CTX-09, S1, S2

| Spec                                                                              | Título                                                                            | Status   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| [SPEC-20260602-001](SPEC-20260602-001-em-foco-contexto-global.md)                 | Sistema Em Foco — Contexto de Veículo Global                                      | Aprovado |
| [SPEC-20260603-001](SPEC-20260603-001-context-chip-subheader.md)                  | Chip de Contexto de Veículo no Subheader + Dialog/Sheet de Seleção                | Aprovado |
| [SPEC-20260804-002](SPEC-20260804-002-contexto-padrao-e-rotulo-none.md)           | Rótulo Correto do Modo `none` e Preferência de Contexto Padrão por Sessão         | Aprovado |

### SPEC-20260602-001 — implementada (T5.3)

`apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/lib/context/context-labels.ts`, `apps/web/src/lib/context/use-vehicle-context.ts`, `apps/web/src/lib/stores/use-dashboard-store.ts`, `apps/web/src/components/expenses/expense-form.tsx`, `apps/web/src/components/maintenance/maintenance-form.tsx`.

> O `FocusSlot` foi removido do sidebar pela SPEC-20260603-001 (T5.4). O ponto de interação de contexto é o `VehicleContextChip` no header superior.

### SPEC-20260603-001 — implementada (T5.4)

> **Correção de status (2026-08-04):** esta spec constava como "Rascunho" neste README, mas foi promovida para `approved` e implementada em T5.4 (2026-07-16) — ver cabeçalho da spec e revisão v0.3 do histórico.

Componentes implementados: `apps/web/src/components/layout/header.tsx`, `apps/web/src/components/layout/vehicle-context-chip.tsx`, `apps/web/src/components/layout/vehicle-context-dialog.tsx`, `apps/web/src/components/layout/vehicle-context-sheet.tsx`, `apps/web/src/components/layout/vehicle-switcher-content.tsx`. Hook compartilhado: `apps/web/src/lib/context/use-vehicle-context.ts`.

### SPEC-20260804-002 — implementação pendente

Altera: `apps/web/src/lib/context/use-vehicle-context.ts` (RF-01, RF-02), `apps/web/src/app/(app)/layout.tsx` (RF-09), `apps/api/src/modules/preferences/` (RF-05, RF-06), `packages/validators/src/preferences.schemas.ts` (RF-05), `/settings/preferences` (RF-07, RF-08). Requer migration de banco: adicionar `default_context_type` e `default_context_id` em `user_preferences` (RF-04).
