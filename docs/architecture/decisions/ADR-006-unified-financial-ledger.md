# ADR-006: Padrão Polimórfico para Ledger Financeiro Unificado

## Status

Accepted

## Context

O navestory SaaS tem múltiplas origens de despesas financeiras: lançamentos manuais do usuário, custos gerados automaticamente pela conclusão de uma manutenção (`MaintenancesModule`), multas de trânsito (`FinesModule`) e custos anuais recorrentes como IPVA, CRLV e seguro (`RecurringCostsModule`).

Antes desta decisão, apenas despesas manuais existiam na tabela `expenses`. Conforme novos módulos foram adicionados, surgiram três estratégias arquiteturais possíveis para consolidar todas as despesas em uma visão única ("Hub Financeiro"):

1. **UNION VIEW**: criar uma VIEW SQL que faz `UNION ALL` entre `expenses`, `maintenances`, `fines` e `vehicle_recurring_costs`. Cada SELECT retorna campos mapeados para colunas comuns.
2. **Tabela de junção separada**: criar uma tabela `financial_ledger` que referencia registros de cada domínio via colunas FK separadas (`maintenance_id`, `fine_id`, `recurring_cost_id` — todas nullable).
3. **Padrão polimórfico (`source_type + source_id + is_readonly`)**: adicionar três colunas à tabela `expenses` existente: `source_type TEXT` (enum de origens), `source_id UUID` (FK polimórfica para o registro de origem) e `is_readonly BOOLEAN` (flag de imutabilidade para despesas vinculadas).

A decisão recaiu sobre a **opção 3**.

## Decision

Adotar o padrão polimórfico `source_type + source_id + is_readonly` na tabela `expenses` como mecanismo central do ledger unificado.

Os módulos geradores de despesas (`MaintenancesModule`, `FinesModule`, `RecurringCostsModule`) chamam `ExpensesService.createFromSource()` e `ExpensesService.softDeleteBySource()` para escrever e cancelar entradas no ledger sem acessar diretamente a tabela `expenses`.

Regras de domínio derivadas desta decisão (registradas em `specs/RULES.md`):

- **R-LED-01**: Expenses com `source_type IS NOT NULL` têm `is_readonly = true`; tentativas de PATCH ou DELETE retornam 403.
- **R-LED-02**: Criação de expense vinculada ocorre automaticamente ao criar uma multa (via `POST /fines`) ou ao concluir uma manutenção com custo.
- **R-LED-03**: Cancelamento do registro de origem (`cancelled`) soft-deleta a expense vinculada via `softDeleteBySource`.
- **R-LED-04**: `source_type` e `source_id` são sempre definidos juntos — enforced pela constraint `expenses_source_coherence_check` no banco. Essa constraint não existia no banco legado `NaveSaaS` (achado do IMPACTO-026, descontinuado); no projeto atual `navestory` ela já foi criada e verificada (IMPACTO-027 #5).
- **R-LED-05**: `vehicle_recurring_costs` com `paid_at` preenchido cria expense vinculada com `source_type = 'recurring_cost'`.
- **R-HUB-01**: Soft-delete de multa ou custo recorrente também soft-deleta a expense vinculada.
- **R-HUB-02**: `UNIQUE INDEX uq_expenses_source` garante no máximo uma expense ativa por `(source_type, source_id)` — operação idempotente.

## Consequences

**Facilita:**

- A tabela `expenses` continua sendo a única fonte de verdade para o hub financeiro. Queries de listagem, KPIs, CSV de exportação e filtros não precisam de JOIN com múltiplas tabelas — todos os dados financeiros já estão em `expenses`.
- Adicionar novas origens (ex: `toll`, `parking`) requer apenas: (1) um novo módulo que chame `createFromSource`, (2) adicionar o valor ao `CHECK` constraint de `source_type` — sem alteração na VIEW ou na tabela principal.
- O padrão é familiar no ecossistema Rails/Django (Polymorphic Associations) e bem documentado.
- RLS de `expenses` (`auth.uid() = user_id`) protege automaticamente as despesas vinculadas — sem necessidade de políticas extras.

**Dificulta:**

- Não há FK enforced no banco entre `source_id` e as tabelas de origem — a consistência referencial é responsabilidade da camada de serviço (`ExpensesService`). Registros órfãos (source deletado sem soft-delete da expense) são possíveis se o fluxo não chamar `softDeleteBySource`.
- O `UNIQUE INDEX uq_expenses_source` usa `WHERE deleted_at IS NULL`, o que significa que registros soft-deleted não liberam o slot na constraint. Reativar um registro cancelado exige garantir que `softDeleteBySource` foi chamado antes, caso contrário `createFromSource` falha com violação de unique.
- Queries que precisam exibir detalhes do registro de origem (ex: `LinkedExpenseDrawer`) devem fazer lookups separados em `fines` ou `vehicle_recurring_costs` usando `source_type` + `source_id` — não há JOIN direto por FK.
- O padrão polimórfico torna a auditoria de referências cruzadas mais complexa: não é possível usar `FOREIGN KEY` convencional para garantir integridade referencial no banco.

**Trade-offs aceitos:**

- A ausência de FK polimórfica é compensada pelo design de serviço: `createFromSource` e `softDeleteBySource` são os únicos pontos de escrita, evitando writes diretos à tabela. O `UNIQUE INDEX` atua como rede de segurança para criação dupla acidental.
- O índice já nasce parcial (`WHERE deleted_at IS NULL`, confirmado em IMPACTO-016 #3 e aplicado de fato em IMPACTO-027 #5) — isso é intencional, não uma limitação aceita: soft-deletar o registro de origem (ex: cancelar uma multa) libera o slot de unicidade automaticamente, permitindo recriar a expense vinculada se a mesma origem for reaberta, sem exigir hard-delete.

## References

- `specs/RULES.md` — R-LED-01 a R-LED-05, R-HUB-01, R-HUB-02, R-REC-01, R-REC-02
- `matrices/impacto.md` — IMPACTO-016 (decisão original), IMPACTO-026 (achado no legado `NaveSaaS`), IMPACTO-027 #5 (constraint aplicada e verificada no projeto `navestory`)
- `matrices/rastreabilidade.md` — seção EPIC-FIN-001

**Nota:** o projeto ainda não tem código-fonte (ver `docs/IMPLEMENTATION_STRATEGY.md`, Fase 3). Os caminhos-alvo de implementação (migration, `ExpensesService.createFromSource`/`softDeleteBySource`, consumidores em `FinesModule`/`RecurringCostsModule`) serão criados nessa fase — não referenciados aqui como se já existissem.
