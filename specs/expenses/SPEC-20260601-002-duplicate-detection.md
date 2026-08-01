---
id: SPEC-20260601-002
title: Detecção de Duplicata de Despesa
status: approved
date: 2026-06-01
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R2]
security: [S1]
camadas: [backend, database]
---

# SPEC-20260601-002: Detecção de Duplicata de Despesa

**Versão:** 1.0
**Status:** Aprovada
**Autor:** douglps
**Data:** 2026-06-01
**Reviewers:** —

---

## 1. Resumo

Ao criar uma nova despesa (`POST /expenses`), o sistema verifica se já existe um registro ativo com os mesmos `vehicle_id`, `date`, `amount` e `category` para o mesmo usuário. Se um duplicata potencial for encontrado, o lançamento é aceito normalmente e a resposta inclui `duplicate_warning: true` e o `duplicate_id` do registro suspeito. O usuário pode ignorar o aviso — nenhum bloqueio ocorre.

---

## 2. Contexto e Motivação

**Problema:**
Hoje o módulo de expenses não possui nenhuma verificação de lançamento duplicado. Um usuário pode registrar a mesma despesa duas vezes por engano — cenário comum em abastecimentos realizados com pressa e confirmados novamente por incerteza — sem qualquer aviso do sistema. Registros duplicados distorcem totais no dashboard (KPI "Gastos do mês"), análises de custo/km e exportações CSV.

**Evidências:**

- O sistema usa soft-delete (`deleted_at`): registros deletados não somem fisicamente, o que significa que duplicatas acumuladas ao longo do tempo inflam as métricas até serem percebidas e removidas manualmente.
- Não há constraint de unicidade no banco para a combinação `(user_id, vehicle_id, date, amount, category)` — a proteção precisa existir na camada de aplicação.

**Por que agora:**
A SPEC-20260531-001 (redesign do dashboard) expõe KPIs e gráficos diretamente derivados dos totais de despesas. A confiabilidade dos dados exibidos é prerequisito para que o dashboard seja útil. Duplicatas silenciosas comprometem essa confiabilidade.

---

## 3. Goals (Objetivos)

- [ ] G-01: Ao criar uma despesa com os 4 critérios idênticos a um registro ativo existente do mesmo usuário, o sistema retorna `duplicate_warning: true` e o `duplicate_id` do suspeito na resposta HTTP 201.
- [ ] G-02: O lançamento é sempre persistido — 0% de bloqueios legítimos causados por esta feature.
- [ ] G-03: Registros com `deleted_at IS NOT NULL` são completamente excluídos da verificação.
- [ ] G-04: A verificação ocorre apenas na criação (POST), nunca na atualização (PATCH).

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Dupla submissão detectada e sinalizada | 0% | 100% (quando critérios exatos forem atendidos) | Na entrega da feature |
| Lançamentos erroneamente bloqueados (falsos negativos de aceitação) | N/A | 0% | Na entrega da feature |
| Tempo adicional de resposta no endpoint POST /expenses | 0 ms | < 30 ms (P95) | Na entrega da feature |

---

## 4. Non-Goals (Fora do Escopo)

- **NG-01:** Bloquear o lançamento duplicado (Estratégia A descartada — o usuário pode ter motivo legítimo para dois lançamentos idênticos no mesmo dia, ex: dois abastecimentos separados de mesmo valor).
- **NG-02:** Verificação de duplicata em atualizações (PATCH) — apenas criação (POST) está no escopo desta versão.
- **NG-03:** Detecção fuzzy / por similaridade — ex: valores próximos (R$ 100,00 vs. R$ 100,01), datas próximas (ontem vs. hoje), categorias relacionadas. Apenas igualdade exata nos 4 critérios.
- **NG-04:** Deduplicação automática (mesclar ou deletar automaticamente o duplicado) — a decisão é do usuário.
- **NG-05:** Verificação de duplicata entre usuários distintos — dois usuários com a mesma despesa não geram warning.
- **NG-06:** Exibição de interface para resolver duplicatas (`/expenses/duplicates`) — fora desta spec.
- **NG-07:** Constraint de unicidade no banco de dados para os 4 campos — a validação é em camada de aplicação para permitir lançamentos intencionalmente idênticos com o warning.

---

## 5. Usuários e Personas

**Usuário primário:** Motorista autônomo (P-001) ou gestor de frota (P-002) que registra despesas manualmente, frequentemente via mobile em situações de atenção dividida (ex: posto de combustível).

**Jornada atual (sem a feature):**

1. Usuário registra abastecimento de R$ 150,00 para o veículo ABC-1234 em 2026-06-01.
2. Usuário não tem certeza se enviou e registra novamente.
3. Sistema salva os dois registros sem aviso.
4. Dashboard exibe R$ 300,00 de gastos no dia, incorretamente.
5. Usuário descobre o erro dias depois ao revisar o histórico.

**Jornada futura (com a feature):**

1. Usuário registra abastecimento de R$ 150,00 para o veículo ABC-1234 em 2026-06-01.
2. Usuário não tem certeza se enviou e registra novamente.
3. Sistema salva o segundo registro e retorna HTTP 201 com `duplicate_warning: true` e `duplicate_id: "uuid-do-primeiro"`.
4. Frontend exibe alerta: "Possível duplicata detectada. Um lançamento com os mesmos dados (id: abc...) foi encontrado."
5. Usuário decide manter ambos ou deletar o recém-criado.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID    | Requisito                                                                                                                                                                                                                                                                                           | Prioridade | Critério de Aceite                                                                                                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-01 | O repositório deve expor o método `findPotentialDuplicate(userId: string, vehicleId: string, date: string, amount: number, category: string): Promise<Expense \| null>`, que retorna o primeiro registro ativo (`deleted_at IS NULL`) correspondente aos 5 parâmetros, ou `null` se não encontrado. | Must       | Dado registro ativo com `user_id=U, vehicle_id=V, date=D, amount=A, category=C`, `findPotentialDuplicate(U, V, D, A, C)` retorna esse registro. Dado o mesmo registro com `deleted_at` preenchido, retorna `null`. |
| RF-02 | O `ExpensesService.create()` deve invocar `findPotentialDuplicate()` **após** o insert bem-sucedido, usando os dados da despesa recém-criada.                                                                                                                                                       | Must       | Em POST com dados duplicados, o insert ocorre antes da verificação — o novo registro é salvo independentemente do resultado da busca.                                                                              |
| RF-03 | Se `findPotentialDuplicate()` retornar um registro, a resposta da criação deve ser enriquecida com `duplicate_warning: true` e `duplicate_id: <uuid-do-registro-encontrado>`. O HTTP status permanece 201.                                                                                          | Must       | POST com dados idênticos a registro ativo existente retorna HTTP 201 com body contendo `duplicate_warning: true` e `duplicate_id` igual ao UUID do registro suspeito.                                              |
| RF-04 | Se `findPotentialDuplicate()` retornar `null` (sem duplicata), a resposta deve omitir os campos `duplicate_warning` e `duplicate_id` (ou retornar `duplicate_warning: false` sem `duplicate_id`).                                                                                                   | Must       | POST com dados únicos retorna HTTP 201 sem `duplicate_warning` (ou com `duplicate_warning: false`).                                                                                                                |
| RF-05 | A busca de duplicata deve filtrar exclusivamente por `deleted_at IS NULL`, desconsiderando registros soft-deletados.                                                                                                                                                                                | Must       | Dado único registro existente com os mesmos dados mas `deleted_at` não-nulo, POST com dados iguais retorna HTTP 201 sem `duplicate_warning`.                                                                       |
| RF-06 | A verificação de duplicata não deve ocorrer no fluxo de atualização (`ExpensesService.update()`).                                                                                                                                                                                                   | Must       | PATCH em endpoint existente não invoca `findPotentialDuplicate()`; nenhum `duplicate_warning` é retornado em atualizações.                                                                                         |

### 6.2 Fluxo Principal (Happy Path — criação com duplicata detectada)

1. Usuário envia `POST /expenses` com `{ vehicle_id: "uuid-V", category: "fuel", amount: 150.00, date: "2026-06-01", ... }`.
2. `ExpensesService.create()` valida a posse do veículo via `VehiclesService.findOne()`.
3. `expenseRepository.create()` persiste o novo registro e retorna o objeto criado (ex: `id: "uuid-novo"`).
4. `ExpensesService` invoca `expenseRepository.findPotentialDuplicate(userId, "uuid-V", "2026-06-01", 150.00, "fuel")`.
5. Repositório encontra registro ativo `{ id: "uuid-existente", ... }` com os mesmos 4 campos para o mesmo usuário.
6. Service constrói resposta: `{ ...expense, duplicate_warning: true, duplicate_id: "uuid-existente" }`.
7. Controller retorna HTTP 201 com o objeto enriquecido.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Criação sem duplicata:**

1. Usuário envia `POST /expenses` com dados únicos (nenhum registro ativo com mesmos 4 campos).
2. `expenseRepository.create()` persiste o registro.
3. `findPotentialDuplicate()` retorna `null`.
4. Resposta: HTTP 201 com o expense sem `duplicate_warning`.

**Fluxo Alternativo B — Usuário deletou o original e recria:**

1. Usuário havia registrado despesa X e depois a deletou (soft-delete: `deleted_at` preenchido).
2. Usuário cria nova despesa com os mesmos dados.
3. `findPotentialDuplicate()` ignora registro X (pois `deleted_at IS NOT NULL`) e retorna `null`.
4. Resposta: HTTP 201 sem `duplicate_warning`. Comportamento esperado — sem falso positivo.

**Fluxo Alternativo C — Falha na query de duplicata:**

1. `expenseRepository.create()` persiste o registro com sucesso.
2. `findPotentialDuplicate()` lança exceção (ex: timeout de banco).
3. `ExpensesService` captura a exceção, loga o erro e retorna a resposta base sem warning.
4. Resposta: HTTP 201 com o expense sem `duplicate_warning`. O lançamento já persistido não é desfeito.

---

## 7. Requisitos Não-Funcionais

| ID     | Requisito                           | Valor alvo                                          | Observação                                                                                |
| ------ | ----------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| RNF-01 | Latência adicional por lançamento   | P95 < 30 ms                                         | A query de duplicata deve usar índice em `(user_id, vehicle_id, date, category, amount)`. |
| RNF-02 | Segurança — isolamento multi-tenant | `findPotentialDuplicate` filtra sempre por `userId` | Nunca retorna registros de outros usuários como duplicata.                                |
| RNF-03 | Atomicidade da resposta             | O lançamento persiste mesmo se a verificação falhar | A detecção de duplicata é best-effort — não pode impedir persistência do registro.        |
| RNF-04 | Precisão da comparação de `amount`  | Comparação deve usar igualdade exata numérica       | `amount: 150.00` e `amount: 150.0` devem ser considerados iguais (mesmo valor numérico).  |

---

## 8. Design e Interface

**Componentes afetados:**

- `ExpenseRepositoryPort` (novo método abstrato `findPotentialDuplicate`)
- `SupabaseExpenseRepository` (implementação do novo método)
- `ExpensesService.create()` (lógica de verificação e enriquecimento da resposta)
- Contrato de resposta do endpoint `POST /expenses`

**Comportamento esperado:**
Os campos `duplicate_warning` e `duplicate_id` são adicionados à resposta de forma aditiva — não há breaking change. Clientes que não reconhecem esses campos simplesmente os ignoram.

**Estados da resposta:**

- Sem duplicata: `{ id, user_id, vehicle_id, category, amount, date, ... }` (shape atual — inalterado)
- Com duplicata: `{ id, user_id, vehicle_id, category, amount, date, ..., duplicate_warning: true, duplicate_id: "uuid-do-suspeito" }`

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**
Nenhuma migração de banco é necessária. A feature opera sobre registros existentes na tabela `expenses`.

**Índice recomendado (para performance da query de detecção):**

```sql
-- Recomendado: otimiza a query SELECT 1 FROM expenses
-- WHERE user_id = $1 AND vehicle_id = $2 AND date = $3
-- AND amount = $4 AND category = $5 AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_expenses_duplicate_check
  ON expenses (user_id, vehicle_id, date, amount, category)
  WHERE deleted_at IS NULL;
```

**Migrações necessárias:** Não obrigatório para o MVP. O índice acima é recomendado para frotas com alto volume de lançamentos e pode ser criado em migration separada após validação de performance.

---

## 10. Integrações e Dependências

| Dependência                           | Tipo                       | Impacto se indisponível                                                                                |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `SupabaseService` / `supabase.client` | Obrigatória                | `findPotentialDuplicate` falha; service faz degradação graciosa (retorna sem warning, registra erro).  |
| `VehiclesService.findOne()`           | Obrigatória (já existente) | Já tratado no fluxo atual — 404 se veículo não encontrado, antes de qualquer verificação de duplicata. |
| `expenseRepository.create()`          | Obrigatória (já existente) | Se o insert falhar, `findPotentialDuplicate` não é chamado (não há registro a reportar).               |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário                                                                                | Trigger                                                                            | Comportamento esperado                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-01: Usuário deleta o original e recria                                              | Registro original tem `deleted_at IS NOT NULL`; usuário cria novo com mesmos dados | `findPotentialDuplicate` retorna `null` (deleted não é candidato). Novo registro criado sem warning.                                                                        |
| EC-02: Dois usuários diferentes, mesma despesa                                         | `user_id` distintos, demais campos idênticos                                       | `findPotentialDuplicate` filtra por `userId` — sem cruzamento entre usuários. Cada usuário vê seus dados isolados.                                                          |
| EC-03: Mesmo usuário, mesmo veículo, mesma data e categoria, mas amount diferente      | `amount: 150.00` vs. `amount: 151.00`                                              | Sem duplicata (`amount` deve ser exatamente igual). Nenhum warning.                                                                                                         |
| EC-04: Usuário tem dois lançamentos idênticos pré-existentes (duplicata já persistida) | `findPotentialDuplicate` retorna o **primeiro** encontrado                         | O método retorna o primeiro resultado da query (`.single()` ou `.limit(1)`). O `duplicate_id` aponta para esse primeiro registro.                                           |
| EC-05: Falha na query `findPotentialDuplicate`                                         | Timeout ou erro do Supabase na consulta de duplicata                               | Service captura a exceção, loga com `Logger.error`, retorna a resposta base (expense sem warning). O lançamento já salvo não é revertido.                                   |
| EC-06: `amount` com casas decimais de ponto flutuante                                  | `150.001` vs. `150.00` armazenado como `NUMERIC(10,2)`                             | O banco armazena com precisão `NUMERIC(10,2)` — `150.001` é truncado/arredondado para `150.00` antes de persistir. A comparação ocorre no banco com o valor já normalizado. |
| EC-07: Criação de despesa sem `vehicle_id`                                             | Payload inválida                                                                   | Zod schema rejeita com 400 antes de chegar ao service. `findPotentialDuplicate` nunca é chamado.                                                                            |

---

## 12. Segurança e Privacidade

- **Autenticação:** Endpoint protegido por JWT Guard (padrão existente no módulo expenses).
- **Autorização:** `findPotentialDuplicate` recebe `userId` como parâmetro obrigatório — jamais cruza dados entre usuários. A política RLS do Supabase (`auth.uid() = user_id`) serve como segunda camada de proteção.
- **Dados sensíveis:** Valores financeiros são processados, mas não são PII. O `duplicate_id` exposto na resposta é o UUID de um registro do próprio usuário — nenhum dado de terceiros é exposto.
- **Auditoria:** Nenhum log de auditoria adicional necessário. A criação do registro já é auditada pelo fluxo existente.

---

## 13. Plano de Rollout

- **Estratégia:** Entrega direta (sem feature flag). Os campos `duplicate_warning` e `duplicate_id` são aditivos na resposta — não há breaking change.
- **Como reverter (rollback):** Remover a chamada a `findPotentialDuplicate` em `ExpensesService.create()`. A lógica está encapsulada no service — rollback cirúrgico sem impacto no repositório ou banco.
- **Monitoramento pós-deploy:**
  - Taxa de respostas com `duplicate_warning: true` nas primeiras 24–48h (esperado < 2% dos lançamentos).
  - Latência do endpoint `POST /expenses` (não deve exceder baseline + 30 ms no P95).
  - Erros capturados em EC-05 nos logs do NestJS (deve ser zero em condições normais).

---

## 14. Open Questions

| #     | Pergunta                                                                                                                                                                                                                                                                                                                                            | Impacto | Dono    | Prazo                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------------------- |
| OQ-01 | A verificação deve buscar duplicatas apenas nas últimas N horas/dias (janela temporal) ou em todo o histórico? Janela temporal reduziria falsos positivos para lançamentos recorrentes mensais (ex: IPVA todo janeiro), mas adicionaria complexidade. Recomendação atual: histórico completo (igualdade exata é critério suficientemente restrito). | Médio   | douglps | Antes da implementação |
| OQ-02 | Se `findPotentialDuplicate` encontrar múltiplas duplicatas pré-existentes (EC-04), deve retornar apenas a primeira ou uma lista? Retornar lista seria mais informativo, mas altera o contrato da resposta. Recomendação atual: retornar apenas a primeira (mais simples, consistente com o caso de uso principal).                                  | Baixo   | douglps | Antes da implementação |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão                                                                     | Alternativas consideradas                                      | Racional                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estratégia B — Soft Warning (aceitar + sinalizar)                           | Estratégia A: bloquear o lançamento duplicado                  | O usuário pode ter motivo legítimo para dois registros idênticos (ex: dois abastecimentos de mesmo valor no mesmo dia). Bloquear causaria fricção. O warning permite que o usuário decida.                                                                                                                     |
| Verificação após o insert (não antes)                                       | Verificar antes do insert e só inserir se não houver duplicata | Verificar antes cria race condition: dois requests simultâneos passariam ambos pela verificação sem encontrar duplicata e ambos seriam inseridos. Verificar após é mais simples e o comportamento é correto — o segundo lançamento é salvo e sinalizado.                                                       |
| Strategy Pattern configurável descrito na spec                              | Hard-code da lógica no service                                 | Deixar a estratégia injetável facilita futura troca para "bloquear" sem alterar o service. Porém, para esta v1 o comportamento é fixo (Soft Warning) — a interface pode ser adicionada em refactor posterior.                                                                                                  |
| Critério de duplicata: 4 campos exatos (vehicle_id, date, amount, category) | 3 campos (sem amount), ou 5 campos (incluindo description)     | 4 campos cobrem o caso de uso principal (mesma despesa acidental). Incluir `description` seria restritivo demais (descrições ligeiramente diferentes não evitariam o warning). Excluir `amount` seria permissivo demais (mesma categoria no mesmo dia com valores diferentes não é necessariamente duplicata). |
| Método `findPotentialDuplicate` no `ExpenseRepositoryPort`                  | Query inline no service                                        | Segue o padrão Repository existente; mantém o service testável com mocks; isola a query de banco na camada de infraestrutura.                                                                                                                                                                                  |

---

## Apêndice

### Referências

- `apps/api/src/modules/expenses/expenses.service.ts` — service atual sem verificação de duplicata
- `apps/api/src/modules/expenses/repositories/expense.repository.port.ts` — interface a ser estendida com `findPotentialDuplicate`
- `apps/api/src/modules/expenses/repositories/supabase-expense.repository.ts` — implementação do repositório com padrão Supabase a seguir
- `packages/validators/src/expenses.schema.ts` — schema Zod com os campos `vehicle_id`, `category`, `amount`, `date`
- `supabase/migrations/20260310000000_init_schema_and_rls.sql` — schema da tabela `expenses` com `deleted_at TIMESTAMPTZ`
- `SPEC-20260531-001` — Dashboard redesign que depende de totais de despesas confiáveis (KPI "Gastos do mês")

### Contexto para Agentes de IA

Ao implementar esta spec, siga as instruções abaixo para manter consistência com o restante do projeto:

**Arquitetura:**

- Padrão obrigatório: Controller → Service → RepositoryPort (abstract class) → SupabaseRepository (implementação)
- Novo método no Port → nova implementação no Supabase → Service chama o Port (nunca a implementação diretamente)
- Ver `docs/architecture/overview.md` para diagrama completo de camadas

**Validação:**

- Regras estáticas (tipos, ranges, formatos): `packages/validators/src/expenses.schema.ts` (Zod)
- Regras com consulta ao banco (ex: verificação de duplicata): no Service, não no schema Zod

**Testes:**

- Framework: Jest + ts-jest (API), Vitest (Web)
- Padrão de nomenclatura: `describe('RF-01: ...')` para requisitos, `describe('EC-01: ...')` para edge cases
- Seguir ciclo TDD: RED → GREEN → REFACTOR
- Padrão AAA: Arrange / Act / Assert em cada `it()`
- Mocks do repositório: usar `jest.Mocked<ExpenseRepositoryPort>` com `jest.fn()`
- **Nunca** mockar o banco diretamente — apenas mockar a porta abstrata

**Convenções de nomenclatura:**

- Métodos do Port em camelCase inglês: `findPotentialDuplicate`, `findMaxOdometerByVehicle`
- DTOs: `CreateExpenseDto`, `UpdateExpenseDto` (classe NestJS) com decorators `@ApiProperty`
- Schemas Zod: `createExpenseInputSchema`, `updateExpenseInputSchema` em `@navestory/validators`

**Referência de contexto:**

- `docs/architecture/overview.md` — stack, padrões e ADRs
- `apps/api/src/modules/expenses/expenses.service.ts` — padrão de service do domínio
- `apps/api/src/modules/expenses/repositories/expense.repository.port.ts` — padrão de Port

### Histórico de Revisões

| Versão | Data       | Autor   | Mudanças                                 |
| ------ | ---------- | ------- | ---------------------------------------- |
| 1.0    | 2026-06-01 | douglps | Criação inicial                          |
| 1.1    | 2026-06-02 | douglps | Adicionada seção "Contexto para Agentes" |

---

## Relatório de Avaliação de Qualidade

### Score Final: **92 / 100** — Excelente (pronta para implementação imediata)

#### Breakdown por Dimensão

| Dimensão      | Peso | Pontos obtidos | Pontos possíveis | Observações                                                                                                                                                                                                                                                                                                                |
| ------------- | ---- | -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completude    | 30%  | 29             | 30               | Todas as seções 1–15 preenchidas; 6 RFs com IDs, prioridades e critérios de aceite mensuráveis; 7 non-goals explícitos. Desconto mínimo: OQ-01 sobre janela temporal ainda aberta.                                                                                                                                         |
| Testabilidade | 25%  | 24             | 25               | Fluxo principal com 7 passos; 3 fluxos alternativos detalhados; métricas numéricas (< 30 ms P95, 100% detecção, 0% bloqueios). Desconto: métrica de taxa de duplicatas sem baseline histórico mensurável.                                                                                                                  |
| Clareza       | 20%  | 20             | 20               | Sujeito claro em todos os RFs ("o repositório deve", "o `ExpensesService` deve"); sem termos vagos; ambiguidades documentadas na seção 14; critério de 4 campos exatos bem definido.                                                                                                                                       |
| Escopo        | 15%  | 14             | 15               | 7 non-goals cobrindo fuzzy matching, PATCH, deduplicação automática, constraint de banco e UI. Dependências mapeadas; rollback cirúrgico definido. Desconto mínimo: estratégia configurável (Strategy Pattern) mencionada como possível futura melhoria mas não especificada — poderia gerar expectativa de implementação. |
| Edge Cases    | 10%  | 10             | 10               | 7 edge cases com trigger e comportamento definido; EC-05 cobre falha de banco com degradação graciosa; EC-06 cobre precisão numérica de NUMERIC(10,2).                                                                                                                                                                     |

#### Gaps Identificados

| Prioridade  | Gap                                                                                                                                  | Impacto                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baixo       | OQ-01: janela temporal da busca não resolvida (histórico completo vs. N dias)                                                        | Para lançamentos recorrentes (ex: IPVA anual), histórico completo pode gerar falsos positivos no próximo ano. Recomendação: começar com histórico completo e ajustar se rate de falsos positivos for alto. |
| Baixo       | OQ-02: múltiplas duplicatas pré-existentes — retornar primeira ou lista                                                              | Cosmético; primeira é suficiente para o caso de uso primário.                                                                                                                                              |
| Muito baixo | Strategy Pattern mencionado como "pode ser adicionado em refactor posterior" sem spec — pode criar expectativa sem contrato definido | Risco de scope creep se implementador decidir implementar a interface já. Sugestão: remover a menção ou mover para NG-08.                                                                                  |
