-- @spec docs/architecture/entities.md — motoristas e documentos digitalizados
-- NOTA (2026-07-13): estas 3 tabelas foram removidas pela migration 0016_drop_unspecced_driver_document_tables.sql
-- porque não têm spec aprovada em specs/ (ver docs/IMPLEMENTATION_STRATEGY.md Tarefa T0.2). Mantido aqui
-- inalterado como registro histórico fiel do que foi de fato aplicado no projeto Supabase `Nave`.

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  legal_id text,
  phone text,
  email text,
  cnh_number text,
  cnh_category text,
  cnh_expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.vehicle_drivers (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (vehicle_id, driver_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type = any (array['user','vehicle','driver'])),
  entity_id uuid not null,
  document_type text not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
