-- @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md — corrige recursão infinita de RLS
-- Descoberto em teste manual (2026-08-04): `workspaces_member_select` consulta `workspace_members`,
-- e `workspace_members_owner_all` consulta `workspaces` de volta — o Postgres detecta o ciclo e
-- recusa qualquer SELECT/INSERT/UPDATE nas duas tabelas com "infinite recursion detected in policy
-- for relation workspaces". O mesmo padrão se repete em workspace_invites, workspace_vehicle_assignments,
-- workspace_driver_settings, workspace_member_profiles e na extensão de vehicles_select_own — todas
-- fazem EXISTS cruzado entre workspaces <-> workspace_members dentro da própria policy.
--
-- Correção padrão do Postgres/Supabase para esse caso: mover o EXISTS cruzado para dentro de uma
-- função `security definer` (dona pelo role de migração, que faz bypass de RLS internamente),
-- quebrando o ciclo de reavaliação de policy. As policies passam a chamar a função em vez de
-- fazer o EXISTS inline.

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and w.owner_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.removed_at is null
  );
$$;

create or replace function public.owns_workspace_member_row(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.id = p_member_id and wm.user_id = auth.uid() and wm.removed_at is null
  );
$$;

create or replace function public.workspace_member_owned_by_current_user(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.id = p_member_id and w.owner_id = auth.uid()
  );
$$;

create or replace function public.vehicle_has_active_workspace_assignment(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_vehicle_assignments wva
    join public.workspace_members wm on wm.id = wva.member_id
    where wva.vehicle_id = p_vehicle_id
      and wm.user_id = auth.uid()
      and wm.removed_at is null
  );
$$;

revoke execute on function public.is_workspace_owner(uuid) from public, anon;
revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.owns_workspace_member_row(uuid) from public, anon;
revoke execute on function public.workspace_member_owned_by_current_user(uuid) from public, anon;
revoke execute on function public.vehicle_has_active_workspace_assignment(uuid) from public, anon;

grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.owns_workspace_member_row(uuid) to authenticated;
grant execute on function public.workspace_member_owned_by_current_user(uuid) to authenticated;
grant execute on function public.vehicle_has_active_workspace_assignment(uuid) to authenticated;

-- workspaces
drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces for select
  using (public.is_workspace_member(id));

-- workspace_invites
drop policy if exists workspace_invites_owner_all on public.workspace_invites;
create policy workspace_invites_owner_all on public.workspace_invites for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

-- workspace_members
drop policy if exists workspace_members_owner_all on public.workspace_members;
create policy workspace_members_owner_all on public.workspace_members for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

-- workspace_vehicle_assignments
drop policy if exists workspace_vehicle_assignments_owner_all on public.workspace_vehicle_assignments;
create policy workspace_vehicle_assignments_owner_all on public.workspace_vehicle_assignments for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists workspace_vehicle_assignments_member_select on public.workspace_vehicle_assignments;
create policy workspace_vehicle_assignments_member_select on public.workspace_vehicle_assignments for select
  using (public.owns_workspace_member_row(member_id));

-- workspace_driver_settings
drop policy if exists workspace_driver_settings_owner_all on public.workspace_driver_settings;
create policy workspace_driver_settings_owner_all on public.workspace_driver_settings for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists workspace_driver_settings_member_select on public.workspace_driver_settings;
create policy workspace_driver_settings_member_select on public.workspace_driver_settings for select
  using (public.is_workspace_member(workspace_id));

-- workspace_member_profiles
drop policy if exists workspace_member_profiles_owner_all on public.workspace_member_profiles;
create policy workspace_member_profiles_owner_all on public.workspace_member_profiles for all
  using (public.workspace_member_owned_by_current_user(workspace_member_id))
  with check (public.workspace_member_owned_by_current_user(workspace_member_id));

drop policy if exists workspace_member_profiles_self_all on public.workspace_member_profiles;
create policy workspace_member_profiles_self_all on public.workspace_member_profiles for all
  using (public.owns_workspace_member_row(workspace_member_id))
  with check (public.owns_workspace_member_row(workspace_member_id));

-- vehicles: mesma extensão de RF-10/R-WS-04, agora sem recursão
alter policy vehicles_select_own on public.vehicles
  using (
    ((select auth.uid()) = user_id and deleted_at is null)
    or public.vehicle_has_active_workspace_assignment(id)
  );
