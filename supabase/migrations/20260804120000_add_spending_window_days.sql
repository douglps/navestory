-- @spec SPEC-20260804-001 RF-01
-- Coluna de preferência de janela rolante (em dias) do KPI "Gastos nos últimos X dias".
-- R-PREF-01: default seguro (7) — ausência de preferência nunca causa erro.
-- RLS existente em user_preferences ((select auth.uid()) = user_id) cobre a coluna nova
-- sem alteração de policy.

alter table public.user_preferences
  add column if not exists spending_window_days smallint
    not null default 7
    constraint user_preferences_spending_window_days_check
      check (spending_window_days in (7, 14, 30));
