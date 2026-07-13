-- @spec matrices/impacto.md IMPACTO-026 achado adicional — FKs sem índice de cobertura

create index idx_vehicles_user_id on public.vehicles (user_id);
create index idx_expenses_user_id on public.expenses (user_id);
create index idx_expenses_vehicle_id on public.expenses (vehicle_id);
create index idx_maintenances_user_id on public.maintenances (user_id);
create index idx_maintenances_vehicle_id on public.maintenances (vehicle_id);
create index idx_fines_user_id on public.fines (user_id);
create index idx_fines_vehicle_id on public.fines (vehicle_id);
create index idx_audit_logs_user_id on public.audit_logs (user_id);
create index idx_vehicle_groups_user_id on public.vehicle_groups (user_id);
create index idx_vehicle_group_members_vehicle_id on public.vehicle_group_members (vehicle_id);
create index idx_expense_templates_user_id on public.expense_templates (user_id);
create index idx_expense_templates_vehicle_id on public.expense_templates (vehicle_id);
create index idx_user_categories_user_id on public.user_categories (user_id);
create index idx_drivers_user_id on public.drivers (user_id);
create index idx_vehicle_drivers_driver_id on public.vehicle_drivers (driver_id);
create index idx_documents_user_id on public.documents (user_id);
create index idx_vehicle_recurring_costs_user_id on public.vehicle_recurring_costs (user_id);
create index idx_vehicle_recurring_costs_vehicle_id on public.vehicle_recurring_costs (vehicle_id);
