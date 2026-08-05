-- @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-05, R-WS-05 — remove a
-- constraint `unique (workspace_id, user_id)` de `workspace_members`, criada junto da tabela em
-- 20260804210000_workspace_foundation.sql. Ela bloqueava reingresso: como R-WS-05 preserva o
-- histórico (soft delete via `removed_at`), um usuário removido e reconvidado ao mesmo workspace
-- colidia com sua própria linha antiga e o aceite falhava com 500 (duplicate key). A regra de
-- negócio real já é garantida por `workspace_members_user_active_unique`, um índice único parcial
-- em `user_id` para `removed_at is null` (R-WS-03: no máximo 1 membership ativa por usuário, em
-- qualquer workspace) — a constraint removida aqui era redundante para o caso ativo e incorreta
-- para o caso histórico.

alter table public.workspace_members drop constraint workspace_members_workspace_id_user_id_key;
