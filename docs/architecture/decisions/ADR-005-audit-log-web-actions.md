# ADR-005: Audit Log Universalizado para Web Server Actions

## Status

Accepted

## Context

O `AuditService` do backend registrava eventos de auditoria apenas para operações via API REST (Controller → Service). Com a introdução de Server Actions no Next.js 15, operações críticas passaram a ocorrer diretamente no servidor web sem passar pelo NestJS — portanto sem registro de auditoria. Isso criava lacunas no log: um admin podia ver deleções via API mas não via interface web.

## Decision

Estender o registro de auditoria para cobrir todas as Server Actions que realizam operações de escrita críticas (criação, atualização, deleção de veículos, despesas, manutenções; deleção de conta). As Server Actions chamam o backend via API (que já registra), mas também garantem log local quando o backend não é acionado diretamente.

A decisão mantém o `AuditService` como fonte primária de verdade para operações de API, e adiciona chamadas de auditoria nas Server Actions para operações onde o fluxo bypassa o NestJS.

## Consequences

- Cobertura de auditoria completa para todas as mutações visíveis ao usuário
- Risco de duplicação de logs (Server Action + API ambos registrando a mesma operação) — mitigado por idempotência do log (deduplicação por `user_id + action + timestamp` no AuditService)
- A `matrices/permissoes.md` lista explicitamente quais ações são auditadas e em qual camada

## References

- `apps/api/src/infrastructure/audit/audit.service.ts`
- `apps/web/app/actions/` — Server Actions com chamadas de auditoria
- `matrices/permissoes.md` — seção de Auditoria
- IMPACTO-007
