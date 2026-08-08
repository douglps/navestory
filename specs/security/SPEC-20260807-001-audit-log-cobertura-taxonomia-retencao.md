---
id: SPEC-20260807-001
title: "Audit Log — Cobertura, Taxonomia e Política de Retenção"
status: approved
date: 2026-08-07
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-MON-01, R-MON-02, R-MON-03, R-MON-04, R-MON-05, C2, C3]
security: [S1, S2, C2, C3]
camadas: [backend, database]
---

# SPEC-20260807-001: Audit Log — Cobertura, Taxonomia e Política de Retenção

**Status:** Aprovado
**Criada em:** 2026-08-07
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Revisores:** —
**Supersede parcialmente:** [SPEC-20260602-005](../dashboard/SPEC-20260602-005.md) — reverte as exclusões de cobertura listadas na seção "Fora de Escopo" daquela spec para os módulos `vehicle-groups`, `categories`, `expense-templates`, `preferences` e para os eventos `LOGOUT`/`PASSWORD_RESET` de auth. A infraestrutura base (schema, `AuditService`, RLS de imutabilidade, página `/atividades`) documentada em SPEC-20260602-005 permanece **inalterada e em vigor**.

---

## Contexto

Levantamento realizado em 2026-08-07 mapeou:

1. **Cobertura atual de `AuditService.log()`**: ~30 chamadas distribuídas em ~10 módulos do backend NestJS (`auth`, `admin`, `users`, `vehicles`, `expenses`, `maintenances`, `fines`, `recurring-costs`, `odometer-cycles`).
2. **Gaps identificados**: módulos com operações de mutação real sem registro de audit — incluindo `vehicle-groups` (impacta controle de acesso), `categories`, `expense-templates`, `preferences`, e dois eventos de auth de alta relevância de segurança (`LOGOUT`, efetivação de `PASSWORD_RESET`). O soft-delete em cascata de despesas originadas de multa/manutenção/custo recorrente (`softDeleteBySource`) também não gera entrada de audit.
3. **Inconsistência de taxonomia**: `fleet-settings.service.ts` usa `action: "fleet_settings_updated"` (lowercase/underscore), quebrando o padrão `SCREAMING_SNAKE_CASE` adotado em todo o resto do sistema — inconsistência que torna consultas e filtros por `action` frágeis.
4. **Ausência de política de retenção formal**: a tabela `audit_logs` não tem mecanismo de expiração ou arquivamento; conforme o crescimento da base, isso gerará volume indefinido sem benefício de compliance após o prazo razoável de guarda.

Referências de mercado consultadas: OWASP Logging Cheat Sheet, ISO 27001 A.8.15 (Monitoring activities), práticas de audit trail enterprise com retenção em camadas quente/fria.

---

## Objetivo

1. Fechar os gaps de cobertura de audit log de maior risco, priorizando eventos de segurança (`LOGOUT`, `PASSWORD_RESET`) e de controle de acesso (`vehicle-groups`).
2. Formalizar a regra de nomenclatura de `action` como `SCREAMING_SNAKE_CASE` (R-MON-05) e corrigir a violação existente em `fleet-settings.service.ts`.
3. Estabelecer e implementar uma política de retenção em duas camadas (quente 0–90 dias / fria 90 dias–5 anos) que garanta compliance de longo prazo sem crescimento ilimitado da tabela `audit_logs` (C3).

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Rastreabilidade de eventos de segurança de auth

**Como** administrador ou usuário, **quero** que logout e redefinição de senha sejam registrados no audit log, **para** ter trilha completa de eventos de acesso à conta.

- **Dado que** um usuário autenticado chama `POST /auth/logout`, **quando** a operação conclui com sucesso, **então** uma entrada `{ action: "LOGOUT", table_name: "auth", record_id: <userId> }` aparece em `audit_logs`.
- **Dado que** um usuário conclui o fluxo de redefinição de senha (nova senha efetivada), **quando** `resetPassword()` é chamado no backend, **então** uma entrada `{ action: "PASSWORD_RESET", table_name: "auth", record_id: <userId> }` aparece em `audit_logs` sem expor a senha nova ou token de reset em `changes`.

### US-02: Rastreabilidade de operações em grupos de veículos

**Como** administrador de frota, **quero** que criação, edição, exclusão e mudança de membros de grupos de veículos sejam auditadas, **para** rastrear quem alterou a composição de grupos que controlam a visibilidade de veículos para motoristas.

- **Dado que** um grupo de veículos é criado via `POST /vehicle-groups`, **quando** a operação conclui, **então** uma entrada `{ action: "VEHICLE_GROUP_CREATED" }` aparece em `audit_logs`.
- **Dado que** os membros de um grupo são redefinidos via `setMembers()`, **quando** a operação conclui, **então** uma entrada `{ action: "VEHICLE_GROUP_MEMBERS_SET", changes: { member_count: N } }` aparece em `audit_logs`.

### US-03: Consistência na consulta e filtro do audit log

**Como** administrador consultando `GET /admin/audit-logs`, **quero** que todos os valores de `action` sigam o mesmo padrão de nomenclatura, **para** poder filtrar e agrupar eventos sem tratar casos especiais por módulo.

- **Dado que** registros históricos de `fleet_settings_updated` (lowercase) e novos registros de `FLEET_SETTINGS_UPDATED` (SCREAMING_SNAKE_CASE) coexistirão no banco, **quando** a UI/filtro de admin agrupa por tipo de ação, **então** ambos os valores são reconhecidos como equivalentes no contexto histórico — a UI deve tratar os dois como o mesmo tipo de evento de configuração de frota.

### US-04: Retenção de audit log conforme política de compliance

**Como** responsável técnico pelo sistema, **quero** que registros de audit sejam automaticamente movidos para armazenamento frio após 90 dias e expurgados após 5 anos, **para** cumprir o prazo razoável de guarda sem crescimento indefinido da tabela `audit_logs`.

- **Dado que** um registro em `audit_logs` tem `created_at` há mais de 90 dias, **quando** o job de arquivamento executa, **então** o registro é exportado para o bucket privado `audit-logs-archive` em formato comprimido e removido da tabela `audit_logs`.
- **Dado que** um arquivo no bucket `audit-logs-archive` tem data de criação há mais de 5 anos, **quando** o job de expurgo executa, **então** o arquivo é removido permanentemente do storage.

---

## Requisitos Funcionais

### RF-01 — Cobertura: eventos de auth (Alta)

Adicionar `auditService.log()` em `auth.service.ts` nos pontos abaixo, que hoje não geram entrada de audit:

| Método | Ação | Campos obrigatórios em `changes` |
|---|---|---|
| `logout()` | `LOGOUT` | `{ timestamp }` — não incluir token revogado |
| `resetPassword()` (efetivação da nova senha, não o envio do link) | `PASSWORD_RESET` | `{ timestamp, description: "Senha redefinida com sucesso" }` — nunca incluir a senha nova, token ou hash |

Ambas as chamadas seguem o padrão fire-and-forget (R-MON-01): `void this.auditService.log(...)`.

### RF-02 — Cobertura: operações em grupos de veículos (Alta)

Adicionar `auditService.log()` em `vehicle-groups.service.ts` nos métodos abaixo, hoje sem registro:

| Método | Ação | Campos sugeridos em `changes` |
|---|---|---|
| `create()` | `VEHICLE_GROUP_CREATED` | `{ name, description }` |
| `update()` | `VEHICLE_GROUP_UPDATED` | diff dos campos alterados |
| `remove()` | `VEHICLE_GROUP_DELETED` | `{ name }` |
| `setMembers()` | `VEHICLE_GROUP_MEMBERS_SET` | `{ member_count: N }` |

Justificativa de prioridade Alta: operações em grupos de veículos afetam diretamente a visibilidade de veículos para motoristas (`workspace_member`) — é dado de controle de acesso (R-WS-04), não apenas configuração periférica.

### RF-03 — Cobertura: eventos de perfil de usuário e motorista (Média)

Adicionar `auditService.log()` nos métodos abaixo:

| Arquivo | Método | Ação |
|---|---|---|
| `users.service.ts` | `updateProfile()` | `PROFILE_UPDATED` |
| `fleet-settings.service.ts` | `updateMyProfile()` (perfil do motorista — CNH, telefone) | `DRIVER_PROFILE_UPDATED` |

Campo `changes` deve omitir PII conforme R-MON-02 (ex: `photo_url`, `photo_thumbnail_url` não devem constar).

### RF-04 — Cobertura: soft-delete em cascata de despesas vinculadas (Média)

Adicionar `auditService.log()` em `expenses.service.ts`, no método `softDeleteBySource()`, que hoje executa soft-delete de despesas derivadas de multa, manutenção ou custo recorrente cancelado/excluído sem gerar entrada de audit:

| Método | Ação | Campos obrigatórios em `changes` |
|---|---|---|
| `softDeleteBySource()` | `EXPENSE_DELETED` | `{ cascade_from: source_type }` — indica que a exclusão foi em cascata, não direta. Usar a mesma `action` do delete direto para não fragmentar a taxonomia; o campo `cascade_from` distingue os dois cenários quando necessário. |

### RF-05 — Cobertura: categorias, templates e preferências (Baixa)

Adicionar `auditService.log()` nos métodos abaixo. Prioridade Baixa porque esses módulos não manipulam dado financeiro ou de acesso direto, mas geram mutação persistente que deve ter trilha para compliance completo (C2):

| Arquivo | Método | Ação |
|---|---|---|
| `categories.service.ts` | `create()` | `CATEGORY_CREATED` |
| `categories.service.ts` | `remove()` | `CATEGORY_DELETED` |
| `expense-templates.service.ts` | `create()` | `EXPENSE_TEMPLATE_CREATED` |
| `expense-templates.service.ts` | `patch()` / `update()` | `EXPENSE_TEMPLATE_UPDATED` |
| `expense-templates.service.ts` | `remove()` | `EXPENSE_TEMPLATE_DELETED` |
| `preferences.service.ts` | `upsert()` | `PREFERENCES_UPDATED` |

### RF-06 — Correção de taxonomia: `FLEET_SETTINGS_UPDATED` (Alta)

`fleet-settings.service.ts` usa hoje `action: "fleet_settings_updated"` (lowercase/underscore), violando R-MON-05. Corrigir o valor passado para `action: "FLEET_SETTINGS_UPDATED"` em todos os pontos de chamada desse service.

**Tratamento de registros históricos:** registros já existentes em `audit_logs` com `action = "fleet_settings_updated"` **não serão migrados** — a tabela é imutável (R-MON-04). Quaisquer consultas ou filtros que precisem agrupar "configurações de frota" devem considerar ambos os valores como equivalentes historicamente. Documentar essa equivalência na spec `SPEC-20260521-004` (admin audit log) quando ela for atualizada.

### RF-07 — Campo `description` recomendado em `changes` (Baixa)

Formalizar como prática recomendada (não obrigatória) que o campo `changes` (JSONB) pode incluir uma chave `description` com texto curto legível para eventos onde o payload bruto não é autoexplicativo para leitura humana. Exemplos de uso: `PASSWORD_RESET`, `LOGOUT`, `ACCOUNT_DELETION_REQUESTED`.

Não exige migração de schema — o campo `changes` é JSONB livre (sem constraint de estrutura). Não exige retroação a chamadas existentes. É uma orientação de implementação para novas chamadas e para revisão das existentes quando fizer sentido.

### RF-08 — Política de retenção em duas camadas (Alta)

Implementar job agendado via `pg_cron` (mesmo mecanismo do hard-delete de conta em `SPEC-20260719-002`) que aplica a política de retenção C3:

**Camada quente (0–90 dias):** permanece na tabela `audit_logs` atual, consultável em tempo real pela página `/atividades` e pelo endpoint `GET /admin/audit-logs`. Nenhuma mudança de comportamento nessa janela.

**Arquivamento para camada fria (job de arquivamento):**
- Seleciona registros com `created_at < NOW() - INTERVAL '90 days'` da tabela `audit_logs`.
- Agrupa por mês (partição por `DATE_TRUNC('month', created_at)`).
- Exporta cada partição mensal para o bucket privado do Supabase Storage `audit-logs-archive` (sem acesso público, somente `service_role`) em formato NDJSON comprimido (`.ndjson.gz`), com path `{year}/{month}/audit-logs-{year}-{month}.ndjson.gz`.
- Remove os registros exportados da tabela `audit_logs` somente após confirmar que o arquivo foi gravado com sucesso no Storage.
- **Frequência sugerida:** diária, em horário de baixo tráfego (ex: `0 3 * * *` UTC).

**Expurgo da camada fria (job de expurgo):**
- Lista arquivos no bucket `audit-logs-archive` com data de upload (`created_at` do objeto no Storage) maior que 5 anos.
- Remove permanentemente esses arquivos do Storage. Sem soft-delete — expurgo é literal após o prazo de compliance.
- **Frequência sugerida:** mensal (ex: `0 4 1 * *` UTC).

**Acesso à camada fria:** não há endpoint de consulta automática à camada fria nesta spec — acesso é manual/administrativo. O processo operacional de recuperação de um arquivo do bucket quando necessário (ex: solicitação de compliance) deve ser documentado em `important/PENDENCIAS-E-PROCESSOS.md` do projeto.

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|---|---|---|
| RNF-01 | Fire-and-forget (R-MON-01) | Todas as novas chamadas a `AuditService.log()` usam `void this.auditService.log(...)` — falha nunca propaga para a operação principal |
| RNF-02 | Sem PII em `changes` (R-MON-02) | Nenhum dos novos registros inclui senha, token, `photo_url`, `photo_thumbnail_url` ou outro campo sensível |
| RNF-03 | Imutabilidade (R-MON-04) | O job de arquivamento remove da tabela `audit_logs` somente após confirmação de escrita bem-sucedida no Storage; nunca deleta sem backup |
| RNF-04 | Bucket `audit-logs-archive` privado | Policy do bucket não permite acesso público — somente `service_role`; acesso por anon ou usuário autenticado retorna 403 |
| RNF-05 | Taxonomia consistente (R-MON-05) | Nenhuma nova chamada a `AuditService.log()` usa valor de `action` fora do padrão `SCREAMING_SNAKE_CASE` |

---

## Critérios de Aceite

- [ ] CA-01: `POST /auth/logout` bem-sucedido → entrada `{ action: "LOGOUT", table_name: "auth" }` em `audit_logs`
- [ ] CA-02: Efetivação de reset de senha → entrada `{ action: "PASSWORD_RESET", table_name: "auth" }` em `audit_logs`; campo `changes` não contém senha, token ou hash
- [ ] CA-03: `POST /vehicle-groups` → entrada `{ action: "VEHICLE_GROUP_CREATED" }` em `audit_logs`
- [ ] CA-04: `setMembers()` de grupo → entrada `{ action: "VEHICLE_GROUP_MEMBERS_SET", changes: { member_count: N } }` em `audit_logs`
- [ ] CA-05: `DELETE /vehicle-groups/:id` → entrada `{ action: "VEHICLE_GROUP_DELETED" }` em `audit_logs`
- [ ] CA-06: `PATCH /vehicle-groups/:id` → entrada `{ action: "VEHICLE_GROUP_UPDATED" }` em `audit_logs`
- [ ] CA-07: `updateProfile()` em `users.service.ts` → entrada `{ action: "PROFILE_UPDATED" }` em `audit_logs`; `photo_url` e `photo_thumbnail_url` ausentes de `changes`
- [ ] CA-08: `updateMyProfile()` em `fleet-settings.service.ts` → entrada `{ action: "DRIVER_PROFILE_UPDATED" }` em `audit_logs`
- [ ] CA-09: `softDeleteBySource()` em `expenses.service.ts` → entrada `{ action: "EXPENSE_DELETED", changes: { cascade_from: <source_type> } }` em `audit_logs`
- [ ] CA-10: `upsert()` em `preferences.service.ts` → entrada `{ action: "PREFERENCES_UPDATED" }` em `audit_logs`
- [ ] CA-11: `create()` em `categories.service.ts` → entrada `{ action: "CATEGORY_CREATED" }` em `audit_logs`
- [ ] CA-12: `remove()` em `categories.service.ts` → entrada `{ action: "CATEGORY_DELETED" }` em `audit_logs`
- [ ] CA-13: Operações de create/update/delete em `expense-templates.service.ts` → entradas `EXPENSE_TEMPLATE_CREATED` / `EXPENSE_TEMPLATE_UPDATED` / `EXPENSE_TEMPLATE_DELETED` em `audit_logs`
- [ ] CA-14: `fleet-settings.service.ts` não gera mais `action: "fleet_settings_updated"` — novos registros usam `"FLEET_SETTINGS_UPDATED"`
- [ ] CA-15: Job de arquivamento: registros com `created_at > 90 dias` são exportados para `audit-logs-archive/{year}/{month}/audit-logs-{year}-{month}.ndjson.gz` e removidos da tabela após confirmação de escrita
- [ ] CA-16: Job de arquivamento não remove da tabela `audit_logs` se a escrita no Storage falhar
- [ ] CA-17: Bucket `audit-logs-archive` retorna 403 para tentativa de acesso com chave anon
- [ ] CA-18: Job de expurgo remove arquivos do bucket `audit-logs-archive` com mais de 5 anos

---

## Fora de Escopo

- **Captura de IP/user-agent nos eventos**: `changes.ip`, `changes.user_agent` são boa prática identificada em pesquisa de mercado (OWASP Logging Cheat Sheet), mas requerem decisão própria sobre coleta de dado adicional — retenção de endereço IP tem implicação LGPD não decidida aqui. Registrar como requisito candidato para spec futura.
- **Hash chain / assinatura criptográfica entre linhas**: tamper-evidence adicional à imutabilidade por RLS já existente (R-MON-04). Nível de maturidade acima do necessário no estágio atual; revisitar apenas se surgir exigência contratual formal de audit trail certificado à prova de adulteração.
- **Endpoint de consulta automática à camada fria**: acesso a arquivos do bucket `audit-logs-archive` é processo manual documentado em `important/PENDENCIAS-E-PROCESSOS.md` — não é feature de produto nesta spec.
- **Registro de tentativas falhas/negadas de autorização**: mantido fora de escopo, mesma decisão de SPEC-20260602-005. Falhas de autenticação e tentativas de acesso não autorizado são cobertas pela observabilidade técnica (Sentry/Pino, `SPEC-20260716-002`), não pelo audit trail de compliance; reavaliar se surgir exigência formal de auditoria de segurança.
- **Migração de registros históricos** com `action` em formato antigo (ex: `"fleet_settings_updated"`): dado imutável por RLS (R-MON-04), não serão alterados retroativamente.
- **Módulos `analytics` e `dashboard`**: mantidos fora do audit log — não realizam mutação de dado financeiro ou pessoal sensível relevante a C2.
- **Paginação e filtros da página `/atividades`**: escopo de SPEC-20260602-005, não revisado aqui.

---

## Dependências

| Tipo | Referência | Descrição |
|---|---|---|
| Spec | SPEC-20260602-005 | Spec base do audit log — define `AuditService`, schema de `audit_logs`, RLS de imutabilidade e página `/atividades`. Esta spec estende a cobertura; a infraestrutura base permanece inalterada |
| Spec | SPEC-20260521-001 | Hardening — C2 define campos obrigatórios de `audit_logs` |
| Spec | SPEC-20260719-002 | Soft-delete e retenção de conta — referência de padrão `pg_cron` para job agendado no Supabase (mesmo mecanismo para o job de arquivamento de RF-08) |
| Spec | SPEC-20260521-004 | Admin — `GET /admin/audit-logs` é a visão administrativa do audit log; deve documentar a equivalência histórica `fleet_settings_updated` ↔ `FLEET_SETTINGS_UPDATED` quando atualizada |
| Infra | Supabase Storage | Bucket `audit-logs-archive` (privado) precisa ser criado antes da execução do job de arquivamento |
| Infra | `pg_cron` | Extensão já habilitada no Supabase (referência: SPEC-20260719-002); jobs de arquivamento e expurgo são funções PL/pgSQL agendadas por ela |
| Regra | R-MON-05 | Nova regra de nomenclatura de `action` — definida em `specs/RULES.md` como parte desta spec |
| Regra | C3 | Nova regra de retenção de audit log — definida em `specs/RULES.md` como parte desta spec |

---

## Notas Técnicas

### Padrão de chamada

Todas as novas chamadas a `AuditService.log()` seguem o padrão já estabelecido — fire-and-forget com `void`:

```typescript
// @spec SPEC-20260807-001 RF-01
void this.auditService.log({
  userId,
  action: 'LOGOUT',
  tableName: 'auth',
  recordId: userId,
  changes: { timestamp: new Date().toISOString() },
});
```

### Job de arquivamento — estratégia de atomicidade

O job de arquivamento não pode usar uma transação única para "exportar E remover", pois escrita no Storage é operação fora do Postgres. A ordem correta é:

1. Selecionar os IDs dos registros a arquivar.
2. Serializar em NDJSON, comprimir com `gzip`.
3. Fazer upload para o bucket Storage.
4. **Somente se o upload retornar sucesso**: executar `DELETE FROM audit_logs WHERE id = ANY($ids)`.
5. Em caso de falha no upload: abortar sem excluir (CA-16 — dados permanecem na tabela quente).

Isso garante que não há perda de dado em caso de falha parcial. Uma segunda execução do job no mesmo dia simplesmente tentará reupar o mesmo arquivo (sobrescrevendo se existir) e então deleterá — operação idempotente.

### Equivalência histórica de `action` de fleet-settings

A aplicação da correção de RF-06 cria uma descontinuidade intencional no valor de `action` para configurações de frota:
- Registros até a data do deploy: `"fleet_settings_updated"` (lowercase)
- Registros após o deploy: `"FLEET_SETTINGS_UPDATED"` (SCREAMING_SNAKE_CASE)

Consultas que precisam agrupar os dois períodos devem usar `WHERE action IN ('fleet_settings_updated', 'FLEET_SETTINGS_UPDATED')` ou normalizar na camada de aplicação. Documentar isso como comentário no endpoint de filtro de admin quando SPEC-20260521-004 for revisada.

### Acesso ao arquivo frio (processo operacional)

Quando um arquivo da camada fria precisar ser consultado (ex: solicitação de auditoria de compliance, suporte a investigação), o processo é:
1. Acessar o bucket `audit-logs-archive` via Supabase Studio ou CLI com service role.
2. Baixar o arquivo `.ndjson.gz` correspondente ao período.
3. Descomprimir com `gunzip` e ler linha a linha (cada linha é um JSON de um registro de `audit_logs`).

Este processo deve ser documentado em `important/PENDENCIAS-E-PROCESSOS.md` com passo a passo para execução sem conhecimento prévio do sistema.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|---|---|---|
| — | — | — |
