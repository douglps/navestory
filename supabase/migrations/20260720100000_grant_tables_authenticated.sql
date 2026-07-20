-- @spec RULES.md S2 — garante que a role `authenticated` tenha os privilégios de tabela
-- mínimos necessários para que as policies de RLS possam ser avaliadas pelo Postgres.
--
-- CONTEXTO: em Postgres, o GRANT de tabela é verificado ANTES da RLS policy. Sem GRANT,
-- o engine retorna `permission denied for table` (code 42501) e nunca chega a avaliar a
-- policy — por isso auth.uid() = id não ajuda se o GRANT está faltando.
--
-- BUG ORIGINAL: CT-006/CT-007 falhavam com code 42501 em public.profiles. Investigação
-- confirmou que NENHUMA migração anterior concedia SELECT/INSERT/UPDATE à role authenticated
-- para qualquer tabela de public — o projeto dependia inteiramente dos grants implícitos
-- que o `supabase start` provisiona, e esses grants não estavam sendo aplicados.
--
-- ESCOPO: o problema afeta todas as tabelas de public, não só profiles. profiles é a
-- primeira a falhar porque CT-006 e CT-007 são os únicos testes de integração hoje.
-- Esta migration corrige todas as tabelas de uma vez para evitar regressão.
--
-- CRITÉRIO DE GRANT POR TABELA:
--   • Alinhado às RLS policies existentes em 20260712172047_rls_policies.sql
--   • Tabelas com policy DELETE USING (false) → sem GRANT DELETE (operação bloqueada por design)
--   • Tabelas imutáveis (audit_logs, vehicle_odometer_cycles) → SELECT e INSERT apenas
--   • auth_login_attempts → intencionalmente sem GRANT (acesso restrito a service role)
--   • INSERT em profiles → concedido para consistência com profiles_insert_own policy;
--     na prática o insert é feito pelo trigger handle_new_user (SECURITY DEFINER)

-- profiles: SELECT/UPDATE obrigatórios; INSERT por consistência com policy; DELETE via cascade/admin
grant select, insert, update on public.profiles to authenticated;

-- vehicles, expenses, maintenances, fines: hard delete bloqueado por policy (USING false)
grant select, insert, update on public.vehicles to authenticated;
grant select, insert, update on public.expenses to authenticated;
grant select, insert, update on public.maintenances to authenticated;
grant select, insert, update on public.fines to authenticated;

-- audit_logs: imutável — UPDATE e DELETE bloqueados pelas policies audit_logs_no_update / no_delete
grant select, insert on public.audit_logs to authenticated;

-- vehicle_groups e membros: CRUD completo (R-GRP-01..04, dono controla via RLS)
grant select, insert, update, delete on public.vehicle_groups to authenticated;
grant select, insert, update, delete on public.vehicle_group_members to authenticated;

-- expense_templates: CRUD completo (R3 — limite enforced por trigger, não por ausência de GRANT)
grant select, insert, update, delete on public.expense_templates to authenticated;

-- user_categories: CRUD completo (R-CAT-01..04)
grant select, insert, update, delete on public.user_categories to authenticated;

-- user_preferences: CRUD completo (R-PREF-01, R-DISP-03)
grant select, insert, update, delete on public.user_preferences to authenticated;

-- vehicle_recurring_costs: sem hard delete por policy (recurring_costs_no_hard_delete não existe
-- como policy explícita, mas o padrão do domínio usa soft-delete via deleted_at)
grant select, insert, update on public.vehicle_recurring_costs to authenticated;

-- vehicle_odometer_cycles: imutável — apenas SELECT e INSERT (R-ODO-05/06; sem UPDATE/DELETE)
grant select, insert on public.vehicle_odometer_cycles to authenticated;

-- auth_login_attempts: sem GRANT para authenticated — acesso restrito ao service role (S4)
-- (nenhuma linha aqui é intencional)

-- Previne regressão em migrações futuras: qualquer tabela nova criada em public recebe
-- automaticamente os mesmos privilégios. DELETE incluído porque RLS é o controle real —
-- o GRANT é apenas o pré-requisito para a policy ser avaliada.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
