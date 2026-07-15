-- @spec SPEC-20260612-001 RF-01.2
-- Adiciona despesas manuais (source_type IS NULL) como 4ª fonte de get_upcoming_costs:
-- lançamentos futuros (date > current_date) dentro do horizonte, sempre não-estimados.
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
  union all
  select 'expense'::text, e.id, coalesce(e.description, initcap(e.category)), e.amount, e.date, e.vehicle_id, v.plate, false
  from public.expenses e join public.vehicles v on v.id = e.vehicle_id
  where e.user_id = auth.uid() and e.deleted_at is null and e.source_type is null
    and e.date > current_date and e.date <= current_date + p_horizon_days
    and (p_vehicle_id is null or e.vehicle_id = p_vehicle_id)
  order by due_date asc;
end;
$$;

alter function public.get_upcoming_costs(uuid, integer) security invoker;
