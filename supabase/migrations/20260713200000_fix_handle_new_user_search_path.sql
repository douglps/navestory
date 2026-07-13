-- @spec RULES.md S9 (search_path fixo) — corrige regressão introduzida pela própria S9:
-- `set search_path = ''` em handle_new_user() impedia a resolução do tipo `profile_type`
-- sem schema-qualificação, quebrando 100% dos registros novos (SQLSTATE 42704), descoberto
-- via teste de integração real (CT-006/STORY-REG-01) contra Supabase local.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, profile_type, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'profile_type')::public.profile_type, 'autonomous'::public.profile_type),
    now(),
    now()
  );
  return new;
end;
$$;
