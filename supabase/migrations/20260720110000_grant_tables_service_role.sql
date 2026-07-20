-- @spec RULES.md S2, docs/qa/2026-07-20-rls-profiles-sem-grant.md
--
-- CONTEXTO: assim como `authenticated` (20260720100000_grant_tables_authenticated.sql), a role
-- `service_role` faz bypass de RLS mas AINDA precisa de GRANT de tabela no Postgres — bypass de
-- RLS e GRANT são mecanismos independentes. `service_role` nunca recebeu GRANT explícito em
-- nenhuma migration deste projeto; dependia inteiramente do grant implícito provisionado pela
-- imagem base do Postgres do Supabase. Esse grant implícito não é garantido entre versões da
-- imagem: a CI (supabase/setup-cli@v1 com `version: latest`) resolveu uma imagem mais nova que
-- não o provisiona, causando `permission denied for table profiles` (42501) para o client admin
-- (SUPABASE_SERVICE_ROLE_KEY) em AuthService.register() — nunca reproduzido localmente, onde a
-- imagem já estava em cache com o grant implícito antigo.
--
-- ESCOPO: service_role é a role do backend (supabaseAdmin) — usada para operações administrativas
-- que intencionalmente ignoram RLS (ex: checagem pós-signup, auditoria, login attempts). Recebe
-- CRUD completo em todas as tabelas de public, sem as mesmas restrições aplicadas a authenticated
-- (ex: DELETE bloqueado por policy em vehicles/expenses) — RLS não filtra service_role, então
-- essas restrições não se aplicam a essa role; o controle de acesso para service_role é feito
-- inteiramente no código do backend, não no banco.

grant select, insert, update, delete on all tables in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
