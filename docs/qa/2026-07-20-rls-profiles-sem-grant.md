# RLS em `public.profiles` bloqueado por falta de GRANT (2026-07-20)

**Severidade:** 🔴 alta — bloqueia funcionalidade (não é um vazamento de dado, é o oposto: acesso
legítimo negado), mas está numa área S2 (RLS ativo, `specs/RULES.md`) e nunca tinha sido validado
em CI de verdade.

**Origem:** ao investigar a falha do job `Integration test (Supabase local — CT-006, CT-007)` no
CI (run [29762251500](https://github.com/douglps/navestory/actions/runs/29762251500)), depois de
corrigir o bloqueio de Node 20/pnpm e o build faltante de `@navestory/validators` (ver
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
depois disso, pelo build faltante de `@navestory/validators` (commit `e4a7237`). É provável que esse bug
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

---

## Resolução (2026-07-20 — agente `dba`)

### Causa raiz confirmada (análise estática das migrations)

A investigação percorreu todas as 24 migrations em `supabase/migrations/` sem acesso ao banco local
(Supabase CLI não disponível na sessão). A causa raiz foi confirmada por análise estática:

**Nenhuma migration do projeto concede `GRANT` de tabela à role `authenticated`.** Os únicos
`GRANT` encontrados são `GRANT EXECUTE ON FUNCTION` em migrations de analytics (`20260712172105`,
`20260716120000`, `20260716130000`, `20260716140000`). Para tabelas, o projeto dependia
inteiramente dos grants implícitos que o `supabase start` provisiona — e esses grants não estavam
sendo aplicados de forma consistente.

O mecanismo é o seguinte:

- `20260712172047_rls_policies.sql` habilita RLS em todas as tabelas e executa
  `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon`, removendo explicitamente o acesso de `anon`.
- A mesma migration também executa `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon`
  para tabelas futuras.
- Mas **em nenhum momento** é executado `GRANT ... TO authenticated` para qualquer tabela.

### Escopo: `profiles` não é exceção — o problema é universal

Após varrer todas as migrations, a conclusão é que **todas as tabelas do schema `public` têm o
mesmo problema**: nenhuma recebe GRANT explícito para `authenticated`. `profiles` foi a primeira a
manifestar o erro porque CT-006 e CT-007 são os únicos testes de integração hoje que acessam uma
tabela diretamente como `authenticated`. `vehicles`, `expenses`, `maintenances` etc. teriam o mesmo
erro 42501 se fossem testadas da mesma forma.

A hipótese inicial de que o trigger `handle_new_user` poderia ser a causa específica para `profiles`
foi descartada: `handle_new_user` é `SECURITY DEFINER` e executa com privilégios do dono da função
(`postgres`/`supabase_admin`), não da role `authenticated`. Isso é irrelevante para o GRANT.

### Migração criada

**Arquivo:** `supabase/migrations/20260720100000_grant_tables_authenticated.sql`

A migração concede os privilégios mínimos por tabela, alinhados às RLS policies existentes:

| Tabela                                                                     | GRANT concedido                | Justificativa                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                                                                 | SELECT, INSERT, UPDATE         | SELECT/UPDATE necessários; INSERT por consistência com `profiles_insert_own`; DELETE via cascade/admin (não authenticated)    |
| `vehicles`, `expenses`, `maintenances`, `fines`, `vehicle_recurring_costs` | SELECT, INSERT, UPDATE         | Hard delete bloqueado por policy `USING (false)` — GRANT DELETE seria redundante e contrário ao princípio de menor privilégio |
| `audit_logs`                                                               | SELECT, INSERT                 | Imutável — policies `audit_logs_no_update` e `audit_logs_no_delete` retornam `false`                                          |
| `vehicle_odometer_cycles`                                                  | SELECT, INSERT                 | Imutável por design (R-ODO-05/06) — sem UPDATE/DELETE policies                                                                |
| `vehicle_groups`, `vehicle_group_members`                                  | SELECT, INSERT, UPDATE, DELETE | CRUD completo — policy `FOR ALL`                                                                                              |
| `expense_templates`, `user_categories`, `user_preferences`                 | SELECT, INSERT, UPDATE, DELETE | CRUD completo — policies individuais para cada operação                                                                       |
| `auth_login_attempts`                                                      | (nenhum)                       | Intencional — acesso restrito ao service role (S4)                                                                            |

A migração também inclui:

```sql
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
```

Isso previne regressão em migrações futuras: qualquer nova tabela criada em `public` recebe os
grants automaticamente. O DELETE é incluído nos default privileges porque RLS é o controle real
de acesso — o GRANT é apenas o pré-requisito para a policy ser avaliada.

### Validação

O Supabase CLI não estava disponível localmente durante esta sessão. A análise é estática (leitura
de migrations) — a validação contra a suíte de integração (`CT-006`, `CT-007`) precisa ser
executada manualmente ou pelo próximo run de CI após merge desta migration.

**Comando para validar localmente (quando o ambiente estiver disponível):**

```bash
# Na raiz do projeto
supabase db reset   # aplica todas as migrations do zero
cd apps/api
pnpm test:integration
```

### Achados adicionais

1. **Sem criação de spec separada**: esta correção é uma lacuna de implementação da regra S2 já
   existente (`RULES.md`), não uma feature nova. Não foi criada spec separada, conforme alinhado
   no briefing da tarefa. A rastreabilidade via comentário `-- @spec RULES.md S2` na migration é
   suficiente.

2. **Escopo de este fix vs. outras migrações**: nenhuma outra migration precisou ser alterada.
   A nova migration é aditiva (apenas GRANTs) e não cria risco de conflito com migrações existentes.

## Validação contra banco real (2026-07-20, sessão seguinte)

Docker Desktop e Supabase CLI (`v2.101.0`) estavam disponíveis localmente. Passos executados:

```bash
supabase start        # subiu a stack; containers de sessão anterior (17h) precisaram de
                       # `supabase stop` + `supabase start` limpo antes de ficarem saudáveis
supabase db reset      # reaplicou as 25 migrations (incluindo 20260720100000_grant_tables_authenticated.sql)
cd apps/api
pnpm test:integration
```

**Observação operacional:** logo após o `db reset`, o gateway (Kong) e demais serviços (Auth, REST
etc.) caíram — só `supabase_db_navestory` continuou de pé, e a suíte falhou com
`ECONNREFUSED 127.0.0.1:54321`. Não é efeito da migration; é o `db reset` reiniciando containers
que não voltaram sozinhos nesta versão do CLI. Resolvido com `supabase stop` seguido de
`supabase start` limpo — depois disso todos os serviços (`db`, `kong`, `auth`, `rest`, `storage`,
`realtime`, `analytics`, `studio`, `pg_meta`, `inbucket`) ficaram `healthy` (exceto `vector`, que
ficou reiniciando em loop — não bloqueia a suíte, que não depende dele).

**Resultado: 6/6 testes passando**, incluindo os dois casos que antes falhavam com
`code: 42501, permission denied for table profiles`:

```
RLS em profiles (integração, Supabase local)
  ✓ CT-007: usuário A não consegue ler o profile do usuário B (RLS bloqueia)
  ✓ usuário A consegue ler o próprio profile (RLS permite auth.uid() = id)
Auth (integração, Supabase local)
  ✓ CT-006: GET /users/me sem JWT retorna 401 (S1)
  ✓ CT-006: GET /users/me com JWT malformado retorna 401
  ✓ registra e faz login de um usuário real contra o Supabase local (STORY-REG-01, STORY-01)
  ✓ bloqueia registro duplicado com 409 (STORY-REG-01)
```

**Status: bug corrigido e validado contra banco real.** A migration
`supabase/migrations/20260720100000_grant_tables_authenticated.sql` resolve a causa raiz confirmada
pelo `dba` (nenhuma migration anterior concedia GRANT explícito para `authenticated` em nenhuma
tabela de `public`) sem regressão nos testes existentes.
