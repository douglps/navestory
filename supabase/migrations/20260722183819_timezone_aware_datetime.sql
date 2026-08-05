-- @spec SPEC-20260715-002 RF-BD-01, RF-BD-02, RF-BD-03, RF-BD-04
-- Suporte a fuso horário por usuário: coluna `timezone` em user_preferences, e migração de
-- expenses.date / maintenances.scheduled_date / maintenances.completion_date de DATE para
-- TIMESTAMPTZ. `expenses.date` é renomeada para `occurred_at` (decisão fechada D-01 — a semântica
-- "só data" deixa de valer quando o campo passa a carregar hora e fuso).
--
-- Dados existentes (RF-BD-04, D-02): cada linha `DATE` legada vira meia-noite no fuso do dono do
-- registro (JOIN com user_preferences.timezone), com fallback 'UTC' quando o dono não tem fuso
-- configurado. `date::timestamp at time zone tz` interpreta o valor `timestamp without time zone`
-- como horário local naquele fuso e produz o `timestamptz` (UTC) equivalente.

begin;

alter table public.user_preferences
  add column if not exists timezone text
    check (timezone is null or char_length(timezone) between 1 and 64);

-- expenses.date -> expenses.occurred_at (timestamptz)
-- Postgres não permite subquery correlacionada em `ALTER COLUMN TYPE ... USING`
-- (SQLSTATE 0A000: cannot use subquery in transform expression), por isso a conversão
-- usa coluna auxiliar + UPDATE...FROM (que suporta join normalmente) em vez de um único ALTER.
alter table public.expenses add column occurred_at timestamptz;

update public.expenses e
set occurred_at = e.date::timestamp at time zone coalesce(up.timezone, 'UTC')
from public.user_preferences up
where up.user_id = e.user_id;

update public.expenses e
set occurred_at = e.date::timestamp at time zone 'UTC'
where e.occurred_at is null;

alter table public.expenses alter column occurred_at set not null;
alter table public.expenses drop column date;

-- maintenances.scheduled_date / completion_date (timestamptz, nomes mantidos — RF-BD-03)
alter table public.maintenances add column scheduled_date_tz timestamptz;
alter table public.maintenances add column completion_date_tz timestamptz;

update public.maintenances m
set scheduled_date_tz = m.scheduled_date::timestamp at time zone coalesce(up.timezone, 'UTC'),
    completion_date_tz = case
      when m.completion_date is null then null
      else m.completion_date::timestamp at time zone coalesce(up.timezone, 'UTC')
    end
from public.user_preferences up
where up.user_id = m.user_id;

update public.maintenances m
set scheduled_date_tz = m.scheduled_date::timestamp at time zone 'UTC',
    completion_date_tz = case
      when m.completion_date is null then null
      else m.completion_date::timestamp at time zone 'UTC'
    end
where m.scheduled_date_tz is null;

alter table public.maintenances alter column scheduled_date_tz set not null;
alter table public.maintenances drop column scheduled_date;
alter table public.maintenances rename column scheduled_date_tz to scheduled_date;
alter table public.maintenances drop column completion_date;
alter table public.maintenances rename column completion_date_tz to completion_date;

-- Funções que referenciavam `expenses.date` diretamente (renomear para `occurred_at`); o rename de
-- coluna não propaga para corpo de função (texto opaco) — sem este ajuste, as RPCs abaixo falhariam
-- em runtime com "column expenses.date does not exist". Semântica preservada (cast ::date onde a
-- função expõe/compara dia calendário — mesmo comportamento de antes, sem regressão).

create or replace function public.get_category_spending_highlights(
  p_vehicle_id uuid default null,
  p_group_vehicle_ids uuid[] default null
)
returns table(category text, total_amount numeric, expense_count integer)
language sql
security invoker
set search_path = ''
stable
as $$
  select e.category, sum(e.amount) as total_amount, count(*)::integer as expense_count
  from public.expenses e
  where e.user_id = auth.uid()
    and e.deleted_at is null
    and e.occurred_at >= date_trunc('month', current_date)::date
    and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
    and (p_group_vehicle_ids is null or e.vehicle_id = any(p_group_vehicle_ids))
  group by e.category
  order by sum(e.amount) desc
  limit 3;
$$;

create or replace function public.detect_expense_anomalies(p_threshold numeric default 2.0)
returns table (
  expense_id uuid,
  vehicle_id uuid,
  category text,
  amount numeric,
  date date,
  z_score numeric,
  avg_amount numeric,
  stddev_amount numeric
)
language sql
security invoker
set search_path = ''
as $$
  with stats as (
    select
      e.vehicle_id,
      e.category,
      avg(e.amount) as avg_amount,
      stddev(e.amount) as stddev_amount,
      count(*) as sample_size
    from public.expenses e
    where e.user_id = auth.uid() and e.deleted_at is null
    group by e.vehicle_id, e.category
  )
  select
    e.id as expense_id,
    e.vehicle_id,
    e.category,
    e.amount,
    e.occurred_at::date as date,
    round((e.amount - s.avg_amount) / s.stddev_amount, 2) as z_score,
    round(s.avg_amount, 2) as avg_amount,
    round(s.stddev_amount, 2) as stddev_amount
  from public.expenses e
  join stats s on s.vehicle_id = e.vehicle_id and s.category = e.category
  where e.user_id = auth.uid() and e.deleted_at is null
    and s.sample_size >= 5 and s.stddev_amount > 0
    and abs((e.amount - s.avg_amount) / s.stddev_amount) >= p_threshold
  order by abs((e.amount - s.avg_amount) / s.stddev_amount) desc;
$$;

create or replace function public.fleet_benchmark()
returns table (
  vehicle_id uuid,
  plate varchar,
  vehicle_name text,
  total_expenses numeric,
  total_km integer,
  cost_per_km numeric,
  avg_km_per_liter numeric,
  maintenance_count integer,
  fines_count integer,
  health_score integer,
  efficiency_rank integer
)
language sql
security invoker
set search_path = ''
as $$
  with expense_totals as (
    select
      e.vehicle_id,
      sum(e.amount) as total_expenses,
      (max(e.odometer_km) - min(e.odometer_km)) as total_km
    from public.expenses e
    where e.user_id = auth.uid() and e.deleted_at is null
    group by e.vehicle_id
  ),
  fuel_avg as (
    select
      f.vehicle_id,
      avg(f.km_per_liter) as avg_km_per_liter
    from (
      select
        e.vehicle_id,
        case
          when e.full_tank is true and lag(e.odometer_km) over (partition by e.vehicle_id order by e.occurred_at, e.id) is not null
            and coalesce(e.liters, 0) > 0
          then (e.odometer_km - lag(e.odometer_km) over (partition by e.vehicle_id order by e.occurred_at, e.id)) / e.liters
          else null
        end as km_per_liter
      from public.expenses e
      where e.user_id = auth.uid() and e.category = 'fuel' and e.deleted_at is null
    ) f
    where f.km_per_liter is not null
    group by f.vehicle_id
  ),
  maintenance_counts as (
    select m.vehicle_id, count(*) as maintenance_count
    from public.maintenances m
    where m.user_id = auth.uid() and m.deleted_at is null
    group by m.vehicle_id
  ),
  fines_counts as (
    select fi.vehicle_id, count(*) as fines_count
    from public.fines fi
    where fi.user_id = auth.uid() and fi.deleted_at is null
    group by fi.vehicle_id
  ),
  ranked as (
    select
      v.id as vehicle_id,
      v.plate,
      coalesce(v.nickname, trim(both ' ' from coalesce(v.make, '') || ' ' || coalesce(v.model, ''))) as vehicle_name,
      coalesce(et.total_expenses, 0) as total_expenses,
      coalesce(et.total_km, 0) as total_km,
      case
        when coalesce(et.total_km, 0) > 0 then round(et.total_expenses / et.total_km, 2)
        else null
      end as cost_per_km,
      round(fa.avg_km_per_liter, 2) as avg_km_per_liter,
      coalesce(mc.maintenance_count, 0)::integer as maintenance_count,
      coalesce(fc.fines_count, 0)::integer as fines_count,
      v.health_score::integer as health_score
    from public.vehicles v
    left join expense_totals et on et.vehicle_id = v.id
    left join fuel_avg fa on fa.vehicle_id = v.id
    left join maintenance_counts mc on mc.vehicle_id = v.id
    left join fines_counts fc on fc.vehicle_id = v.id
    where v.user_id = auth.uid() and v.deleted_at is null
  )
  select
    r.*,
    row_number() over (
      order by (r.cost_per_km is null) asc, r.cost_per_km asc
    )::integer as efficiency_rank
  from ranked r
  order by efficiency_rank;
$$;

create or replace function public.forecast_monthly_costs(
  p_vehicle_id uuid default null,
  p_months_ahead integer default 3
)
returns table (
  month date,
  projected_amount numeric,
  projected_low numeric,
  projected_high numeric,
  is_forecast boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_months date[];
  v_amounts numeric[];
  v_month_count integer;
  v_stddev numeric;
  v_avg3 numeric[];
  v_next_month date;
  v_next_amount numeric;
  i integer;
begin
  select array_agg(monthly.month order by monthly.month), array_agg(monthly.amount order by monthly.month)
  into v_months, v_amounts
  from (
    select date_trunc('month', e.occurred_at)::date as month, sum(e.amount) as amount
    from public.expenses e
    where e.user_id = auth.uid() and e.deleted_at is null
      and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
    group by date_trunc('month', e.occurred_at)
  ) monthly;

  v_month_count := coalesce(array_length(v_months, 1), 0);

  for i in 1..v_month_count loop
    month := v_months[i];
    projected_amount := v_amounts[i];
    projected_low := v_amounts[i];
    projected_high := v_amounts[i];
    is_forecast := false;
    return next;
  end loop;

  if v_month_count < 6 then
    return;
  end if;

  select stddev(a) into v_stddev
  from unnest(v_amounts[v_month_count - 5 : v_month_count]) as a;
  v_stddev := coalesce(v_stddev, 0);

  v_avg3 := array[v_amounts[v_month_count - 2], v_amounts[v_month_count - 1], v_amounts[v_month_count]];
  v_next_month := v_months[v_month_count];

  for i in 1..p_months_ahead loop
    v_next_month := (v_next_month + interval '1 month')::date;
    v_next_amount := (v_avg3[1] + v_avg3[2] + v_avg3[3]) / 3;
    month := v_next_month;
    projected_amount := round(v_next_amount, 2);
    projected_low := round(greatest(v_next_amount - v_stddev, 0), 2);
    projected_high := round(v_next_amount + v_stddev, 2);
    is_forecast := true;
    return next;
    v_avg3 := array[v_avg3[2], v_avg3[3], v_next_amount];
  end loop;

  return;
end;
$$;

create or replace function public.seasonal_expense_heatmap(p_vehicle_id uuid default null)
returns table (
  month_number integer,
  category text,
  avg_amount numeric,
  occurrence_count integer
)
language sql
security invoker
set search_path = ''
as $$
  with scoped as (
    select e.*
    from public.expenses e
    where e.user_id = auth.uid() and e.deleted_at is null
      and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
  ),
  distinct_months as (
    select count(distinct date_trunc('month', occurred_at)) as month_count from scoped
  )
  select
    extract(month from s.occurred_at)::integer as month_number,
    s.category,
    round(avg(s.amount), 2) as avg_amount,
    count(*)::integer as occurrence_count
  from scoped s, distinct_months dm
  where dm.month_count >= 6
  group by extract(month from s.occurred_at), s.category
  order by month_number, category;
$$;

create or replace function public.calculate_vehicle_tco(p_vehicle_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_vehicle         record;
  v_cycle_start     timestamptz;
  v_period_start    timestamptz;
  v_period_days     integer;
  v_total           numeric := 0;
  v_fuel            numeric := 0;
  v_maintenance     numeric := 0;
  v_fines           numeric := 0;
  v_recurring       numeric := 0;
  v_other           numeric := 0;
  v_total_km        integer;
  v_cost_per_km     numeric;
  v_cost_per_month  numeric;
  v_row             record;
begin
  select * into v_vehicle from public.vehicles where id = p_vehicle_id;
  if not found then
    raise exception 'unauthorized';
  end if;

  v_cycle_start := public.get_active_cycle_start(p_vehicle_id);
  v_period_start := coalesce(v_cycle_start, v_vehicle.created_at);
  v_period_days := greatest(round(extract(epoch from (now() - v_period_start)) / 86400), 0);

  for v_row in
    select e.category, e.source_type, e.amount
    from public.expenses e
    where e.vehicle_id = p_vehicle_id and e.deleted_at is null
      and (v_cycle_start is null or e.occurred_at >= v_cycle_start)
  loop
    v_total := v_total + v_row.amount;
    if v_row.source_type = 'maintenance' then
      v_maintenance := v_maintenance + v_row.amount;
    elsif v_row.source_type = 'fine' then
      v_fines := v_fines + v_row.amount;
    elsif v_row.source_type = 'recurring_cost' then
      v_recurring := v_recurring + v_row.amount;
    elsif v_row.category = 'fuel' then
      v_fuel := v_fuel + v_row.amount;
    else
      v_other := v_other + v_row.amount;
    end if;
  end loop;

  select (max(e.odometer_km) - min(e.odometer_km)) into v_total_km
  from public.expenses e
  where e.vehicle_id = p_vehicle_id and e.deleted_at is null and e.odometer_km is not null
    and (v_cycle_start is null or e.occurred_at >= v_cycle_start);

  v_cost_per_km := case when coalesce(v_total_km, 0) > 0 then round(v_total / v_total_km, 2) else null end;
  v_cost_per_month := case when v_period_days >= 30 then round(v_total / (v_period_days / 30.0), 2) else null end;

  return jsonb_build_object(
    'total', round(v_total, 2),
    'breakdown', jsonb_build_object(
      'fuel', round(v_fuel, 2),
      'maintenance', round(v_maintenance, 2),
      'fines', round(v_fines, 2),
      'recurring', round(v_recurring, 2),
      'other', round(v_other, 2)
    ),
    'cost_per_km', v_cost_per_km,
    'cost_per_month', v_cost_per_month,
    'total_km', coalesce(v_total_km, 0),
    'period_days', v_period_days
  );
end;
$$;

create or replace function public.fuel_consumption_trend(p_vehicle_id uuid, p_limit integer default 20)
returns table (
  expense_id uuid,
  date date,
  liters numeric,
  amount numeric,
  odometer_km integer,
  km_per_liter numeric,
  price_per_liter numeric,
  rolling_avg_kpl numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cycle_start timestamptz;
begin
  perform 1 from public.vehicles where id = p_vehicle_id;
  if not found then
    raise exception 'unauthorized';
  end if;

  v_cycle_start := public.get_active_cycle_start(p_vehicle_id);

  return query
  with fuel_events as (
    select
      e.id,
      e.occurred_at,
      e.liters,
      e.amount,
      e.odometer_km,
      e.full_tank,
      lag(e.odometer_km) over (order by e.occurred_at, e.id) as prev_odometer_km
    from public.expenses e
    where e.vehicle_id = p_vehicle_id and e.category = 'fuel' and e.deleted_at is null
      and (v_cycle_start is null or e.occurred_at >= v_cycle_start)
  ),
  computed as (
    select
      f.id,
      f.occurred_at,
      f.liters,
      f.amount,
      f.odometer_km,
      case
        when f.full_tank is true and f.prev_odometer_km is not null and coalesce(f.liters, 0) > 0
          then round((f.odometer_km - f.prev_odometer_km) / f.liters, 2)
        else null
      end as km_per_liter,
      case when coalesce(f.liters, 0) > 0 then round(f.amount / f.liters, 2) else null end as price_per_liter
    from fuel_events f
  ),
  windowed as (
    select
      c.*,
      count(*) over (order by c.occurred_at, c.id rows between 4 preceding and current row) as window_size,
      avg(c.km_per_liter) over (order by c.occurred_at, c.id rows between 4 preceding and current row) as window_avg
    from computed c
  )
  select
    w.id as expense_id,
    w.occurred_at::date as date,
    w.liters,
    w.amount,
    w.odometer_km,
    w.km_per_liter,
    w.price_per_liter,
    case when w.window_size = 5 then round(w.window_avg, 2) else null end as rolling_avg_kpl
  from windowed w
  order by w.occurred_at desc, w.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_upcoming_costs(p_vehicle_id uuid default null, p_horizon_days integer default 30)
returns table(source_type text, source_id uuid, title text, amount numeric, due_date date, vehicle_id uuid, vehicle_plate text, is_estimated boolean)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_horizon_days not in (7, 30, 90) then
    raise exception 'horizon_days deve ser 7, 30 ou 90';
  end if;

  return query
  select 'maintenance'::text, m.id, m.description, m.cost, m.scheduled_date::date, m.vehicle_id, v.plate, (m.cost is null)
  from public.maintenances m join public.vehicles v on v.id = m.vehicle_id
  where m.user_id = auth.uid() and m.deleted_at is null and m.status in ('scheduled', 'in_progress')
    and m.scheduled_date is not null and m.scheduled_date::date <= current_date + p_horizon_days
    and (p_vehicle_id is null or m.vehicle_id = p_vehicle_id)
  union all
  select 'fine'::text, f.id, coalesce(f.description, 'Multa'), coalesce(f.amount_with_discount, f.amount), f.due_date, f.vehicle_id, v.plate, false
  from public.fines f join public.vehicles v on v.id = f.vehicle_id
  where f.user_id = auth.uid() and f.deleted_at is null and f.status = 'pending'
    and f.due_date is not null and f.due_date <= current_date + p_horizon_days
    and (p_vehicle_id is null or f.vehicle_id = p_vehicle_id)
  union all
  select 'recurring_cost'::text, rc.id, rc.cost_type::text, rc.amount, rc.due_date, rc.vehicle_id, v.plate, false
  from public.vehicle_recurring_costs rc join public.vehicles v on v.id = rc.vehicle_id
  where rc.user_id = auth.uid() and rc.deleted_at is null and rc.paid_at is null
    and rc.due_date <= current_date + p_horizon_days
    and (p_vehicle_id is null or rc.vehicle_id = p_vehicle_id)
  union all
  select 'expense'::text, e.id, coalesce(e.description, initcap(e.category)), e.amount, e.occurred_at::date, e.vehicle_id, v.plate, false
  from public.expenses e join public.vehicles v on v.id = e.vehicle_id
  where e.user_id = auth.uid() and e.deleted_at is null and e.source_type is null
    and e.occurred_at::date > current_date and e.occurred_at::date <= current_date + p_horizon_days
    and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
  order by due_date asc;
end;
$$;

alter function public.get_upcoming_costs(uuid, integer) security invoker;

create or replace function public.get_vehicle_cost_per_km(p_vehicle_id uuid, p_month_start date default date_trunc('month', current_date)::date)
returns table(total_spent numeric, total_km integer, cost_per_km numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_cycle_start timestamptz;
begin
  select user_id into v_user_id from public.vehicles where id = p_vehicle_id;
  if v_user_id is distinct from auth.uid() then
    raise exception 'unauthorized';
  end if;

  v_cycle_start := public.get_active_cycle_start(p_vehicle_id);

  return query
  with fuel_events as (
    select e.amount, e.odometer_km, lag(e.odometer_km) over (order by e.occurred_at) as prev_odometer
    from public.expenses e
    where e.vehicle_id = p_vehicle_id and e.category = 'fuel' and e.deleted_at is null
      and e.occurred_at >= p_month_start and e.odometer_km is not null
      and (v_cycle_start is null or e.occurred_at >= v_cycle_start)
    order by e.occurred_at
  ),
  totals as (
    select sum(amount) as total_spent,
           sum(odometer_km - prev_odometer) filter (where prev_odometer is not null) as total_km
    from fuel_events
  )
  select t.total_spent, t.total_km::integer,
         case when coalesce(t.total_km, 0) > 0 then round(t.total_spent / t.total_km, 2) else 0 end
  from totals t;
end;
$$;

commit;
