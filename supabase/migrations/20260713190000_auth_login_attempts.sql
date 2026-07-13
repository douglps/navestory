-- @spec SPEC-20260524-001 STORY-03, RULES.md S4
-- Contador de tentativas de login inválidas por e-mail (bloqueio de 15min após 5 falhas).
-- Sem policy de RLS para anon/authenticated: acessível apenas via SERVICE_ROLE_KEY (backend).

create table public.auth_login_attempts (
  email text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.auth_login_attempts enable row level security;

comment on table public.auth_login_attempts is
  'Contador de tentativas de login inválidas por e-mail. Acesso restrito ao backend (service role).';
