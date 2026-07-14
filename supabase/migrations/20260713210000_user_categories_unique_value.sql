-- @spec SPEC-20260602-004 R-CAT-02, RF-03
-- A spec original previa `UNIQUE(user_id, value)` em user_categories, mas a
-- migration consolidada (20260712171846) não incluiu essa constraint.
-- Corrigido aqui para que POST /categories com value duplicado por usuário
-- retorne 409 de fato (violação de constraint), não apenas confiar no service.
alter table public.user_categories
  add constraint uq_user_categories_user_value unique (user_id, value);
