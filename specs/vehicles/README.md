# Specs — Veículos

Regras: R5, R-VEH-01, R-VEH-02, R-DISP-01, R-DISP-02, R-DISP-03, R-ODO-03, R-ODO-04, R-ODO-05, R-ODO-06, R-HS-01 a R-HS-10

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260602-002](SPEC-20260602-002.md) | Gestão de Veículos (CRUD) | Aprovada |
| [SPEC-20260603-003](SPEC-20260603-003-vehicle-display-preferences.md) | Preferências de Exibição do Veículo no Chip | Aprovada |
| [SPEC-20260711-001](SPEC-20260711-001-odometer-cycles.md) | Ciclos de Odômetro | Aprovada |
| [SPEC-20260730-001](SPEC-20260730-001-vehicle-health-score.md) | Score de Saúde de Veículo e Frota | Draft |

> SPEC-20260602-003 (Grupos de Veículos) foi reorganizada para [`specs/vehicle-groups/`](../vehicle-groups/). O arquivo `SPEC-20260602-003.md` nesta pasta é apenas um ponteiro redirect.

Implementação em `apps/api/src/modules/vehicles/`, `apps/api/src/modules/odometer-cycles/`, `apps/web/src/app/(app)/vehicles/` e `apps/web/src/app/(app)/settings/`.

> **Ciclos de Odômetro (SPEC-20260711-001):** Fecha NG-04 de `specs/expenses/SPEC-20260601-001-odometer-validation.md`. Introduz `vehicle_odometer_cycles` como série temporal auditável de resets e estende `odometer_km` como campo obrigatório em manutenções com `status = completed`. Decisão arquitetural documentada em [`docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md`](../../docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md). Análise de impacto: IMPACTO-025 (`matrices/impacto.md`).
