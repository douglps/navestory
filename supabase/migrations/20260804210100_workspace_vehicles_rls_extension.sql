-- @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-10, R-WS-04 — estende a
-- visibilidade de veículos para workspace_member com atribuição ativa, sem alterar a regra de
-- posse existente (dono continua vendo os próprios veículos). Apenas policy de SELECT — sem
-- risco do bug de WITH CHECK corrigido em 20260731192440 (SELECT não tem WITH CHECK).

alter policy vehicles_select_own on public.vehicles
  using (
    ((select auth.uid()) = user_id and deleted_at is null)
    or exists (
      select 1 from public.workspace_vehicle_assignments wva
      join public.workspace_members wm on wm.id = wva.member_id
      where wva.vehicle_id = vehicles.id
        and wm.user_id = (select auth.uid())
        and wm.removed_at is null
    )
  );
