---
id: SPEC-20260715-002
title: "Suporte a Fuso Horário por Usuário (Timezone-Aware)"
status: draft
date: 2026-07-15
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R2, R-TZ-01, R-TZ-02, R-TZ-03, R-TZ-04, R-PREF-01]
security: [S1, S2]
camadas: [frontend, backend, database]
---

# SPEC-20260715-002: Suporte a Fuso Horário por Usuário (Timezone-Aware)

**Status:** Draft
**Criada em:** 2026-07-15
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## 1. Contexto

### 1.1 Bug corrigido em T5.1 e limitação residual

Durante a implementação de T5.1 (redesign do dashboard, SPEC-20260531-001) foi corrigido um
bug em `apps/api/src/modules/dashboard/dashboard.service.ts`: a função `daysUntil` misturava
calendário local do processo Node.js com UTC para determinar "hoje" — `getFullYear`/`getMonth`/
`getDate` (fuso do SO) de um lado e `Date.parse(...T00:00:00Z)` do outro — causando off-by-one
próximo à meia-noite UTC, conforme documentado em
[IMPACTO-033](../../matrices/impacto.md#impacto-033) e no changelog de
`docs/IMPLEMENTATION_STRATEGY.md` (entrada T5.1, 2026-07-15).

A correção unificou os dois lados da comparação para UTC (`toDateString` retorna
`date.toISOString().slice(0, 10)`, garantindo consistência). Entretanto, o problema foi apenas
parcialmente eliminado: o servidor agora considera sempre "hoje" o dia calendário em **UTC do
servidor**, não no fuso do usuário. Para um usuário no Brasil (UTC-3), entre ~21h e meia-noite
horário local, o servidor já considera "amanhã" em UTC — adiantando indevidamente alertas de
vencimento e classificações de documentos.

### 1.2 Schema sem componente de hora

O schema atual não captura hora em nenhum lançamento transacional:
- `expenses.date` → `DATE` (sem hora, sem timezone) — ver
  `supabase/migrations/20260712171830_core_tables.sql`
- `maintenances.scheduled_date` e `maintenances.completion_date` → `DATE`

Ambos são preenchidos a partir de `<input type="date">` no frontend, que retorna uma string como
`"2026-07-15"`. Essa string é enviada diretamente sem conversão através de um objeto `Date`, o
que elimina o risco de off-by-one na captura — mas também impede qualquer granularidade de hora e
impossibilita saber em qual fuso o usuário estava ao lançar o registro.

### 1.3 Decisões já tomadas (não reabrir)

1. Lançamentos passam a capturar hora além da data, com preenchimento automático (hora corrente no
   fuso do usuário) e edição manual permitida.
2. Suporte multi-fuso por usuário desde já — não fixar em `America/Sao_Paulo`. Padrão híbrido:
   detecção automática via `Intl.DateTimeFormat().resolvedOptions().timeZone` como default, com
   override manual persistido.
3. Granularidade por usuário, não por conta/frota. O campo `timezone` mora em `user_preferences`
   — extensão natural do módulo `PreferencesModule` (`GET|PATCH /preferences`), já existente.

---

## 2. Objetivo

Tornar o Nave consciente do fuso horário do usuário em três frentes:

1. **Cálculo de "hoje"**: alertas, KPIs e classificação de documentos no `DashboardService`
   passam a usar o fuso do usuário autenticado.
2. **Persistência de data+hora**: `expenses.date`, `maintenances.scheduled_date` e
   `maintenances.completion_date` migram de `DATE` para `timestamptz`; frontend captura
   data+hora no fuso do usuário.
3. **Fuso persistido por usuário**: detecção automática no primeiro acesso e override em
   `/settings/preferences`.

---

## 3. Requisitos Funcionais — Camada Database

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-BD-01 | Migration: adicionar coluna `timezone TEXT` em `public.user_preferences`; coluna nullable (ausência = fuso ainda não detectado); constraint `CHECK (timezone IS NULL OR length(timezone) BETWEEN 1 AND 64)` como guarda mínima de integridade (validação IANA completa fica no backend/frontend) | Alta |
| RF-BD-02 | Migration: converter `public.expenses.date` de `DATE` para `TIMESTAMPTZ` **e renomear a coluna para `occurred_at`** (decisão fechada com o usuário em 2026-07-15 — ver Nota N-01). Migration única (`ALTER TABLE ... RENAME COLUMN date TO occurred_at`, seguido de `ALTER COLUMN occurred_at TYPE timestamptz USING ...`) | Alta |
| RF-BD-03 | Migration: converter `public.maintenances.scheduled_date` de `DATE` para `TIMESTAMPTZ`; converter `public.maintenances.completion_date` de `DATE` para `TIMESTAMPTZ`. Nomes de coluna mantidos (só `expenses.date` é renomeado, por já ter semântica ambígua com o novo tipo — `scheduled_date`/`completion_date` continuam claros) | Alta |
| RF-BD-04 | Estratégia de migração de dados existentes (decisão fechada com o usuário em 2026-07-15): linhas com valor `DATE` existente recebem hora `00:00:00` no fuso `user_preferences.timezone` do usuário dono do registro, via `JOIN` com `user_preferences` por `user_id`; quando `timezone IS NULL` para aquele usuário, usar `'UTC'` como fallback | Alta |
| RF-BD-05 | RLS e índices existentes em `expenses.date`/`occurred_at` e `maintenances.scheduled_date` devem ser avaliados pelo implementador para reindexação após a alteração de tipo; nenhum índice novo é prescrito por esta spec (responsabilidade do `dba` agent na fase de revisão) | Média |

### Nota N-01 — Nome da coluna `expenses.date` (decisão fechada)

**Decisão do usuário (2026-07-15): renomear para `occurred_at`.** Justificativa: `date` como nome
deixa de fazer sentido quando o campo passa a carregar hora e fuso — `occurred_at` comunica a
semântica correta ("quando a despesa ocorreu", não apenas "em que dia"). Isso exige, além da
migration de rename, atualizar todas as referências no codebase: `packages/validators/src/
expense.schemas.ts` (campo `date` do schema Zod), `apps/api/src/modules/expenses/*` (service,
DTOs, queries `select`/`order`/`gte`/`lte`), `apps/api/src/modules/dashboard/dashboard.service.ts`
(export CSV, `sumExpensesAmount`), `apps/web/src/app/(app)/expenses/**/*` (formulários, listagem).
Fica registrado aqui como aviso de escopo — não é um detalhe menor, é uma mudança que toca dezenas
de arquivos; o implementador deve tratar como uma tarefa própria de rename antes de somar a
mudança de tipo, para manter o PR revisável.

---

## 4. Requisitos Funcionais — Camada Backend

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-BK-01 | `PreferencesService.findOne()` passa a incluir `timezone` na query (`PREFERENCES_COLUMNS`) e retornar o campo no tipo de resposta; fallback: quando `null`, retornar `null` sem substituir por `'UTC'` — o fallback para `'UTC'` é aplicado pelos consumidores (R-TZ-01, R-PREF-01) | Alta |
| RF-BK-02 | `PreferencesService.upsert()` aceita `timezone` no payload; `UpdatePreferencesDto` e o schema Zod correspondente em `packages/validators/src/preferences.schemas.ts` recebem campo `timezone?: string \| null` com validação: quando presente e não-nulo, deve ser string não-vazia com pattern `^[A-Za-z_/]+$` (IANA básico); validação completa via `Intl.supportedValuesOf('timeZone')` pode ser adicionada no frontend, não é obrigatória no backend nesta fase (R-TZ-02) | Alta |
| RF-BK-03 | `DashboardService.getAlerts()`, `countUrgentMaintenances()`, `getKpis()` e `getVehicleCards()` — toda chamada a `new Date()` que determina "hoje" passa a receber o `timezone` IANA do usuário autenticado (obtido por `PreferencesService.findOne()` no início de cada operação de dashboard); a nova assinatura de `daysUntil(dateStr, today, tz)` e `classifyDocument(dateStr, today, tz)` calcula "hoje" no fuso recebido, não em UTC (R-TZ-01) | Alta |
| RF-BK-04 | Implementação de utilitário `toCalendarDay(date: Date, tz: string): string` — retorna `YYYY-MM-DD` no fuso `tz` usando `Intl.DateTimeFormat` com opções `{ timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' }`; substitui `toDateString(date)` (que usa UTC) onde "dia do usuário" é o contexto correto. O utilitário fica em módulo compartilhado (`apps/api/src/shared/utils/date.utils.ts` ou equivalente) | Alta |
| RF-BK-05 | Quando `user_preferences.timezone` é `null` ou a leitura de preferências falha, o fallback documentado é `'UTC'` — nunca o fuso do processo (`process.env.TZ`, fuso do SO). Esse fallback deve aparecer como constante nomeada (`FALLBACK_TIMEZONE = 'UTC'`) no código (R-TZ-01) | Alta |
| RF-BK-06 | `ExpensesService` — o campo `occurred_at` (renomeado de `date`, RF-BD-02) dos DTOs de create/update passa a aceitar string ISO 8601 com offset (ex: `"2026-07-15T21:30:00-03:00"`) **ou** string de data simples `"YYYY-MM-DD"` (compatibilidade retroativa); quando recebe `YYYY-MM-DD`, o service interpreta como `00:00:00` no fuso do usuário autenticado (obtido de `user_preferences.timezone`, com fallback `'UTC'`) antes de persistir como `timestamptz` (R-TZ-03) | Alta |
| RF-BK-07 | `MaintenancesService` — mesmo padrão de RF-BK-06 para `scheduled_date` e `completion_date` (R-TZ-03) | Alta |
| RF-BK-08 | Detecção de duplicata (R2) — a comparação de "mesma data" em `ExpensesService` passa a comparar o **dia calendário no fuso do usuário**, não igualdade direta de `timestamptz`; query deve usar `AT TIME ZONE user_tz` ou equivalente que extraia `DATE` no fuso correto antes de comparar | Alta |
| RF-BK-09 | `ExpensesService.create()` — quando `occurred_at` está no futuro (dia calendário do usuário), a resposta é enriquecida com `future_date_warning: true`; a operação nunca é bloqueada (decisão fechada com o usuário em 2026-07-15 — R-TZ-04) | Média |
| RF-BK-10 | `MaintenancesService.update()` — quando `completion_date` excede "agora" em mais de 24h (dia/hora calendário do usuário), a operação é rejeitada com `422 Unprocessable Entity` (decisão fechada com o usuário em 2026-07-15 — R-TZ-04) | Média |

---

## 5. Requisitos Funcionais — Camada Frontend

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-FE-01 | No carregamento da sessão autenticada (ex: layout `(app)`), verificar se `user_preferences.timezone` é `null`; quando `null`, detectar via `Intl.DateTimeFormat().resolvedOptions().timeZone` (API nativa do browser, lê configuração do SO do usuário, retorna nome IANA) e persistir via `PATCH /preferences { timezone: "<iana_name>" }` — silencioso, sem modal (R-TZ-02, R-PREF-01) | Alta |
| RF-FE-02 | Tela `/settings/preferences` (já existente) — adicionar seção "Fuso horário" com: valor atual exibido, seletor de fuso (input text com datalist ou select com lista de fusos IANA mais comuns do Brasil + opção "Outro..."), botão "Salvar"; ao salvar, chama `PATCH /preferences { timezone }` e exibe toast de confirmação (R-TZ-02) | Alta |
| RF-FE-03 | Formulário de despesa (`/expenses/new` e `/expenses/[id]`) — campo de data é substituído por `datetime-local` (data + hora); no mount do formulário, preencher automaticamente com a data e hora atuais no fuso do usuário (obtido de `user_preferences.timezone` via React Query/contexto de preferências já disponível); campo editável pelo usuário; valor enviado ao backend como ISO 8601 com offset (R-TZ-03) | Alta |
| RF-FE-04 | Formulário de manutenção (`/maintenance/new` e `/maintenance/[id]`) — mesmo padrão de RF-FE-03 para `scheduled_date`; campo `completion_date` também com `datetime-local`, sem preenchimento automático (usuário define manualmente quando foi concluída) (R-TZ-03) | Alta |
| RF-FE-05 | Ao exibir datas de lançamento (listagens de despesas, manutenções), formatar sempre no fuso do usuário usando `Intl.DateTimeFormat` com `timeZone: user_preferences.timezone ?? 'UTC'`; nunca usar `toLocaleDateString()` sem opção `timeZone` explícita (evita dependência do fuso do browser no momento da renderização) | Média |
| RF-FE-06 | Seletor de fuso horário de RF-FE-02 deve incluir ao menos os fusos IANA válidos do Brasil: `America/Sao_Paulo`, `America/Manaus`, `America/Belem`, `America/Fortaleza`, `America/Recife`, `America/Porto_Velho`, `America/Boa_Vista`, `America/Rio_Branco`, `America/Noronha`; lista pode ser estendida, mas esses são obrigatórios | Baixa |

---

## 6. Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|--------------------|
| RNF-01 | Performance — overhead de `PreferencesService.findOne()` em `DashboardService` não deve adicionar mais de 50 ms no p95 de `GET /dashboard/kpis` (uma query adicional, mas query simples por PK) | Alta |
| RNF-02 | Segurança — `timezone` em `UpdatePreferencesDto` não pode ser usado para injeção; validação Zod + RLS de `user_preferences` garantem que o campo só afeta o próprio usuário (S1, S2) | Alta |
| RNF-03 | Compatibilidade retroativa — a migration de `DATE → TIMESTAMPTZ` não pode corromper ou perder registros existentes; deve ser executada dentro de uma transação com rollback em caso de erro | Alta |
| RNF-04 | Degradação graciosa — quando `Intl.DateTimeFormat().resolvedOptions().timeZone` retornar um valor não-IANA (edge case em browsers antigos), o frontend deve silenciosamente omitir o PATCH e manter `timezone = null` (o fallback `'UTC'` no backend entra em ação) | Média |

---

## 7. Critérios de Aceite

- [ ] CA-01: Usuário em `America/Sao_Paulo` acessa o dashboard às 22h30 horário local (01h30 UTC do dia seguinte) — nenhuma manutenção agendada para "amanhã" aparece como vencida ou urgente incorretamente; o cálculo usa o dia correto no fuso do usuário
- [ ] CA-02: `GET /preferences` retorna `{ timezone: "America/Sao_Paulo" }` para usuário com timezone configurado; retorna `{ timezone: null }` para usuário sem timezone configurado
- [ ] CA-03: `PATCH /preferences { timezone: "America/Fortaleza" }` persiste o valor e o próximo `GET /preferences` reflete a mudança
- [ ] CA-04: `PATCH /preferences { timezone: "invalid/timezone/string/that/is/too/long/and/exceeds/limit" }` retorna 400 (schema Zod rejeita)
- [ ] CA-05: Formulário de nova despesa (`/expenses/new`) abre com o campo de hora preenchido com a hora atual do usuário no seu fuso; o usuário pode alterar manualmente
- [ ] CA-06: Despesa criada com `occurred_at: "2026-07-15T21:30:00-03:00"` é persistida como `timestamptz` equivalente a `2026-07-16T00:30:00Z` no banco (conversão UTC correta)
- [ ] CA-07: Após migração de dados, toda linha existente em `expenses` com `date = '2026-05-10'` (DATE, nome pré-migração) é convertida para `occurred_at timestamptz` — valor migrado é `2026-05-10T00:00:00Z` (UTC, fallback) quando `user_preferences.timezone` do dono é `null`, ou `2026-05-10T03:00:00Z` (meia-noite em UTC-3) quando é `America/Sao_Paulo`
- [ ] CA-08: Detecção de duplicata (R2) — duas despesas lançadas com `occurred_at: "2026-07-15T23:30:00-03:00"` e `occurred_at: "2026-07-15T21:00:00-03:00"` (mesmo dia no fuso do usuário, mas horas diferentes) são consideradas mesma data para fins de R2; `duplicate_warning: true` é retornado na segunda criação se demais campos coincidirem
- [ ] CA-09: Dois lançamentos com `occurred_at: "2026-07-15T22:00:00-03:00"` (15/jul local = 16/jul UTC) e `occurred_at: "2026-07-16T01:00:00Z"` (16/jul UTC = 15/jul local em UTC-3) são tratados como datas **diferentes** para fins de R2 no contexto de usuário em `America/Sao_Paulo`
- [ ] CA-10: Primeiro acesso de usuário sem `timezone` configurado — o app detecta o fuso via `Intl.DateTimeFormat` e faz `PATCH /preferences` silenciosamente; próximo `GET /preferences` retorna o fuso detectado
- [ ] CA-11: `DashboardService.getAlerts()` usa o `timezone` do usuário autenticado para calcular o horizonte de alertas; usuário sem timezone configurado recebe alertas calculados em `'UTC'` (CA-01 não aplica, mas sem erro)
- [ ] CA-12: Despesa criada com `occurred_at` 2 dias no futuro (dia calendário do usuário) é salva normalmente, com `future_date_warning: true` na resposta (D-03, RF-BK-09)
- [ ] CA-13: `PATCH /maintenances/:id { status: "completed", completion_date: "<agora + 48h no fuso do usuário>" }` retorna `422` (D-04, RF-BK-10); `completion_date` até 24h no futuro é aceito sem erro

---

## 8. Impacto em Regras Existentes

### R1 — Odômetro não retrocede

R1 compara `odometer_km` (número inteiro), não datas. A mudança de `DATE` para `timestamptz` não
altera diretamente R1. O impacto indireto é que `findMaxOdometerByVehicle` filtra por data para
encontrar o máximo — com `timestamptz`, o filtro `date <= :current_date` deve continuar usando
comparação no fuso do usuário (não UTC). Ver RF-BK-06 e RF-BK-07 para o tratamento correto.
**Nenhuma alteração na definição de R1 é necessária.**

### R2 — Duplicata por mesma data/valor/categoria/veículo

Com `expenses.date` migrando para `timestamptz`, "mesma data" passa a significar **mesmo dia
calendário no fuso do usuário** (não igualdade de `timestamptz`). RF-BK-08 especifica a mudança
de implementação. A **definição de R2 em `specs/RULES.md` foi atualizada** com uma nota de
esclarecimento (sem mudança de comportamento de negócio — a intenção de R2 sempre foi "mesmo dia",
a mudança é apenas na implementação da comparação). Specs que citam R2 não precisam ser revisadas.

---

## 9. Decisões Fechadas com o Usuário (2026-07-15)

Todas as decisões abaixo foram levadas ao usuário e confirmadas antes do início da implementação
— nenhuma permanece em aberto.

| # | Decisão | Resolução |
|---|---------|-----------|
| D-01 | Nome da coluna `expenses.date` pós-migração | **Renomear para `occurred_at`** (RF-BD-02, Nota N-01) |
| D-02 | Estratégia de migração de dados existentes | **JOIN com `user_preferences`** para usar o fuso do dono; fallback `'UTC'` quando `timezone IS NULL` (RF-BD-04) |
| D-03 | Despesa com `occurred_at` futuro | **Aviso não-bloqueante** — `future_date_warning: true` na resposta, operação nunca bloqueada (RF-BK-09, R-TZ-04) |
| D-04 | `completion_date` de manutenção no futuro | **Bloqueado (422)** quando excede "agora" em mais de 24h (RF-BK-10, R-TZ-04) |

---

## 10. Fora de Escopo

- Conversão de fusos para datas em `vehicles` (`ipva_due_date`, `insurance_expires_at`,
  `crlv_expires_at`) — são datas de documentos que o usuário registra manualmente como datas
  absolutas; a semântica é "vence em tal dia no Brasil", não uma hora específica. Permanecem
  `DATE`. O `classifyDocument` recebe o fuso correto via RF-BK-03, mas o tipo da coluna não muda.
- Localização de idioma (`locale`) e formato de data exibido — spec futura
- Moeda e formatação monetária regional — spec futura
- Notificações baseadas em fuso horário (ex: "envia push às 9h do usuário") — depende de
  SPEC-20260521-002 (alertas por email, adiados para Fase 9)
- Suporte a múltiplos fusos no contexto de frotas multi-estado/multi-país — escopo Fase 8+

---

## 11. Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec (aprovada) | SPEC-20260603-004 | `user_preferences` — tabela que recebe a coluna `timezone` (RF-BD-01) |
| Spec (aprovada) | SPEC-20260603-003 | `PreferencesModule` REST já existente (`GET|PATCH /preferences`) — estendido por RF-BK-01, RF-BK-02 |
| Spec (aprovada) | SPEC-20260531-001 | `DashboardService` — principal arquivo corrigido (RF-BK-03, RF-BK-04); referencia IMPACTO-033 |
| Spec (aprovada) | SPEC-20260601-002 | Detecção de duplicatas (R2) — impactada por RF-BK-08 |
| Spec (aprovada) | SPEC-20260714-001 | `ExpensesService` — DTOs e service de despesas (RF-BK-06, RF-BK-09) |
| Spec (aprovada) | SPEC-20260715-001 | `MaintenancesService` — DTOs e service de manutenções (RF-BK-07) |
| Referência externa | IMPACTO-033 | Registro do bug e do contexto de correção parcial no T5.1 |
| Migration | `20260712171830_core_tables.sql` | Define os tipos `DATE` atuais que esta spec converte |
| Migration | `20260712171846_grouping_templates_preferences.sql` | Define `user_preferences` sem `timezone` |

---

## 12. Notas Técnicas

### 12.1 Como calcular "hoje" no fuso do usuário em Node.js

`Intl.DateTimeFormat` é a API nativa de Node.js (disponível sem dependência adicional) para
trabalhar com fusos IANA:

```typescript
// apps/api/src/shared/utils/date.utils.ts
export function toCalendarDay(date: Date, tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // 'en-CA' produz ISO 8601 (YYYY-MM-DD) sem separadores extras
  return formatter.format(date);
}
```

`daysUntil` passa a usar `toCalendarDay(today, userTz)` em vez de `toDateString(today)` (que
retorna UTC). A função `toDateString` existente pode ser mantida para os casos onde UTC é
deliberadamente o contexto correto (ex: comparações de `timestamptz` puras).

### 12.2 Preenchimento automático de hora no frontend

Para obter a hora atual no fuso do usuário como valor de `<input type="datetime-local">`:

```typescript
// valor no formato esperado pelo input: "YYYY-MM-DDTHH:mm"
function nowInUserTz(tz: string): string {
  return new Date()
    .toLocaleString('sv', { timeZone: tz }) // 'sv' (sueco) produz ISO 8601
    .slice(0, 16);
}
```

O valor do input é lido como data local (sem tz) e precisa ser enviado ao backend com o offset do
usuário explícito — montar via `new Date(inputValue + offsetString).toISOString()` ou equivalente.

### 12.3 Nome IANA vs. offset em DST

`America/Sao_Paulo` observa horário de verão até 2019 (abolido pelo Decreto 9.772/2019), mas o
banco de dados IANA (tzdata) continua incluindo o nome. Usar nome IANA em vez de `-03:00` é
mandatório (R-TZ-02) porque: (a) sistemas que processam dados históricos do período de DST
precisam do nome IANA para interpretar corretamente; (b) futuros usuários em outros países onde
DST ainda muda têm seus offsets interpretados corretamente.

### 12.4 Performance de `PreferencesService.findOne()` no DashboardService

`DashboardService` já executa múltiplas queries paralelas via `Promise.allSettled`. Adicionar
`PreferencesService.findOne()` como primeira query (sequencial, antes do `allSettled`) adiciona
uma RTT. Para minimizar: (a) o controller pode ler o timezone do usuário e passá-lo como
parâmetro ao invés de o service fazer a leitura; (b) o timezone pode ser cacheado no token JWT
via custom claim (evolução futura). Para esta spec, a abordagem simples (service lê preferências)
é suficiente — RNF-01 exige validação empírica durante implementação.

---

## 13. Regras de Domínio Referenciadas

> Ver `specs/RULES.md` para definição completa.

| ID | Resumo |
|----|--------|
| R2 | Duplicata de despesa por mesma data/valor/categoria/veículo — "data" passa a ser dia calendário no fuso do usuário |
| R-TZ-01 | "Hoje" calculado no fuso do usuário, nunca em UTC do servidor |
| R-TZ-02 | Fuso armazenado como nome IANA; nunca offset fixo |
| R-TZ-03 | Persistência como `timestamptz`; hora preenchida automaticamente no fuso do usuário |
| R-TZ-04 | Despesa futura: aviso não-bloqueante; `completion_date` de manutenção futura: bloqueado acima de 24h (422) |
| R-PREF-01 | Toda preferência tem default seguro; ausência nunca causa erro |
| S1 | Toda rota privada exige `SupabaseAuthGuard` |
| S2 | RLS ativo em todas as tabelas |

---

## Histórico de Revisões

| Data | Versão | Mudança | Autor |
|------|--------|---------|-------|
| 2026-07-15 | 1.0 | Criação inicial — corrige limitação residual do bug T5.1 (IMPACTO-033); formaliza suporte multi-fuso, migração de `DATE → TIMESTAMPTZ` e captura de hora em lançamentos | Douglas Lopes (lps.doug@protonmail.com) |
| 2026-07-15 | 1.1 | 4 decisões em aberto (D-01 a D-04) fechadas com o usuário: `expenses.date` renomeada para `occurred_at` (RF-BD-02, Nota N-01); migração de dados existentes via JOIN com `user_preferences` (RF-BD-04); despesa futura gera aviso não-bloqueante (RF-BK-09); `completion_date` de manutenção futura acima de 24h é bloqueado com 422 (RF-BK-10 novo). CA-12 e CA-13 adicionados; CA-06 a CA-09 atualizados para `occurred_at`. R-TZ-04 em `specs/RULES.md` atualizada para refletir as duas decisões, sem marcação de pendência | Douglas Lopes (lps.doug@protonmail.com) |
