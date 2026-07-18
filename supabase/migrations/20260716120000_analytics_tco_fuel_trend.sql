-- @spec SPEC-20260622-001 RF-01, RF-02
-- Substitui `calculate_vehicle_tco(uuid)` e `fuel_consumption_trend(uuid, integer)` criadas em
-- 20260712172020_analytics_functions.sql (formato de retorno divergente do RF-01/RF-02 e não
-- consumidas por nenhum código de aplicação, ver changelog de 2026-07-16 na spec). Mudança de
-- tipo de retorno exige DROP explícito — CREATE OR REPLACE não é suficiente.
--
-- SECURITY INVOKER alinhado ao padrão já estabelecido para as demais RPCs de analytics
-- (IMPACTO-027 item 3): o RLS de `vehicles`/`expenses` garante o isolamento por auth.uid();
-- a checagem `if not found` é defesa em profundidade, não o mecanismo primário.

drop function if exists public.calculate_vehicle_tco(uuid);
drop function if exists public.fuel_consumption_trend(uuid, integer);

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

  -- R-ANA-04: mapeamento de bucket por prioridade — source_type prevalece sobre category (RF-01)
  for v_row in
    select e.category, e.source_type, e.amount
    from public.expenses e
    where e.vehicle_id = p_vehicle_id and e.deleted_at is null
      and (v_cycle_start is null or e.date >= v_cycle_start)
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
    and (v_cycle_start is null or e.date >= v_cycle_start);

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

-- R-FUEL-02/03: km/L exige full_tank=true + registro anterior; price_per_liter sempre derivado.
-- rolling_avg_kpl (janela de 5 registros físicos, não 5 valores não-nulos) só aparece a partir do
-- 5º registro cronológico (CT-004, CT-016).
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
      e.date,
      e.liters,
      e.amount,
      e.odometer_km,
      e.full_tank,
      lag(e.odometer_km) over (order by e.date, e.id) as prev_odometer_km
    from public.expenses e
    where e.vehicle_id = p_vehicle_id and e.category = 'fuel' and e.deleted_at is null
      and (v_cycle_start is null or e.date >= v_cycle_start)
  ),
  computed as (
    select
      f.id,
      f.date,
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
      count(*) over (order by c.date, c.id rows between 4 preceding and current row) as window_size,
      avg(c.km_per_liter) over (order by c.date, c.id rows between 4 preceding and current row) as window_avg
    from computed c
  )
  select
    w.id as expense_id,
    w.date,
    w.liters,
    w.amount,
    w.odometer_km,
    w.km_per_liter,
    w.price_per_liter,
    case when w.window_size = 5 then round(w.window_avg, 2) else null end as rolling_avg_kpl
  from windowed w
  order by w.date desc, w.id desc
  limit p_limit;
end;
$$;

revoke execute on function public.calculate_vehicle_tco(uuid) from public, anon;
revoke execute on function public.fuel_consumption_trend(uuid, integer) from public, anon;
grant execute on function public.calculate_vehicle_tco(uuid) to authenticated;
grant execute on function public.fuel_consumption_trend(uuid, integer) to authenticated;
