-- @spec docs/architecture/decisions/ADR-006-unified-financial-ledger.md — R-LED-01..05, R-HUB-01/02, R-REC-01/02

create table public.vehicle_recurring_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  cost_type recurring_cost_type not null,
  year integer not null check (year >= 2000 and year <= 2100),
  amount numeric(10,2) not null check (amount > 0),
  due_date date not null,
  paid_at date,
  expense_id uuid references public.expenses(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint uq_vehicle_recurring_cost unique (vehicle_id, cost_type, year)
);

-- R-HUB-02: idempotência do ledger — no máximo uma expense ativa por origem
create unique index uq_expenses_source on public.expenses (source_type, source_id) where deleted_at is null;

-- cobertura de FK sinalizada no IMPACTO-026 (achado 3)
create index idx_vehicle_recurring_costs_expense_id on public.vehicle_recurring_costs (expense_id);
