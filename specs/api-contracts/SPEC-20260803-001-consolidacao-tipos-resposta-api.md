---
id: SPEC-20260803-001
title: "Consolidação de Tipos de Resposta da API em packages/validators"
status: approved
date: 2026-08-03
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: []
camadas: [backend, frontend]
---

## Contexto

O monorepo navestory usa `packages/validators` (`@navestory/validators`) para compartilhar schemas
Zod de **entrada** (payloads de criação/atualização) entre `apps/api` e `apps/web`. Os **tipos de
resposta** da API, porém, ficam fora desse pacote — cada tela do frontend redeclara manualmente
sua própria `interface` para o shape esperado.

A auditoria registrada em [IMPACTO-049](../../matrices/impacto.md#impacto-049) documentou o drift
resultante:

- `Vehicle` nunca é exportado como tipo de resposta por `packages/validators`. Oito ou mais
  arquivos do frontend (`analytics`, `expenses`, `fines`, `maintenance`, `vehicles` e as respectivas
  páginas `/new`) redeclaram `interface Vehicle {...}` à mão, e essas cópias já divergem entre si:
  `apps/web/src/app/(app)/vehicles/page.tsx:14` inclui o campo `year`; as outras sete não.
  Enquanto isso, `apps/api/src/modules/vehicles/vehicles.service.ts:11–31` retorna ~25 colunas
  reais (`odometer`, `status`, `fuel_type`, `renavam`, `chassi`, `ipva_due_date` etc.).
- `ExpenseKpis` e `UpcomingCostItem` **já existem** como tipos de saída em
  `packages/validators/src/expense.schemas.ts:114–140` e são usados pelo backend
  (`apps/api/.../expenses.service.ts:815`), mas o frontend **ainda assim** os redeclara em
  `apps/web/src/app/(app)/expenses/page.tsx:37–55` em vez de importar.
- O `apiClient<T>` genérico (`apps/web/src/lib/http/api-client.ts`) faz `as T` sobre o `fetch`
  sem validação Zod em runtime — o TypeScript confia no cast, mas não valida contra o shape real
  retornado pela API.

O gate de sincronia atual (type-check + E2E) **não captura** esse drift porque as interfaces locais
compilam de forma independente do shape real retornado pela API — o TypeScript valida contra o que
foi escrito à mão, não contra o backend real.

## Objetivo

Centralizar todos os tipos de resposta da API (atualmente duplicados em telas do frontend) em
`packages/validators`, como schemas Zod de saída com `z.infer`, e migrar `apps/web` para importar
esses tipos em vez de redeclarar interfaces locais — de modo que qualquer mudança de schema no
backend quebre o type-check do monorepo em vez de produzir bug silencioso de UI.

## Histórias de Usuário e Critérios de Aceitação

### US-01: Tipo de veículo compartilhado

**Como** desenvolvedor frontend, **quero** importar `VehicleResponse` de `@navestory/validators`,
**para** que uma mudança de schema no backend quebre o type-check em vez de causar bug silencioso
de UI.

- **Dado que** `vehicleResponseSchema` está definido em `packages/validators` e `VehicleResponse`
  é exportado via `z.infer<typeof vehicleResponseSchema>`, **quando** o backend adiciona ou remove
  um campo da resposta de veículo e o schema é atualizado, **então** `tsc --noEmit` falha em
  qualquer tela do frontend que acessar um campo inexistente ou não tratar um campo novo.
- **Dado que** oito telas do frontend redeclaram `interface Vehicle {...}` localmente,
  **quando** a migração para `VehicleResponse` for concluída, **então** nenhum arquivo dentro de
  `apps/web` deve conter `interface Vehicle` ou `type Vehicle =` — apenas importações do pacote
  compartilhado são permitidas.
- **Dado que** `vehicles/page.tsx` atualmente inclui `year` na interface local e as demais sete
  cópias não, **quando** `VehicleResponse` for o tipo canônico, **então** a definição de `year`
  existirá em um único lugar e todas as telas consumirão o mesmo contrato.

### US-02: Tipos de KPI e custos próximos sem redeclaração

**Como** desenvolvedor frontend, **quero** importar `ExpenseKpis` e `UpcomingCostItem` de
`@navestory/validators` em vez de redeclarar tipos que já existem no pacote compartilhado,
**para** eliminar a divergência entre o tipo local e o tipo que o backend já usa internamente.

- **Dado que** `ExpenseKpis` e `UpcomingCostItem` já existem em
  `packages/validators/src/expense.schemas.ts`, **quando** a tela `expenses/page.tsx` for
  atualizada, **então** as interfaces locais nas linhas 37–55 serão removidas e substituídas por
  importações de `@navestory/validators`.
- **Dado que** o backend usa esses mesmos tipos ao montar a resposta de `getExpenseKpis`,
  **quando** a lógica do service mudar, **então** o type-check do frontend falhará automaticamente,
  sem depender de revisão manual.

### US-03: Padrão estendido a outras entidades de resposta

**Como** tech lead, **quero** que a mesma abordagem de `z.infer` seja aplicada às entidades
`Fine`, `Maintenance` e KPIs de dashboard, **para** que `packages/validators` seja o único lugar
a consultar para saber o shape de qualquer resposta da API — eliminando a necessidade de inspecionar
arquivos de tela ou o código do service.

- **Dado que** a auditoria de drift foi conduzida para `Vehicle` e `Expense*`, **quando** a
  varredura das demais entidades (`Fine`, `Maintenance`, KPIs de dashboard) for concluída,
  **então** um inventário documentado listará: (a) entidades que já têm tipo compartilhado mas
  são redeclaradas localmente, (b) entidades sem tipo compartilhado ainda, e (c) entidades sem
  drift detectado — com proposta de tratamento para cada caso.
- **Dado que** o inventário for aprovado, **quando** tipos faltantes forem adicionados a
  `packages/validators`, **então** a migração das telas correspondentes seguirá o mesmo padrão
  de RF-01 e RF-02.

## Requisitos Funcionais

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                   | Prioridade | História relacionada |
|-------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|----------------------|
| RF-01 | Criar `vehicleResponseSchema` em `packages/validators/src/vehicle.schemas.ts` como schema Zod de saída cobrindo as ~25 colunas reais retornadas por `VehiclesService` (`id`, `user_id`, `plate`, `brand`, `model`, `year`, `color`, `nickname`, `fuel_type`, `favorite_fuel_type`, `odometer`, `status`, `renavam`, `chassi`, `ipva_due_date`, `insurance_due_date`, `crlv_due_date`, `next_maintenance_km`, `next_maintenance_date`, `photo_url`, `health_score`, `deleted_at`, `created_at`, `updated_at`). Exportar `VehicleResponse = z.infer<typeof vehicleResponseSchema>` do índice do pacote. | Alta       | US-01                |
| RF-02 | Remover todas as declarações locais de `interface Vehicle` e `type Vehicle` dentro de `apps/web` e substituir por `import type { VehicleResponse } from '@navestory/validators'`. Escopo mínimo confirmado: `analytics/page.tsx`, `expenses/page.tsx`, `fines/page.tsx`, `maintenance/page.tsx`, `vehicles/page.tsx` e as páginas `/new` de cada um desses módulos (8 arquivos). O TypeScript (`tsc --noEmit`) deve passar sem erros após a migração. | Alta       | US-01                |
| RF-03 | Remover as interfaces `ExpenseKpis` e `UpcomingCostItem` declaradas localmente em `apps/web/src/app/(app)/expenses/page.tsx:37–55` e substituir por `import type { ExpenseKpis, UpcomingCostItem } from '@navestory/validators'`. Nenhuma mudança de lógica — apenas remoção de redeclaração e adição de importação. | Alta       | US-02                |
| RF-04 | Conduzir varredura manual em `apps/web` para identificar outras interfaces locais que dupliquem respostas da API — com foco em: KPIs de dashboard (`DashboardKpi`, `FleetKpi` ou similar), `Fine` / `FineResponse`, `Maintenance` / `MaintenanceResponse`. Para cada entidade encontrada: (a) verificar se já existe tipo em `packages/validators`; (b) se sim, migrar seguindo o padrão de RF-02/RF-03; (c) se não, criar o schema Zod de saída correspondente antes de migrar. Documentar o resultado da varredura como comentário de encerramento da tarefa. | Média      | US-03                |

## Requisitos Não-Funcionais

| ID     | Requisito                                                                                                                    | Métrica de Aceite                                                                                                      |
|--------|------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| RNF-01 | Compatibilidade de build | `pnpm build` no monorepo conclui sem erros após cada RF. Nenhuma mudança de comportamento em runtime — apenas tipos em tempo de compilação. |
| RNF-02 | Sem validação Zod adicionada em runtime nesta spec | `apiClient<T>` continua operando com `as T`; parse Zod em runtime fica fora de escopo (Opção B do IMPACTO-049). Nenhum `z.parse` ou `z.safeParse` é adicionado no caminho de fetch nesta spec. |
| RNF-03 | Zero regressão de type-check | `tsc --noEmit` em `apps/web` e `packages/validators` deve passar sem erros novos após cada RF. |
| RNF-04 | Campos opcionais e nullable explícitos | `vehicleResponseSchema` usa `.nullable()` / `.optional()` para campos que o banco pode retornar `null` (ex: `nickname`, `photo_url`, `deleted_at`, campos de vencimento), espelhando o schema real do Supabase — sem `z.any()` ou `z.unknown()` como atalho. |

## Fora de Escopo

- **Opção B (geração automática de client):** uso de `openapi-typescript`, `orval` a partir do Swagger do NestJS, ou migração para tRPC — alternativa futura já registrada em IMPACTO-049; exigiria ADR e mudança de padrão arquitetural. Não faz parte desta spec.
- **Validação Zod em runtime no `apiClient<T>`:** adicionar `z.parse` no caminho de fetch mudaria o comportamento em runtime e exige decisão separada. RNF-02 proíbe explicitamente.
- **Cobertura de testes unitários para os schemas de saída:** a decisão de exigir testes para esta spec está registrada como `pendente` em `specs/TEST_DECISIONS.md` — ver entrada correspondente. Sem aprovação, nenhum teste é obrigatório.
- **Alterações de schema de banco ou migrations:** esta spec não muda o modelo de dados — apenas espelha em TypeScript o que o banco já retorna.
- **Migração de `apiClient<T>` para URL tipada por endpoint:** mudança de ergonomia de API-client que requer ADR e impacto em toda chamada do frontend.

## Dependências

| Tipo         | Referência                                                            | Descrição                                                                                                             |
|--------------|-----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| Código       | `apps/api/src/modules/vehicles/vehicles.service.ts:11–31`            | Fonte de verdade das ~25 colunas retornadas — ler para garantir cobertura completa do `vehicleResponseSchema`         |
| Código       | `packages/validators/src/expense.schemas.ts:114–140`                  | Padrão de referência para tipos de saída já existentes (`ExpenseKpis`, `UpcomingCostItem`) — seguir o mesmo padrão   |
| Código       | `apps/web/src/lib/http/api-client.ts`                                 | Consumidor dos tipos — não muda internamente, mas seus genéricos `<T>` passam a receber tipos de `@navestory/validators` |
| Impacto      | [IMPACTO-049](../../matrices/impacto.md#impacto-049)                  | Achado de auditoria que originou esta spec — detalha arquivos afetados e linhas concretas                             |

## Notas Técnicas

### Decisão sobre RF-04 (escopo da varredura)

RF-04 foi incluído nesta spec (não postergado para uma spec separada) porque: (1) o padrão de
correção é idêntico ao de RF-01/RF-02 — sem divergência de abordagem; (2) a varredura tem custo
baixo (`grep -r "interface.*Response\|interface Fine\|interface Maintenance" apps/web/src`) e o
resultado é binário (drift ou não); (3) separar em spec futura aumentaria o risco de esquecimento,
dado que o problema de drift é transversal. RF-04 tem prioridade Média — pode ser executado em
iteração separada da mesma branch, após RF-01/02/03 estarem verdes.

### Padrão de export esperado

O padrão vigente em `packages/validators` usa `z.infer` direto, sem wrapper de classe. O novo
schema de veículo deve seguir o mesmo estilo de `ExpenseKpis`:

```ts
// packages/validators/src/vehicle.schemas.ts
// @spec SPEC-20260803-001 RF-01
export const vehicleResponseSchema = z.object({
  id: z.string().uuid(),
  plate: z.string(),
  // ... demais campos
  deleted_at: z.string().datetime().nullable(),
});

export type VehicleResponse = z.infer<typeof vehicleResponseSchema>;
```

### Campos `nullable` vs `optional`

Campos que o banco retorna em SELECT sempre (mesmo que `null`) devem ser `.nullable()`, não
`.optional()`. Campos que o backend omite condicionalmente da resposta são `.optional()`. A
inspeção de `vehicles.service.ts` deve identificar quais colunas são selecionadas explicitamente
e quais podem ser omitidas.

### Sem impacto em Server Actions

Os tipos de resposta da API (`VehicleResponse` etc.) são distintos dos DTOs de entrada dos
Server Actions. Server Actions continuam usando os schemas de entrada já existentes em
`@navestory/validators`. Esta spec não altera nenhum schema de entrada.

### Verificação pós-migração sugerida

```bash
# Confirma que nenhuma declaração local de Vehicle sobrou
grep -rn "interface Vehicle\b\|type Vehicle\s*=" apps/web/src

# Confirma que todos os imports vêm do pacote
grep -rn "VehicleResponse" apps/web/src | grep -v "@navestory/validators"
# deve retornar vazio
```

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não edita aqui — cria spec nova com `superseded_by`.

| Data       | O que mudou                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Por quê                                                                                                    |
|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| 2026-08-04 | Aprovada e implementada no mesmo ciclo. RF-01/02/03 implementados integralmente; RF-02 cobriu 12 arquivos (não 8 — a estimativa original da spec não incluía `vehicles/[id]/page.tsx`, `vehicles/[id]/odometer/page.tsx`, `vehicle-groups/new/page.tsx`, `vehicle-groups/[id]/page.tsx`, que também redeclaravam `Vehicle`). RF-04: migrado o caso `Maintenance` (drift idêntico ao de `ExpenseKpis`); `Fine` sem drift; cluster `FleetHealthEntry`/`VehicleCardData` do dashboard identificado mas não migrado — reconciliar `HealthFlag` (tipo local específico) com o `flags` genérico de `dashboard.schemas.ts` requer decisão de design, registrada como pendência de continuação em `matrices/rastreabilidade.md`. | Aprovação direta solicitada pelo usuário; implementação seguiu o mesmo fluxo para não deixar spec aprovada sem código, conforme gate de sincronia do projeto. |
| 2026-08-04 | RF-04 concluído (2ª rodada): cluster de dashboard reconciliado. `HealthFlag` já tinha o mesmo shape do `flags` genérico de `FleetHealthEntry` — decisão de design foi trivial (ambos idênticos), não exigiu generalizar nem especializar nada. `HealthFlag` e `VehicleCard` (renomeado de `VehicleCardData`) viraram canônicos em `packages/validators/src/dashboard.schemas.ts`; `VehicleHealthCard.tsx` passou a reexportar do pacote em vez de redeclarar; as 4 redeclarações locais de `FleetHealthEntry` (`dashboard/page.tsx`, `vehicles/page.tsx`, `dashboard/concept/page.tsx`, `dashboard/concept/design-system-v2/page.tsx`) foram removidas em favor de import do pacote compartilhado. | Continuação da pendência registrada na entrada anterior; usuário retomou a "rodada 2" após corte de contexto. |
| 2026-08-04 | Fechamento de gap remanescente: `apps/web/src/app/workspace/vehicles-tab.tsx` (feature de workspace criada no mesmo dia, fora da lista original de 12 arquivos de RF-02) ainda redeclarava `interface Vehicle` localmente. Migrado para `import type { VehicleResponse } from "@navestory/validators"`. `grep -rn "interface Vehicle\b\|type Vehicle\s*=" apps/web/src` volta a retornar vazio. | A tela de workspace surgiu depois do escopo original de RF-02 ter sido fechado; nova varredura pega o arquivo esquecido antes de virar drift permanente. |
