-- @spec SPEC-20260804-002 RF-04
-- Preferência de contexto padrão do usuário (veículo/grupo/toda a frota), aplicada no
-- início de cada sessão (RF-09). NULL em ambas as colunas é o estado "sem preferência
-- configurada", tratado pela aplicação como equivalente a 'all' (R-PREF-01).

alter table public.user_preferences
  add column if not exists default_context_type text
    constraint user_preferences_default_context_type_check
      check (default_context_type in ('all', 'single', 'group'))
    default null,
  add column if not exists default_context_id uuid
    default null;

-- Coerência entre os dois campos: 'all' nunca tem id; 'single'/'group' sempre têm id.
alter table public.user_preferences
  add constraint chk_default_context_coherence check (
    (default_context_type is null and default_context_id is null) or
    (default_context_type = 'all' and default_context_id is null) or
    (default_context_type in ('single', 'group') and default_context_id is not null)
  );
