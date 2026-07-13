---
id: SPEC-20260603-002
title: "Transições de Status de Manutenção"
status: approved
date: 2026-06-03
author: douglps
rules: [R5, R7]
security: [S1, S2]
compliance: [C2]
---

# SPEC-20260603-002: Transições de Status de Manutenção

**Status:** Aprovada
**Criada em:** 2026-06-03
**Atualizada em:** 2026-06-03
**Autor:** douglps
**Revisores:** —

---

## Contexto

O domínio de manutenções (`maintenances`) expõe a coluna `status` com quatro valores possíveis: `pending`, `in_progress`, `completed` e `cancelled`. O banco de dados valida apenas que o valor inserido pertença a esse conjunto via `CHECK constraint`, mas não impede transições inválidas entre estados — por exemplo, reabrir uma manutenção já concluída (`completed → in_progress`) é estruturalmente aceito pelo banco sem nenhuma restrição adicional.

A regra de domínio R7 (conforme `specs/RULES.md`) define o grafo de transições válidas. Esta spec documenta o comportamento esperado, o ponto de enforcement na camada de serviço e os critérios de aceite associados.

### Discrepância entre R7 e o schema de banco

A versão anterior de R7 em `specs/RULES.md` mencionava `scheduled` como estado inicial. O schema de banco (`supabase/migrations/20260312000000_maintenance_schema.sql`) define:

```sql
status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
```

O valor `scheduled` nunca existiu na base de dados. A resolução adotada nesta spec — e que deve ser retroativamente aplicada a R7 — é **conservadora**: R7 e toda a documentação passam a utilizar `pending` como estado inicial, alinhando-se ao schema real sem necessidade de migration. Uma renomeação `pending → scheduled` seria uma breaking change desnecessária neste estágio.

## Objetivo

Garantir que toda tentativa de atualização de `status` em `PATCH /maintenances/:id` passe por validação de transição no `MaintenancesService` (NestJS), antes de qualquer operação no banco de dados. Transições fora do grafo definido devem ser rejeitadas com `HTTP 409 Conflict` e mensagem descritiva.

## Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | `MaintenancesService.update()` valida a transição de status quando o campo `status` está presente no payload de atualização | Alta |
| RF-02 | Transições permitidas a partir de `pending`: `in_progress`, `completed`, `cancelled` | Alta |
| RF-03 | Transições permitidas a partir de `in_progress`: `completed`, `cancelled` | Alta |
| RF-04 | A partir de `completed`, nenhuma transição é permitida (estado terminal) | Alta |
| RF-05 | A partir de `cancelled`, nenhuma transição é permitida (estado terminal) | Alta |
| RF-06 | Transições para o mesmo status atual (ex.: `pending → pending`) são rejeitadas como inválidas | Média |
| RF-07 | Quando `status` não estiver no payload de atualização, a validação de transição é ignorada | Alta |
| RF-08 | O status atual (`status_atual`) é recuperado do banco antes da validação, nunca assumido pelo caller | Alta |
| RF-09 | A resposta de erro HTTP 409 inclui a mensagem no formato `"Transição inválida: {status_atual} → {status_novo}"` | Média |
| RF-10 | O audit log (`C2`) é gravado apenas após transição bem-sucedida; transições rejeitadas não produzem entrada em `audit_logs` | Alta |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|-------------------|
| RNF-01 | A validação de transição não adiciona roundtrip extra ao banco quando o status não muda | O `findOne()` já existente para verificar propriedade (ownership) é reutilizado para ler o status atual; nenhuma query adicional é necessária |
| RNF-02 | A lógica do grafo de transições é encapsulada em função pura e testável de forma isolada | Função `isValidTransition(from, to): boolean` ou constante `ALLOWED_TRANSITIONS: Record<string, string[]>` em arquivo utilitário do módulo |
| RNF-03 | O `CHECK constraint` de banco permanece como segunda linha de defesa; esta spec não remove nem altera a constraint existente | Schema de banco inalterado |
| RNF-04 | Compatibilidade com o campo `status` padrão `pending` na criação via `POST /maintenances` | Criação não valida transição — o estado inicial é sempre `pending` e não há "estado anterior" |

## Critérios de Aceite

- [ ] **CA-01** — `PATCH /maintenances/:id` com `{ status: "in_progress" }` em uma manutenção `pending` retorna `HTTP 200` com o registro atualizado.
- [ ] **CA-02** — `PATCH /maintenances/:id` com `{ status: "completed" }` em uma manutenção `pending` retorna `HTTP 200`.
- [ ] **CA-03** — `PATCH /maintenances/:id` com `{ status: "cancelled" }` em uma manutenção `pending` retorna `HTTP 200`.
- [ ] **CA-04** — `PATCH /maintenances/:id` com `{ status: "completed" }` em uma manutenção `in_progress` retorna `HTTP 200`.
- [ ] **CA-05** — `PATCH /maintenances/:id` com `{ status: "cancelled" }` em uma manutenção `in_progress` retorna `HTTP 200`.
- [ ] **CA-06** — `PATCH /maintenances/:id` com `{ status: "in_progress" }` em uma manutenção `completed` retorna `HTTP 409` com body `{ statusCode: 409, message: "Transição inválida: completed → in_progress" }`.
- [ ] **CA-07** — `PATCH /maintenances/:id` com `{ status: "pending" }` em uma manutenção `completed` retorna `HTTP 409`.
- [ ] **CA-08** — `PATCH /maintenances/:id` com `{ status: "in_progress" }` em uma manutenção `cancelled` retorna `HTTP 409`.
- [ ] **CA-09** — `PATCH /maintenances/:id` com `{ status: "pending" }` em uma manutenção `cancelled` retorna `HTTP 409`.
- [ ] **CA-10** — `PATCH /maintenances/:id` com `{ status: "pending" }` em uma manutenção `pending` retorna `HTTP 409` (transição para o mesmo estado é inválida).
- [ ] **CA-11** — `PATCH /maintenances/:id` sem campo `status` no payload atualiza outros campos (ex.: `description`) sem acionar validação de transição.
- [ ] **CA-12** — A mensagem de erro segue exatamente o formato `"Transição inválida: {de} → {para}"` com o caractere `→` (U+2192).
- [ ] **CA-13** — `POST /maintenances` cria registro com `status: "pending"` sem acionar validação de transição.
- [ ] **CA-14** — Transição válida (`pending → in_progress`) grava entrada em `audit_logs` com `action: "UPDATE"`, `table_name: "maintenances"` e `record_id` correto.
- [ ] **CA-15** — Transição rejeitada (`completed → in_progress`) não grava nenhuma entrada em `audit_logs`.

## Fora de Escopo

- Alteração do schema de banco (nenhuma migration necessária).
- Renomeação de `pending` para `scheduled` (descartada — ver seção Contexto).
- Validação de transição no frontend (o formulário de manutenção pode apresentar apenas os próximos estados válidos como UX progressiva, mas esta spec cobre apenas o enforcement no backend).
- Transições iniciadas por jobs automatizados (ex.: Edge Function de alertas — SPEC-20260521-002); esses jobs atualizam apenas `alert_sent`, não `status`.
- Restrições de negócio adicionais baseadas em datas (ex.: impedir `completed` se `completion_date` estiver no futuro) — escopo de spec futura.

## Dependências

| Tipo | Referência | Descrição |
|------|------------|-----------|
| Regra de domínio | R7 (`specs/RULES.md`) | Define o grafo de transições; deve ser atualizada para substituir `scheduled` por `pending` |
| Regra de domínio | R5 (`specs/RULES.md`) | Soft-delete: registros com `deleted_at IS NOT NULL` retornam 404 antes de qualquer validação de transição |
| Segurança | S1 (`specs/RULES.md`) | `SupabaseAuthGuard` deve estar ativo no controller de manutenções |
| Segurança | S2 (`specs/RULES.md`) | RLS garante que o `findOne()` de leitura de status atual já filtra pelo `user_id` |
| Compliance | C2 (`specs/RULES.md`) | Audit log obrigatório em mutações bem-sucedidas |
| Schema de banco | `supabase/migrations/20260312000000_maintenance_schema.sql` | Define `status TEXT NOT NULL DEFAULT 'pending' CHECK (...)` — permanece inalterado |
| Spec relacionada | [SPEC-20260521-002](SPEC-20260521-002.md) | Alertas por email operam sobre `alert_sent`, não sobre `status`; grafo de transições desta spec não interfere nos alertas |
| Módulo NestJS | `apps/api/src/modules/maintenances/maintenances.service.ts` | Ponto de enforcement da validação de transição |

## Notas Técnicas

### Grafo de transições (corrigido)

```
pending ──────► in_progress ──► completed (terminal)
    │                 │
    ├──────────────────┴──► cancelled (terminal)
    │
    └──────────────────────► completed (atalho direto)
```

Estados terminais (`completed`, `cancelled`) não possuem transições de saída. Qualquer tentativa de transição a partir deles é rejeitada com `HTTP 409`.

### Implementação sugerida no serviço

```typescript
// @spec SPEC-20260603-002 RF-01 RF-02 RF-03 RF-04 RF-05
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:     ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

function isValidTransition(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}
```

A verificação de transição deve ocorrer **após** o `findOne()` de ownership (que já retorna o registro completo com o `status` atual) e **antes** do `UPDATE` no banco. Nenhuma query adicional é necessária.

### Erro de domínio

Recomenda-se criar `InvalidStatusTransitionException` em `apps/api/src/modules/maintenances/exceptions/` estendendo `HttpException` com status `409` — seguindo o padrão `BusinessException` já estabelecido no projeto.

### Validação no schema Zod

O `updateMaintenanceSchema` (pacote `validators`) deve continuar aceitando qualquer valor válido de `status` (`z.enum(['pending','in_progress','completed','cancelled'])`). A restrição de grafo é responsabilidade exclusiva da camada de serviço, não da camada de validação de input.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 0.1 | 2026-06-03 | douglps | Rascunho inicial — grafo corrigido (`pending` em vez de `scheduled`), CA-01 a CA-15 definidos |
