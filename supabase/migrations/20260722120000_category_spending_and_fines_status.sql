-- @spec SPEC-20260722-004 RF-01, RF-02, P7, R-SUB-01, R-SUB-03, R-SUB-04
-- Agregações do subheader financeiro: top-3 categorias de gasto do mês e status de multas ativas.
-- GROUP BY + ORDER BY + LIMIT são feitos aqui (SQL), nunca em memória no service (P7).
-- Nota sobre R-TZ-01: "mês corrente"/"hoje" usam `current_date` (UTC do servidor), mesma
-- convenção já usada no restante de dashboard.service.ts (ver `daysUntil`/`toDateString`) —
-- fuso por usuário depende de SPEC-20260715-002 (draft, sem coluna `user_preferences.timezone`
-- ainda), fora de escopo desta spec.

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
    and e.date >= date_trunc('month', current_date)::date
    and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
    and (p_group_vehicle_ids is null or e.vehicle_id = any(p_group_vehicle_ids))
  group by e.category
  order by sum(e.amount) desc
  limit 3;
$$;

-- Única passagem sobre `fines`: `earliest_pending_due_date` já filtra por status = 'pending' no
-- próprio agregado (filter), para que uma multa `appealing` vencida nunca contamine a classificação
-- de "overdue" do subheader (R-SUB-04 — recurso suspende o prazo).
create or replace function public.get_fines_status_summary()
returns table(active_count integer, earliest_pending_due_date date)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    count(*)::integer as active_count,
    min(f.due_date) filter (where f.status = 'pending') as earliest_pending_due_date
  from public.fines f
  where f.user_id = auth.uid()
    and f.status in ('pending', 'appealing')
    and f.deleted_at is null;
$$;

-- @spec matrices/impacto.md IMPACTO-026 — mesma política de hardening das demais RPCs analíticas.
revoke execute on function public.get_category_spending_highlights(uuid, uuid[]) from public, anon;
revoke execute on function public.get_fines_status_summary() from public, anon;

grant execute on function public.get_category_spending_highlights(uuid, uuid[]) to authenticated;
grant execute on function public.get_fines_status_summary() to authenticated;
