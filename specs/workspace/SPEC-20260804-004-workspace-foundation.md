---
id: SPEC-20260804-004
title: "Fundação de Workspace — Owner, Membros, Convite e Atribuição de Veículo"
status: approved
date: 2026-08-04
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-WS-01, R-WS-02, R-WS-03, R-WS-04, R-WS-05]
security: [S1, S2, S12]
camadas: [backend, frontend, database, security]
---

# Fundação de Workspace — Owner, Membros, Convite e Atribuição de Veículo

## Contexto

`SPEC-20260620-001` (Business Strategy Stories, status `draft`) prevê os roles `workspace_owner`
e `workspace_member` para o plano Frota (BS-ACL-06, BS-ACL-07), mas nenhuma tabela, role, fluxo
de convite ou RLS multi-tenant existe hoje no código — `workspace` não aparece em nenhuma
migration nem em `apps/api/src`.

`SPEC-20260804-003` (Configurações da Frota — campos obrigatórios de motorista, checklist de
onboarding, alerta de CNH vencendo, painel de conformidade) depende diretamente da existência
desses roles e de um mecanismo de convite/membership. Esta spec implementa a fundação mínima
necessária, sem depender de billing (não há Stripe/assinatura implementados no navestory hoje)
e sem depender de infraestrutura de e-mail própria (bloqueada até a Fase 9 — ver decisão
registrada para alertas de manutenção por e-mail).

## Objetivo

Permitir que qualquer usuário autenticado crie um workspace e se torne `workspace_owner`,
convide motoristas por link (sem e-mail), que os convidados aceitem e se tornem
`workspace_member`, e que o owner atribua veículos próprios aos membros — com RLS garantindo
que cada membro só veja o que lhe foi atribuído.

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Usuário cria um workspace e se torna owner

**Como** usuário autenticado, **quero** criar um workspace, **para** começar a gerenciar uma
equipe de motoristas no plano Frota.

- **Dado que** sou um usuário autenticado sem workspace, **quando** crio um workspace com um
  nome, **então** o sistema cria o registro, define meu `app_metadata.role` como
  `workspace_owner` e registra `WORKSPACE_CREATED` em `audit_logs`.
- **Dado que** já sou `workspace_owner` de um workspace, **quando** tento criar um segundo
  workspace, **então** o sistema recusa com HTTP 409 (R-WS-01).

### US-02 — Owner convida um motorista por link

**Como** workspace_owner, **quero** gerar um link de convite para um motorista, **para**
adicioná-lo ao meu workspace sem depender de envio de e-mail pelo sistema.

- **Dado que** sou workspace_owner, **quando** informo o e-mail de um motorista e solicito um
  convite, **então** o sistema cria um `workspace_invites` com token único, válido por 7 dias, e
  retorna o link para eu copiar e enviar manualmente (R-WS-02).
- **Dado que** um convite já foi aceito ou expirou, **quando** alguém tenta usar o link,
  **então** o sistema recusa com mensagem apropriada, sem revelar se o e-mail já tem conta
  (anti-enumeração, mesmo padrão do fluxo de recuperação de senha).

### US-03 — Convidado aceita o convite e se torna member

**Como** usuário convidado, **quero** aceitar um convite de workspace, **para** passar a fazer
parte da equipe e ver os veículos atribuídos a mim.

- **Dado que** estou autenticado e acesso um link de convite válido, **quando** confirmo o
  aceite, **então** o sistema cria meu registro em `workspace_members`, define meu
  `app_metadata.role` como `workspace_member` e registra `WORKSPACE_MEMBER_JOINED`.
- **Dado que** já pertenço a outro workspace (como owner ou member), **quando** tento aceitar um
  convite, **então** o sistema recusa com HTTP 409 (R-WS-03).
- **Dado que** não estou autenticado, **quando** acesso o link de convite, **então** sou
  redirecionado para login/cadastro e retorno ao convite após autenticar.

### US-04 — Owner atribui veículo a um membro

**Como** workspace_owner, **quero** atribuir um dos meus veículos a um motorista da equipe,
**para** que ele veja e opere aquele veículo no sistema.

- **Dado que** sou workspace_owner e tenho um veículo próprio e um membro ativo no workspace,
  **quando** atribuo o veículo ao membro, **então** o sistema cria/atualiza
  `workspace_vehicle_assignments` e o membro passa a ver aquele veículo em `/vehicles`.
- **Dado que** um veículo não pertence a mim (não sou o `user_id` dono), **quando** tento
  atribuí-lo, **então** o sistema recusa com HTTP 403.
- **Dado que** sou workspace_member, **quando** consulto minha lista de veículos, **então** vejo
  apenas os veículos explicitamente atribuídos a mim — nunca outros veículos do mesmo workspace
  (R-WS-04).

### US-05 — Owner remove um membro

**Como** workspace_owner, **quero** remover um motorista do meu workspace, **para** revogar seu
acesso quando ele deixa a equipe.

- **Dado que** sou workspace_owner, **quando** removo um membro, **então** seu
  `app_metadata.role` é revogado, ele perde acesso a veículos atribuídos, mas o histórico de
  `workspace_member_profiles` e `workspace_vehicle_assignments` é preservado para auditoria, sem
  cascade delete (R-WS-05).

## Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | `POST /workspaces` cria um workspace, torna o criador `workspace_owner` (via service dedicado com SERVICE_ROLE_KEY, escrevendo `app_metadata.role`); recusa com 409 se o usuário já for owner de outro workspace | Alta |
| RF-02 | `GET /workspaces/me` retorna o workspace do usuário autenticado (como owner ou member), ou 404 se não pertencer a nenhum | Alta |
| RF-03 | `POST /workspaces/:id/invites` (`@Roles("workspace_owner")`, ownership via RLS) cria convite com token único, válido 7 dias; retorna a URL de convite completa | Alta |
| RF-04 | `GET /workspaces/invites/:token` retorna dados públicos do convite (nome do workspace, e-mail convidado, status) para renderizar a tela de aceite, sem expor dados sensíveis do workspace | Média |
| RF-05 | `POST /workspaces/invites/:token/accept` (autenticado) valida token não expirado/não usado, cria `workspace_members`, marca convite `accepted`, define `app_metadata.role = workspace_member`; recusa com 409 se usuário já pertence a outro workspace | Alta |
| RF-06 | `GET /workspaces/:id/members` (`@Roles("workspace_owner")`) lista membros ativos com nome/e-mail/data de entrada | Alta |
| RF-07 | `DELETE /workspaces/:id/members/:memberId` (`@Roles("workspace_owner")`) marca `removed_at`, revoga `app_metadata.role` do membro removido, registra `WORKSPACE_MEMBER_REMOVED` | Alta |
| RF-08 | `PUT /workspaces/:id/vehicles/:vehicleId/assign` (`@Roles("workspace_owner")`) valida que o veículo pertence ao owner, cria/atualiza atribuição a um membro ativo | Alta |
| RF-09 | `DELETE /workspaces/:id/vehicles/:vehicleId/assign` (`@Roles("workspace_owner")`) remove a atribuição | Média |
| RF-10 | RLS de `vehicles` estendida: `workspace_member` vê veículos próprios (nenhum, no caso do member puro) **ou** explicitamente atribuídos via `workspace_vehicle_assignments` | Alta |
| RF-11 | Toda mutação (criar workspace, convidar, aceitar, remover membro, atribuir/desatribuir veículo) registra em `audit_logs` (C2) | Alta |
| RF-12 | Frontend: rota `/workspace` protegida por middleware + layout server-side para roles `workspace_owner`/`workspace_member`, seguindo o padrão de `apps/web/src/app/admin/` | Alta |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Autorização | Endpoints de gestão (`invites`, `members`, `assign`) exigem `@Roles("workspace_owner")` + RLS garantindo que o owner só gerencia o próprio workspace (S1, S12) |
| RNF-02 | Isolamento multi-tenant | RLS garante que dados de um workspace nunca vazam para outro; testado manualmente com 2 workspaces distintos (S2) |
| RNF-03 | Anti-enumeração | Endpoints de convite não revelam se um e-mail já possui conta no navestory |
| RNF-04 | Sem infraestrutura de e-mail nova | Convite é 100% link/token; nenhuma integração de provedor de e-mail é introduzida nesta spec |

## Fora de Escopo

- Gate de plano pago / cobrança (billing não existe no navestory hoje) — criação de workspace fica aberta a qualquer usuário autenticado (R-WS-01), lacuna documentada
- Múltiplos workspaces por usuário (owner ou member)
- Convite por e-mail automático (bloqueado até Fase 9)
- Feature flags/overrides administrativos (BS-ADM-*)
- Visibilidade de despesas do member sobre veículos atribuídos (fora do escopo desta spec — só visibilidade do veículo em si)
- Onboarding wizard geral (BS-ONB-*)

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260620-001 | Origem conceitual dos roles `workspace_owner`/`workspace_member` (BS-ACL-06, BS-ACL-07), status draft — esta spec implementa um subconjunto técnico independente do restante (monetização, feature flags) |
| Spec | SPEC-20260804-003 | Depende desta fundação para existir (Configurações da Frota) |
| Regra | S12 | Leitura de role via `app_metadata`, nunca `user_metadata` |
| Regra | C2 | Audit log obrigatório em toda mutação |
| Padrão | `AdminSupabaseService` | Modelo para o service dedicado que escreve `app_metadata.role` via SERVICE_ROLE_KEY |
| Padrão | `vehicle_group_members_owner` (RLS) | Modelo de policy de "ownership indireto via tabela pai" para `workspace_members`/`workspace_vehicle_assignments` |

## Notas Técnicas

### Por que sem gate de plano pago

O navestory não tem billing implementado (sem Stripe, sem tabela de assinatura). Gatear a
criação de workspace por "plano Frota pago" exigiria construir toda a camada de monetização
primeiro — fora de escopo. Documentado como lacuna conhecida (R-WS-01): quando o billing
existir, uma spec nova adiciona o gate sem alterar o modelo de dados do workspace.

### Convite por link, não por e-mail

Mesma decisão já registrada em `SPEC-20260804-003` para alertas de CNH: não existe
infraestrutura de e-mail própria no navestory (só o fluxo nativo do Supabase Auth para
recuperação de senha), e alertas por e-mail estão bloqueados até a Fase 9 (domínio próprio
vinculado à monetização). O convite de workspace segue a mesma lógica: o owner recebe um link
com token e o compartilha por fora do produto (WhatsApp, etc.).

### Escrita de `app_metadata.role`

Segue exatamente o padrão de `AdminSupabaseService`: um service dedicado e isolado dentro do
módulo `workspaces`, usando o client `SERVICE_ROLE_KEY`, chamando
`auth.admin.updateUserById(userId, { app_metadata: { role } })`. Nunca reexportado para fora do
módulo. Necessário porque `app_metadata` não é editável via client user-scoped nem via SQL direto
em `auth.users` (API administrativa é o único caminho suportado).

### Schema novo

- `workspaces` (id, owner_id → profiles, name, created_at, updated_at)
- `workspace_invites` (id, workspace_id, email, token único, status, invited_by, created_at, expires_at, accepted_at, accepted_by)
- `workspace_members` (id, workspace_id, user_id, invite_id, joined_at, removed_at)
- `workspace_vehicle_assignments` (vehicle_id pk, workspace_id, member_id → workspace_members, assigned_at, assigned_by)

Nenhuma FK força cascade delete de `workspace_vehicle_assignments`/histórico ao remover membro —
apenas `removed_at` é setado (R-WS-05).

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-08-04 | Migration `20260804220000_workspace_rls_recursion_fix.sql` — reescreve as policies de RLS de `workspaces`, `workspace_members`, `workspace_invites`, `workspace_vehicle_assignments`, `workspace_driver_settings`, `workspace_member_profiles` e a extensão de `vehicles_select_own` para usar funções `security definer` em vez de EXISTS cruzado entre `workspaces` e `workspace_members`. | Teste manual em 2026-08-04 revelou `infinite recursion detected in policy for relation "workspaces"` — o Postgres detecta o ciclo entre a policy de leitura de `workspaces` (que consulta `workspace_members`) e a policy de gestão de `workspace_members` (que consulta `workspaces` de volta), e bloqueia qualquer SELECT/INSERT nas duas tabelas. Correção pelo padrão recomendado pelo Supabase para esse caso, sem alterar o modelo de dados nem a semântica de autorização descrita nesta spec. |
| 2026-08-04 | Teste ponta a ponta do ciclo completo owner+member via API (2º usuário real criado e removido na sessão) encontrou e corrigiu 3 bugs: (1) `apps/api/src/modules/vehicles/vehicles.service.ts#findAll/findOne` filtrava `.eq("user_id", userId)`, sobrepondo a RLS de RF-10 e escondendo do `workspace_member` os veículos atribuídos a ele — filtro removido, a RLS já decide a visibilidade; (2) `workspace-admin-supabase.service.ts#setRole` enviava `role: role ?? undefined`, e como `JSON.stringify` descarta chaves `undefined`, a chamada de revogação (RF-07) nunca de fato limpava `app_metadata.role` no Supabase — corrigido para enviar `null` explicitamente; (3) migration `20260804230000_workspace_members_allow_rejoin.sql` remove a constraint `unique(workspace_id, user_id)` de `workspace_members` (criada em `20260804210000`), que colidia com a própria linha histórica do usuário (soft delete via `removed_at`, R-WS-05) e quebrava reconvite ao mesmo workspace com HTTP 500 — a regra de negócio real (R-WS-03) já é garantida pelo índice único parcial `workspace_members_user_active_unique`. | Nenhum dos 3 bugs era coberto por teste automatizado (TEST_DECISIONS: workspace dispensado de testes); só apareceram ao percorrer o fluxo completo com dois usuários reais em vez de inspecionar o código isoladamente. |
