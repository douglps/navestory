-- @spec SPEC-20260622-001 RF-03, RF-04
-- SECURITY INVOKER alinhado ao padrão já estabelecido para as demais RPCs de analytics
-- (IMPACTO-027 item 3, ver changelog de 2026-07-16 na spec): o RLS de `vehicles`/`expenses`
-- garante o isolamento por auth.uid(); a checagem manual é defesa em profundidade.

-- R-ANA-02: mínimo 5 expenses na combinação (vehicle_id, category) e stddev > 0 para evitar
-- divisão por zero; categorias com menos dados são excluídas silenciosamente (não é erro).
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
    e.date,
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

-- R-ANA-05: filtra internamente por auth.uid() em vehicles e expenses; nenhum dado de outro
-- usuário aparece no ranking. Veículos sem odômetro ficam com cost_per_km null e por último.
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
      (max(e.odometer_km) - min(e.odometer_km)) filter (where e.odometer_km is not null) as total_km
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
          when e.full_tank is true and lag(e.odometer_km) over (partition by e.vehicle_id order by e.date, e.id) is not null
            and coalesce(e.liters, 0) > 0
          then (e.odometer_km - lag(e.odometer_km) over (partition by e.vehicle_id order by e.date, e.id)) / e.liters
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

revoke execute on function public.detect_expense_anomalies(numeric) from public, anon;
revoke execute on function public.fleet_benchmark() from public, anon;
grant execute on function public.detect_expense_anomalies(numeric) to authenticated;
grant execute on function public.fleet_benchmark() to authenticated;
