-- @spec SPEC-20260721-002 RF-08
-- Corrige get_category_spending_highlights (3 args) para usar expenses.occurred_at após o rename
-- de expenses.date feito pela migration timezone_aware_datetime.
create or replace function public.get_category_spending_highlights(
  p_vehicle_id uuid default null,
  p_group_vehicle_ids uuid[] default null,
  p_limit integer default 3
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
  limit p_limit;
$$;

revoke execute on function public.get_category_spending_highlights(uuid, uuid[], integer) from public, anon;
grant execute on function public.get_category_spending_highlights(uuid, uuid[], integer) to authenticated;
