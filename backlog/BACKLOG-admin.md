# Backlog — Admin e Cancelamento de Conta

> **AVISO DE CORRECAO — 2026-07-12**
> Este arquivo foi corrigido em 2026-07-12 para refletir o estado real do projeto.
> Versoes anteriores marcavam todos os 6 itens como `✅` "entregue" com datas de entrega
> (ex: "✅ 2026-05-28") que não correspondiam ao filesystem real do repositório.
> O repositório navestory é **greenfield**: não existe nenhum código-fonte implementado.
>
> **O que foi preservado:** a descrição funcional de todas as stories, critérios de aceite,
> dependências entre itens, pontuação e prioridades — tudo genuíno e mantido integralmente.
> **O que foi corrigido:** todos os itens marcados ✅ foram revertidos para ⏳ pendente.
> Datas de entrega fictícias foram removidas da tabela-resumo.
> O cabeçalho foi atualizado para refletir que nenhum item foi entregue.
>
> Referencia: `matrices/rastreabilidade.md` (rev. 41, 2026-07-12) contém o historico completo
> da correcao e o criterio de "pronto" para preencher o status real quando a implementacao iniciar.

**Specs de referência:** `specs/admin/SPEC-20260521-004.md`
**Última atualização:** 2026-07-12
**Total pendente:** 22 pts (6 itens) · **Entregue:** 0 pts

---

## Legenda

| Símbolo | Significado                                          |
| ------- | ---------------------------------------------------- |
| ⚠️      | Pré-requisito ou decisão aberta que bloqueia o item  |
| 🔗      | Depende de outro item deste backlog                  |
| 🔶      | Parcialmente implementado — apenas o delta está aqui |

---

## P0 — Fundação: infraestrutura admin e auto-exclusão

> `BL-ADMIN-01` e `BL-ADMIN-02` devem ser entregues juntos — o endpoint de auto-exclusão depende do `AdminSupabaseService` para revogar sessões via service role.

---

### BL-ADMIN-01 · STORY-01 — `AdminSupabaseService` e `AdminGuard`

**Como** sistema,
**quero** ter um client Supabase com `SERVICE_ROLE_KEY` isolado,
**e** um guard que bloqueie endpoints `/admin/*` para não-admins,
**para** que operações privilegiadas nunca vazem para usuários comuns.

**O que implementar:**

- Criar módulo `apps/api/src/modules/admin/` com estrutura:
  ```
  admin.module.ts
  admin.controller.ts
  admin.service.ts
  guards/admin.guard.ts
  services/admin-supabase.service.ts
  ```
- `AdminSupabaseService`: instancia `createClient` com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `AdminGuard`: verifica `user_metadata.role === 'admin'` no payload JWT (via `SupabaseAuthGuard` + extração do claim)
- `AdminSupabaseService` exportado **apenas** para `AdminModule` e `AuthModule` — nunca importado fora desses dois
- `SERVICE_ROLE_KEY` não deve aparecer em nenhuma resposta HTTP ou log de nível INFO/WARN

**Critérios:** CA-04, CA-06, CA-07 em SPEC-20260521-004

**Pts:** 3 | **Dependências:** nenhuma

---

### BL-ADMIN-02 · STORY-02 — Auto-exclusão de conta (`DELETE /users/me`)

**Como** usuário do navestory,
**quero** poder solicitar a exclusão permanente da minha conta,
**para** exercer meu direito ao esquecimento (LGPD Art. 18).

**O que implementar:**

- Endpoint `DELETE /users/me` em `UsersController`, protegido por `SupabaseAuthGuard`
- Body obrigatório: `{ confirm: true }` — sem ele retorna `400 Bad Request`
- Fluxo de `usersService.deleteAccount(userId)`:
  1. `supabase.auth.admin.deleteUser(userId)` via `AdminSupabaseService` — revoga sessões e marca user como deleted em `auth.users`
  2. Trigger `soft_delete_profile()` anonimiza `profiles.name` e limpa `preferences`
  3. Registrar em `audit_logs`: `action = 'ACCOUNT_DELETED'`, `table_name = 'profiles'`, `record_id = userId`
- Resposta de sucesso: `204 No Content`
- Tokens existentes do usuário devem retornar `401` nas próximas requisições

**⚠️ Atenção:** O trigger `soft_delete_profile()` está declarado na migration 001 mas sem `CREATE TRIGGER` associado — corrigir antes ou junto desta story (ver BL-ADMIN-03).

**Critérios:** CA-01, CA-02, CA-03 em SPEC-20260521-004

**Pts:** 8 | **🔗 Dependências:** BL-ADMIN-01

---

### BL-ADMIN-03 · STORY-03 — Corrigir trigger `soft_delete_profile()`

**Como** sistema,
**quero** que o trigger de anonimização seja efetivamente acionado no banco,
**para** garantir que dados pessoais sejam removidos na exclusão.

**O que implementar:**

- Verificar migration 001: confirmar se `CREATE TRIGGER soft_delete_profile_trigger ...` está presente
- Se ausente: criar migration `supabase/migrations/YYYYMMDDXXXXXX_add_soft_delete_trigger.sql` com o `CREATE TRIGGER` correto
- O trigger deve atuar em `BEFORE DELETE ON profiles FOR EACH ROW` anonimizando `name` e zerando `preferences`
- Testar via `supabase db reset` local antes de aplicar em produção

**Pts:** 2 | **🔗 Dependências:** nenhuma (pode ser entregue antes de BL-ADMIN-02)

---

## P1 — Exclusão administrativa (LGPD compliance)

---

### BL-ADMIN-04 · STORY-04 — Admin exclui conta de qualquer usuário (`DELETE /admin/users/:id`)

**Como** administrador do sistema,
**quero** poder excluir a conta de qualquer usuário,
**para** atender solicitações de exclusão via canal de suporte (LGPD Art. 18).

**O que implementar:**

- Endpoint `DELETE /admin/users/:id` em `AdminController`, protegido por `AdminGuard`
- Reutiliza o mesmo fluxo de `deleteAccount` de BL-ADMIN-02, passando `userId` da rota
- Registrar em `audit_logs`: incluir `admin_user_id` (quem executou) além do `record_id` (quem foi excluído)
- Retorna `204 No Content` em sucesso; `404` se usuário não encontrado

**Critérios:** RF-08, RNF-02 em SPEC-20260521-004

**Pts:** 3 | **🔗 Dependências:** BL-ADMIN-01, BL-ADMIN-02

---

## P2 — Observabilidade admin

---

### BL-ADMIN-05 · STORY-05 — Listar usuários (`GET /admin/users`)

**Como** administrador,
**quero** listar todos os usuários com paginação,
**para** localizar contas para suporte ou operações LGPD.

**O que implementar:**

- Endpoint `GET /admin/users?page=1&limit=20` em `AdminController`, protegido por `AdminGuard`
- Query via `AdminSupabaseService` em `profiles` (não em `auth.users` diretamente)
- Retornar: `id`, `name` (anonimizado se soft-deleted), `email`, `created_at`, `deleted_at`
- Paginação por offset; retornar `{ data, total, page, limit }`

**Critérios:** RF-06, RNF-01 em SPEC-20260521-004

**Pts:** 3 | **🔗 Dependências:** BL-ADMIN-01

---

### BL-ADMIN-06 · STORY-06 — Audit logs com filtro (`GET /admin/audit-logs`)

**Como** administrador,
**quero** consultar o histórico de operações por usuário e período,
**para** investigar incidentes e comprovar conformidade LGPD.

**O que implementar:**

- Endpoint `GET /admin/audit-logs?user_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD` em `AdminController`
- Protegido por `AdminGuard`; retorna `403` para não-admins
- Filtros: `user_id` (opcional), `from`/`to` (opcionais, default últimos 30 dias)
- Ordenação: `created_at DESC`; paginação por offset

**Critérios:** CA-05, RF-07 em SPEC-20260521-004

**Pts:** 3 | **🔗 Dependências:** BL-ADMIN-01

---

## Resumo para planejamento

| ID          | Story                                          | Pts        | Prioridade | Depende de      | Status |
| ----------- | ---------------------------------------------- | ---------- | ---------- | --------------- | ------ |
| BL-ADMIN-01 | `AdminSupabaseService` + `AdminGuard`          | 3          | P0         | —               | ⏳     |
| BL-ADMIN-02 | Auto-exclusão `DELETE /users/me`               | 8          | P0         | BL-ADMIN-01, 03 | ⏳     |
| BL-ADMIN-03 | Corrigir trigger `soft_delete_profile()`       | 2          | P0         | —               | ⏳     |
| BL-ADMIN-04 | Admin exclui usuário `DELETE /admin/users/:id` | 3          | P1         | BL-ADMIN-01, 02 | ⏳     |
| BL-ADMIN-05 | Listar usuários `GET /admin/users`             | 3          | P2         | BL-ADMIN-01     | ⏳     |
| BL-ADMIN-06 | Audit logs `GET /admin/audit-logs`             | 3          | P2         | BL-ADMIN-01     | ⏳     |
| **Total**   |                                                | **22 pts** |            |                 |        |

---

## Fora deste backlog

| Item                                         | Motivo                                                 |
| -------------------------------------------- | ------------------------------------------------------ |
| UI de painel administrativo                  | Fase 2 — fora de escopo da SPEC-004                    |
| Hard delete automático pós-30-dias           | Fase 2 — job de retenção agendado                      |
| MFA para operações admin                     | Fase 2                                                 |
| Gestão de roles via UI                       | Fase 2 — admin atribuído via Supabase Dashboard no MVP |
| Exportação de dados pessoais (portabilidade) | LGPD Art. 18 II — Fase 2                               |
| UI de confirmação no frontend (modal)        | Fase 2 — endpoint backend é suficiente para MVP        |
