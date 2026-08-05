-- @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md — tabelas de workspace,
-- convite por link (R-WS-02), membership e atribuição de veículo (R-WS-04)

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- R-WS-01: um usuário só pode ser owner de 1 workspace por vez
create unique index workspaces_owner_unique on public.workspaces(owner_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token text not null unique,
  status text not null default 'pending' check (status = any (array['pending','accepted','revoked','expired'])),
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id)
);

create index workspace_invites_workspace_id_idx on public.workspace_invites(workspace_id);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invite_id uuid references public.workspace_invites(id),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (workspace_id, user_id)
);

-- R-WS-03: usuário pertence a no máximo 1 workspace ativo como member
create unique index workspace_members_user_active_unique on public.workspace_members(user_id) where removed_at is null;
create index workspace_members_workspace_id_idx on public.workspace_members(workspace_id);

create table public.workspace_vehicle_assignments (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null references public.profiles(id)
);

create index workspace_vehicle_assignments_member_id_idx on public.workspace_vehicle_assignments(member_id);

alter table public.workspaces enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_vehicle_assignments enable row level security;

-- workspaces: owner tem CRUD completo; member ativo pode ler o próprio workspace (GET /workspaces/me)
create policy workspaces_owner_all on public.workspaces for all
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy workspaces_member_select on public.workspaces for select
  using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = (select auth.uid())
      and wm.removed_at is null
  ));

-- workspace_invites: apenas o owner gerencia via RLS; leitura/aceite por token acontece via
-- service dedicado com SERVICE_ROLE_KEY (o token é a prova de autorização, não a posse RLS)
create policy workspace_invites_owner_all on public.workspace_invites for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));

-- workspace_members: owner gerencia via RLS; a criação da linha no aceite de convite usa o
-- service SERVICE_ROLE_KEY (o próprio convidado não é owner, não passaria nesta policy)
create policy workspace_members_owner_all on public.workspace_members for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));

create policy workspace_members_self_select on public.workspace_members for select
  using (user_id = (select auth.uid()));

-- workspace_vehicle_assignments: owner gerencia via RLS; member lê apenas as próprias atribuições
create policy workspace_vehicle_assignments_owner_all on public.workspace_vehicle_assignments for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));

create policy workspace_vehicle_assignments_member_select on public.workspace_vehicle_assignments for select
  using (exists (
    select 1 from public.workspace_members wm
    where wm.id = member_id
      and wm.user_id = (select auth.uid())
      and wm.removed_at is null
  ));
