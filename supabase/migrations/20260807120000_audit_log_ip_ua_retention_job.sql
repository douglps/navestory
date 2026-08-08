-- @spec SPEC-20260807-002 RF-A03 — valida S15
-- Retencao diferenciada de 12 meses para os campos ip/user_agent dentro de audit_logs.changes.
-- Job minimo e autocontido: remove apenas as chaves ip/user_agent do JSONB, mantendo o restante
-- do registro intacto (action, user_id, table_name, record_id, demais campos de changes).
-- Nao move/arquiva o registro para camada fria — isso e escopo do job de arquivamento RF-08 de
-- SPEC-20260807-001 (ainda nao implementado em codigo); quando esse job existir, deve reutilizar
-- esta mesma condicao de expurgo antes de mover o registro para o bucket audit-logs-archive.

create or replace function public.redact_expired_audit_log_ip_ua()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.audit_logs
  set changes = changes - 'ip' - 'user_agent'
  where created_at < now() - interval '12 months'
    and (changes ? 'ip' or changes ? 'user_agent');
end;
$$;

revoke execute on function public.redact_expired_audit_log_ip_ua() from public;
revoke execute on function public.redact_expired_audit_log_ip_ua() from anon;
revoke execute on function public.redact_expired_audit_log_ip_ua() from authenticated;

-- Agendamento diario as 03:30 UTC (fora da janela do job de hard-delete de contas, 03:00 UTC)
select cron.schedule(
  'navestory_redact_expired_audit_log_ip_ua',
  '30 3 * * *',
  $$select public.redact_expired_audit_log_ip_ua()$$
);
