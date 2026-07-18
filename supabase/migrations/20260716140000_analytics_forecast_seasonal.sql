-- @spec SPEC-20260622-001 RF-05, RF-06
-- SECURITY INVOKER alinhado ao padrão já estabelecido para as demais RPCs de analytics
-- (IMPACTO-027 item 3, ver changelog de 2026-07-16 na spec): o RLS de `expenses` garante o
-- isolamento por auth.uid().

-- R-ANA-03: projeção com média móvel de 3 meses e banda de ±1 desvio padrão dos últimos 6 meses
-- reais. Exige mínimo de 6 meses de histórico para projetar; abaixo disso retorna apenas os
-- meses históricos (sem erro). Meses históricos vêm com projected_low = projected_high =
-- projected_amount (valor real, sem incerteza) e is_forecast = false.
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
    select date_trunc('month', e.date)::date as month, sum(e.amount) as amount
    from public.expenses e
    where e.user_id = auth.uid() and e.deleted_at is null
      and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
    group by date_trunc('month', e.date)
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

-- R-ANA-07: requer mínimo de 6 meses distintos de dados; abaixo disso retorna vazio (nunca erro).
-- Agrupa por mês do calendário (1-12, via extract(month from date)), não por mês sequencial.
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
    select count(distinct date_trunc('month', date)) as month_count from scoped
  )
  select
    extract(month from s.date)::integer as month_number,
    s.category,
    round(avg(s.amount), 2) as avg_amount,
    count(*)::integer as occurrence_count
  from scoped s, distinct_months dm
  where dm.month_count >= 6
  group by extract(month from s.date), s.category
  order by month_number, category;
$$;

revoke execute on function public.forecast_monthly_costs(uuid, integer) from public, anon;
revoke execute on function public.seasonal_expense_heatmap(uuid) from public, anon;
grant execute on function public.forecast_monthly_costs(uuid, integer) to authenticated;
grant execute on function public.seasonal_expense_heatmap(uuid) to authenticated;
