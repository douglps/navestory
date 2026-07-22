-- @spec SPEC-20260721-002 RF-01 (revisão: catálogo de KPIs configurável, ver STORIES.md US-01)
-- R-KPI-01: catálogo de KPIs do dashboard configurável por usuário, entre 1 e 6 ativos.
-- Validação dos ids contra o catálogo fixo (KPI_CATALOG_IDS) ocorre em @nave/validators —
-- mesmo padrão já usado para vehicle_chip_fields (sem CHECK de enum em texto[] no banco).

alter table public.user_preferences
  add column if not exists dashboard_kpi_ids text[]
    not null default array['expenses_month', 'urgent_maintenance', 'cost_per_km', 'next_maintenance']
    check (array_length(dashboard_kpi_ids, 1) between 1 and 6);
