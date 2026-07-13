-- @spec docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md — R-ODO-03..06

create table public.vehicle_odometer_cycles (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  cycle_number int not null check (cycle_number >= 2),
  started_at timestamptz not null default now(),
  starting_value int not null default 0 check (starting_value >= 0),
  previous_cycle_max int,
  reason text not null check (char_length(reason) >= 3 and char_length(reason) <= 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_odometer_cycles_vehicle_started on public.vehicle_odometer_cycles (vehicle_id, started_at desc);

-- R-ODO-04: retorna o início do ciclo ativo; NULL quando o veículo nunca resetou (ciclo 1 implícito)
create or replace function public.get_active_cycle_start(p_vehicle_id uuid)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select max(started_at) from public.vehicle_odometer_cycles where vehicle_id = p_vehicle_id;
$$;
