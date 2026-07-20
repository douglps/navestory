-- @spec SPEC-20260719-002 RF-04, RF-05, RF-06

-- 1. Drop trigger orfao: a anonimizacao/soft-delete agora e responsabilidade do
--    UsersService (RF-01), executada via UPDATE explicito antes de qualquer DELETE real.
--    Manter o trigger causaria execucao redundante durante o hard delete (o DELETE em
--    auth.users cascateia para profiles, disparando o trigger sem efeito util).
drop trigger if exists before_delete_profiles on public.profiles;

-- 2. Function de hard delete (SECURITY DEFINER, search_path fixo - aplica S9)
create or replace function public.hard_delete_expired_accounts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired_ids uuid[];
begin
  select array_agg(id)
  into v_expired_ids
  from public.profiles
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';

  if v_expired_ids is null or array_length(v_expired_ids, 1) = 0 then
    return;
  end if;

  -- Audit log antes do DELETE (mesma transacao) - RNF-05/RNF-06.
  -- Nao ha passo de anonimizacao intermediaria aqui: o DELETE a seguir elimina os
  -- dados definitivamente via cascade, tornando qualquer UPDATE previo redundante.
  insert into public.audit_logs (user_id, action, table_name, record_id, changes, created_at)
  select
    null,
    'ACCOUNT_HARD_DELETED',
    'auth.users',
    id::text,
    '{"reason": "30-day retention period expired"}'::jsonb,
    now()
  from public.profiles
  where id = any(v_expired_ids);

  -- Hard delete via auth.users (cascata para profiles e demais tabelas).
  -- Objetos fisicos no Supabase Storage NAO sao removidos por este DELETE (RF-12).
  delete from auth.users
  where id = any(v_expired_ids);
end;
$$;

-- 3. Revogar EXECUTE de roles nao autorizados (precaucao - aplica S9/RNF-04)
revoke execute on function public.hard_delete_expired_accounts() from public;
revoke execute on function public.hard_delete_expired_accounts() from anon;
revoke execute on function public.hard_delete_expired_accounts() from authenticated;

-- 4. Agendamento do job diario as 03:00 UTC
select cron.schedule(
  'nave_hard_delete_expired_accounts',
  '0 3 * * *',
  $$select public.hard_delete_expired_accounts()$$
);
