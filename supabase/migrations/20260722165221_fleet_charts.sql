-- @spec SPEC-20260721-002 RF-08
-- Estende get_category_spending_highlights com p_limit opcional (default 3, preserva o
-- comportamento atual de GET /dashboard/spending-highlights) para reaproveitar a mesma RPC no
-- breakdown completo de categorias do gráfico de frota (ExpenseCategoryPie), em vez de criar uma
-- function duplicada. `create or replace` não substitui a assinatura de 2 parâmetros (overload
-- distinto por aridade) — a antiga precisa ser dropada explicitamente para não deixar duas
-- versões da mesma RPC coexistindo.
drop function if exists public.get_category_spending_highlights(uuid, uuid[]);

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
    and e.date >= date_trunc('month', current_date)::date
    and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
    and (p_group_vehicle_ids is null or e.vehicle_id = any(p_group_vehicle_ids))
  group by e.category
  order by sum(e.amount) desc
  limit p_limit;
$$;

revoke execute on function public.get_category_spending_highlights(uuid, uuid[], integer) from public, anon;
grant execute on function public.get_category_spending_highlights(uuid, uuid[], integer) to authenticated;
