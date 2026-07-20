# RLS em `public.profiles` bloqueado por falta de GRANT (2026-07-20)

**Severidade:** 🔴 alta — bloqueia funcionalidade (não é um vazamento de dado, é o oposto: acesso
legítimo negado), mas está numa área S2 (RLS ativo, `specs/RULES.md`) e nunca tinha sido validado
em CI de verdade.

**Origem:** ao investigar a falha do job `Integration test (Supabase local — CT-006, CT-007)` no
CI (run [29762251500](https://github.com/douglps/nave/actions/runs/29762251500)), depois de
corrigir o bloqueio de Node 20/pnpm e o build faltante de `@nave/validators` (ver
`docs/qa/2026-07-20-gap-real-cobertura-web.md`), sobrou uma falha real em
`test/integration/rls.int-spec.ts`:

```
CT-007: usuário A não consegue ler o profile do usuário B (RLS bloqueia)
usuário A consegue ler o próprio profile (RLS permite auth.uid() = id)

Received: {"code": "42501", "details": null,
  "hint": "Grant the required privileges to the current role with:
            GRANT SELECT ON public.profiles TO authenticated;",
  "message": "permission denied for table profiles"}
```

**Diagnóstico:** o próprio Postgres já indica a causa — falta `GRANT SELECT` (e possivelmente
`INSERT`/`UPDATE`) na tabela `public.profiles` para a role `authenticated`. Em Postgres, uma RLS
policy só entra em ação **depois** que a role já tem privilégio de tabela; sem o `GRANT`, o acesso
é negado antes mesmo de a policy ser avaliada — por isso o teste "usuário A consegue ler o próprio
profile" falha também, não só o de isolamento entre usuários.

Nenhuma migração em `supabase/migrations/*.sql` contém `GRANT` ou `ALTER DEFAULT PRIVILEGES`
explícito para `public.profiles` (busca em `20260712171830_core_tables.sql`, onde a tabela é
criada, e nas migrações de RLS `20260712172047_rls_policies.sql`). O projeto depende inteiramente
dos grants padrão que o `supabase start` provisiona — e por algum motivo `profiles` não os tem
(possivelmente porque é a única tabela referenciada por um trigger `handle_new_user` que roda com
outro contexto de execução — não confirmado, precisa investigação com o banco local rodando).

**Por que só apareceu agora:** o job `Integration test` nunca tinha rodado com sucesso até o fim —
estava bloqueado desde o setup (Node 20 incompatível com `pnpm@11.1.3`, ver commit `aa92804`) e,
depois disso, pelo build faltante de `@nave/validators` (commit `e4a7237`). É provável que esse bug
de RLS exista desde a criação da tabela, sem nunca ter sido pego pelo CI.

**Não corrigido nesta sessão** — requer banco Supabase local rodando para testar o `GRANT` e
confirmar que não há efeito colateral (ex: se o trigger `handle_new_user` já teria motivo para rodar
com privilégio elevado e o `GRANT` para `authenticated` é a peça certa a adicionar). Recomendado
acionar o agente `dba` (ver `~/.claude/CLAUDE.md`, tabela de agentes do projeto) para:

1. Rodar `supabase start` localmente e reproduzir o erro.
2. Confirmar se outras tabelas (`vehicles`, `expenses` etc.) têm o `GRANT` implícito funcionando
   e `profiles` é exceção, ou se é um problema mais amplo mascarado por esses dois testes serem os
   únicos de integração hoje (`CT-006`, `CT-007`).
3. Escrever a migração de correção (`GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;`
   ou equivalente, avaliando o mínimo necessário) e validar contra a suíte de integração.
