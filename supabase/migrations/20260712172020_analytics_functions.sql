-- @spec docs/architecture/entities.md, ADR-007 — funções de health score, custos futuros e analytics filtrados por ciclo de odômetro

create or replace function public.calculate_vehicle_health(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vehicle     record;
  v_score       integer := 100;
  v_flags       jsonb   := '[]'::jsonb;
  v_today       date    := current_date;
  v_pending_cnt integer := 0;
  v_overdue_cnt integer := 0;
  v_fines_cnt   integer := 0;
begin
  select * into v_vehicle from public.vehicles where id = p_vehicle_id;

  if not found or v_vehicle.user_id is distinct from auth.uid() then
    raise exception 'unauthorized';
  end if;

  select count(*) into v_pending_cnt
  from public.maintenances
  where vehicle_id = p_vehicle_id and status in ('scheduled', 'in_progress') and deleted_at is null;
  v_score := v_score - least(v_pending_cnt * 5, 20);

  select count(*) into v_overdue_cnt
  from public.maintenances
  where vehicle_id = p_vehicle_id and status in ('scheduled', 'in_progress')
    and scheduled_date < v_today and deleted_at is null;
  v_score := v_score - least(v_overdue_cnt * 15, 30);
  if v_overdue_cnt > 0 then
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('type', 'maintenance_overdue', 'count', v_overdue_cnt));
  end if;

  if v_vehicle.ipva_due_date is not null and v_vehicle.ipva_due_date <= v_today + interval '30 days' then
    v_score := v_score - 10;
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('type', 'ipva_expiring', 'days', (v_vehicle.ipva_due_date - v_today)::integer));
  end if;

  if v_vehicle.insurance_expires_at is not null and v_vehicle.insurance_expires_at <= v_today + interval '30 days' then
    v_score := v_score - 10;
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('type', 'insurance_expiring', 'days', (v_vehicle.insurance_expires_at - v_today)::integer));
  end if;

  if v_vehicle.crlv_expires_at is not null and v_vehicle.crlv_expires_at <= v_today + interval '30 days' then
    v_score := v_score - 10;
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('type', 'crlv_expiring', 'days', (v_vehicle.crlv_expires_at - v_today)::integer));
  end if;

  if v_vehicle.next_maintenance_km is not null and v_vehicle.odometer is not null
     and v_vehicle.odometer >= (v_vehicle.next_maintenance_km - 1000) then
    v_score := v_score - 5;
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('type', 'km_alert', 'km_until', greatest(v_vehicle.next_maintenance_km - v_vehicle.odometer, 0)));
  end if;

  select count(*) into v_fines_cnt
  from public.fines where vehicle_id = p_vehicle_id and status = 'pending' and deleted_at is null;
  v_score := v_score - least(v_fines_cnt * 5, 15);
  if v_fines_cnt > 0 then
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('type', 'fines_pending', 'count', v_fines_cnt));
  end if;

  v_score := greatest(v_score, 0);

  update public.vehicles set health_score = v_score, updated_at = now() where id = p_vehicle_id;

  return jsonb_build_object('score', v_score, 'flags', v_flags);
end;
$$;

create or replace function public.calculate_fleet_health(p_user_id uuid)
returns table(vehicle_id uuid, score integer, flags jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vehicle record;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized';
  end if;

  for v_vehicle in select id from public.vehicles where user_id = p_user_id and deleted_at is null
  loop
    return query select (public.calculate_vehicle_health(v_vehicle.id) ->> 'score')::integer,
                        (public.calculate_vehicle_health(v_vehicle.id) -> 'flags');
  end loop;
end;
$$;

create or replace function public.get_upcoming_costs(p_vehicle_id uuid default null, p_horizon_days integer default 30)
returns table(source_type text, source_id uuid, title text, amount numeric, due_date date, vehicle_id uuid, vehicle_plate text, is_estimated boolean)
language plpgsql
security definer
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
  order by due_date asc;
end;
$$;

-- R-ODO-04: filtra pelo ciclo de odômetro ativo (ADR-007)
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
    select e.amount, e.odometer_km, lag(e.odometer_km) over (order by e.date) as prev_odometer
    from public.expenses e
    where e.vehicle_id = p_vehicle_id and e.category = 'fuel' and e.deleted_at is null
      and e.date >= p_month_start and e.odometer_km is not null
      and (v_cycle_start is null or e.date >= v_cycle_start)
    order by e.date
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

-- R-ODO-04: tendência de consumo km/L filtrada pelo ciclo ativo (ADR-007)
create or replace function public.fuel_consumption_trend(p_vehicle_id uuid, p_limit integer default 12)
returns table(expense_date date, odometer_km integer, liters numeric, km_per_liter numeric)
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
    select e.date, e.odometer_km, e.liters,
           lag(e.odometer_km) over (order by e.date) as prev_odo
    from public.expenses e
    where e.vehicle_id = p_vehicle_id and e.category = 'fuel' and e.deleted_at is null
      and e.odometer_km is not null and e.liters is not null
      and (v_cycle_start is null or e.date >= v_cycle_start)
  )
  select date, odometer_km, liters,
         case when prev_odo is not null and liters > 0 then round((odometer_km - prev_odo) / liters, 2) else null end
  from fuel_events
  where prev_odo is not null
  order by date desc
  limit p_limit;
end;
$$;

-- R-ODO-04: TCO filtrado pelo ciclo ativo — total_km não cruza ciclos (ADR-007)
create or replace function public.calculate_vehicle_tco(p_vehicle_id uuid)
returns table(category text, total_amount numeric, cost_per_km numeric, cost_per_month numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_cycle_start timestamptz;
  v_total_km integer;
  v_months numeric;
begin
  select user_id into v_user_id from public.vehicles where id = p_vehicle_id;
  if v_user_id is distinct from auth.uid() then
    raise exception 'unauthorized';
  end if;

  v_cycle_start := public.get_active_cycle_start(p_vehicle_id);

  select (max(e.odometer_km) - min(e.odometer_km)) into v_total_km
  from public.expenses e
  where e.vehicle_id = p_vehicle_id and e.deleted_at is null and e.odometer_km is not null
    and (v_cycle_start is null or e.date >= v_cycle_start);

  select greatest(extract(epoch from (now() - coalesce(v_cycle_start, (select created_at from public.vehicles where id = p_vehicle_id)))) / (30 * 86400), 1)
    into v_months;

  return query
  select e.category, sum(e.amount) as total_amount,
         case when coalesce(v_total_km, 0) > 0 then round(sum(e.amount) / v_total_km, 2) else null end,
         round(sum(e.amount) / v_months, 2)
  from public.expenses e
  where e.vehicle_id = p_vehicle_id and e.deleted_at is null
    and (v_cycle_start is null or e.date >= v_cycle_start)
  group by e.category;
end;
$$;
