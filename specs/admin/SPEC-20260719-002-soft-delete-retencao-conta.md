---
id: SPEC-20260719-002
title: "Soft-Delete Real com Retenção de 30 Dias — Exclusão de Conta"
status: approved
date: 2026-07-19
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-BIZ-05, C1]
security: [S3, S9]
camadas: [backend, database]
---

# SPEC-20260719-002: Soft-Delete Real com Retenção de 30 Dias — Exclusão de Conta

**Status:** Approved
**Criada em:** 2026-07-19
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Origem:** Auditoria 2026-07-19, Achado confirmado em código — divergência entre RNF-03 de
[`SPEC-20260521-004`](SPEC-20260521-004.md) e implementação real em
`apps/api/src/modules/users/users.service.ts:72-84`

---

## Contexto

O `RNF-03` de `SPEC-20260521-004` declara: "Exclusão de conta é permanente após 30 dias —
hard delete agendado". A regra `R-BIZ-05` reforça o mesmo período de graça. No entanto, a
implementação atual do método `deleteAccount` em
`apps/api/src/modules/users/users.service.ts:72` chama
`this.supabaseAdmin.auth.admin.deleteUser(userId)` **imediatamente**, o que:

1. Deleta o registro em `auth.users` na hora.
2. O cascade `ON DELETE CASCADE` propaga a deleção para `profiles` e todas as tabelas
   relacionadas em uma única transação.
3. A janela de 30 dias nunca existiu na prática.

Há também o trigger `soft_delete_profile()` em
`supabase/migrations/20260712171941_trigger_functions.sql:82-96`, ativado como
`before_delete_profiles` (`BEFORE DELETE ON profiles`). Ele anonimiza nome e preferências e
define `deleted_at = now()`, mas retorna `OLD` — o que significa que a deleção da linha
**prossegue imediatamente** na mesma transação. O trigger não produz retenção; apenas
executa a anonimização um instante antes da linha desaparecer.

A guard de autenticação em
`apps/api/src/common/guards/supabase-auth.guard.ts:46-50` **já verifica**
`profile.deleted_at !== null` e rejeita autenticação — ou seja, a infraestrutura de bloqueio
de acesso para contas em soft-delete está pronta e não precisa mudar.

O projeto já habilita a extensão `pg_cron` em
`supabase/migrations/20260712171800_extensions_and_enums.sql` — infraestrutura para jobs
agendados via SQL já está disponível, sem dependência externa.

Esta spec implementa o comportamento que `SPEC-20260521-004 RNF-03` sempre pretendeu: o
fluxo `DELETE /users/me` passa a ser um soft-delete real, e um job agendado (`pg_cron`)
executa o hard delete após 30 dias.

### Relação com SPEC-20260521-004

Esta spec **não depreca** `SPEC-20260521-004` — o restante dela (admin role, audit logs,
`AdminSupabaseService`, endpoints `/admin/*`, guards) continua válido e aprovado. O que esta
spec faz é detalhar e corrigir o fluxo do `RF-01`/`RF-02`/`RF-03` e implementar o
`RNF-03` que na época ficou declarado como "Fase 2" (ver "Fora de Escopo" da spec original).
O changelog de `SPEC-20260521-004` registra esta ligação.

### Relação com SPEC-20260719-001 (UI de Exclusão de Conta)

A spec de UI (`SPEC-20260719-001`) já pressupõe soft-delete real: menciona banner de "conta
marcada para exclusão" (US-04/RF-11), mensagem de 30 dias ao usuário (US-02/US-03) e
verifica `profiles.deleted_at IS NOT NULL` no Server Component. A implementação definida
aqui é o pré-requisito backend para que aquela spec transite de `draft` para `approved`.

---

## Objetivo

1. Fazer com que `DELETE /users/me` realize um **soft-delete real**: define
   `profiles.deleted_at = now()` sem anonimizar dados imediatamente e registra audit log —
   sem chamar `auth.admin.deleteUser`. A anonimização de `name` e `preferences` é **removida
   do fluxo de soft-delete** (ver "Notas Técnicas — Decisão: anonimização movida para o
   hard-delete").
2. Garantir bloqueio de acesso imediato após o soft-delete (sem deletar `auth.users`) via o
   guard de autenticação (RF-09) — não há revogação explícita de sessão via GoTrue Admin API,
   que não suporta essa operação por `userId` (ver "Notas Técnicas — signOut vs deleteUser").
3. Criar um job agendado via `pg_cron` e uma function SQL dedicada que executa o hard delete
   de contas cujo `deleted_at` ultrapassou 30 dias.
4. Remover o trigger `before_delete_profiles` (`soft_delete_profile()` `BEFORE DELETE ON
   profiles`), cujo propósito fica incorporado pelo fluxo do service.
5. Decidir e documentar o comportamento do endpoint de admin (`DELETE /admin/users/:id`) em
   relação à janela de 30 dias.
6. Especificar e implementar o endpoint `POST /users/me/restore` — reversão do soft-delete
   dentro da janela de 30 dias via autenticação normal (Supabase Auth email/senha), sem
   segundo fator adicional. Com restore real disponível, a janela de 30 dias passa a ser uma
   janela de arrependimento funcional para o usuário, não apenas um atraso técnico de hard
   delete.
7. Modificar `SupabaseAuthGuard` para retornar 403 com `code: "ACCOUNT_PENDING_DELETION"` ao
   detectar conta soft-deleted — distinguindo esse estado de token inválido genérico (401),
   de modo que o frontend possa renderizar a tela de restore em vez de um erro de login comum.
8. Especificar o comportamento do Supabase Storage durante a janela de 30 dias e a limitação
   do job de hard-delete em relação à limpeza de arquivos físicos.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Solicitar exclusão da própria conta

**Como** usuário autenticado do Nave, **quero** que minha solicitação de exclusão de conta
seja registrada e meus dados pessoais anonimizados imediatamente, **para** que eu tenha
controle sobre minha privacidade desde o momento da solicitação, com a exclusão definitiva
ocorrendo após 30 dias.

- **Dado que** envio `DELETE /users/me` com body `{ "confirm": true }` e token JWT válido,
  **quando** o endpoint processa a requisição com sucesso, **então** recebo 204 No Content,
  meu perfil em `profiles` tem `deleted_at` preenchido com o timestamp atual (campos `name`
  e `preferences` permanecem intactos até o hard-delete final — ver "Notas Técnicas —
  Decisão: anonimização movida para o hard-delete"), e meu registro em `auth.users` continua
  existindo.
- **Dado que** o soft-delete foi executado com sucesso, **quando** uso um token JWT ainda
  válido do Supabase para qualquer rota protegida do Nave, **então** recebo 403 com body
  `{ code: "ACCOUNT_PENDING_DELETION" }` (o guard detecta `deleted_at != null` e retorna
  403 em vez de 401 genérico — ver RF-09). Ao fazer login novamente no Supabase Auth com
  email/senha, a autenticação Supabase é bem-sucedida (Supabase Auth não conhece `deleted_at`),
  mas qualquer chamada à API do Nave retorna o mesmo 403, permitindo ao frontend exibir a
  tela de restore (SPEC-20260719-001 RF-13).
- **Dado que** envio `DELETE /users/me` sem `{ "confirm": true }` ou com `{ "confirm": false }`,
  **quando** o endpoint recebe a requisição, **então** recebo 400 Bad Request sem alterar
  nenhum dado.
- **Dado que** envio `DELETE /users/me` sem token JWT, **quando** o guard avalia a
  requisição, **então** recebo 401 Unauthorized antes de qualquer lógica de negócio.

### US-02: Ter a conta definitivamente excluída após 30 dias

**Como** sistema (job agendado), **quero** executar hard delete de contas cujo `deleted_at`
ultrapassou 30 dias, **para** que os dados sejam eliminados definitivamente conforme a
política de retenção (R-BIZ-05, C1).

- **Dado que** o job `nave_hard_delete_expired_accounts` é executado diariamente, **quando**
  existem registros em `profiles` com `deleted_at < now() - interval '30 days'`, **então**
  os registros correspondentes em `auth.users` são deletados, cascateando a deleção em
  `profiles` e todas as tabelas relacionadas, e a operação é registrada em `cron.job_run_details`.
- **Dado que** o job é executado e não há registros elegíveis para hard delete, **quando**
  a function é chamada, **então** nenhum DELETE é executado e o job conclui normalmente sem
  erro.
- **Dado que** o job falha por erro de banco (ex: deadlock, timeout), **quando** o erro
  ocorre, **então** o erro é registrado em `cron.job_run_details.status = 'failed'` e o
  job será reexecutado na próxima janela diária (idempotente — contas que não foram deletadas
  por falha ainda atenderão o critério `deleted_at < now() - 30 days` no próximo ciclo).

### US-04: Restaurar conta dentro da janela de 30 dias

**Como** usuário que solicitou exclusão da conta e está arrependido, **quero** poder cancelar
a exclusão fazendo login normalmente e confirmando a restauração, **para** recuperar minha
conta com todos os dados de veículos e despesas intactos.

- **Dado que** minha conta está com `profiles.deleted_at IS NOT NULL` e faço login via
  Supabase Auth com email/senha válidos, **quando** o frontend detecta a resposta 403 com
  `code: "ACCOUNT_PENDING_DELETION"` ao chamar qualquer endpoint do Nave, **então** sou
  direcionado para a tela de restore (SPEC-20260719-001 RF-13/RF-14) em vez de um erro
  genérico.
- **Dado que** estou na tela de restore e confirmo o cancelamento da exclusão, **quando**
  o frontend chama `POST /users/me/restore` com meu JWT válido do Supabase, **então** recebo
  200, `profiles.deleted_at` volta a ser `NULL`, todos os meus dados (veículos, despesas,
  ciclos de odômetro, nome, preferências) permanecem intactos — pois a anonimização não
  ocorreu no soft-delete —, e o audit log registra `ACCOUNT_RESTORED`.
- **Dado que** a restauração é concluída com sucesso, **quando** o frontend me redireciona
  ao dashboard, **então** consigo usar o sistema normalmente como antes.
- **Dado que** já se passaram mais de 30 dias desde o soft-delete (conta hard-deletada),
  **quando** tento fazer login com as mesmas credenciais, **então** o Supabase Auth rejeita
  (registro em `auth.users` foi removido pelo job) — não há restore possível.

### US-03: Admin executa exclusão imediata de conta (por compliance)

**Como** administrador do sistema, **quero** excluir imediatamente a conta de qualquer
usuário via `DELETE /admin/users/:id`, **para** atender pedidos urgentes de compliance/LGPD
que exigem remoção imediata, sem esperar janela de 30 dias.

- **Dado que** envio `DELETE /admin/users/:id` com token JWT de admin válido, **quando** o
  endpoint processa, **então** o hard delete é executado imediatamente via
  `auth.admin.deleteUser`, a cascata remove todos os dados do usuário, e a operação é
  registrada em `audit_logs`.
- **Dado que** envio `DELETE /admin/users/:id` com token de usuário comum (não admin),
  **quando** o guard avalia a requisição, **então** recebo 403 Forbidden.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História |
|----|-----------|------------|----------|
| RF-01 | `deleteAccount` em `UsersService` para de chamar `supabaseAdmin.auth.admin.deleteUser(userId)`. Passa a executar: (a) UPDATE em `profiles`: **apenas** `deleted_at = now()` onde `id = userId` — sem anonimizar `name` ou `preferences` neste momento; os dados pessoais permanecem intactos para que um eventual restore dentro dos 30 dias os recupere completamente (ver "Notas Técnicas — Decisão: anonimização movida para o hard-delete"); (b) registrar audit log com `action = 'ACCOUNT_DELETION_REQUESTED'` (fire-and-forget, aplica R-MON-01). **Correção de implementação (2026-07-20)**: não há chamada de revogação explícita de sessão — a GoTrue Admin API (`@supabase/auth-js` v2.x, conferido em `GoTrueAdminApi.d.ts`) só expõe `signOut(jwt: string, scope?)`, que recebe o **JWT da sessão**, não um `userId`; não existe método para invalidar todas as sessões de um usuário por id sem deletá-lo. O bloqueio de acesso continua garantido apenas pelo guard (RF-09), que rejeita toda requisição autenticada assim que `deleted_at != null` — ver "Notas Técnicas — signOut vs deleteUser" | Alta | US-01 |
| RF-02 | Se o UPDATE em `profiles` não afetar nenhuma linha (usuário não existe ou já está soft-deleted), retornar 404 Not Found | Alta | US-01 |
| RF-03 | **Removido (2026-07-20)**: dependia de uma chamada a `signOut` que não existe nessa forma na GoTrue Admin API (ver RF-01). Sem revogação explícita, não há falha de revogação a tratar | Alta | US-01 |
| RF-04 | Criar migration `YYYYMMDDHHMMSS_soft_delete_account_job.sql` com: (a) function PL/pgSQL `public.hard_delete_expired_accounts()` — `SECURITY DEFINER`, `SET search_path = ''`, sem parâmetros, retorna `void`; (b) registro do job `pg_cron` com nome `nave_hard_delete_expired_accounts` e schedule `'0 3 * * *'` (03:00 UTC diário) | Alta | US-02 |
| RF-05 | A function `hard_delete_expired_accounts()` executa: `DELETE FROM auth.users WHERE id IN (SELECT id FROM public.profiles WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days')`. Antes do DELETE, insere N linhas em `public.audit_logs` — uma por conta elegível — com `action = 'ACCOUNT_HARD_DELETED'`, `table_name = 'auth.users'`, `record_id = id`, `user_id = NULL` (conta já não existe para associar), `changes = '{"reason": "30-day retention expired"}'::jsonb | Alta | US-02 |
| RF-06 | A mesma migration da RF-04 dropa o trigger `before_delete_profiles` da tabela `profiles` (`DROP TRIGGER IF EXISTS before_delete_profiles ON public.profiles`). A function `soft_delete_profile()` pode ser mantida ou dropada; como não tem mais trigger associado, não interfere — mas documentar no comentário da migration que ela ficou órfã | Alta | — |
| RF-07 | `DELETE /admin/users/:id` (RF-08 de SPEC-20260521-004) **mantém hard-delete imediato** via `auth.admin.deleteUser`. Justificativa: ação deliberada de admin em contexto de compliance — não exige período de arrependimento. O audit log já registra a operação (RNF-02 de SPEC-20260521-004) | Alta | US-03 |
| RF-08 | `POST /users/me/restore` — endpoint para reverter soft-delete dentro da janela de 30 dias. Implementação: (a) usa `SoftDeletedUserGuard` (RF-10) em vez do `SupabaseAuthGuard` padrão — aceita tokens Supabase válidos mesmo que a conta tenha `deleted_at IS NOT NULL`; (b) verifica que `profiles.deleted_at IS NOT NULL` — se já for `NULL`, retorna 409 Conflict (conta não estava em soft-delete); (c) UPDATE em `profiles`: `deleted_at = NULL` onde `id = userId`; (d) registra audit log `ACCOUNT_RESTORED` (fire-and-forget); (e) retorna 200 com `{ message: "Conta restaurada com sucesso." }`. Não emite novo token — o JWT existente já é válido no Supabase Auth e passa a ser aceito pelo `SupabaseAuthGuard` normal após o restore. Justificativa do mecanismo sem segundo fator (OTP/magic link): o login Supabase Auth (email/senha) já é a prova de posse da credencial; adicionar OTP/magic link exigiria infraestrutura de e-mail transacional que o projeto não tem para nenhum outro fluxo — registrado como "endurecimento futuro possível", não requisito de MVP | Alta | US-04 |
| RF-09 | Modificar `SupabaseAuthGuard` (`apps/api/src/common/guards/supabase-auth.guard.ts`, linha 50): ao detectar `profile.deleted_at !== null`, em vez de `throw new UnauthorizedException("Conta inexistente ou desativada")`, lançar `ForbiddenException` com payload `{ code: "ACCOUNT_PENDING_DELETION", deleted_at: profile.deleted_at, message: "Conta marcada para exclusão. Faça login para restaurá-la." }`. Casos de token ausente, inválido ou expirado continuam resultando em 401. Isso permite que o frontend distinga "conta soft-deleted aguardando restore" (403) de "sessão inválida" (401). **Correção de implementação (2026-07-20)**: o `HttpExceptionFilter` global (`apps/api/src/common/filters/http-exception.filter.ts`, S5) reduzia toda resposta de erro a `{statusCode, message, timestamp}` — `code`/`deleted_at` seriam descartados antes de chegar ao frontend. O filtro foi ajustado para propagar `code`/`deleted_at` via whitelist explícita (não passthrough genérico do payload da exceção), preservando a garantia S5 de nunca vazar stack trace/SQL | Alta | US-04 |
| RF-10 | Criar `SoftDeletedUserGuard` em `apps/api/src/common/guards/` — guard com a mesma lógica de validação de JWT via Supabase Auth do `SupabaseAuthGuard`, mas que aceita contas com `deleted_at IS NOT NULL`. Valida que o token é válido no Supabase (mesma chamada `auth.getUser`), verifica que o perfil existe em `profiles`, e popula `request.user` normalmente — a presença de `deleted_at` não resulta em erro neste guard. Token ausente ou inválido ainda retorna 401. Usado exclusivamente no endpoint `POST /users/me/restore` | Alta | US-04 |
| RF-11 | Durante a janela de 30 dias após o soft-delete, arquivos físicos no Supabase Storage associados à conta (fotos de veículo, documentos) **permanecem intactos**. Não há job de limpeza antecipada de Storage. A remoção dos metadados de arquivo no banco (referências via FK em tabelas como `vehicles`) ocorre apenas pelo cascade do hard-delete em `auth.users` | Alta | — |
| RF-12 | **Limitação MVP — limpeza de Storage no hard-delete**: o job `hard_delete_expired_accounts()` opera exclusivamente via SQL (`pg_cron`) e não consegue chamar a Supabase Storage API para remover objetos físicos dos buckets. Consequência: após o hard-delete, os metadados de arquivo no banco são removidos pelo cascade, mas os **objetos físicos no bucket do Supabase Storage** (imagens, PDFs) podem persistir como órfãos. Solução futura recomendada: Supabase Edge Function de limpeza agendada via `pg_cron` + extensão `pg_net` (`net.http_post`) que chama a Storage API para remover objetos cujos metadados não existem mais no banco. Essa Edge Function está **fora do escopo desta spec** — registrar como dívida técnica em `important/PENDENCIAS-E-PROCESSOS.md` | Média | — |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Atomicidade do soft-delete | O UPDATE em `profiles` é a única operação de escrita do fluxo (sem revogação de sessão explícita, ver RF-01/RF-03). O soft-delete em `profiles` é a fonte de verdade — o guard valida apenas `deleted_at`, não o estado em `auth.users` |
| RNF-02 | Idempotência do job | Executar `hard_delete_expired_accounts()` múltiplas vezes no mesmo dia produz o mesmo resultado: contas já deletadas não existem mais e não causam erro |
| RNF-03 | Janela de retenção exata | Somente contas com `deleted_at < now() - interval '30 days'` são elegíveis para hard delete — nem um segundo antes |
| RNF-04 | Segurança da function | `hard_delete_expired_accounts()` é `SECURITY DEFINER` com `SET search_path = ''` (aplica S9). `EXECUTE` não deve ser concedido ao role `anon` ou `authenticated` — apenas ao `postgres` (pg_cron) |
| RNF-05 | Audit log antes do hard delete | Linhas de `audit_logs` devem ser inseridas **antes** do DELETE (dentro da mesma transação) para garantir rastreabilidade; se o DELETE falhar, o INSERT é revertido junto — correto, pois a conta não foi deletada |
| RNF-06 | Sem PII em audit log de exclusão | `changes` em `audit_logs` para `ACCOUNT_DELETION_REQUESTED` e `ACCOUNT_HARD_DELETED` contém apenas `{"reason": "..."}` — nenhum dado pessoal, aplica R-MON-02 |

---

## Fora de Escopo

- **Segundo fator adicional para restore (OTP, magic link)**: o restore usa login normal
  via Supabase Auth. Adicionar OTP/magic link é registrado como endurecimento futuro possível,
  não requisito de MVP (ver RF-08 — justificativa detalhada).
- **Reativação de conta via admin** (admin restaura conta em período de graça): fora desta
  spec — admin já tem hard-delete imediato via RF-07; um endpoint de restore administrativo
  pode ser especificado em spec futura separada.
- **Limpeza de arquivos físicos no Supabase Storage durante o hard-delete**: limitação de
  MVP documentada em RF-12. Edge Function de limpeza fica fora do escopo desta spec.
- **Envio de e-mail de confirmação de exclusão e/ou alerta antes do hard delete**: depende
  de domínio próprio (pendente, Fase 9, ver `important/PENDENCIAS-E-PROCESSOS.md`).
- **Dashboard administrativo de contas em período de graça**: fora desta spec.
- **Reativação via admin** (admin restaura conta que está em período de graça): fora desta
  spec — admin já tem hard-delete imediato via RF-07; fluxo de reativação depende de RF-08.
- **Alterações no fluxo de UI** (`SPEC-20260719-001`): a UI de exclusão de conta é
  especificada separadamente. Esta spec define apenas o backend e o job.
- **Estratégia de anonimização de dados pessoais (definitiva)**: a decisão vigente nesta spec
  (não anonimizar no soft-delete, deixar para o hard-delete via cascade) é suficiente para o
  MVP do fluxo de restore, mas **não é uma análise completa de classificação de dados**
  pessoais/sensíveis do Nave. Uma spec dedicada e exclusiva sobre anonimização (quais campos
  em quais tabelas são PII, se algum dado deve ser anonimizado em vez de excluído para fins
  estatísticos/históricos, retenção diferenciada por sensibilidade) fica para análise
  futura, fora desta spec.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec aprovada | [SPEC-20260521-004](SPEC-20260521-004.md) | Define AdminSupabaseService, guards de admin, audit logs — esta spec reutiliza toda essa infraestrutura |
| Spec draft | [SPEC-20260719-001](../security/SPEC-20260719-001-exclusao-conta-ui.md) | UI de exclusão de conta — depende desta spec para refletir o soft-delete real no frontend (RF-11, US-04) |
| Banco | `pg_cron` extension | Já habilitada em `supabase/migrations/20260712171800_extensions_and_enums.sql` |
| Banco | `profiles.deleted_at timestamptz` | Coluna já existe no schema (`20260712171830_core_tables.sql`) |
| Banco | `auth.users` | O hard delete via SQL exige `DELETE` em `auth.users` — o role `postgres` (usado pelo `pg_cron` por padrão no Supabase) tem essa permissão como superusuário |
| Guard | `SupabaseAuthGuard` | Já verifica `profile.deleted_at !== null` e rejeita 401 — não requer mudança |
| Regra | `R-BIZ-05` | Período de graça de 30 dias para exclusão de conta |
| Regra | `C1` | LGPD — exclusão completa; esta spec implementa o mecanismo real de C1 |
| Regra | `S9` | Function SECURITY DEFINER com `search_path` fixo — aplicado à `hard_delete_expired_accounts()` |
| Regra | `R-MON-01` | Audit log fire-and-forget — `ACCOUNT_DELETION_REQUESTED` no service |
| Regra | `R-MON-02` | Sem PII em `audit_logs.changes` |
| Regra | `R-MON-03` | `audit_logs.user_id` é `ON DELETE SET NULL` — preservado após hard delete |

---

## Notas Técnicas

### Decisão: anonimização movida para o hard-delete (reversão da decisão original)

**Decisão original (revertida):** a spec rascunhada inicialmente propunha anonimizar `name`
e `preferences` imediatamente no soft-delete, para "privacy by design".

**Decisão vigente:** a anonimização **não ocorre no soft-delete**. `name` e `preferences`
permanecem intactos nos 30 dias. Razões para a reversão:

1. **Restore real muda o equilíbrio do tradeoff**: com RF-08 especificado e implementado, a
   janela de 30 dias é uma janela de arrependimento funcional. Um usuário que se arrepende
   em horas e restaura a conta espera encontrar tudo intacto — nome, preferências,
   veículos, despesas. Anonimizar imediatamente tornaria o restore uma experiência confusa
   ("sua conta foi restaurada, mas você perdeu nome e preferências").
2. **Os dados não estão expostos durante os 30 dias**: o `SupabaseAuthGuard` bloqueia
   qualquer acesso à conta com `deleted_at IS NOT NULL`. A visibilidade dos dados por
   terceiros é zero — a "janela de exposição" que a anonimização imediata pretendia reduzir
   não existe na prática.
3. **LGPD Art. 18 não exige anonimização como passo intermediário**: a lei exige exclusão
   dos dados — o que ocorre definitivamente no hard-delete após 30 dias. A anonimização era
   uma escolha de design, não uma obrigação legal.
4. **Nota sobre PITR**: se Supabase Point-in-Time Recovery (PITR) estiver habilitado no
   projeto, backups criados durante os 30 dias preservarão o `name` original. Para MVP,
   essa é uma dívida técnica aceitável — a conta está bloqueada e o dado original será
   eliminado na janela de produção após o hard-delete. Avaliar mitigações futuras (janela
   de PITR menor que 30 dias, por exemplo) em revisão de compliance futura.

**Consequência prática**: `deleteAccount()` em `UsersService` faz apenas `UPDATE profiles SET
deleted_at = now()`. A function `hard_delete_expired_accounts()` (RF-05) continua sem passo
de anonimização intermediária — o `DELETE FROM auth.users` remove os dados definitivamente
via cascade, tornando qualquer UPDATE de anonimização imediatamente antes redundante.

### Decisão: admin mantém hard-delete imediato

`DELETE /admin/users/:id` não passa a usar soft-delete de 30 dias. Justificativas:

1. Admin acionando exclusão age em nome de um pedido formal de compliance — o Art. 18 da
   LGPD exige resposta em até 15 dias (RNF-04 de SPEC-20260521-004); a janela de 30 dias
   seria contraproducente nesse contexto.
2. A ação já é protegida por `AdminGuard` + `RolesGuard` + audit log obrigatório — nível de
   rastreabilidade adequado para uma exclusão imediata deliberada.
3. Adicionar período de graça para operações de admin criaria ambiguidade: o que acontece se
   o usuário fez `DELETE /users/me` (soft-delete) e um admin também faz
   `DELETE /admin/users/:id` antes dos 30 dias? Manter comportamentos distintos e claros
   evita esse conflito.

### Decisão: restore via login normal (RF-08) — sem segundo fator adicional

O mecanismo de reautenticação para o restore é o login normal via Supabase Auth
(email/senha). Nenhum segundo fator (OTP por e-mail, magic link, SMS) é exigido. Razões:

1. **Login Supabase já é a prova de posse da credencial**: uma conta soft-deleted
   (`profiles.deleted_at != null`) ainda autentica normalmente no Supabase Auth — é o
   `SupabaseAuthGuard` do Nave que bloqueia o acesso via API. Portanto, logar com sucesso
   já prova que o usuário conhece a senha.
2. **Infraestrutura de e-mail transacional ausente**: OTP ou magic link exigiriam envio de
   e-mail, que o projeto não tem configurado para nenhum outro fluxo (nem o login usa isso).
   Exigir isso apenas para restore introduziria dependência de infraestrutura (domínio
   próprio, conta Resend, DNS, anti-spam) desnecessária para o MVP.
3. **Endurecimento futuro possível**: adicionar um segundo fator no restore (ex: e-mail de
   confirmação "Você está cancelando a exclusão da sua conta?") é uma melhoria válida de
   segurança para versões futuras, quando a infraestrutura de e-mail transacional estiver
   disponível.

### Distinção 403 ACCOUNT_PENDING_DELETION vs 401 genérico (RF-09)

O guard atual lança 401 para qualquer falha de autenticação — token ausente, expirado,
inválido ou conta soft-deleted. O frontend não consegue distinguir esses casos e exibe um
erro genérico de login em todos eles.

Com RF-09, o `SupabaseAuthGuard` passa a diferenciar:

| Situação | Código HTTP | Code no body |
|----------|-------------|--------------|
| Token ausente | 401 | (sem code — resposta padrão do guard) |
| Token inválido ou expirado (Supabase rejeita) | 401 | (sem code) |
| Token válido, conta soft-deleted | **403** | `ACCOUNT_PENDING_DELETION` |
| Token válido, conta normal | 200 | (fluxo normal) |

O frontend detecta 403 + `code === "ACCOUNT_PENDING_DELETION"` e renderiza a tela de
restore (SPEC-20260719-001 RF-13/RF-14) em vez de "erro de login".

### SoftDeletedUserGuard (RF-10)

O endpoint `POST /users/me/restore` não pode usar `SupabaseAuthGuard` (que rejeita contas
soft-deleted). O `SoftDeletedUserGuard` implementa a mesma validação de JWT via Supabase
Auth (`auth.getUser`), mas aceita a presença de `deleted_at IS NOT NULL` como estado
esperado — populando `request.user` normalmente. Token ausente/inválido ainda resulta em
401. A guard reside em `apps/api/src/common/guards/soft-deleted-user.guard.ts` e é usada
apenas nesse endpoint.

### Storage — comportamento durante a janela de 30 dias e limitação do hard-delete (RF-11/RF-12)

**Durante os 30 dias**: nenhum arquivo físico no Supabase Storage é removido. Não existe
job de limpeza antecipada. O soft-delete afeta apenas o banco (`profiles.deleted_at`). Os
buckets de Storage permanecem intactos.

**No hard-delete**: o `DELETE FROM auth.users` via cascade remove os registros de banco que
referenciam os arquivos (ex: coluna `photo_url` em `vehicles`), mas os **objetos físicos
no bucket** não são removidos automaticamente — o Supabase Storage não tem trigger ou
cascade que apague objetos quando a FK correspondente no banco é deletada.

**Decisão de MVP**: aceitar essa limitação. Os arquivos físicos órfãos terão tamanho
acumulado negligenciável em escala de MVP. A solução completa (Edge Function de limpeza)
entra como dívida técnica em `important/PENDENCIAS-E-PROCESSOS.md`.

**Por que `pg_cron` não resolve**: `pg_cron` executa SQL puro. A Supabase Storage API é
um serviço HTTP externo (não SQL). Opções futuras: (a) usar `pg_net` dentro da function
para fazer `net.http_post` para a Edge Function; (b) criar uma Edge Function agendada
independente (via Supabase Dashboard / CLI), sem depender de `pg_cron`.

### Trigger `before_delete_profiles` — remoção

O trigger `before_delete_profiles` (`BEFORE DELETE ON profiles`, function
`soft_delete_profile()`) deve ser **dropado** nesta spec. Razões:

1. A anonimização agora é responsabilidade do service (RF-01), executada via UPDATE antes
   de qualquer DELETE.
2. Manter o trigger causaria execução redundante durante o hard delete: o job de pg_cron
   deleta via `auth.users` (cascade para `profiles`), acionando o trigger que tentaria
   fazer UPDATE em `profiles.name/preferences/deleted_at` — que já estão anonimizados
   desde o soft-delete. Inofensivo mas ruidoso.
3. A function `soft_delete_profile()` em si pode ser mantida (sem trigger associado, nunca
   é chamada) ou dropada — recomenda-se comentar na migration que ela está órfã.

### Estrutura da migration

```sql
-- @spec SPEC-20260719-002 RF-04, RF-05, RF-06

-- 1. Drop trigger órfão (anonimização passa para a camada de aplicação via RF-01)
DROP TRIGGER IF EXISTS before_delete_profiles ON public.profiles;

-- 2. Function de hard delete (SECURITY DEFINER, search_path fixo — aplica S9)
CREATE OR REPLACE FUNCTION public.hard_delete_expired_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expired_ids uuid[];
BEGIN
  -- Coletar IDs elegíveis para hard delete
  SELECT ARRAY_AGG(id)
  INTO v_expired_ids
  FROM public.profiles
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';

  IF v_expired_ids IS NULL OR ARRAY_LENGTH(v_expired_ids, 1) = 0 THEN
    RETURN; -- Nada a fazer
  END IF;

  -- Audit log antes do DELETE (dentro da mesma transação — R-MON-03 garante preservação)
  -- Nota: não há passo de anonimização intermediária aqui — o DELETE a seguir elimina
  -- os dados definitivamente via cascade. Anonymization como passo prévio seria redundante
  -- (os dados deixariam de existir milissegundos depois). Ver "Decisão: anonimização
  -- movida para o hard-delete" nas Notas Técnicas.
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, changes, created_at)
  SELECT
    NULL,                                        -- user_id NULL: conta deletada (R-MON-03)
    'ACCOUNT_HARD_DELETED',
    'auth.users',
    id::text,
    '{"reason": "30-day retention period expired"}'::jsonb,
    now()
  FROM public.profiles
  WHERE id = ANY(v_expired_ids);

  -- Hard delete via auth.users (cascata para profiles e demais tabelas)
  -- Arquivos físicos no Supabase Storage NÃO são removidos por este DELETE — ver RF-12.
  DELETE FROM auth.users
  WHERE id = ANY(v_expired_ids);
END;
$$;

-- 3. Revogar EXECUTE de roles não-autorizados (precaução — aplica S9/RNF-04)
REVOKE EXECUTE ON FUNCTION public.hard_delete_expired_accounts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hard_delete_expired_accounts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.hard_delete_expired_accounts() FROM authenticated;

-- 4. Agendamento do job diário às 03:00 UTC
SELECT cron.schedule(
  'nave_hard_delete_expired_accounts',
  '0 3 * * *',
  $$SELECT public.hard_delete_expired_accounts()$$
);
```

### `signOut` vs `deleteUser` — revogação de sessão (corrigido em 2026-07-20)

A intenção original era usar `supabaseAdmin.auth.admin.signOut(userId, { scope: 'global' })`
para revogar todas as sessões do usuário sem deletar `auth.users`. Ao implementar, confirmei
em `GoTrueAdminApi.d.ts` (`@supabase/auth-js` v2.110.2, instalado no monorepo) que
`signOut(jwt: string, scope?: SignOutScope)` recebe o **JWT de uma sessão específica**, não
um `userId` — não há, na API atual, um método para invalidar todas as sessões de um usuário
por id sem deletar o usuário inteiro (`deleteUser`).

**Consequência prática**: `deleteAccount()` não chama nenhum método de revogação de sessão.
Isso é aceitável porque o `SupabaseAuthGuard` (RF-09) intercepta toda requisição autenticada
e rejeita qualquer conta com `profile.deleted_at != null` — portanto, mesmo um JWT
tecnicamente válido no Supabase Auth resulta em 403 `ACCOUNT_PENDING_DELETION` antes de
qualquer lógica de negócio no Nave. A janela de exposição real é zero para a API do Nave;
o JWT continua "válido" apenas do ponto de vista do Supabase Auth, o que é irrelevante
enquanto o guard estiver no caminho de toda rota privada (o que é o caso hoje).

### `pg_cron` e monitoramento de falhas

O `pg_cron` registra execuções em `cron.job_run_details` (`status`, `return_message`,
`start_time`, `end_time`). Não há alerta automático de falha implementado nesta fase.
Recomendação para observabilidade futura: monitorar `cron.job_run_details WHERE status = 'failed'`
via query periódica ou Supabase Alerts — isso é fora do escopo desta spec mas deve entrar
em `important/PENDENCIAS-E-PROCESSOS.md`.

O job é naturalmente tolerante a falhas: contas não deletadas por falha pontual
continuarão elegíveis no próximo ciclo diário (critério `deleted_at < now() - 30 days`
permanece verdadeiro), garantindo que nenhuma conta fique presa indefinidamente.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito)
> não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-20 | `status: draft` → `approved`. Implementação concluída (RF-01, RF-02, RF-04 a RF-10; RF-03 removido do escopo — ver nota na própria RF-03; RF-11/RF-12 são limitação documentada, não código). Gate de sincronia satisfeito em `matrices/rastreabilidade.md` | Backend pré-requisito de `SPEC-20260719-001` implementado e testado (`apps/api/src/modules/users/*`, `apps/api/src/common/guards/*`, migration `20260720000000_soft_delete_account_job.sql`) |
