---
id: SPEC-20260731-008
title: "Painel de Administração — Gestão de Roles e Interface Web"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [C1, C2]
security: [S3, S12, S14]
camadas: [backend, frontend, security]
---

# SPEC-20260731-008: Painel de Administração — Gestão de Roles e Interface Web

**Status:** Approved
**Criada em:** 2026-07-31
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

O módulo `admin` do backend (`apps/api/src/modules/admin/`) expõe três endpoints funcionais e aprovados em [`SPEC-20260521-004`](SPEC-20260521-004.md):

- `GET /admin/users` — lista paginada de usuários
- `GET /admin/audit-logs` — lista paginada de audit logs com filtros
- `DELETE /admin/users/:id` — exclusão imediata de conta (LGPD compliance)

Ambos os leitores de referência desta spec devem entender o estado atual:

1. **Endpoint de gestão de roles inexistente.** A SPEC-20260521-004 marcou explicitamente "Gestão de roles via UI" como fora de escopo (Fase 2). A SPEC-20260731-006 também anotou "criação de endpoint de admin para gerenciar roles de outros usuários" como fora de seu escopo. Esta spec implementa esse requisito postergado.

2. **Ausência total de interface web admin.** Não existe nenhuma rota `/admin` em `apps/web` hoje. Toda interação com o módulo admin ocorre via ferramentas externas (Insomnia, curl). O acesso a dados de usuários e audit logs é impraticável para qualquer operação de suporte ou compliance sem interface dedicada.

3. **Mecanismo de role corrigido.** A SPEC-20260731-006 eliminou a vulnerabilidade de escalação de privilégio via `user_metadata`. O `RolesGuard` já lê `app_metadata.role` (S12). Novas contas admin são criadas com `app_metadata.role: "admin"` desde o início. O endpoint de gestão de roles desta spec deve usar o mesmo `AdminSupabaseService` (service role key — S3) para gravar `app_metadata`, garantindo que o campo seja imutável por usuários comuns.

Esta spec implementa o escopo postergado da Fase 2 da SPEC-20260521-004: endpoint de gestão de roles e interface web básica de administração.

---

## Objetivo

1. Criar o endpoint `PATCH /admin/users/:id/role` para promoção e rebaixamento de roles de admin, com auditoria obrigatória e bloqueio de auto-rebaixamento.
2. Criar a interface web de administração em `apps/web` (rota `/admin`), cobrindo visualização de usuários, audit logs, exclusão de conta e gestão de roles — consumindo os endpoints existentes e o novo.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Admin promove ou rebaixa role de outro usuário

**Como** administrador do sistema, quero poder promover um usuário comum a administrador e rebaixar um administrador a usuário comum, para gerenciar quem tem acesso às operações sensíveis do painel admin.

- **Dado que** sou um administrador autenticado e acesso a tela de gestão de usuários, **quando** clico em "Promover a admin" ao lado de um usuário comum, **então** o sistema chama `PATCH /admin/users/:id/role` com `{ role: "admin" }`, atualiza `app_metadata.role` via `AdminSupabaseService`, registra a ação no `audit_logs` (action: `ADMIN_ROLE_GRANTED`) e exibe confirmação visual na UI.

- **Dado que** sou um administrador autenticado e acesso a tela de gestão de usuários, **quando** clico em "Revogar admin" ao lado de outro administrador, **então** o sistema chama `PATCH /admin/users/:id/role` com `{ role: null }`, remove `app_metadata.role` via `AdminSupabaseService`, registra a ação no `audit_logs` (action: `ADMIN_ROLE_REVOKED`) e exibe confirmação visual na UI.

- **Dado que** sou um administrador e visualizo a tabela de usuários, **quando** a operação de alteração de role conclui com sucesso, **então** o status do usuário na tabela é atualizado imediatamente (revalidação da listagem) sem exigir reload manual da página.

### US-02 — Admin não consegue rebaixar o próprio role

**Como** administrador do sistema, quero que o sistema me impeça de revogar acidentalmente meu próprio role de admin, para não me trancar fora do painel sem poder recuperar o acesso.

- **Dado que** sou um administrador autenticado, **quando** tento chamar `PATCH /admin/users/:id/role` com `{ role: null }` usando meu próprio `id` como parâmetro, **então** o backend retorna HTTP 422 com mensagem: `"Admin não pode revogar o próprio role"` — a operação é rejeitada sem alterar `app_metadata`, sem registrar audit log.

- **Dado que** sou um administrador autenticado e visualizo a tabela de usuários na interface web, **quando** meu próprio usuário aparece na lista com role de admin, **então** o botão "Revogar admin" ao lado do meu usuário está desabilitado visualmente e exibe tooltip: "Não é possível revogar o próprio role de admin".

### US-03 — Admin visualiza lista paginada de usuários

**Como** administrador do sistema, quero ver uma tabela paginada de todos os usuários cadastrados, para consultar o status de contas e realizar operações como excluir ou gerenciar roles.

- **Dado que** sou um administrador autenticado e acesso `/admin`, **quando** a página carrega, **então** a tabela de usuários exibe: email, nome, role atual (`app_metadata.role` ou "Usuário"), status da conta (`deleted_at` — ativo/pendente de exclusão), data de cadastro; paginada com máximo 20 por página (P1).

- **Dado que** sou um administrador autenticado na tabela de usuários, **quando** navego para a próxima página, **então** a tabela carrega os próximos 20 usuários via `GET /admin/users?page=N&limit=20` e preserva o estado da paginação na URL (query param `page`).

### US-04 — Admin visualiza audit logs com filtros

**Como** administrador do sistema, quero visualizar os audit logs com capacidade de filtrar por usuário e período, para investigar incidentes e operações sensíveis.

- **Dado que** sou um administrador autenticado e acesso a aba de audit logs em `/admin`, **quando** a página carrega sem filtros ativos, **então** a tabela exibe os logs mais recentes (ordem decrescente por `created_at`), com colunas: ação (`action`), tabela afetada (`table_name`), ID do registro (`record_id`), email do usuário que executou, e timestamp.

- **Dado que** sou um administrador autenticado e digito um `user_id` no campo de filtro ou seleciono um intervalo de datas, **quando** submeto os filtros, **então** a tabela recarrega os logs filtrados via `GET /admin/audit-logs?user_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD` e a URL reflete os filtros ativos.

### US-05 — Admin exclui conta de usuário com confirmação explícita

**Como** administrador do sistema, quero poder excluir permanentemente a conta de qualquer usuário (LGPD compliance), com uma etapa de confirmação antes da ação ser executada.

- **Dado que** sou um administrador autenticado e visualizo a tabela de usuários, **quando** clico no botão "Excluir conta" ao lado de um usuário, **então** um modal de confirmação é exibido com o email do usuário e o texto: "Esta ação é irreversível e exclui permanentemente todos os dados do usuário. Confirmar?" com botões "Cancelar" e "Confirmar exclusão".

- **Dado que** o modal de confirmação de exclusão está aberto, **quando** clico em "Confirmar exclusão", **então** o sistema chama `DELETE /admin/users/:id`, recebe HTTP 204, fecha o modal, remove a linha do usuário da tabela e exibe toast de sucesso.

- **Dado que** o modal de confirmação de exclusão está aberto, **quando** clico em "Cancelar" ou pressiono `Esc`, **então** o modal fecha sem executar nenhuma ação e o estado da tabela não muda.

---

## Requisitos Funcionais

### Backend

| ID    | Requisito                                                                                                                                                                                                                                                                                                                   | Prioridade |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-01 | `PATCH /admin/users/:id/role` — endpoint novo protegido por `@UseGuards(SupabaseAuthGuard, RolesGuard)` + `@Roles("admin")`, idêntico aos demais endpoints do `AdminController`                                                                                                                                             | Alta       |
| RF-02 | Body do `PATCH /admin/users/:id/role`: `{ role: "admin" \| null }` — validado por schema Zod; qualquer valor fora desse domínio retorna 400                                                                                                                                                                                 | Alta       |
| RF-03 | O endpoint chama `AdminSupabaseService.client.auth.admin.updateUserById(userId, { app_metadata: { role: role \| undefined } })` para gravar em `app_metadata` (campo gravável apenas com service role key — S3, S12)                                                                                                        | Alta       |
| RF-04 | Bloqueio de auto-rebaixamento: se `params.id === req.user.sub` e `body.role === null`, retornar HTTP 422 com `{ error: "Admin não pode revogar o próprio role" }` — sem alterar banco, sem audit log (S14)                                                                                                                  | Alta       |
| RF-05 | Auditoria obrigatória: toda alteração de role concluída com sucesso registra em `audit_logs` via `AuditService`: `action = "ADMIN_ROLE_GRANTED"` (promoção) ou `action = "ADMIN_ROLE_REVOKED"` (rebaixamento), `table_name = "auth.users"`, `record_id = userId`, `changes = { role_before, role_after }` — aplica C2 e S14 | Alta       |
| RF-06 | Se o usuário alvo não existir no Supabase Auth, o endpoint retorna HTTP 404                                                                                                                                                                                                                                                 | Média      |
| RF-07 | Auto-promoção (admin promove a si mesmo para admin novamente) é idempotente — sem erro, sem audit log redundante quando o role já é o mesmo antes e depois                                                                                                                                                                  | Baixa      |

### Frontend

| ID    | Requisito                                                                                                                                                                                                                                | Prioridade |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF-08 | Rota `/admin` em `apps/web` — layout dedicado (sem sidebar de usuário comum); acessível exclusivamente por usuários com `app_metadata.role === "admin"`                                                                                  | Alta       |
| RF-09 | Proteção de rota no frontend: middleware ou layout server-side verifica `app_metadata.role` do usuário autenticado via Supabase Auth client e redireciona para `/403` se não for admin; segurança real permanece no backend (RolesGuard) | Alta       |
| RF-10 | Tabela de usuários paginada consumindo `GET /admin/users`; colunas: email, nome, role, status da conta, data de cadastro; botões de ação: "Promover a admin" / "Revogar admin" / "Excluir conta"                                         | Alta       |
| RF-11 | Botão "Revogar admin" do próprio usuário autenticado exibido como desabilitado com tooltip explicativo (S14 — prevenção de lockout de UI)                                                                                                | Alta       |
| RF-12 | Tabela de audit logs paginada consumindo `GET /admin/audit-logs`; colunas: ação, tabela, ID do registro, usuário executor, timestamp; filtros: `user_id` (input de texto) e período (`from`/`to`, date pickers)                          | Alta       |
| RF-13 | Modal de confirmação de exclusão de conta (`Dialog` de `@navestory/ui` — não existe `AlertDialog` no pacote; mesmo padrão de `DeleteAccountDialog`) com email do usuário no texto de confirmação, conforme US-05                         | Alta       |
| RF-14 | Ação de alteração de role usa loading state no botão durante a chamada; exibe toast de sucesso ou erro ao concluir; revalida a tabela de usuários após sucesso                                                                           | Média      |
| RF-15 | Estados de carregamento das tabelas usam `Skeleton` de `@navestory/ui` (R-DS-10)                                                                                                                                                         | Baixa      |
| RF-16 | Estado vazio das tabelas (nenhum resultado retornado) exibe mensagem textual explicativa em vez de tabela em branco                                                                                                                      | Baixa      |

---

## Requisitos Não-Funcionais

| ID     | Requisito    | Métrica de Aceite                                                                                                                                          |
| ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança    | `PATCH /admin/users/:id/role` retorna 403 para qualquer chamada sem `app_metadata.role = "admin"` — mesma garantia já existente nos demais endpoints admin |
| RNF-02 | Auditoria    | 100% das promoções e rebaixamentos bem-sucedidos têm registro correspondente em `audit_logs` — nenhuma alteração de role ocorre sem rastro                 |
| RNF-03 | Idempotência | Chamar o endpoint duas vezes com o mesmo role não cria dois registros de audit; se o role não mudou, não há audit log (RF-07)                              |
| RNF-04 | Isolamento   | Frontend admin não reutiliza componentes de contexto de frota (FleetAside, VehicleContextChip) — é um layout independente                                  |

---

## Critérios de Aceite

- [x] CA-01: `PATCH /admin/users/:id/role` com `{ role: "admin" }` por admin → HTTP 200; `app_metadata.role = "admin"` setado no Supabase; registro em `audit_logs` com `action = "ADMIN_ROLE_GRANTED"` — coberto por teste unitário (`admin.service.spec.ts`)
- [x] CA-02: `PATCH /admin/users/:id/role` com `{ role: null }` por admin para outro usuário → HTTP 200; `app_metadata.role` removido; registro em `audit_logs` com `action = "ADMIN_ROLE_REVOKED"` — coberto por teste unitário
- [x] CA-03: `PATCH /admin/users/:id/role` com `{ role: null }` por admin para si mesmo → HTTP 422 com `{ error: "Admin não pode revogar o próprio role" }`; sem alteração no banco; sem audit log — coberto por teste unitário (valida S14)
- [x] CA-04: `PATCH /admin/users/:id/role` com token de usuário comum → HTTP 403 — garantido estruturalmente pelo mesmo `RolesGuard`/`@Roles("admin")` já testado em `roles.guard.spec.ts`, aplicado a todo o `AdminController`
- [x] CA-05: `PATCH /admin/users/:id/role` com `id` inexistente → HTTP 404 — coberto por teste unitário
- [ ] CA-06: `/admin` no frontend redireciona usuário sem `app_metadata.role = "admin"` para `/403` sem exibir nenhum dado admin — implementado (middleware + layout); validado por `next build`/typecheck, **verificação manual em browser ainda pendente**
- [ ] CA-07: Tabela de usuários em `/admin` exibe dados paginados; navegação entre páginas funciona e reflete `page` na URL — implementado; verificação manual em browser pendente
- [ ] CA-08: Filtros de audit logs (`user_id`, `from`, `to`) filtram os resultados via query params; URL reflete os filtros ativos — implementado; verificação manual em browser pendente
- [ ] CA-09: Modal de exclusão exibe o email do usuário alvo; "Confirmar exclusão" executa `DELETE /admin/users/:id`; tabela é revalidada após 204 — implementado; verificação manual em browser pendente
- [ ] CA-10: Botão "Revogar admin" do próprio usuário autenticado está desabilitado e exibe tooltip na interface web — implementado; verificação manual em browser pendente

---

## Fora de Escopo

- Não inclui: criação de contas admin diretamente pela UI (contas admin continuam sendo criadas via script com `auth.admin.createUser` + `app_metadata.role: "admin"`)
- Não inclui: visualização ou edição de dados transacionais de um usuário específico (despesas, veículos) — acesso de suporte a dados de usuário individual não faz parte desta fase
- Não inclui: exportação de dados de usuários em CSV/JSON via interface admin
- Não inclui: impersonação de usuário (login como outro usuário para diagnóstico)
- Não inclui: gestão de planos de assinatura ou limites de billing via interface admin
- Não inclui: MFA para operações admin (marcado como Fase 2 em SPEC-20260521-004; continua postergado)
- Não inclui: busca/filtro de usuários por nome ou email na tabela de usuários (paginação simples por enquanto)
- Não inclui: endpoint para listar admins separadamente dos usuários comuns

---

## Dependências

| Tipo            | Referência                                                                        | Descrição                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Spec            | [SPEC-20260521-004](SPEC-20260521-004.md)                                         | Define `AdminSupabaseService`, `AdminController`, `RolesGuard` e `@Roles("admin")` — infraestrutura reutilizada integralmente |
| Spec            | [SPEC-20260731-006](../security/SPEC-20260731-006-correcao-role-user-metadata.md) | Correção do `RolesGuard` para `app_metadata.role`; S12 define o contrato que RF-03 deve seguir                                |
| Regra           | C2                                                                                | Auditoria obrigatória em toda mutação sensível — aplica-se a RF-05                                                            |
| Regra           | S3                                                                                | `SUPABASE_SERVICE_ROLE_KEY` somente no backend; `AdminSupabaseService` é o único ponto de uso                                 |
| Regra           | S12                                                                               | `app_metadata` como única fonte de claims de autorização — RF-03 deve gravar em `app_metadata`, nunca em `user_metadata`      |
| Regra           | S14                                                                               | Bloqueio de auto-rebaixamento e auditoria obrigatória de gestão de role — implementada em RF-04 e RF-05                       |
| Serviço externo | Supabase Auth (GoTrue)                                                            | `auth.admin.updateUserById(userId, { app_metadata })` é a API usada em RF-03; requer `SUPABASE_SERVICE_ROLE_KEY`              |
| Componentes     | `@navestory/ui`                                                                   | `Dialog` (RF-13), `Skeleton` (RF-15), `Button`, `Badge`, `Tooltip` — usar componentes canônicos (R-DS-09, R-DS-10)            |

---

## Notas Técnicas

### Endpoint `PATCH /admin/users/:id/role`

O endpoint usa o mesmo decorator `@UseGuards(SupabaseAuthGuard, RolesGuard)` + `@Roles("admin")` já estabelecido no `AdminController`. O identificador do admin autenticado (`adminUserId`) é obtido via `@UserId()` — mesmo padrão do `deleteUser`.

Para a chamada ao Supabase Admin, `role: null` no body é traduzido como `{ app_metadata: { role: undefined } }` — o Supabase preserva outros campos de `app_metadata` e apenas remove o campo `role`. Não usar `{}` vazio como value de `app_metadata`, pois isso sobrescreve todo o objeto em vez de fazer merge.

Verificar se `body.role === request.user.app_metadata?.role` antes de escrever no Supabase e de registrar audit log — se o role já é o mesmo, não há operação a executar (RF-07).

### Identificação de "mesmo usuário" para S14

Usar `request.user.sub` (subject do JWT, equivale ao `auth.users.id`) para comparar com `params.id`. O campo `sub` já está disponível no payload populado pelo `SupabaseAuthGuard`.

### Proteção de rota no frontend (RF-09)

O `apps/web/middleware.ts` já intercepta navegação de página para rotas autenticadas (S1). Para a rota `/admin`, o middleware (ou um layout server component em `app/admin/layout.tsx`) deve verificar o campo `app_metadata.role` do usuário retornado por `supabase.auth.getUser()` (server-side). Se não for `"admin"`, fazer `redirect("/403")`.

Importante: a proteção client-side é conveniência de UX, não garantia de segurança. O `RolesGuard` no backend rejeita qualquer requisição não-admin com 403, independentemente do que a UI exibir.

### Estratégia de revalidação no frontend

Após promoção, rebaixamento ou exclusão, usar `router.refresh()` do Next.js App Router para revalidar os dados da tabela sem reload completo, ou uma chamada explícita ao `mutate()` se TanStack Query for o mecanismo de fetch (verificar padrão existente nos demais módulos de `apps/web`).

---

## Changelog

- **2026-07-31 — Aprovação e implementação.** Spec aprovada e implementada no mesmo ciclo
  (backend: endpoint `PATCH /admin/users/:id/role`, `AdminSupabaseService.getUserById`/
  `updateUserRole`, enriquecimento de `GET /admin/users` com `name`/`deleted_at` de `profiles`
  para atender RF-10; frontend: rota `/admin`, `/403`, middleware com checagem de role). Correção
  pequena de conteúdo (RF-13, Dependências): a spec original citava `AlertDialog` de `@navestory/ui`,
  componente que não existe no pacote — corrigido para `Dialog` (componente real usado no
  repositório para confirmação destrutiva, mesmo padrão de `DeleteAccountDialog`). Ver
  `matrices/rastreabilidade.md` (seção da spec) e `matrices/impacto.md` (IMPACTO-048) para
  detalhes de código e teste por requisito.
