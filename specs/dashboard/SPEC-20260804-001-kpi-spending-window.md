---
id: SPEC-20260804-001
title: "KPI Dashboard — Gastos nos Últimos X Dias (Janela Rolante Configurável)"
status: approved
date: 2026-08-04
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-KPI-01, R-KPI-03, R-PREF-01, R-TZ-01]
security: [S1, S2]
camadas: [frontend, backend, database]
---

# SPEC-20260804-001: KPI Dashboard — Gastos nos Últimos X Dias (Janela Rolante Configurável)

**Status:** approved
**Criada em:** 2026-08-04
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Decisão de escopo: spec nova, não edição in-place de SPEC-20260721-002

SPEC-20260721-002 está `approved` desde 2026-07-22. A adição de uma 9ª métrica ao catálogo
(`KPI_CATALOG_IDS`) e de uma coluna nova em `user_preferences` (`spending_window_days`) envolve:
(a) alteração de schema de banco de dados (migration), (b) novo requisito funcional de backend
(cômputo da janela rolante no catálogo de KPIs), e (c) UI nova em `/settings/preferences`.
Isso ultrapassa o critério de "mudança pequena" (correção ou clarificação sem mudar
comportamento) definido no `.claude/CLAUDE.md`, seção "Changelog de spec pós-aprovação", e
não reverte nenhum critério já aprovado em RF-01. A abordagem correta é criar uma spec nova
dependente, mantendo SPEC-20260721-002 intacta e `approved`.

---

## Contexto

O KPI de "Gasto do Mês Atual" (`expenses_month`, uma das 8 métricas do catálogo definido em
SPEC-20260721-002/RF-01) exibe valor artificialmente baixo nos primeiros dias de cada mês,
porque soma apenas as despesas do mês corrente desde o dia 1.

Para a persona **Carlos** (motorista autônomo que controla custo operacional diariamente), a
pergunta relevante não é "quanto gastei desde o dia 1 do mês" — é "quanto gastei nessa
semana". Um KPI de janela rolante de curto prazo (ex.: últimos 7 dias) responde essa questão
com consistência em qualquer ponto do mês.

A métrica nova coexiste com `expenses_month`: são semânticas distintas — uma é calendário, a
outra é janela deslizante.

---

## Objetivo

Adicionar ao catálogo de KPIs do dashboard uma 9ª métrica — "Gastos nos últimos X dias" —
em que X é configurável por usuário (valores permitidos: 7, 14 ou 30 dias, padrão 7), expor
a preferência de janela na página de configurações existente (`/settings/preferences`), e
garantir que o catálogo compute a soma correta com o filtro de janela rolante.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Visualizar KPI de gastos em janela rolante no dashboard

**Como** Carlos (motorista autônomo), **quero** ver no dashboard o total que gastei nos
últimos 7 dias, **para** saber meu custo operacional semanal independente de onde estou no
calendário mensal.

- **Dado que** tenho o KPI `spending_window` ativado (`dashboard_kpi_ids` inclui
  `spending_window`) e minha preferência `spending_window_days = 7`, **quando** acesso o
  dashboard, **então** o card exibe a soma de `expenses.amount` com `occurred_at` entre
  `hoje − 7 dias` e `hoje` (inclusive, no fuso do usuário), formatado em BRL.
- **Dado que** não tenho despesas nos últimos 7 dias, **quando** o card é exibido, **então**
  o valor é R$ 0,00 (sem erro, sem skeleton infinito).
- **Dado que** minha preferência `spending_window_days = 14`, **quando** o catálogo é
  consultado, **então** o card exibe o label "Últ. 14 dias" e a soma dos últimos 14 dias.

### US-02: Configurar a janela de dias em Preferências

**Como** Carlos, **quero** escolher se a janela do KPI é de 7, 14 ou 30 dias, **para**
adequar o KPI ao meu ciclo de controle (semanal, quinzenal ou mensal).

- **Dado que** acesso `/settings/preferences`, **quando** a seção "KPIs do Dashboard" é
  exibida, **então** vejo um controle de seleção com as opções "7 dias", "14 dias" e
  "30 dias", com o valor atual selecionado (default: "7 dias" se nunca configurado).
- **Dado que** seleciono "30 dias" e salvo, **quando** retorno ao dashboard, **então**
  o KPI exibe o label "Últ. 30 dias" e a soma dos últimos 30 dias.
- **Dado que** tento salvar um valor não permitido (ex.: via PATCH manual à API), **quando**
  o backend processa a requisição, **então** recebo 422 com mensagem de validação.

### US-03: Ativar/desativar o KPI no catálogo

**Como** Carlos, **quero** poder incluir ou remover o KPI "Gastos nos últimos X dias" da
minha grade de KPIs ativos, **para** controlar quais métricas ocupam espaço no dashboard.

- **Dado que** o catálogo agora tem 9 entradas, **quando** acesso o editor de KPIs ativos,
  **então** `spending_window` aparece como opção disponível (ativado ou não, conforme
  `dashboard_kpi_ids` atual).
- **Dado que** já tenho 6 KPIs ativos, **quando** tento ativar o `spending_window` como
  sétimo, **então** recebo mensagem de erro "Máximo de 6 KPIs ativos atingido" (R-KPI-01
  permanece válida).

---

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Prioridade | História |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| RF-01 | Adicionar coluna `spending_window_days SMALLINT NOT NULL DEFAULT 7` à tabela `user_preferences` via migration. Constraint: `CHECK (spending_window_days IN (7, 14, 30))`. RLS existente (`(select auth.uid()) = user_id`) cobre a nova coluna sem alteração — o isolamento por usuário é garantido pela policy já presente. O valor `7` como default segue R-PREF-01 (ausência de preferência nunca causa erro). | Alta       | US-02    |
| RF-02 | Expandir o schema Zod de preferências (`@navestory/validators`, arquivo de preferências) com o campo `spendingWindowDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(7)`. O endpoint `PATCH /preferences` (já implementado por SPEC-20260603-004) passa a aceitar e persistir esse campo. Valor fora do conjunto `{7, 14, 30}` retorna 422.                                                                                                             | Alta       | US-02    |
| RF-03 | No endpoint `GET /dashboard/kpi-catalog`, adicionar a 9ª entrada ao catálogo com `id: 'spending_window'`. O cômputo da métrica é a soma de `expenses.amount` onde `occurred_at >= NOW() - INTERVAL '<X> days'` AND `occurred_at <= NOW()`, com X lido de `user_preferences.spending_window_days` do usuário autenticado. O label retornado ao frontend varia conforme X: `"Últ. 7 dias"`, `"Últ. 14 dias"`, `"Últ. 30 dias"`. Filtro de `deleted_at IS NULL` obrigatório. "Hoje" usa o fuso do usuário (R-TZ-01). | Alta       | US-01    |
| RF-04 | O `KpiCard` de `spending_window` não exibe sparkline nem delta percentual (`delta_pct: null`, sparkline ausente). Justificativa: janela rolante desloca a base de comparação a cada dia — não há período anterior fixo análogo para calcular delta, e 6 pontos de sparkline comparando "X dias encerrados" distintos seriam enganosos. Isso não viola R-KPI-02 (que rege o limite de amostra, não a ausência de delta por design). | Alta       | US-01    |
| RF-05 | Adicionar controle de seleção da janela em dias na página `/settings/preferences` (mesma tela que gerencia `vehicle_chip_fields` e `auto_draft_enabled`). O controle deve ser um grupo de opções (radio group ou segmented control, usando componentes de `@navestory/ui`) com as opções "7 dias" / "14 dias" / "30 dias". Salvar via `PATCH /preferences`. O controle só é exibido quando o usuário tem `spending_window` em seus `dashboard_kpi_ids` ativos (relevância contextual) ou sempre visível — decisão de UX a confirmar na implementação; ambas as opções são válidas tecnicamente. | Média      | US-02    |
| RF-06 | Atualizar `KPI_CATALOG_IDS` em `@navestory/validators` de 8 para 9 entradas, adicionando `'spending_window'`. Qualquer validação Zod que enumera os IDs do catálogo (`z.enum([...])`) deve incluir a nova entrada. Garantir que a adição não quebre leituras de `dashboard_kpi_ids` existentes de usuários que não têm `spending_window` ativado (é aditivo, não destrutivo). | Alta       | US-03    |

---

## Requisitos Não-Funcionais

| ID     | Requisito                                                                                        | Métrica de Aceite                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Performance do endpoint `GET /dashboard/kpi-catalog` não deve regredir com a 9ª métrica         | p95 do endpoint mantido ≤ 400ms; a query da janela rolante usa índice existente em `expenses(occurred_at)` se disponível |
| RNF-02 | O cálculo de janela rolante deve aplicar o fuso do usuário, não UTC do servidor                  | Testes de integração cobrem borda meia-noite: despesa às 23h de ontem no fuso do usuário está ou não na janela conforme R-TZ-01 |
| RNF-03 | A migration de adição da coluna é não-destrutiva                                                 | `DEFAULT 7` e `NOT NULL` permitem adicionar a coluna sem downtime; zero linhas de `user_preferences` existentes ficam inválidas |
| RNF-04 | Segurança: somente o próprio usuário lê e escreve `spending_window_days`                         | RLS existente (`auth.uid() = user_id`) cobre a coluna; sem nova policy necessária; verificar que a coluna não é exposta em endpoints admin sem restrição |

---

## Fora de Escopo

- Suporte a valores de janela além de `{7, 14, 30}` (ex.: janela livre em dias digitada pelo usuário) — requer spec própria e validação de produto.
- Delta percentual ou sparkline para o KPI `spending_window` — explicitamente excluído por RF-04; reavaliar em spec futura se houver demanda.
- Migração de dados: não há dado legado a converter. A coluna nova nasce com `DEFAULT 7` e todos os usuários existentes herdam a janela padrão de 7 dias automaticamente.
- Filtragem do KPI por veículo ou grupo de contexto: o cálculo em RF-03 soma despesas de todos os veículos do usuário, sem filtro de contexto — mesma semântica dos demais KPIs de frota. Filtragem por contexto fica para spec futura.
- Notificações ou alertas baseados na janela de gastos — fora de escopo nesta fase.

---

## Dependências

| Tipo       | Referência                                                          | Descrição                                                                                                                                          |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec       | SPEC-20260721-002 (approved)                                        | Define o mecanismo de catálogo (RF-01), `KPI_CATALOG_IDS`, `dashboard_kpi_ids`, e `GET /dashboard/kpi-catalog`. Esta spec estende RF-01 de forma aditiva. |
| Spec       | SPEC-20260603-004 (approved)                                        | Criou a tabela `user_preferences` e o endpoint `PATCH /preferences`. RF-01 e RF-02 desta spec dependem da estrutura e do endpoint já existentes.   |
| Spec       | SPEC-20260715-002 (approved)                                        | Definiu `occurred_at` como `timestamptz` e as regras de fuso (R-TZ-01). RF-03 usa `occurred_at` e deve respeitar o fuso do usuário.                |
| Regra      | R-PREF-01                                                           | Default seguro e funcional para toda preferência — o `DEFAULT 7` da coluna implementa esta regra.                                                  |
| Regra      | R-KPI-01                                                            | Teto de 6 KPIs ativos e catálogo fixo (agora 9 entradas). A nova métrica não altera o teto de ativação simultânea.                                 |
| Regra      | R-KPI-03 (nova — criada junto com esta spec)                        | Define os valores permitidos da janela, o default e o vínculo com `user_preferences.spending_window_days`.                                         |
| Componente | `packages/validators/src/preferences.schemas.ts`                   | Precisa de campo `spendingWindowDays` (RF-02) e de `KPI_CATALOG_IDS` atualizado (RF-06).                                                          |
| Componente | `apps/web/src/app/(app)/settings/preferences/page.tsx` (ou similar) | Recebe o novo controle de seleção de janela (RF-05).                                                                                               |
| Backend    | `GET /dashboard/kpi-catalog`                                        | Endpoint a estender com a 9ª entrada (RF-03).                                                                                                      |

---

## Notas Técnicas

### Cálculo de "hoje" no fuso do usuário

R-TZ-01 define que "hoje" é sempre o dia calendário do fuso do usuário. Para a janela rolante,
`hoje − X dias` deve ser calculado com `timezone(user_tz, NOW()) - INTERVAL '<X> days'`,
convertido de volta para UTC para filtrar `occurred_at` (que é `timestamptz`). Alternativa
equivalente: comparar `timezone(user_tz, occurred_at)::date >= CURRENT_DATE - X` — verificar
qual forma usa o índice existente.

### Sem sparkline e sem delta — justificativa detalhada

A janela de X dias desloca a cada dia. "Ontem" a janela era `[hoje-8, hoje-1]`; "hoje" é
`[hoje-7, hoje]`. O delta percentual entre essas duas janelas mede ruído diário (entrada e
saída de 1 dia), não uma tendência significativa. O sparkline de 6 pontos mensais (padrão de
RF-01 de SPEC-20260721-002) também não se aplica: uma janela rolante de 7 dias é incomparável
com meses inteiros. A ausência de delta/sparkline é uma decisão de produto registrada em RF-04,
não uma omissão técnica.

### Valores permitidos como enum, não intervalo livre

A restrição a `{7, 14, 30}` é intencional: (a) limita o espaço de teste e de validação;
(b) evita que o usuário configure janelas longas que tornam o KPI indistinguível do "gasto
histórico total"; (c) mapeia diretamente aos ciclos de controle mais comuns (semanal,
quinzenal, mensal). Ampliar o conjunto requer alteração de R-KPI-03, com versionamento.

### Migration

```sql
-- @spec SPEC-20260804-001 RF-01
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS spending_window_days SMALLINT NOT NULL DEFAULT 7
  CONSTRAINT user_preferences_spending_window_days_check
    CHECK (spending_window_days IN (7, 14, 30));
```

Executar como migration versionada (`supabase/migrations/<timestamp>_add_spending_window_days.sql`).
Verificar que a RLS existente não precisa de ajuste — a policy de `user_preferences` já filtra
por `(select auth.uid()) = user_id` para SELECT, INSERT e UPDATE.

### Label dinâmico no catálogo

O campo `label` retornado pelo catálogo para `spending_window` deve ser calculado server-side
e refletir o valor atual da preferência do usuário autenticado:

```typescript
// @spec SPEC-20260804-001 RF-03
const windowDays = prefs.spendingWindowDays ?? 7;
const label = `Últ. ${windowDays} dias`;
```

Isso evita que o frontend precise interpolar o label por conta própria — o contrato do catálogo
já inclui label resolvido, conforme o padrão estabelecido pelos demais KPIs de SPEC-20260721-002.

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito)
> não edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
| ---- | ----------- | ------- |
|      |             |         |
