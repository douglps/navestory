# Multas — Índice de Specs

Feature: gestão completa do ciclo de vida de multas de veículos, incluindo backend REST, ledger
unificado de despesas e frontend de CRUD.

| Spec | Título | Status | Camadas |
|------|--------|--------|---------|
| [SPEC-20260607-001](SPEC-20260607-001-fines-module.md) | FinesModule — API REST e Integração com Ledger | approved | backend, database |
| [SPEC-20260722-005](SPEC-20260722-005-fines-frontend.md) | Tela /fines — Frontend do Módulo de Multas | approved | frontend |

## Dependências entre specs

- `SPEC-20260722-005` depende integralmente de `SPEC-20260607-001` (backend já implementado antes
  do frontend ser especificado).
- Ambas as specs participam do **Ledger Unificado** (EPIC-FIN-001 / IMPACTO-016): multas criam
  despesas vinculadas via `source_type = 'fine'`; cancelamento de multa propaga soft-delete para a
  despesa vinculada (R-LED-03, R-HUB-01).

## Rastreabilidade

Ver seções `SPEC-20260607-001` e `SPEC-20260722-005` em `matrices/rastreabilidade.md`.
