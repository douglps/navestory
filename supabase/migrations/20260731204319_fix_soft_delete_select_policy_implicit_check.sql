-- @spec RULES.md S13 v2 -- corrige a causa-raiz real do bloqueio de soft-delete: para UPDATE, o
-- Postgres combina (AND) o USING da policy de SELECT com o WITH CHECK da policy de UPDATE ao
-- validar a linha resultante -- mesmo com WITH CHECK do UPDATE ja corrigido (migration
-- 20260731192440), a policy de SELECT ainda exigia "deleted_at is null", que a linha resultante
-- de um soft-delete nunca satisfaz. Reproduzido em SQL puro simulando o JWT do usuario de teste:
-- UPDATE expenses SET deleted_at = now() -> 42501, mesmo com o WITH CHECK do UPDATE contendo
-- apenas checagem de posse. UPDATE em qualquer outra coluna funciona normalmente -- confirma que
-- o bloqueio vinha do SELECT policy, nao do UPDATE policy.
--
-- A aplicacao ja filtra "deleted_at is null" explicitamente em toda query de leitura (services de
-- expenses, vehicles, maintenances, fines, recurring-costs, dashboard, analytics), entao a policy
-- de SELECT nao precisa repetir esse filtro -- isso e responsabilidade de query, nao de RLS. RLS
-- continua garantindo posse (auth.uid() = user_id/id) em toda leitura.

alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);

alter policy vehicles_select_own on public.vehicles
  using ((select auth.uid()) = user_id);

alter policy expenses_select_own on public.expenses
  using ((select auth.uid()) = user_id);

alter policy maintenances_select_own on public.maintenances
  using ((select auth.uid()) = user_id);

alter policy fines_select_own on public.fines
  using ((select auth.uid()) = user_id);

alter policy recurring_costs_select_own on public.vehicle_recurring_costs
  using ((select auth.uid()) = user_id);
