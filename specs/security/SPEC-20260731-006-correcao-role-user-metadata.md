---
id: SPEC-20260731-006
title: "Correção: Escalação de Privilégio via user_metadata do Supabase"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: [S12]
camadas: [backend, security]
compliance: [C2]
---

## Contexto

Auditoria de segurança realizada em 2026-07-31 identificou uma vulnerabilidade **crítica** de escalação de privilégio no mecanismo de autorização de rotas de administração do backend NestJS (`apps/api`).

O `RolesGuard` (`apps/api/src/common/guards/roles.guard.ts`, linha 25) determina se um usuário é admin lendo o campo `request.user?.user_metadata?.role`. Esse campo é populado pelo `SupabaseAuthGuard` (`apps/api/src/common/guards/supabase-auth.guard.ts`, linhas 41-45) a partir de `data.user.user_metadata`, retornado pela chamada `this.supabaseAdmin.auth.getUser(token)`.

O problema é que `user_metadata` no Supabase Auth (GoTrue) é um campo **gravável pelo próprio usuário autenticado** via chamada direta à API pública `PUT /auth/v1/user` (equivalente a `supabase.auth.updateUser({ data: { role: "admin" } })`) usando apenas o próprio access token e a `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave documentada em `docs/reference/environment-variables.md` (~linha 45) como segura para uso no navegador e, portanto, não-secreta por design (alinhada à recomendação oficial do Supabase). Essa chamada não passa pelo backend NestJS deste projeto e portanto não é interceptada por nenhum guard.

A consequência direta é que qualquer usuário autenticado pode:

1. Chamar a API pública do Supabase fora deste app, setando `user_metadata.role = "admin"` no próprio registro.
2. Usar o mesmo access token para acessar `apps/api/src/modules/admin/admin.controller.ts`, que usa `@UseGuards(SupabaseAuthGuard, RolesGuard)` + `@Roles("admin")`.
3. Obter acesso indevido a: `GET /admin/users` (listar todos os usuários), `GET /admin/audit-logs` (ver todos os audit logs), `DELETE /admin/users/:id` (excluir conta de qualquer usuário).

Uma revisão paralela do código confirmou que **100% da checagem de admin no sistema depende exclusivamente de `user_metadata`** — não existe nenhum uso de `app_metadata` em nenhum arquivo do repositório hoje.

Esta vulnerabilidade tem origem na decisão de implementação do RF-09 de `SPEC-20260521-004` (changelog de 2026-07-13), que registrou a adoção de `user_metadata.role` como identificador de role admin, mas não avaliou o vetor de bypass direto via API pública do Supabase — a spec original considerava apenas o caminho via este backend.

## Problemas

| # | Problema | Severidade | Arquivo |
|---|----------|-----------|---------|
| P1 | `RolesGuard` lê `user_metadata.role` — campo gravável pelo próprio usuário via API pública do Supabase | Crítico | `apps/api/src/common/guards/roles.guard.ts:25` |
| P2 | `SupabaseAuthGuard` popula `request.user.user_metadata` a partir de `data.user.user_metadata`, sem migrar para `app_metadata` | Crítico | `apps/api/src/common/guards/supabase-auth.guard.ts:41-45` |
| P3 | `JwtPayload` não declara `app_metadata` — campo não tipado no contrato de autenticação | Alto | `apps/api/src/modules/auth/jwt.strategy.ts` |
| P4 | Teste de regressão do `RolesGuard` cobre apenas `user_metadata.role` — passou a ser cobertura de caminho incorreto | Alto | `apps/api/src/common/guards/roles.guard.spec.ts` |
| P5 | Contas admin existentes têm `user_metadata.role = "admin"` — precisam de migração manual para `app_metadata.role` | Operacional | Supabase Dashboard (sem arquivo de código) |

## Objetivo

Eliminar o vetor de escalação de privilégio substituindo a fonte do claim de role de `user_metadata` (gravável pelo usuário) por `app_metadata` (gravável apenas via API administrativa com service role key), alinhando o mecanismo de autorização ao padrão recomendado pela documentação oficial do Supabase para dados de autorização.

## Histórias de Usuário e Critérios de Aceitação

### US-01: Usuário malicioso tenta escalar para admin via user_metadata

**Como** usuário comum autenticado, se eu tentar setar `user_metadata.role = "admin"` diretamente na API pública do Supabase e usar meu token em seguida para acessar rotas de admin, quero que o sistema me rejeite com 403.

- **Dado que** sou um usuário autenticado sem `app_metadata.role = "admin"`, **quando** chamo diretamente `PUT /auth/v1/user` no Supabase com `{ data: { role: "admin" } }` usando meu access token e envio esse token para `GET /admin/users`, **então** recebo HTTP 403 (acesso negado), mesmo que `user_metadata.role` no token seja `"admin"`.
- **Dado que** sou um usuário autenticado sem `app_metadata.role = "admin"`, **quando** envio qualquer requisição autenticada para qualquer rota sob `/admin/*`, **então** recebo HTTP 403, independente do conteúdo de `user_metadata`.

### US-02: Administrador legítimo continua operando após a migração

**Como** administrador do sistema, depois que minha conta for migrada de `user_metadata.role` para `app_metadata.role`, quero continuar acessando todas as funcionalidades de admin sem interrupção.

- **Dado que** minha conta tem `app_metadata.role = "admin"` (migrada via Supabase Dashboard ou script), **quando** envio uma requisição autenticada para `GET /admin/users`, **então** recebo HTTP 200 com a lista de usuários.
- **Dado que** minha conta tem `app_metadata.role = "admin"`, **quando** envio uma requisição autenticada para `DELETE /admin/users/:id`, **então** a operação executa normalmente com HTTP 200 ou 204.
- **Dado que** minha conta tem `user_metadata.role = "admin"` mas **não** tem `app_metadata.role = "admin"` (cenário de migração incompleta), **quando** envio uma requisição autenticada para qualquer rota `/admin/*`, **então** recebo HTTP 403 — confirmando que o guard passou a ler exclusivamente `app_metadata`.

## Requisitos Funcionais

### RF-SEC-001 — Migrar fonte do claim de role para `app_metadata` no `RolesGuard`

- Substituir `request.user?.user_metadata?.role` por `request.user?.app_metadata?.role` em `apps/api/src/common/guards/roles.guard.ts` (linha 25)
- O comportamento de comparação com o array de roles permitidos permanece idêntico — apenas a origem do campo muda
- Prioridade: **Alta** | História: US-01, US-02

### RF-SEC-002 — Atualizar `SupabaseAuthGuard` para popular `app_metadata` no payload

- Em `apps/api/src/common/guards/supabase-auth.guard.ts` (linhas 41-45), adicionar `app_metadata: data.user.app_metadata` ao objeto `request.user` populado após validação do token
- Verificar se `user_metadata` ainda é usado para **outra finalidade que não seja autorização** (ex: display name, avatar, preferências) em qualquer parte do código que consome `request.user`; se sim, mantê-lo no payload para não quebrar esses consumidores; se não, pode ser removido do payload — a decisão deve ser registrada como comentário no código
- Aplicar a mesma adição de `app_metadata` em `apps/api/src/common/guards/soft-deleted-user.guard.ts`, se esse guard também acessa `user_metadata` para qualquer verificação de autorização
- Prioridade: **Alta** | História: US-01, US-02

### RF-SEC-003 — Adicionar `app_metadata` ao tipo `JwtPayload`

- Em `apps/api/src/modules/auth/jwt.strategy.ts`, adicionar o campo `app_metadata?: { role?: string }` à interface ou tipo `JwtPayload`
- Garante tipagem correta e detecta via TypeScript qualquer referência a `user_metadata.role` que fique sem atualização
- Prioridade: **Alta** | História: US-01, US-02

### RF-SEC-004 — Migração manual de contas admin existentes para `app_metadata`

- Toda conta que hoje tem `user_metadata.role = "admin"` precisa ter `app_metadata.role = "admin"` configurado **antes** do deploy da correção — caso contrário o admin perde acesso imediatamente após o deploy
- O mecanismo de migração é manual/pontual via Supabase Dashboard (Auth > Users > selecionar usuário > editar `app_metadata`) **ou** via script Node.js usando `supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { role: "admin" } })`
- Este requisito é operacional, não automatizado — não deve ser implementado como migration de schema
- Executar migração **antes** do deploy do código alterado (RF-SEC-001/002/003), nunca depois
- Prioridade: **Alta** | História: US-02

### RF-SEC-005 — Atualizar teste de regressão do `RolesGuard`

- Em `apps/api/src/common/guards/roles.guard.spec.ts`, atualizar os casos de teste que usam `user_metadata.role` para usar `app_metadata.role`
- Adicionar caso de teste explícito: usuário com `user_metadata.role = "admin"` mas sem `app_metadata.role` deve receber resultado de negação de acesso (retorno `false` do guard)
- Adicionar caso de teste explícito: usuário com `app_metadata.role = "admin"` deve receber resultado de permissão (retorno `true` do guard)
- Prioridade: **Alta** | História: US-01, US-02

### RF-SEC-006 — Registrar o vetor corrigido no changelog de `SPEC-20260521-004`

- `SPEC-20260521-004` está com `status: approved` — não pode ser editada in-place com mudança de requisito
- Esta spec (SPEC-20260731-006) substitui o RF-09 de `SPEC-20260521-004` quanto ao mecanismo de identificação de role admin
- `SPEC-20260521-004` deve receber uma entrada de changelog no rodapé, registrando que RF-09 foi corrigido por esta spec
- `SPEC-20260521-004` **não** muda de status — o restante dela continua válido
- Prioridade: **Média** | História: —

## Critérios de Aceite

- [ ] `RolesGuard` lê `app_metadata.role` — nunca mais `user_metadata.role` — para decisão de autorização
- [ ] Usuário sem `app_metadata.role = "admin"` mas com `user_metadata.role = "admin"` setado recebe HTTP 403 em todas as rotas `/admin/*` (critério de fechamento da vulnerabilidade)
- [ ] Administrador legítimo (com `app_metadata.role = "admin"`) acessa `GET /admin/users`, `GET /admin/audit-logs` e `DELETE /admin/users/:id` normalmente após a migração
- [ ] `JwtPayload` declara `app_metadata?: { role?: string }` — compilação TypeScript não emite erro na leitura do campo
- [ ] `roles.guard.spec.ts` cobre os dois cenários: `app_metadata.role = "admin"` (permite) e ausência de `app_metadata.role` mesmo com `user_metadata.role = "admin"` (nega)
- [ ] Migração operacional de contas admin existentes concluída **antes** do deploy — confirmada no Supabase Dashboard
- [ ] Audit log registra a operação de migração como ação administrativa (aplica C2 — toda mutação sensível é auditada)

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Segurança | Nenhum usuário não-admin pode acessar `/admin/*` via manipulação de `user_metadata` — 100% das requests sem `app_metadata.role = "admin"` devem retornar 403 |
| RNF-02 | Retrocompatibilidade | Nenhuma outra funcionalidade que consuma `user_metadata` (ex: display de nome, avatar) deve ser quebrada pela mudança |
| RNF-03 | Zero downtime de admin | Admin legítimo não pode perder acesso durante a janela de deploy — a migração operacional (RF-SEC-004) é pré-requisito do deploy |

## Fora de Escopo

- Não inclui: mudança no mecanismo de autenticação (JWT/Supabase Auth) — só a autorização post-auth muda.
- Não inclui: implementação de script automatizado de migração de dados — a migração é pontual e manual (RF-SEC-004).
- Não inclui: criação de endpoint de admin para gerenciar roles de outros usuários — fora do escopo desta correção.
- Não inclui: alteração de RLS ou policies de banco de dados — a vulnerabilidade é exclusivamente no guard NestJS.
- Não inclui: anonimização de PII em audit logs — assunto da spec dedicada futura referenciada em memória do projeto.

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec (corrige) | [SPEC-20260521-004](../admin/SPEC-20260521-004.md) | RF-09 — decisão de implementação que adotou `user_metadata.role`; o comportamento descrito ali para o `RolesGuard` é substituído por esta spec |
| Segurança | S12 (esta spec) | Regra de segurança criada para formalizar a proibição de `user_metadata` como fonte de autorização |
| Compliance | C2 | Mutação de `app_metadata` de contas admin é operação sensível — deve ser auditada via `AuditService` |
| Serviço externo | Supabase Auth (GoTrue) | `app_metadata` é gravável apenas via `auth.admin.updateUserById()` com service role key — confirmar na documentação do Supabase que esse comportamento não muda com atualizações do GoTrue |

## Notas Técnicas

**Por que `app_metadata` e não `user_metadata`:**
O Supabase Auth distingue dois campos de dados customizados no registro de usuário:
- `user_metadata`: gravável pelo próprio usuário autenticado via `supabase.auth.updateUser()` com o access token comum. Projetado para preferências e dados de perfil controlados pelo usuário.
- `app_metadata`: gravável apenas via API administrativa (`supabase.auth.admin.updateUserById()`) com a `SUPABASE_SERVICE_ROLE_KEY`. Projetado explicitamente para dados de autorização que o usuário não deve controlar.

A documentação oficial do Supabase recomenda `app_metadata` para roles e permissões. A adoção de `user_metadata` no RF-09 de `SPEC-20260521-004` foi uma decisão de implementação que não avaliou esse vetor.

**Impacto nos claims do JWT:**
Tanto `user_metadata` quanto `app_metadata` são incluídos no JWT emitido pelo Supabase. A chamada `this.supabaseAdmin.auth.getUser(token)` retorna ambos os campos no objeto `data.user`. A mudança é cirúrgica: apenas qual campo é lido para decisão de autorização.

**Decisão sobre `user_metadata` no payload:**
Antes de remover `user_metadata` do objeto `request.user`, verificar no código se algum consumidor (ex: endpoint que retorna dados de perfil, log de auditoria) acessa `request.user.user_metadata` para finalidade não relacionada a autorização. Se existir, manter ambos os campos no payload — remoção desnecessária pode quebrar funcionalidade não relacionada a esta correção.

**Ordem das operações no deploy:**
1. Migrar contas admin existentes para `app_metadata.role = "admin"` no Supabase Dashboard (RF-SEC-004)
2. Fazer deploy do código alterado (RF-SEC-001, 002, 003)
3. Validar que o admin legítimo ainda acessa `/admin/*` corretamente
4. Executar caso de teste manual do critério de fechamento da vulnerabilidade (usuário com `user_metadata.role = "admin"` e sem `app_metadata.role` → 403)

**Sobre `SPEC-20260521-004`:**
A mudança nesta spec é classificada como **mudança estrutural** (reverte um requisito aprovado — RF-09). Por isso, esta spec nova (SPEC-20260731-006) é criada em vez de editar a spec original in-place. A `SPEC-20260521-004` permanece com `status: approved` e recebe apenas uma entrada de changelog no rodapé apontando para esta spec — não muda de status, pois o restante de seu conteúdo continua válido.

## Changelog (pós-aprovação)

> Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-31 | Status alterado de `draft` para `approved`; implementação concluída (RF-SEC-001, 002, 003, 005, 006) | Aprovação de Douglas; RF-SEC-004 (migração manual das contas admin) segue pendente de execução operacional antes do deploy |

---

> **Nota de rastreabilidade:** entrada correspondente criada em `matrices/rastreabilidade.md` (seção `SPEC-20260731-006`), conforme gate de sincronia do projeto (Nível 2). RF-SEC-004 (migração manual das contas admin existentes) permanece pendente de execução operacional por Douglas — código, testes e demais requisitos já implementados.
