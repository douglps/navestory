-- @spec RULES.md S2 — RLS multi-tenant em todas as tabelas, otimizado com (select auth.uid()) (IMPACTO-026 achado adicional)

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.expenses enable row level security;
alter table public.maintenances enable row level security;
alter table public.fines enable row level security;
alter table public.audit_logs enable row level security;
alter table public.vehicle_groups enable row level security;
alter table public.vehicle_group_members enable row level security;
alter table public.expense_templates enable row level security;
alter table public.user_categories enable row level security;
alter table public.user_preferences enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicle_drivers enable row level security;
alter table public.documents enable row level security;
alter table public.vehicle_recurring_costs enable row level security;
alter table public.vehicle_odometer_cycles enable row level security;

-- profiles
create policy profiles_select_own on public.profiles for select using ((select auth.uid()) = id and deleted_at is null);
create policy profiles_insert_own on public.profiles for insert with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update using ((select auth.uid()) = id and deleted_at is null);
create policy profiles_delete_own on public.profiles for delete using ((select auth.uid()) = id);

-- vehicles
create policy vehicles_select_own on public.vehicles for select using ((select auth.uid()) = user_id and deleted_at is null);
create policy vehicles_insert_own on public.vehicles for insert with check ((select auth.uid()) = user_id);
create policy vehicles_update_own on public.vehicles for update using ((select auth.uid()) = user_id and deleted_at is null);
create policy vehicles_no_hard_delete on public.vehicles for delete using (false);

-- expenses
create policy expenses_select_own on public.expenses for select using ((select auth.uid()) = user_id and deleted_at is null);
create policy expenses_insert_own on public.expenses for insert with check ((select auth.uid()) = user_id);
create policy expenses_update_own on public.expenses for update using ((select auth.uid()) = user_id and deleted_at is null and not is_readonly);
create policy expenses_no_hard_delete on public.expenses for delete using (false);

-- maintenances
create policy maintenances_select_own on public.maintenances for select using ((select auth.uid()) = user_id and deleted_at is null);
create policy maintenances_insert_own on public.maintenances for insert with check ((select auth.uid()) = user_id);
create policy maintenances_update_own on public.maintenances for update using ((select auth.uid()) = user_id and deleted_at is null);
create policy maintenances_no_hard_delete on public.maintenances for delete using (false);

-- fines
create policy fines_select_own on public.fines for select using ((select auth.uid()) = user_id and deleted_at is null);
create policy fines_insert_own on public.fines for insert with check ((select auth.uid()) = user_id);
create policy fines_update_own on public.fines for update using ((select auth.uid()) = user_id and deleted_at is null);
create policy fines_no_hard_delete on public.fines for delete using (false);

-- audit_logs (imutável)
create policy audit_logs_select_own on public.audit_logs for select using ((select auth.uid()) = user_id);
create policy audit_logs_insert_own on public.audit_logs for insert with check ((select auth.uid()) = user_id or user_id is null);
create policy audit_logs_no_update on public.audit_logs for update using (false);
create policy audit_logs_no_delete on public.audit_logs for delete using (false);

-- vehicle_groups
create policy vehicle_groups_owner on public.vehicle_groups for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- vehicle_group_members (via group owner)
create policy vehicle_group_members_owner on public.vehicle_group_members for all
  using (exists (select 1 from public.vehicle_groups g where g.id = group_id and g.user_id = (select auth.uid())))
  with check (exists (select 1 from public.vehicle_groups g where g.id = group_id and g.user_id = (select auth.uid())));

-- expense_templates
create policy expense_templates_select_own on public.expense_templates for select using ((select auth.uid()) = user_id);
create policy expense_templates_insert_own on public.expense_templates for insert with check ((select auth.uid()) = user_id);
create policy expense_templates_update_own on public.expense_templates for update using ((select auth.uid()) = user_id);
create policy expense_templates_delete_own on public.expense_templates for delete using ((select auth.uid()) = user_id);

-- user_categories
create policy user_categories_owner on public.user_categories for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- user_preferences
create policy user_preferences_owner on public.user_preferences for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- drivers
create policy drivers_owner on public.drivers for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- vehicle_drivers (via vehicle owner)
create policy vehicle_drivers_owner on public.vehicle_drivers for all
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid())))
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid())));

-- documents
create policy documents_owner on public.documents for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- vehicle_recurring_costs
create policy recurring_costs_select_own on public.vehicle_recurring_costs for select using ((select auth.uid()) = user_id and deleted_at is null);
create policy recurring_costs_insert_own on public.vehicle_recurring_costs for insert with check ((select auth.uid()) = user_id);
create policy recurring_costs_update_own on public.vehicle_recurring_costs for update using ((select auth.uid()) = user_id and deleted_at is null);
create policy recurring_costs_no_hard_delete on public.vehicle_recurring_costs for delete using (false);

-- vehicle_odometer_cycles: apenas o dono do veículo (R-ODO-05); imutável, sem update/delete
create policy odometer_cycles_owner_select on public.vehicle_odometer_cycles for select
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid())));
create policy odometer_cycles_owner_insert on public.vehicle_odometer_cycles for insert
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid())) and created_by = (select auth.uid()));

-- discoverabilidade: revoga grants de anon (toda a app exige login — fecha os achados pg_graphql_anon_table_exposed do IMPACTO-026)
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
