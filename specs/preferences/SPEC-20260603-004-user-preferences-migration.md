---
id: SPEC-20260603-004
title: "Migration: Tabela Consolidada user_preferences"
status: approved
date: 2026-06-03
author: douglps
rules: [S1, S2, R-DISP-03, R-PREF-01]
security: [S1, S2]
---

# SPEC-20260603-004: Migration — Tabela Consolidada `user_preferences`

**Status:** Aprovada
**Criada em:** 2026-06-03
**Autor:** douglps

---

## Contexto

A server action `apps/web/app/actions/user-preferences.ts` já realiza operações de leitura e upsert na tabela `user_preferences` (colunas `user_id` e `vehicle_chip_fields JSONB`). Entretanto, essa tabela **não existe em nenhuma migration versionada** do projeto. Atualmente, quando a tabela está ausente, a action retorna silenciosamente o valor default (`DEFAULT_CHIP_FIELDS`) sem lançar erro — comportamento correto segundo a regra R-PREF-01, mas que mascara a ausência de infraestrutura.

Além disso, features planejadas no backlog — seleção de tema (STORY-03), configuração de notificações (STORY-05) — precisarão de colunas adicionais na mesma tabela. Uma migration consolidada é o momento correto para criar a estrutura completa e escalável, evitando migrations incrementais fragmentadas.

A tabela `profiles` já possui um campo `preferences JSONB DEFAULT '{}'::jsonb`, que continua existindo para outros propósitos. A tabela `user_preferences` é um repositório tipado e separado, mais escalável para preferências de produto com semântica clara por coluna.

## Objetivo

Criar a migration versionada `supabase/migrations/20260603000000_user_preferences.sql` que estabeleça a tabela `public.user_preferences` com todas as colunas planejadas para o MVP e roadmap imediato, com RLS owner-only completo, defaults seguros e idempotência garantida.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | A migration cria a tabela `public.user_preferences` com as colunas: `user_id UUID PRIMARY KEY`, `vehicle_chip_fields JSONB`, `theme TEXT`, `notifications_config JSONB`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Alta |
| RF-02 | RLS habilitada na tabela; policies de SELECT e INSERT e UPDATE restritas a `auth.uid() = user_id` | Alta |
| RF-03 | Nenhuma policy de DELETE é criada; a remoção de linhas ocorre exclusivamente por cascade ao deletar o `profiles.id` correspondente | Alta |
| RF-04 | O upsert por `user_id` (cláusula `ON CONFLICT (user_id) DO UPDATE`) é idempotente: re-executar com os mesmos dados não cria duplicatas nem perde dados existentes | Alta |
| RF-05 | O default da coluna `vehicle_chip_fields` é `'["plate","make"]'::jsonb`, compatível com R-DISP-01 (placa obrigatória, até 3 campos) | Alta |
| RF-06 | O default da coluna `theme` é `'system'`; a constraint `CHECK (theme IN ('light', 'dark', 'system'))` rejeita qualquer outro valor | Alta |
| RF-07 | O default da coluna `notifications_config` é `'{}'::jsonb`; sem schema rígido — estrutura interna definida em spec futura (STORY-05) | Média |
| RF-08 | A server action existente `updateChipFields` em `apps/web/app/actions/user-preferences.ts` deve funcionar corretamente sem qualquer alteração de código após a migration ser aplicada | Alta |
| RF-09 | A migration usa `CREATE TABLE IF NOT EXISTS` para ser aplicável em banco que eventualmente já contenha a tabela, sem retornar erro | Alta |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Performance | Migration concluída em < 1 s em banco vazio (sem dados históricos para transformar) |
| RNF-02 | Segurança | RLS garante isolamento total entre usuários — nenhum `user_id` acessa ou modifica linhas de outro (S1, S2) |

---

## Schema da Tabela

```sql
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id              UUID        PRIMARY KEY
                                   REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_chip_fields  JSONB       NOT NULL DEFAULT '["plate","make"]'::jsonb,
  theme                TEXT        NOT NULL DEFAULT 'system'
                                   CHECK (theme IN ('light', 'dark', 'system')),
  notifications_config JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### RLS esperada

```sql
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

> Nenhuma policy de DELETE é declarada. Exclusão ocorre apenas via `ON DELETE CASCADE` quando o registro pai em `profiles` é removido (C1 — cascata LGPD).

### Arquivo de migration

O SQL acima deve ser criado em:

```
supabase/migrations/20260603000000_user_preferences.sql
```

O arquivo de rollback correspondente deve ser criado em:

```
supabase/migrations/rollback/20260603000000_user_preferences_down.sql
```

com o conteúdo `DROP TABLE IF EXISTS public.user_preferences;`.

---

## Critérios de Aceite

- [ ] CA-01: `supabase db push` aplica a migration sem erro em ambiente limpo (banco sem a tabela)
- [ ] CA-02: `SELECT * FROM user_preferences` retorna somente as linhas cujo `user_id = auth.uid()` — linhas de outros usuários são invisíveis
- [ ] CA-03: Upsert com `user_id` já existente atualiza a linha, não cria duplicata
- [ ] CA-04: `INSERT INTO user_preferences (user_id, ...) VALUES (<outro_uid>, ...)` executado com JWT de `user_a` é rejeitado com erro RLS quando `outro_uid ≠ user_a`
- [ ] CA-05: `DELETE FROM user_preferences` executado com qualquer JWT válido remove 0 linhas (RLS bloqueia — nenhuma policy de DELETE existe)
- [ ] CA-06: Linha inserida sem especificar `vehicle_chip_fields` tem o valor `["plate","make"]`
- [ ] CA-07: `INSERT INTO user_preferences (user_id, theme) VALUES (<uid>, 'sepia')` é rejeitado com violação de CHECK constraint
- [ ] CA-08: As server actions `getChipFields()` e `updateChipFields()` de `apps/web/app/actions/user-preferences.ts` salvam e leem dados corretamente após a migration ser aplicada, sem nenhuma alteração no código da action

---

## Fora de Escopo

- Migração de dados de `profiles.preferences` para `user_preferences` — não há dados a migrar (campo nunca foi usado para `vehicle_chip_fields`)
- Definição da estrutura interna de `notifications_config` — spec futura (STORY-05)
- Coluna de idioma (`locale`) — roadmap futuro
- Coluna de moeda (`currency`) — roadmap futuro
- Alterações no código das server actions — RF-08 exige zero alterações

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Tabela de banco | `public.profiles` | FK `user_id REFERENCES profiles(id) ON DELETE CASCADE` — a tabela `profiles` deve existir antes desta migration |
| Migration existente | `20260310000000_init_schema_and_rls.sql` | Cria `public.profiles`; deve ter sido aplicada antes |
| Spec pré-requisito | Nenhuma | Esta spec não tem dependência de outra spec |
| Spec dependente | STORY-03 (tema) | Usa a coluna `theme` desta tabela |
| Spec dependente | SPEC-20260603-003 (chip fields UI) | `updateChipFields` usa `vehicle_chip_fields` desta tabela; a migration formaliza a infraestrutura que a spec pressupõe |
| Spec dependente | STORY-05 (notificações) | Usará `notifications_config` desta tabela |

---

## Notas Técnicas

**Por que `CREATE TABLE IF NOT EXISTS` e não `CREATE TABLE`?**
A tabela foi criada manualmente no Supabase durante o desenvolvimento da SPEC-20260603-003 (`🔶 Criada no Supabase` na matriz de rastreabilidade). O `IF NOT EXISTS` garante que a migration seja aplicável tanto em bancos de desenvolvimento que já têm a tabela quanto em ambientes de staging/produção que ainda não a têm — sem duplicação de erro.

**Por que não usar `profiles.preferences JSONB`?**
O campo `preferences JSONB` em `profiles` é genérico e sem validação por coluna. A tabela `user_preferences` permite defaults e constraints tipadas por preferência (`CHECK` em `theme`, `DEFAULT` declarativo em `vehicle_chip_fields`). Além disso, isola a evolução do schema de preferências do schema central de perfil — uma migration em `user_preferences` não afeta `profiles`.

**Compatibilidade com a server action existente**
O código em `apps/web/app/actions/user-preferences.ts` usa `.upsert({ user_id, vehicle_chip_fields, updated_at }, { onConflict: 'user_id' })`. A coluna `updated_at` precisa existir na tabela para a action não retornar erro de coluna desconhecida. O schema desta spec inclui `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, garantindo compatibilidade total (RF-08).

**Ausência de index secundário**
`user_id` é `PRIMARY KEY` e portanto já é indexado. Não há necessidade de índice adicional para os acessos previstos (sempre por `user_id`).

**Política de DELETE via RLS**
A ausência de uma policy de DELETE não é omissão acidental. A semântica correta é: preferências são sempre deletadas em cascata quando o usuário exclui sua conta (C1 — LGPD). Permitir DELETE via RLS abriria caminho para que um client-side bug apague preferências inadvertidamente; o cascade é a única rota intencional de remoção.

---

## Histórico de Revisões

| Data | Versão | Mudança | Autor |
|------|--------|---------|-------|
| 2026-06-03 | 1.0 | Criação inicial | douglps |
| 2026-07-14 | 1.1 | Reconciliação com a implementação real: a tabela `public.user_preferences` foi criada em `supabase/migrations/20260712171846_grouping_templates_preferences.sql` com schema divergente do descrito acima — `vehicle_chip_fields text[]` (não `jsonb`), sem as colunas `theme` e `notifications_config` (ainda não necessárias, adiadas para as specs dependentes STORY-03/STORY-05), e RLS via policy única `FOR ALL` (não policies separadas por SELECT/INSERT/UPDATE), sem exclusão explícita de DELETE via texto de policy (mas nenhuma rota de app usa DELETE direto — cascade permanece a única via). Decisão confirmada com o usuário em 2026-07-14: a camada de serviço usa módulo NestJS REST (`apps/api/src/modules/preferences`, GET/PATCH `/preferences`) consumido via React Query, em vez de server actions Next.js (`apps/web/app/actions/user-preferences.ts`) como originalmente descrito em RF-08 — mantém consistência com o padrão já estabelecido em T2.1–T2.4 (vehicles, vehicle-groups, categories, odometer-cycles). RF-08 é considerado satisfeito pelo equivalente funcional via REST. | Douglas Lopes (lps.doug@protonmail.com) |
