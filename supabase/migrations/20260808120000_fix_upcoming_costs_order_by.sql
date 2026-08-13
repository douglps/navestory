-- @spec SPEC-20260608-001-upcoming-costs.md
-- Corrige dois bugs em get_upcoming_costs, ambos nunca pegos pelos testes porque
-- expenses.service.spec.ts mocka o client do Supabase em vez de rodar a RPC real:
-- 1) "invalid UNION/INTERSECT/EXCEPT ORDER BY clause" — o nome de coluna de um UNION é
--    herdado só do primeiro SELECT da cadeia; o branch `maintenance` usava
--    `m.scheduled_date::date` sem alias (cast não tem nome implícito `due_date`), então
--    `order by due_date` não resolvia — 500 em GET /expenses/upcoming desde a criação
--    da função (20260714220000).
-- 2) "structure of query does not match function result type" na coluna 7 — `v.plate` é
--    `character varying(10)` no schema, mas a função declara a coluna como `text`; só
--    aparece depois que o bug 1 é corrigido (o parser rejeita a query antes de chegar a
--    checar o tipo de retorno).

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
  select 'maintenance'::text, m.id, m.description, m.cost, m.scheduled_date::date as due_date, m.vehicle_id, v.plate::text, (m.cost is null)
  from public.maintenances m join public.vehicles v on v.id = m.vehicle_id
  where m.user_id = auth.uid() and m.deleted_at is null and m.status in ('scheduled', 'in_progress')
    and m.scheduled_date is not null and m.scheduled_date::date <= current_date + p_horizon_days
    and (p_vehicle_id is null or m.vehicle_id = p_vehicle_id)
  union all
  select 'fine'::text, f.id, coalesce(f.description, 'Multa'), coalesce(f.amount_with_discount, f.amount), f.due_date, f.vehicle_id, v.plate::text, false
  from public.fines f join public.vehicles v on v.id = f.vehicle_id
  where f.user_id = auth.uid() and f.deleted_at is null and f.status = 'pending'
    and f.due_date is not null and f.due_date <= current_date + p_horizon_days
    and (p_vehicle_id is null or f.vehicle_id = p_vehicle_id)
  union all
  select 'recurring_cost'::text, rc.id, rc.cost_type::text, rc.amount, rc.due_date, rc.vehicle_id, v.plate::text, false
  from public.vehicle_recurring_costs rc join public.vehicles v on v.id = rc.vehicle_id
  where rc.user_id = auth.uid() and rc.deleted_at is null and rc.paid_at is null
    and rc.due_date <= current_date + p_horizon_days
    and (p_vehicle_id is null or rc.vehicle_id = p_vehicle_id)
  union all
  select 'expense'::text, e.id, coalesce(e.description, initcap(e.category)), e.amount, e.occurred_at::date, e.vehicle_id, v.plate::text, false
  from public.expenses e join public.vehicles v on v.id = e.vehicle_id
  where e.user_id = auth.uid() and e.deleted_at is null and e.source_type is null
    and e.occurred_at::date > current_date and e.occurred_at::date <= current_date + p_horizon_days
    and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
  order by due_date asc;
end;
$$;

alter function public.get_upcoming_costs(uuid, integer) security invoker;
