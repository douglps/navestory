-- @spec matrices/impacto.md IMPACTO-026 (residual) — troca SECURITY DEFINER por INVOKER nas RPCs de analytics.
-- As checagens manuais de auth.uid() já existentes são redundantes com o RLS sob INVOKER, mas mantidas
-- como defesa em profundidade.

alter function public.calculate_vehicle_health(uuid) security invoker;
alter function public.calculate_fleet_health(uuid) security invoker;
alter function public.get_upcoming_costs(uuid, integer) security invoker;
alter function public.get_vehicle_cost_per_km(uuid, date) security invoker;
alter function public.fuel_consumption_trend(uuid, integer) security invoker;
alter function public.calculate_vehicle_tco(uuid) security invoker;
