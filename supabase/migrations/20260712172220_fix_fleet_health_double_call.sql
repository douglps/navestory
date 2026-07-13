-- fix: calculate_fleet_health chamava calculate_vehicle_health duas vezes por veículo (score e flags
-- separadamente), duplicando o UPDATE em vehicles.health_score. Agora calcula uma vez por veículo.

create or replace function public.calculate_fleet_health(p_user_id uuid)
returns table(vehicle_id uuid, score integer, flags jsonb)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_vehicle record;
  v_result jsonb;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized';
  end if;

  for v_vehicle in select id from public.vehicles where user_id = p_user_id and deleted_at is null
  loop
    v_result := public.calculate_vehicle_health(v_vehicle.id);
    vehicle_id := v_vehicle.id;
    score := (v_result ->> 'score')::integer;
    flags := v_result -> 'flags';
    return next;
  end loop;
end;
$$;
