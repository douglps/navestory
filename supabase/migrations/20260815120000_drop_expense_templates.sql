-- Remove o recurso "Modelos de despesa" (SPEC-20260601-003).
-- Desabilitado por decisão de produto em 2026-08-15: sem usuários reais em produção, o
-- recurso será redesenhado do zero em vez de mantido incrementalmente (RF-05, RF-09, RF-13
-- nunca ficaram completos — ver matrices/rastreabilidade.md). A spec permanece `approved`
-- (mudança tratada como pequena, não estrutural) até que uma spec nova a substitua.
drop table if exists public.expense_templates cascade;

drop function if exists public.enforce_expense_templates_limit();
drop function if exists public.update_expense_templates_updated_at();
