# Specs — Workspace (Plano Frota)

Regras: R-WS-01, R-WS-02, R-WS-03, R-WS-04, R-WS-05

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260804-004](SPEC-20260804-004-workspace-foundation.md) | Fundação de Workspace — Owner, Membros, Convite e Atribuição de Veículo | Aprovada |

Implementação em `apps/api/src/modules/workspaces/`, `apps/web/src/app/workspace/` e
`supabase/migrations/` (tabelas `workspaces`, `workspace_invites`, `workspace_members`,
`workspace_vehicle_assignments`).

Pré-requisito de [SPEC-20260804-003](../fleet-admin/SPEC-20260804-003-fleet-settings.md)
(Configurações da Frota). Origem conceitual em
[SPEC-20260620-001](../business/SPEC-20260620-001-business-strategy-stories.md)
(BS-ACL-06, BS-ACL-07 — status draft, escopo de monetização/plano pago não incluído aqui).
