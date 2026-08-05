-- @spec SPEC-20260801-002 RF-03
-- `seasonal_expense_heatmap` agrega por month_number (1-12), perdendo a dimensão do ano —
-- impossibilitando correlação temporal entre anos. Esta RPC retorna year_month como DATE,
-- preservando a dimensão temporal completa.
-- SECURITY INVOKER com RLS de `expenses` como mecanismo primário de isolamento (R-ANA-05),
-- mesmo padrão estabelecido nas demais RPCs de analytics.

create or replace function public.expense_category_monthly_series(
  p_vehicle_id uuid default null
)
returns table (
  year_month date,
  category text,
  total numeric,
  vehicle_id uuid
)
language sql
security invoker
set search_path = ''
as $$
  select
    date_trunc('month', e.occurred_at)::date as year_month,
    e.category,
    sum(e.amount) as total,
    p_vehicle_id as vehicle_id
  from public.expenses e
  where e.user_id = auth.uid() and e.deleted_at is null
    and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
  group by date_trunc('month', e.occurred_at), e.category
  having sum(e.amount) > 0
  order by year_month desc;
$$;

revoke execute on function public.expense_category_monthly_series(uuid) from public, anon;
grant execute on function public.expense_category_monthly_series(uuid) to authenticated;
