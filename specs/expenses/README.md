# Specs — Despesas

Regras: R1, R2, R3, R4, R5, R6, R-CAT-01..04, R-FUEL-01..06, R-LED-01..05, R-HUB-01..02, R-REC-01..02, R-EXP-01, R-ODO-01..02

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260714-001](SPEC-20260714-001-expenses-crud.md) | CRUD Base de Despesas (ExpensesModule) | Aprovada |
| [SPEC-20260521-003](SPEC-20260521-003.md) | Export CSV — Dashboard | Aprovada |
| [SPEC-20260601-001](SPEC-20260601-001-odometer-validation.md) | Validação de Sequência de Odômetro | Aprovada |
| [SPEC-20260601-002](SPEC-20260601-002-duplicate-detection.md) | Detecção de Duplicata de Despesa | Aprovada |
| [SPEC-20260601-003](SPEC-20260601-003-expense-templates.md) | Sistema de Modelos Rápidos de Despesas | Aprovada |
| [SPEC-20260602-004](SPEC-20260602-004.md) | Categorias Personalizadas de Despesa | Aprovada |
| [SPEC-20260606-001](SPEC-20260606-001-fuel-enrichment.md) | Tipo de Combustível, Tanque Cheio e Cálculo de Consumo | Aprovada |
| [SPEC-20260606-002](SPEC-20260606-002-fuel-supplier.md) | Fornecedor / Posto de Combustível | Aprovada |
| [SPEC-20260608-001](SPEC-20260608-001-upcoming-costs.md) | Próximas Despesas — endpoint + tab | Aprovada |
| [SPEC-20260608-002](SPEC-20260608-002-expenses-kpis.md) | KPIs financeiros da central | Aprovada |
| [SPEC-20260608-003](SPEC-20260608-003-recurring-costs-alerts.md) | Alertas IPVA/CRLV/Seguro | Aprovada |
| [SPEC-20260609-001](SPEC-20260609-001-recurring-costs-crud.md) | CRUD de Custos Recorrentes | Aprovada |
| [SPEC-20260609-002](SPEC-20260609-002-expenses-by-vehicle-tab.md) | Tab "Por Veículo" em /expenses | Aprovada |
| [SPEC-20260609-003](SPEC-20260609-003-consolidated-csv-export.md) | Exportação CSV Consolidada | Aprovada |
| [SPEC-20260612-001](SPEC-20260612-001-expense-form-ux-improvements.md) | Melhorias de UX no Formulário de Despesas e Hub Financeiro | Aprovada |
| [SPEC-20260612-002](SPEC-20260612-002-form-fields-adjustments.md) | Ajustes de Campos e Layout do Formulário de Despesas | Aprovada |

Implementação em `apps/api/src/modules/expenses/`, `apps/api/src/modules/recurring-costs/`, `apps/web/app/(dashboard)/expenses/`, `apps/web/app/(dashboard)/recurring-costs/`.

> **Ledger Unificado (EPIC-FIN-001):** As regras R-LED-01..05, R-HUB-01..02, R-REC-01..02 afetam também os módulos de multas e manutenções. Spec do FinesModule em [`specs/fines/SPEC-20260607-001-fines-module.md`](../fines/SPEC-20260607-001-fines-module.md). Decisão arquitetural documentada em [`docs/architecture/decisions/ADR-006-unified-financial-ledger.md`](../../docs/architecture/decisions/ADR-006-unified-financial-ledger.md).
