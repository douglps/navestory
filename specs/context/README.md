# Specs — Contexto Global (Sistema Em Foco)

Regras: R5, R-CTX-01, R-CTX-02, R-CTX-03, R-CTX-04, R-CTX-05, R-CTX-06, R-CTX-07, S1, S2

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260602-001](SPEC-20260602-001-em-foco-contexto-global.md) | Sistema Em Foco — Contexto de Veículo Global | Aprovado |
| [SPEC-20260603-001](SPEC-20260603-001-context-chip-subheader.md) | Chip de Contexto de Veículo no Subheader + Dialog/Sheet de Seleção | Rascunho |

### SPEC-20260602-001 — implementação atual

`apps/web/components/layout/sidebar.tsx`, `apps/web/components/layout/fleet-aside.tsx`, `apps/web/components/layout/focus-slot.tsx`, `apps/web/components/layout/context-filter-sync.tsx`, `apps/web/hooks/use-vehicle-context-field.ts`, `apps/web/lib/context-labels.ts`, `apps/web/components/expenses/expense-form.tsx`, `apps/web/components/maintenance/maintenance-form.tsx`.

> RF-01 (slot no sidebar) desta spec é **substituído** pela SPEC-20260603-001 RF-15. Após a implementação da SPEC-20260603-001, o `FocusSlot` será removido do sidebar e o ponto de interação de contexto passará a ser o chip no subheader.

### SPEC-20260603-001 — implementação pendente

Novos componentes: `apps/web/components/layout/vehicle-context-chip.tsx`, `apps/web/components/layout/vehicle-context-dialog.tsx`, `apps/web/components/layout/vehicle-context-sheet.tsx`. Ajustes em: `apps/web/components/layout/header.tsx`, `apps/web/components/layout/sidebar.tsx`, `apps/web/components/layout/vehicle-switcher-content.tsx`.

> **Atualização 2026-06-15:** o `VehicleContextChip` foi posicionado no header superior (`Header`/`header.tsx`), à esquerda, após o logo/toggle de menu mobile — não no subheader (`FluidFleetHeader`/`fleet-subheader.tsx`), que mantém apenas os chips de categoria de despesa e botões de filtro. O menu de navegação (`NAV_TABS`) foi removido do header superior sem substituto, pois a navegação principal já existe na sidebar (`NAV_ITEMS`). Ver SPEC-20260603-001 RF-01 (nota "Atualização 2026-06-15") para detalhes.
