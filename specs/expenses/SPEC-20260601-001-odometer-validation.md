---
id: SPEC-20260601-001
title: Validação de Sequência de Odômetro
status: approved
date: 2026-06-01
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R1, R4]
security: [S1]
camadas: [backend, database]
---

# SPEC-20260601-001: Validação de Sequência de Odômetro

**Versão:** 1.0
**Status:** Aprovada
**Autor:** douglps
**Data:** 2026-06-01
**Reviewers:** —

---

## 1. Resumo

Ao registrar ou editar uma despesa com o campo `odometer_km` preenchido, o sistema deve comparar o valor informado com o maior quilômetro já registrado para aquele veículo. Se o valor for menor (indicando possível regressão de odômetro), a operação é aceita normalmente, mas a resposta inclui a flag `odometer_warning: true` e uma mensagem explicativa. O lançamento nunca é bloqueado — a validação é informativa.

---

## 2. Contexto e Motivação

**Problema:**
O campo `odometer_km` foi adicionado à tabela `expenses` na migration `20260522000000_add_odometer_km.sql` para viabilizar o cálculo de custo por quilômetro (`R$/km`) no dashboard. Hoje, nenhuma validação de sequência existe: um lançamento de 50.000 km pode ser inserido após um de 100.000 km sem qualquer aviso, corrompendo silenciosamente os gráficos de consumo e custo/km que dependem de séries temporais coerentes.

**Evidências:**

- O KPI "Custo/km" e o gráfico `FuelConsumptionChart` (referenciados em `SPEC-20260531-001`) dependem de leituras de odômetro ordenadas. Uma sequência descrescente produz valores negativos de quilometragem percorrida, tornando os cálculos inválidos.
- O campo é `INTEGER NULL`, portanto voluntário — usuários não o preenchem em todos os lançamentos, mas quando o fazem, esperam que o sistema os oriente sobre inconsistências.

**Por que agora:**
O redesign do dashboard (SPEC-20260531-001) prioriza KPIs e gráficos baseados em odômetro. A ausência desta validação tornaria os dados exibidos não confiáveis logo no lançamento do dashboard revisado.

---

## 3. Goals (Objetivos)

- [ ] G-01: Ao inserir ou atualizar uma despesa com `odometer_km` informado, o sistema retorna `odometer_warning: true` na resposta sempre que o valor for menor que o maior km registrado para o mesmo veículo.
- [ ] G-02: O lançamento é sempre persistido, independentemente do resultado da verificação — 0% de bloqueios legítimos causados por esta feature.
- [ ] G-03: Quando `odometer_km` é `null` ou ausente, nenhuma consulta de verificação é realizada.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Lançamentos com odômetro regressivo persistidos sem aviso | 100% (sem aviso) | 0% (todos recebem aviso) | Na entrega da feature |
| Falsos positivos (warning em lançamentos com km válido) | N/A | 0% | Na entrega da feature |
| Tempo adicional de resposta no endpoint POST /expenses | 0 ms | < 50 ms (P95) | Na entrega da feature |

---

## 4. Non-Goals (Fora do Escopo)

- **NG-01:** Bloquear o lançamento quando o odômetro for regressivo (Estratégia A descartada — conflito com lançamentos retroativos legítimos).
- **NG-02:** Validação de sequência de odômetro no schema Zod — a verificação exige consulta ao banco, não é realizável no nível de schema estático.
- **NG-03:** Detecção de saltos de odômetro muito altos (ex: 1.000.000 km em um dia) — validação por limite de valor já existe via `nonnegative()` no schema; análise estatística de saltos está fora do escopo desta versão.
- **NG-04:** Validação de odômetro em manutenções (`maintenances.odometer_km`) — a coluna existe na tabela, mas o escopo desta spec é restrito à tabela `expenses`.
- **NG-05:** Exibição do warning no frontend — esta spec cobre apenas o contrato de resposta da API. A camada de UI é responsabilidade do time de frontend e não está especificada aqui.
- **NG-06:** Persistência do histórico de odômetro como entidade separada — o valor máximo é calculado dinamicamente a partir de registros existentes.

---

## 5. Usuários e Personas

**Usuário primário:** Motorista autônomo ou gestor de frota (P-001, P-002 conforme SPEC-20260531-001) que registra despesas com quilometragem no navestory.

**Jornada atual (sem a feature):**

1. Usuário registra despesa de combustível com `odometer_km: 50000`.
2. Usuário percebe que digitou errado e registra novamente com `odometer_km: 50000` (já havia registrado `80000` antes).
3. Sistema salva sem aviso. Gráfico de consumo fica incorreto.
4. Usuário descobre o problema ao analisar o dashboard com valores negativos ou absurdos.

**Jornada futura (com a feature):**

1. Usuário registra despesa de combustível com `odometer_km: 50000`.
2. API detecta que o maior km do veículo é `80000` e salva o registro normalmente.
3. Resposta inclui `odometer_warning: true` e mensagem "O odômetro informado (50.000 km) é menor que o último registrado (80.000 km). Verifique se o valor está correto."
4. Frontend exibe alerta não-bloqueante ao usuário.
5. Usuário corrige ou confirma intencionalmente o lançamento retroativo.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID    | Requisito                                                                                                                                                                                                                                                                                                                                                                                 | Prioridade | Critério de Aceite                                                                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | O sistema deve, ao processar `POST /expenses` ou `PATCH /expenses/:id`, verificar se `odometer_km` está presente e não nulo na payload antes de realizar qualquer consulta de sequência.                                                                                                                                                                                                  | Must       | Dado `odometer_km: null` ou ausente na payload, nenhuma query de busca de máximo é executada; a resposta não contém `odometer_warning`.                                                  |
| RF-02 | O repositório deve expor o método `findMaxOdometerByVehicle(vehicleId: string, userId: string, excludeExpenseId?: string): Promise<number \| null>`, que retorna o maior `odometer_km` não-nulo de registros ativos (`deleted_at IS NULL`) do veículo para o usuário. O parâmetro `excludeExpenseId` é usado em atualizações (PATCH) para excluir o registro sendo editado da comparação. | Must       | Dado veículo com registros de km `[10000, 30000, 20000]` (todos ativos), o método retorna `30000`. Dado nenhum registro com km não-nulo, retorna `null`.                                 |
| RF-03 | O `ExpensesService` deve, após chamar `expenseRepository.create()` ou `expenseRepository.update()`, invocar `findMaxOdometerByVehicle()` com o `vehicleId` e comparar o `odometer_km` do lançamento ao máximo encontrado. Se `odometer_km < máximo`, a resposta deve ser enriquecida com `{ ...expense, odometer_warning: true, odometer_previous_max_km: <máximo> }`.                    | Must       | POST com `odometer_km: 50000` quando o máximo existente é `80000` retorna HTTP 201 com body contendo `odometer_warning: true` e `odometer_previous_max_km: 80000`.                       |
| RF-04 | Quando `odometer_km >= máximo` (valor normal ou crescente), a resposta deve omitir o campo `odometer_warning` ou retorná-lo como `false`, sem `odometer_previous_max_km`.                                                                                                                                                                                                                 | Must       | POST com `odometer_km: 90000` quando o máximo existente é `80000` retorna HTTP 201 sem `odometer_warning` (ou com `odometer_warning: false`).                                            |
| RF-05 | No fluxo de atualização (PATCH), a verificação de sequência deve excluir o próprio registro sendo editado ao buscar o máximo.                                                                                                                                                                                                                                                             | Must       | Dado registro X com `odometer_km: 80000` sendo atualizado para `79000`, e nenhum outro registro do veículo com km > `79000`, o sistema não emite warning (o máximo excluindo X é menor). |
| RF-06 | A verificação de sequência deve considerar apenas registros com `deleted_at IS NULL`.                                                                                                                                                                                                                                                                                                     | Must       | Dado único registro existente com `odometer_km: 100000` e `deleted_at` preenchido, o sistema trata o veículo como sem km registrado e não emite warning para qualquer valor.             |

### 6.2 Fluxo Principal (Happy Path — POST com warning)

1. Usuário envia `POST /expenses` com payload incluindo `vehicle_id: "uuid-X"`, `odometer_km: 50000` e demais campos obrigatórios.
2. `ExpensesService.create()` valida a posse do veículo via `VehiclesService.findOne()`.
3. `expenseRepository.create()` persiste o registro e retorna o objeto criado.
4. `ExpensesService` invoca `expenseRepository.findMaxOdometerByVehicle("uuid-X", userId)`.
5. Repositório retorna `80000` (maior km ativo do veículo).
6. Service compara: `50000 < 80000` → constrói resposta `{ ...expense, odometer_warning: true, odometer_previous_max_km: 80000 }`.
7. Controller retorna HTTP 201 com o objeto enriquecido.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Primeiro lançamento com km no veículo:**

1. Usuário envia `POST /expenses` com `odometer_km: 50000`.
2. `findMaxOdometerByVehicle()` retorna `null` (nenhum registro anterior com km).
3. Service interpreta `null` como "sem histórico" → sem warning.
4. Resposta: HTTP 201 com o expense sem `odometer_warning`.

**Fluxo Alternativo B — Lançamento sem odômetro:**

1. Usuário envia `POST /expenses` sem `odometer_km` (campo ausente ou `null`).
2. Service detecta `odometer_km == null` e pula a consulta de verificação.
3. `expenseRepository.create()` persiste o registro normalmente.
4. Resposta: HTTP 201 com o expense sem `odometer_warning`.

**Fluxo Alternativo C — PATCH atualizando km para valor maior:**

1. Usuário envia `PATCH /expenses/uuid-E` com `odometer_km: 90000`.
2. Máximo existente (excluindo o registro uuid-E) é `80000`.
3. `90000 >= 80000` → sem warning.
4. Resposta: HTTP 200 com o expense sem `odometer_warning`.

---

## 7. Requisitos Não-Funcionais

| ID     | Requisito                           | Valor alvo                                                                                                                | Observação                                                                                                                      |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Latência adicional por lançamento   | P95 < 50 ms                                                                                                               | A consulta de máximo deve ser uma query simples `SELECT MAX(odometer_km)` com índice em `vehicle_id`.                           |
| RNF-02 | Segurança — isolamento multi-tenant | `findMaxOdometerByVehicle` sempre recebe `userId` como filtro obrigatório                                                 | Garante que o odômetro máximo não vaze entre usuários distintos.                                                                |
| RNF-03 | Consistência em concorrência        | A busca de máximo ocorre após o insert/update — aceita race condition de leitura suja em cenários de inserção concorrente | Cenário de dois dispositivos inserindo simultaneamente é tratável; o warning pode chegar levemente defasado, o que é aceitável. |

---

## 8. Design e Interface

**Componentes afetados:**

- `ExpenseRepositoryPort` (novo método abstrato `findMaxOdometerByVehicle`)
- `SupabaseExpenseRepository` (implementação do novo método)
- `ExpensesService.create()` e `ExpensesService.update()` (lógica de comparação e enriquecimento da resposta)
- Contrato de resposta dos endpoints `POST /expenses` e `PATCH /expenses/:id`

**Comportamento esperado:**
A resposta da API passa a incluir campos opcionais de warning. O frontend deve tratar graciosamente a presença ou ausência desses campos — não há breaking change, pois campos novos são adicionados, não removidos.

**Estados da resposta:**

- Sem warning: `{ id, user_id, vehicle_id, category, amount, date, odometer_km, ... }` (shape atual — inalterado)
- Com warning: `{ id, user_id, vehicle_id, category, amount, date, odometer_km: 50000, ..., odometer_warning: true, odometer_previous_max_km: 80000 }`

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**
Nenhuma migração de banco é necessária. O campo `odometer_km INTEGER NULL` já existe na tabela `expenses` (migration `20260522000000_add_odometer_km.sql`). A feature opera exclusivamente na camada de serviço e repositório.

**Índice recomendado (opcional para performance):**

```sql
-- Opcional: melhora o tempo da query SELECT MAX(odometer_km) por veículo
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id_odometer
  ON expenses (vehicle_id, odometer_km)
  WHERE odometer_km IS NOT NULL AND deleted_at IS NULL;
```

**Migrações necessárias:** Não (o índice acima é opcional e pode ser aplicado em uma migration separada se benchmarks indicarem necessidade).

---

## 10. Integrações e Dependências

| Dependência                           | Tipo                       | Impacto se indisponível                                                                                                                        |
| ------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `SupabaseService` / `supabase.client` | Obrigatória                | A consulta `findMaxOdometerByVehicle` falha; o service deve tratar o erro, logar e retornar a resposta base sem warning (degradação graciosa). |
| `VehiclesService.findOne()`           | Obrigatória (já existente) | Já tratado no fluxo atual — 404 se veículo não encontrado.                                                                                     |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário                                                                     | Trigger                                                    | Comportamento esperado                                                                                                                                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-01: Primeiro lançamento com km do veículo                                | `findMaxOdometerByVehicle()` retorna `null`                | Sem warning. O lançamento é aceito normalmente como baseline do odômetro.                                                                                                  |
| EC-02: Lançamento retroativo com km menor que registros mais recentes       | `odometer_km: 30000` quando máximo é `80000`               | Warning emitido (`odometer_warning: true`, `odometer_previous_max_km: 80000`). O lançamento é salvo. Comportamento esperado e documentado.                                 |
| EC-03: Dois lançamentos no mesmo dia com km diferentes                      | Ex: dois abastecimentos no mesmo dia, km `50000` e `52000` | Cada lançamento é avaliado independentemente. O de `50000` pode gerar warning se não for o primeiro. O de `52000` (se inserido depois) não gera warning se `52000 >= max`. |
| EC-04: `odometer_km` igual ao máximo existente (mesmo valor)                | `odometer_km: 80000`, máximo existente `80000`             | Sem warning — `80000 >= 80000` é condição válida.                                                                                                                          |
| EC-05: Falha na query `findMaxOdometerByVehicle` (timeout ou erro de banco) | Supabase retorna erro na consulta de máximo                | O service loga o erro, mas retorna a resposta base sem warning. O lançamento já foi salvo — não é desfeito.                                                                |
| EC-06: PATCH sem `odometer_km` na payload (update parcial)                  | `odometer_km` ausente na DTO de update                     | Nenhuma verificação realizada. Comportamento idêntico ao fluxo sem km.                                                                                                     |
| EC-07: Registro com `odometer_km: 0`                                        | Usuário informa km zerado                                  | `0` é valor válido (nonnegative). Se o máximo existente for `50000`, `0 < 50000` → warning emitido.                                                                        |

---

## 12. Segurança e Privacidade

- **Autenticação:** Endpoint protegido por JWT Guard (padrão existente no módulo expenses).
- **Autorização:** `findMaxOdometerByVehicle` recebe `userId` como filtro obrigatório — o máximo calculado nunca cruza dados de usuários distintos.
- **Dados sensíveis:** Quilometragem não é PII. Nenhum dado sensível novo é introduzido.
- **Auditoria:** Nenhum log de auditoria adicional necessário além do já existente para insert/update de despesas.

---

## 13. Plano de Rollout

- **Estratégia:** Entrega direta (sem feature flag). Os campos `odometer_warning` e `odometer_previous_max_km` são novos na resposta e aditivos — nenhuma breaking change para clientes que ignorem campos desconhecidos.
- **Como reverter (rollback):** Remover a chamada a `findMaxOdometerByVehicle` em `ExpensesService.create()` e `ExpensesService.update()`. A lógica de negócio está encapsulada no service — rollback cirúrgico sem impacto na camada de repositório.
- **Monitoramento pós-deploy:** Observar nas primeiras 24h:
  - Taxa de respostas com `odometer_warning: true` (esperado ser < 5% dos lançamentos com km).
  - Latência do endpoint `POST /expenses` (não deve exceder baseline + 50 ms no P95).
  - Erros na query `findMaxOdometerByVehicle` nos logs do Supabase.

---

## 14. Open Questions

_Todas as questões foram resolvidas — ver seção 15 (Decision Log)._

---

## 15. Decisões Tomadas (Decision Log)

| Decisão                                                                                                                                                                   | Alternativas consideradas                                                   | Racional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estratégia B — Soft Warning (aceitar + sinalizar)                                                                                                                         | Estratégia A: bloquear o lançamento quando km regressivo                    | Lançamentos retroativos são legítimos no contexto do navestory (usuário registra despesa de semana passada). Bloquear causaria mais fricção do que benefício.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Validação no `ExpensesService`, não no schema Zod                                                                                                                         | Validação no DTO/schema via custom validator                                | A verificação de sequência exige consulta ao banco, tornando-a incompatível com validação estática de schema. O service é o lugar correto para regras com dependências externas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Novo método `findMaxOdometerByVehicle` no `ExpenseRepositoryPort`                                                                                                         | Query inline no service                                                     | Segue o padrão Repository existente no módulo; mantém o service testável com mocks do repositório.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Enriquecimento da resposta no service (não no controller)                                                                                                                 | Controller sobrepõe a resposta                                              | O enriquecimento é lógica de negócio — pertence ao service, não à camada HTTP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **OQ-01 → D5:** Query de máximo executada **após** o insert/update, com `excludeExpenseId` para excluir o próprio registro no fluxo PATCH                                 | Query antes do insert (evita incluir o próprio registro)                    | Executar após o persist permite sempre passar `excludeExpenseId` de forma uniforme — o registro recém-criado é naturalmente excluído na comparação via PATCH; em INSERT o id não existe ainda, então `excludeExpenseId` é omitido.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **OQ-02 → D6:** Padrão escolhido é **response-field** — retornar `odometer_warning: true` e `odometer_previous_max_km` no body do 201/200, conforme RF-03/RF-04 e seção 8 | Exception-based (`ExpenseWarningException` + flag `confirmed` para reenvio) | **Correção 2026-07-14 (ver changelog):** a versão anterior desta linha registrava a decisão oposta (exception-based) por suposição incorreta de que esse padrão já estava implementado em SPEC-20260601-002 — nunca esteve; aquela spec sempre especificou response-field (seu RF-03). Exception-based exigiria alterar o `HttpExceptionFilter` global do projeto (afetando o contrato de erro de todos os módulos) e introduzir uma máquina de estados de confirmação no frontend, sem nenhum ganho de UX comprovado — pesquisa de padrões de mercado (Nielsen Norman Group) desaconselha diálogo de confirmação para validações soft, e o uso de HTTP 409 para uma condição não-bloqueante distorce a semântica do protocolo. Response-field mantém o padrão consistente entre os dois warnings do módulo expenses. |

---

## Apêndice

### Referências

- Migration `20260522000000_add_odometer_km.sql` — adição do campo `odometer_km` às tabelas `expenses` e `maintenances`
- `apps/api/src/modules/expenses/expenses.service.ts` — service atual sem verificação de odômetro
- `apps/api/src/modules/expenses/repositories/expense.repository.port.ts` — interface do repositório a ser estendida
- `packages/validators/src/expenses.schema.ts` — schema Zod com `odometer_km: z.coerce.number().int().nonnegative().optional().nullable()`
- `SPEC-20260531-001` — Dashboard redesign que depende de dados de odômetro coerentes

### Contexto para Agentes de IA

Ao implementar esta spec, siga as instruções abaixo para manter consistência com o restante do projeto:

**Arquitetura:**

- Padrão obrigatório: Controller → Service → RepositoryPort (abstract class) → SupabaseRepository
- Novo método no Port: `findMaxOdometerByVehicle(vehicleId, userId, excludeExpenseId?)` — já implementado
- Lógica de comparação e warning: no Service (`collectWarnings` para CREATE, bloco inline para UPDATE)
- Ver `docs/architecture/overview.md` para diagrama completo de camadas e ADRs vigentes

**Decisão de design já tomada (corrigida em 2026-07-14 — ver changelog):**

- Warnings usam padrão **response-field**: o lançamento é sempre persistido em uma única requisição, e a resposta HTTP 201/200 é enriquecida com `odometer_warning: true` e `odometer_previous_max_km` quando aplicável (RF-03/RF-04)
- Não lançar exceção nem exigir reenvio com flag de confirmação — não há segunda requisição
- Mesmo padrão usado por SPEC-20260601-002 (duplicate_warning/duplicate_id) — manter os dois warnings do módulo expenses consistentes entre si
- Ver seção 15 (Decision Log) para racional de D5 e D6

**Testes:**

- Framework: Jest + ts-jest
- Nomear describes com `RF-XX:` para requisitos e `EC-XX:` para edge cases (já feito em `expenses.service.spec.ts`)
- TDD obrigatório: escrever o teste que falha antes do código de produção
- Mocks: `jest.Mocked<ExpenseRepositoryPort>` — nunca mockar Supabase diretamente

**Convenções:**

- Nome canônico do método: `findMaxOdometerByVehicle` (não `findLastOdometer`)
- Parâmetro de exclusão: `excludeExpenseId?: string` — obrigatório para fluxo PATCH

**Referência de contexto:**

- `docs/architecture/overview.md` — stack, padrões e ADRs
- `apps/api/src/modules/expenses/expenses.service.ts` — implementação atual do service
- `apps/api/src/modules/expenses/repositories/expense.repository.port.ts` — Port com o método

### Histórico de Revisões

| Versão | Data       | Autor              | Mudanças                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------ | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0    | 2026-06-01 | douglps            | Criação inicial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 1.1    | 2026-06-02 | douglps            | Fechamento de OQ-01 e OQ-02; adicionada seção "Contexto para Agentes"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| —      | 2026-07-11 | doc-keeper         | **NG-04 superseded parcialmente:** a exclusão de validação de odômetro em manutenções (NG-04) foi revertida por decisão de produto documentada em [SPEC-20260711-001](../vehicles/SPEC-20260711-001-odometer-cycles.md) e [ADR-007](../../docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md). `odometer_km` passa a ser obrigatório em manutenções com `status = completed` (R-ODO-03). O conteúdo original desta spec permanece inalterado — a superação é exclusivamente no escopo de NG-04.                                                                                                                                                                                                                                                                           |
| —      | 2026-07-14 | douglps (via T3.2) | **Correção de contradição interna (D6):** a linha D6 do Decision Log e a seção "Contexto para Agentes de IA" afirmavam padrão exception-based (`ExpenseWarningException` + `confirmed`), contradizendo os próprios RF-03/RF-04 e a seção 8, que sempre descreveram response-field. A premissa de D6 (padrão "já implementado" em SPEC-20260601-002) era falsa — aquela spec nunca usou exception-based. Corrigido para response-field, único padrão coerente com os RFs desta spec e com SPEC-20260601-002. Decisão validada com pesquisa de UX (padrões Nielsen Norman Group) e análise de impacto técnico antes da correção. Nenhum RF funcional foi alterado — apenas a seção "Contexto para Agentes" e a decisão D6, que nunca refletiam corretamente os requisitos já aprovados. |

---

## Relatório de Avaliação de Qualidade

### Score Final: **91 / 100** — Excelente (pronta para implementação imediata)

#### Breakdown por Dimensão

| Dimensão      | Peso | Pontos obtidos | Pontos possíveis | Observações                                                                                                                                                                                         |
| ------------- | ---- | -------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completude    | 30%  | 29             | 30               | Todas as seções 1–15 preenchidas; 6 RFs com IDs e critérios de aceite; 6 non-goals explícitos. Desconto mínimo: OQ-01 ainda aberta (sem impacto na implementação base).                             |
| Testabilidade | 25%  | 24             | 25               | Fluxo principal com 7 passos detalhados; 3 fluxos alternativos cobertos; métricas numéricas presentes (< 50 ms, 0% falsos positivos). Desconto: métrica de taxa de warnings sem baseline histórico. |
| Clareza       | 20%  | 20             | 20               | Sujeito claro em todos os RFs; sem termos vagos sem definição; ambiguidades sinalizadas com OQ na seção 14.                                                                                         |
| Escopo        | 15%  | 14             | 15               | 6 non-goals que previnem scope creep real; dependências mapeadas; plano de rollback cirúrgico definido. Desconto mínimo: rollout sem feature flag pode ser arriscado.                               |
| Edge Cases    | 10%  | 9              | 10               | 7 edge cases com trigger e comportamento definido. Desconto: EC-05 (falha de banco) define degradação graciosa mas não especifica o formato exato do log.                                           |

#### Gaps Identificados

| Prioridade | Gap                                                                | Impacto                                                            |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Baixo      | OQ-01: momento da query (antes vs. depois do insert) não resolvido | Pode causar discrepância no EC-03 (dois lançamentos no mesmo dia)  |
| Baixo      | OQ-02: `odometer_previous_max_km` sempre vs. apenas com warning    | Cosmético — não afeta correção da feature                          |
| Baixo      | Formato do log em EC-05 não especificado                           | Dev define livremente; pode usar padrão existente do NestJS Logger |
