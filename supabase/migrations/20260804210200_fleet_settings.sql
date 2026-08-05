-- @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md — campos obrigatórios de motorista
-- (R-FLEET-01/02) e perfil de motorista por workspace_member (RF-04, RF-11)

create table public.workspace_driver_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  require_cnh_number boolean not null default true,
  require_cnh_expiry boolean not null default true,
  require_cnh_category boolean not null default true,
  require_phone boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table public.workspace_member_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_member_id uuid not null unique references public.workspace_members(id) on delete cascade,
  cnh_number text,
  cnh_category text,
  cnh_expires_at date,
  phone text,
  updated_at timestamptz not null default now()
);

alter table public.workspace_driver_settings enable row level security;
alter table public.workspace_member_profiles enable row level security;

-- workspace_driver_settings: apenas o owner do workspace gerencia (RF-02, R-FLEET-01/02)
create policy workspace_driver_settings_owner_all on public.workspace_driver_settings for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));

-- member lê (nunca escreve) os campos obrigatórios do próprio workspace — RF-04 precisa saber
-- o que preencher no checklist de onboarding
create policy workspace_driver_settings_member_select on public.workspace_driver_settings for select
  using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_driver_settings.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.removed_at is null
  ));

-- workspace_member_profiles: owner do workspace lê/gerencia todos os perfis dos seus membros
-- (painel de conformidade, RF-11/RF-13); o próprio member lê e edita apenas o seu (RF-04)
create policy workspace_member_profiles_owner_all on public.workspace_member_profiles for all
  using (exists (
    select 1 from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.id = workspace_member_id and w.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.id = workspace_member_id and w.owner_id = (select auth.uid())
  ));

create policy workspace_member_profiles_self_all on public.workspace_member_profiles for all
  using (exists (
    select 1 from public.workspace_members wm
    where wm.id = workspace_member_id and wm.user_id = (select auth.uid()) and wm.removed_at is null
  ))
  with check (exists (
    select 1 from public.workspace_members wm
    where wm.id = workspace_member_id and wm.user_id = (select auth.uid()) and wm.removed_at is null
  ));
