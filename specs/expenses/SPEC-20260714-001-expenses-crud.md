---
id: SPEC-20260714-001
title: "CRUD Base de Despesas (ExpensesModule)"
status: approved
date: 2026-07-14
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R2, R4, R5, R-EXP-01, R-ODO-02, R-LED-01, R-LED-04, R-SAN-01, R-SAN-02, R-SAN-04, R-VEH-01]
security: [S1, S2, C2]
---

# SPEC-20260714-001: CRUD Base de Despesas (ExpensesModule)

**Status:** Aprovada
**Criada em:** 2026-07-14
**Atualizada em:** 2026-07-14
**Autor:** Douglas Lopes (lps.doug@protonmail.com)
**Revisores:** douglps

---

## Contexto

Despesa (`expense`) é a entidade financeira central do Nave SaaS — todas as análises, exports, KPIs e o hub financeiro unificado (ADR-006) dependem da existência de registros em `public.expenses`. A tabela foi criada e está aplicada em produção via `supabase/migrations/20260712171830_core_tables.sql`, mas **nenhum módulo de aplicação foi implementado ainda** para expor operações CRUD sobre ela.

As 14 specs existentes em `specs/expenses/` (SPEC-20260521-003 a SPEC-20260612-002) estendem comportamentos do módulo de despesas, assumindo implicitamente que o `ExpensesModule` já existe. Esta spec formaliza o contrato base que as demais specs estendem e que a Fase 3 do roadmap (`docs/IMPLEMENTATION_STRATEGY.md`) vai implementar.

O schema já inclui colunas para fuel enrichment (`fuel_type`, `liters`, `full_tank`, `supplier`) e para o ledger polimórfico (`source_type`, `source_id`, `is_readonly`). Esta spec cobre apenas o CRUD manual básico; as lógicas de enrichment e de criação/remoção automática via ledger são objeto de outras specs (SPEC-20260606-001, SPEC-20260606-002, ADR-006 Fase 3).

---

## Objetivo

Implementar o `ExpensesModule` no backend NestJS e as páginas mínimas de listagem e formulário no frontend Next.js, permitindo que o usuário autenticado crie, visualize, edite e exclua despesas manuais vinculadas a seus veículos.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | `POST /expenses` cria uma despesa manual com os campos obrigatórios: `vehicle_id` (UUID do veículo do usuário), `category` (string de categoria padrão ou personalizada), `amount` (valor monetário em BRL), `date` (data da despesa no formato `YYYY-MM-DD`) | Alta |
| RF-02 | `POST /expenses` aceita os campos opcionais: `description` (texto livre, máx 500 chars), `odometer_km` (inteiro, ver R1, R4, R-ODO-02), `fuel_type` (enum `FuelType` ou null), `liters` (numeric ou null), `full_tank` (boolean tri-state ou null), `supplier` (texto livre, máx 100 chars, ver R-FUEL-04) | Alta |
| RF-03 | `GET /expenses` retorna lista paginada (`page`, `limit`, default limit 20, máximo 100 — P1) de despesas ativas (`deleted_at IS NULL`) do usuário autenticado, ordenadas por `date` descendente; suporta filtros opcionais: `vehicle_id`, `category`, `date_from` (`YYYY-MM-DD`), `date_to` (`YYYY-MM-DD`) | Alta |
| RF-04 | `GET /expenses/:id` retorna os dados completos de uma despesa específica ativa do usuário; retorna 404 se inexistente, soft-deletada ou de outro usuário | Alta |
| RF-05 | `PATCH /expenses/:id` atualiza campos editáveis de uma despesa manual (`category`, `amount`, `date`, `description`, `odometer_km`, `fuel_type`, `liters`, `full_tank`, `supplier`); operação parcial (só campos enviados são atualizados); retorna 404 se não encontrada ou de outro usuário | Alta |
| RF-06 | `DELETE /expenses/:id` aplica soft-delete (`deleted_at = NOW()`) na despesa; retorna 204 sem corpo; retorna 404 se não encontrada ou de outro usuário | Alta |
| RF-07 | `POST /expenses` e `PATCH /expenses/:id` retornam 403 para despesas com `is_readonly = true` (R-LED-01) — despesas vinculadas ao ledger polimórfico não são editáveis via esta API | Alta |
| RF-08 | `POST /expenses` aceita `odometer_km` e persiste sem validação de sequência nesta spec — a checagem R1 (soft warning não-bloqueante via exceção + flag `confirmed`) é implementada por completo em SPEC-20260601-001 (T3.2), que estende este `ExpensesService.create()`/`update()` | Alta |
| RF-09 | `POST /expenses` com `vehicle_id` que não pertence ao usuário autenticado retorna 404 (não 403, para não vazar existência de outros veículos) | Alta |
| RF-10 | Toda mutação (create, update, delete) registra entrada em `audit_logs` com `action`, `table_name = 'expenses'`, `record_id`, `changes` (C2); campos omitidos: `user_id` (segue R-MON-02) | Alta |
| RF-11 | Página `/expenses` (frontend) exibe lista de despesas com colunas: data, categoria, veículo, valor; suporta filtro por veículo via context global (R-CTX-03); link para `/expenses/new` | Alta |
| RF-12 | Página `/expenses/new` (frontend) exibe `ExpenseForm` com os campos obrigatórios e opcionais; pré-preenche `vehicle_id` a partir do contexto global quando disponível (R-CTX-06); ao salvar com sucesso, redireciona para `/expenses` (R-FORM-04) | Alta |
| RF-13 | Página `/expenses/[id]/edit` (frontend) carrega os dados da despesa e exibe `ExpenseForm` em modo edição; campo `vehicle_id` não é editável após criação | Média |
| RF-14 | Resposta de `POST /expenses` e `GET /expenses/:id` inclui campo `computed` com `price_per_liter` (R-FUEL-03) e `km_per_liter` (R-FUEL-02) quando calculáveis; `null` nos demais casos — **fica ⏳ para SPEC-20260606-001 (fuel enrichment)**, incoerente implementar aqui já que esta spec declara o cálculo de km/L fora de escopo | Baixa |
| RF-15 | `GET /expenses` suporta paginação por `cursor` (UUID do último registro recebido) como alternativa ao `page` offset — para uso futuro de scroll infinito no mobile | Baixa |

---

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Performance | `GET /expenses` com até 200 registros em p95 < 300 ms; listagem usa índice em `(user_id, date DESC, deleted_at)` |
| RNF-02 | Segurança | Toda rota exige JWT válido via `SupabaseAuthGuard` (S1); RLS `auth.uid() = user_id` ativo na tabela `expenses` (S2) |
| RNF-03 | Isolamento | Nenhuma operação expõe ou modifica despesas de outro usuário; filtros por `user_id` são sempre aplicados no service e reforçados por RLS |
| RNF-04 | Integridade | Campos `source_type`, `source_id` e `is_readonly` nunca são aceitos como input da API pública nesta fase; se enviados, são silenciosamente ignorados |
| RNF-05 | Soft-delete | Registros com `deleted_at IS NOT NULL` são invisíveis por padrão em todas as listagens e consultas por ID (R5) |
| RNF-06 | Cascade de veículo | Ao aplicar soft-delete em um veículo (R-VEH-01), todas as despesas com aquele `vehicle_id` também recebem `deleted_at` com o mesmo timestamp — responsabilidade do `VehiclesService`, não do `ExpensesModule` |

---

## Critérios de Aceite

- [ ] CA-01: `POST /expenses` com `{ vehicle_id, category: "fuel", amount: 150.00, date: "2026-07-14", odometer_km: 50000 }` retorna 201 com o registro criado e `id` UUID
- [ ] CA-02: `POST /expenses` com `amount: 0` retorna 400 (R-EXP-01 — valor mínimo 0,01)
- [ ] CA-03: `POST /expenses` com `amount: 100000001` retorna 400 (R-EXP-01 — valor máximo 100.000.000,00)
- [ ] CA-04: `POST /expenses` com `odometer_km: 10000000` retorna 400 (R-ODO-02 — máximo 9.999.999)
- [ ] CA-05: `POST /expenses` com `odometer_km` menor que o maior valor já registrado para o mesmo veículo é aceito e persistido sem bloqueio (a checagem/warning de R1 é objeto de SPEC-20260601-001, T3.2 — fora do escopo desta spec)
- [ ] CA-06: `GET /expenses` não retorna despesas com `deleted_at IS NOT NULL`
- [ ] CA-07: `GET /expenses` com `vehicle_id` de outro usuário na query string retorna lista vazia (não 403)
- [ ] CA-08: `GET /expenses/:id` para despesa de outro usuário retorna 404
- [ ] CA-09: `PATCH /expenses/:id` para despesa com `is_readonly = true` retorna 403 (R-LED-01)
- [ ] CA-10: `DELETE /expenses/:id` para despesa com `is_readonly = true` retorna 403 (R-LED-01)
- [ ] CA-11: `DELETE /expenses/:id` seta `deleted_at`; `GET /expenses/:id` para o mesmo ID retorna 404
- [ ] CA-12: `POST /expenses` com `vehicle_id` de veículo de outro usuário retorna 404
- [ ] CA-13: `PATCH /expenses/:id` com `{ amount: 200.00 }` atualiza apenas `amount`; demais campos permanecem inalterados
- [ ] CA-14: `POST /expenses` com `fuel_type: "invalid_value"` retorna 400 (enum inválido — R-FUEL-01)
- [ ] CA-15: Toda criação de despesa gera entrada em `audit_logs` com `action = 'INSERT'`, `table_name = 'expenses'`, `record_id` igual ao UUID da despesa criada
- [ ] CA-16: `GET /expenses?limit=101` retorna 400 ou aplica cap de 100 (P1)
- [ ] CA-17: `GET /expenses` sem filtros retorna apenas despesas do usuário autenticado, mesmo que existam despesas de outros usuários no banco

---

## Fora de Escopo

- Criação de despesas via ledger polimórfico (`createFromSource` / `softDeleteBySource`) — objeto de specs EPIC-FIN-001 (T3.8, T3.9, T3.10)
- Lógica de enriquecimento de abastecimento (cálculo de km/L real, price_per_liter persistido, histórico de fornecedor) — SPEC-20260606-001, SPEC-20260606-002
- Validação de sequência de odômetro (`R1`, soft warning via exceção + `confirmed`) — SPEC-20260601-001 (T3.2); esta spec apenas persiste `odometer_km` sem checagem
- Validação de sequência de odômetro por janela de ciclo (`R-ODO-04`) — SPEC-20260711-001
- Detecção de duplicata com confirmação (`confirmed: true`) — SPEC-20260601-002
- Sistema de modelos rápidos (`expense_templates`) — SPEC-20260601-003
- Export CSV — SPEC-20260521-003, SPEC-20260609-003
- KPIs financeiros, upcoming costs, alertas — SPEC-20260608-001, SPEC-20260608-002, SPEC-20260608-003
- Filtro avançado por múltiplas categorias ou ranges de valor
- Upload de comprovante/foto de nota fiscal
- Compartilhamento de despesas entre usuários

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260602-002 | `VehiclesModule` — `vehicle_id` de toda despesa referencia um veículo do usuário; soft-delete em cascata gerenciado pelo `VehiclesService` |
| Spec | SPEC-20260602-004 | `CategoriesModule` — `GET /categories` provê as categorias válidas (padrão + personalizadas) que o formulário e o service consultam |
| Spec | SPEC-20260601-001 | Validação de odômetro (R1) — spec futura (T3.2) que estende `ExpensesService.create()`/`update()` desta spec com a checagem `findMaxOdometerByVehicle`; não implementada aqui |
| Spec | SPEC-20260521-001 | Hardening de segurança — S1, S2, C2 aplicados aqui |
| Spec | SPEC-20260521-004 | LGPD — `DELETE /users/me` em cascata via FK `expenses.user_id → profiles(id) ON DELETE CASCADE` |
| ADR | ADR-006 | Ledger unificado — define `source_type`, `source_id`, `is_readonly` como somente-leitura nesta fase; R-LED-01 e R-LED-04 são restrições desta spec |
| Validador | `@nave/validators` | `createExpenseInputSchema`, `updateExpenseInputSchema`, `expenseBaseSchema`, `expenseRowSchema` — a serem criados em `packages/validators/src/expense.schemas.ts` seguindo o padrão do projeto (Zod, `.trim()`, `.normalize('NFC')` em strings — R-SAN-01, R-SAN-02) |
| DB | `public.expenses` | Migration `20260712171830_core_tables.sql` — schema aplicado, não alterar |
| DB | `uq_expenses_source` | Índice único parcial `WHERE deleted_at IS NULL` em `(source_type, source_id)` — já aplicado; relevante apenas para specs futuras do ledger |

---

## Notas Técnicas

### Camadas de implementação

Seguir o padrão estabelecido pelos módulos `VehiclesModule` e `CategoriesModule`:

```
ExpensesController (apps/api/src/modules/expenses/)
  → ExpensesService
    → ExpensesRepositoryPort (interface)
      → SupabaseExpensesRepository (implementação)
```

O `ExpensesController` segue o mesmo contrato de `VehiclesController`: extrai `accessToken` do header `Authorization: Bearer` (fallback para cookie `nave_access_token`), passa para o service, retorna `{ data: result }`.

### Campos somente-leitura via API pública

Os campos `source_type`, `source_id` e `is_readonly` **nunca devem aparecer nos schemas de input** (`createExpenseInputSchema` / `updateExpenseInputSchema`). O `createExpenseInputSchema` define `is_readonly: false` fixo; o service não aceita override desses campos.

### Proteção de despesas readonly (R-LED-01)

O `ExpensesService.update()` e `ExpensesService.remove()` devem buscar o registro primeiro; se `is_readonly = true`, lançam `ForbiddenException` antes de qualquer mutação.

### Schema Zod de validação

O `expenseBaseSchema` deve incluir:
- `vehicle_id`: `z.string().uuid()` (R-SAN-04)
- `category`: `z.string().trim().min(1).max(100)` (R-SAN-01)
- `amount`: `z.number().min(0.01).max(100_000_000)` (R-EXP-01)
- `date`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` — validado como data ISO
- `description`: `z.string().trim().normalize('NFC').max(500).nullable().optional()` (R-SAN-01, R-SAN-02)
- `odometer_km`: `z.number().int().min(0).max(9_999_999).nullable().optional()` (R-ODO-02)
- `fuel_type`: enum `FuelType` nullable/optional (R-FUEL-01)
- `liters`: `z.number().positive().nullable().optional()`
- `full_tank`: `z.boolean().nullable().optional()` (R-FUEL-06)
- `supplier`: `z.string().trim().max(100).nullable().optional()` (R-FUEL-04, R-SAN-01)

### Paginação

`GET /expenses` aceita `page` (integer, default 1), `limit` (integer, default 20, max 100 — P1) e os filtros opcionais. A resposta inclui envelope `{ data: [...], meta: { total, page, limit, has_next } }`.

### Audit log

Usar `AuditService` já implementado no projeto (R-MON-01 — fire-and-forget, erros nunca propagam). Campos `user_id` e outros PII são omitidos do campo `changes` (R-MON-02).

### Frontend — ExpenseForm

O `ExpenseForm` é um componente React Hook Form com `mode: 'onBlur'` e `reValidateMode: 'onChange'` (R-FORM-01). Usa `FormField` + `Controller` para todos os campos (R-FORM-02). `amount` usa `CurrencyInput` (R-FORM-03). Implementa dirty check com `AlertDialog` ao cancelar (R-FORM-05). Retorna `ActionResult` via Server Action (R-FORM-06). Se não há veículos cadastrados, exibe empty state com CTA (R-FORM-07).

---

## Regras de Domínio Referenciadas

> Ver `specs/RULES.md` para definição completa.

| ID | Resumo |
|----|--------|
| R2 | Despesas com mesmos `vehicle_id`, `category`, `amount` e `date` exigem confirmação — implementado em SPEC-20260601-002; esta spec apenas não bloqueia a criação quando `confirmed: true` for passado |
| R4 | `odometer_km` é obrigatório para despesas de `category = "fuel"` |
| R5 | Soft-delete via `deleted_at`; registros com `deleted_at IS NOT NULL` são invisíveis em todas as listagens |
| R-EXP-01 | `amount` entre 0,01 e 100.000.000,00 (inclusive) |
| R-ODO-02 | `odometer_km` máximo 9.999.999 (7 dígitos) |
| R-LED-01 | Despesas com `source_type IS NOT NULL` têm `is_readonly = true`; PATCH e DELETE retornam 403 |
| R-LED-04 | `source_type` e `source_id` sempre definidos juntos — constraint `expenses_source_coherence_check` no banco; nunca expostos via input da API pública nesta fase |
| R-SAN-01 | Campos de texto livre aplicam `.trim()` antes de validação |
| R-SAN-02 | Campos de texto livre aplicam `.normalize('NFC')` |
| R-SAN-04 | Parâmetros de ID validados como UUID antes de uso |
| R-VEH-01 | Soft-delete de veículo em cascata — responsabilidade do `VehiclesService`; `ExpensesModule` expõe método `softDeleteByVehicle(vehicleId, deletedAt)` para uso interno |

---

## Histórico de Revisões

| Data | Versão | Mudança | Autor |
|------|--------|---------|-------|
| 2026-07-14 | 1.0 | Criação inicial — spec base para Fase 3 (T3.1+); formaliza CRUD manual que todas as specs de despesas assumem como pré-existente | Douglas Lopes (lps.doug@protonmail.com) |
