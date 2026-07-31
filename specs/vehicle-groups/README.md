# Specs — Grupos de Veículos

Regras: R-GRP-01, R-GRP-02, R-GRP-03, R-GRP-04, R-CTX-02

| Spec | Título | Status |
|------|--------|--------|
| [SPEC-20260602-003](SPEC-20260602-003.md) | Grupos de Veículos | Aprovada |

Implementação em:
- Backend: `apps/api/src/modules/vehicle-groups/` (`VehicleGroupsController`, `VehicleGroupsService`, DTOs)
- Validators: `packages/validators/src/vehicle-group.schemas.ts` (`createGroupInputSchema`, `updateGroupInputSchema`, `setGroupMembersInputSchema`, `PRESET_GROUP_COLORS`)
- Frontend: `apps/web/src/app/(app)/vehicle-groups/` (listagem, criação, detalhe/edição)
- Schema: `supabase/migrations/20260712171846_grouping_templates_preferences.sql` (tabelas `vehicle_groups` e `vehicle_group_members`)
- RLS: `supabase/migrations/20260712172047_rls_policies.sql` (policies `vehicle_groups_owner`, `vehicle_group_members_owner`)

> **Nota de dependência:** RF-11 a RF-15 (integração com FleetAside, store Zustand, query param `groupId`) dependem do Sistema Em Foco (SPEC-20260602-001) e estão marcados ⏳ na matriz de rastreabilidade — aguardam Fase 5.
