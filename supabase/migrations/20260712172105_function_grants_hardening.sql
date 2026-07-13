-- @spec matrices/impacto.md IMPACTO-026 achados 1 e 6 — remove exposição de RPC SECURITY DEFINER a anon/PUBLIC

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.soft_delete_profile() from public, anon, authenticated;

revoke execute on function public.calculate_vehicle_health(uuid) from public, anon;
revoke execute on function public.calculate_fleet_health(uuid) from public, anon;
revoke execute on function public.get_upcoming_costs(uuid, integer) from public, anon;
revoke execute on function public.get_vehicle_cost_per_km(uuid, date) from public, anon;
revoke execute on function public.fuel_consumption_trend(uuid, integer) from public, anon;
revoke execute on function public.calculate_vehicle_tco(uuid) from public, anon;
revoke execute on function public.get_active_cycle_start(uuid) from public, anon;

grant execute on function public.calculate_vehicle_health(uuid) to authenticated;
grant execute on function public.calculate_fleet_health(uuid) to authenticated;
grant execute on function public.get_upcoming_costs(uuid, integer) to authenticated;
grant execute on function public.get_vehicle_cost_per_km(uuid, date) to authenticated;
grant execute on function public.fuel_consumption_trend(uuid, integer) to authenticated;
grant execute on function public.calculate_vehicle_tco(uuid) to authenticated;
grant execute on function public.get_active_cycle_start(uuid) to authenticated;
