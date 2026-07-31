-- @spec RULES.md S13 — corrige achado crítico: policies de UPDATE para soft-delete não tinham
-- WITH CHECK explícito, herdando o mesmo predicado do USING ("deleted_at is null"). Isso bloqueia
-- TODO soft-delete via cliente autenticado (anon key + JWT do usuário), pois a linha resultante do
-- UPDATE (com deleted_at preenchido) nunca satisfaz o CHECK implícito. Reproduzido em 2026-07-31
-- durante investigação de E2E: DELETE /expenses/:id retornava 500, erro Postgres 42501
-- ("new row violates row-level security policy for table expenses").
--
-- Afeta as 5 tabelas com soft-delete via UPDATE que usam esse padrão: profiles, vehicles,
-- expenses, maintenances, fines, vehicle_recurring_costs. O CHECK correto mantém apenas a
-- verificação de posse (auth.uid() = user_id/id) — não repete "deleted_at is null" nem
-- "not is_readonly", que são regras de QUAL LINHA pode ser alvo do update (USING), não do
-- ESTADO RESULTANTE (CHECK).

alter policy profiles_update_own on public.profiles
  with check ((select auth.uid()) = id);

alter policy vehicles_update_own on public.vehicles
  with check ((select auth.uid()) = user_id);

alter policy expenses_update_own on public.expenses
  with check ((select auth.uid()) = user_id);

alter policy maintenances_update_own on public.maintenances
  with check ((select auth.uid()) = user_id);

alter policy fines_update_own on public.fines
  with check ((select auth.uid()) = user_id);

alter policy recurring_costs_update_own on public.vehicle_recurring_costs
  with check ((select auth.uid()) = user_id);
