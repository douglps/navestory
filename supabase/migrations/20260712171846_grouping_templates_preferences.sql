-- @spec docs/architecture/entities.md — agrupamento, templates, categorias e preferências

create table public.vehicle_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 60),
  color text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_group_members (
  group_id uuid not null references public.vehicle_groups(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  primary key (group_id, vehicle_id)
);

create table public.expense_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 60),
  category text not null,
  amount numeric(10,2) not null check (amount > 0),
  description text check (description is null or char_length(description) <= 255),
  liters numeric(6,2) check (liters is null or liters > 0),
  fuel_type text check (fuel_type is null or fuel_type = any (array['gasoline','gasoline_premium','ethanol','diesel','diesel_s10','gnv','electric','hybrid'])),
  supplier text,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  value text not null check (value ~ '^[a-z0-9_-]+$'),
  label text not null check (char_length(label) >= 1 and char_length(label) <= 100),
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_chip_fields text[] not null default array['make','plate','model'] check (array_length(vehicle_chip_fields, 1) >= 1),
  auto_draft_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
