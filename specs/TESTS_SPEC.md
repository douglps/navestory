# Estratégia de Testes — navestory SaaS

---

## Níveis e Ferramentas

| Nível      | Ferramenta                             | Localização               | Quando rodar        |
| ---------- | -------------------------------------- | ------------------------- | ------------------- |
| Unitário   | Jest + ts-jest (API) / Vitest (Web)    | `*.spec.ts`, `*.test.tsx` | A cada commit       |
| Integração | Jest + Supabase real (sem mocks de BD) | `*.repository.spec.ts`    | A cada commit       |
| Contrato   | Verificação de response shape vs. spec | a implementar (Fase 4)    | CI                  |
| E2E        | Playwright                             | `apps/web/e2e/`           | CI, antes de deploy |

> **Estratégia E2E:** a configuração do Playwright, os fluxos cobertos, o critério de seleção
> (E2E vs. unitário) e a integração com o CI estão formalizados em
> [SPEC-20260716-003](qa/SPEC-20260716-003-e2e-playwright.md). Esta tabela é o ponto de entrada
> da pirâmide; a spec é a fonte canônica dos requisitos de E2E.

**Regra inviolável:** testes de repositório nunca mocam o banco de dados — política ativa desde 2026-06-01.

---

## Pirâmide Alvo

```
         /  E2E  \         5% — fluxos críticos do usuário
        /----------\
       /  Contrato  \      a implementar — verificação response shape
      /--------------\
     /  Integração    \    25% — repository + supabase real
    /------------------\
   /     Unitários      \  70% — services, schemas, VOs, guards
  /______________________\
```

Threshold atual de cobertura: **88% unitário** (CI falha abaixo disso).

---

## Casos Críticos

| ID     | O que valida                                                                      | Regra | Localização                         |
| ------ | --------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| CT-001 | Despesa com odômetro menor que o último registrado gera `odometer_warning: true`  | R1    | `expenses.service.spec.ts`          |
| CT-002 | Despesa com campos idênticos sem `confirmed: true` gera `duplicate_warning: true` | R2    | `expenses.service.spec.ts`          |
| CT-003 | Criação do 21º template falha com 422                                             | R3    | `expense-templates.service.spec.ts` |
| CT-004 | Despesa de categoria `fuel` sem `odometer_km` falha com 400                       | R4    | `expenses.service.spec.ts`          |
| CT-005 | Transição de manutenção inválida (ex: `completed → in_progress`) falha com 409    | R7    | `maintenance.service.spec.ts`       |
| CT-006 | Rota privada sem JWT retorna 401                                                  | S1    | `auth.guard.spec.ts`                |
| CT-007 | Acesso a recurso de outro usuário retorna 403 (RLS)                               | S2    | testes de repositório               |

---

## Casos de Caminho Infeliz (auditoria 2026-07-20)

Gaps de teste identificados numa varredura de branches de erro não exercitadas apesar do
gate de 88% de cobertura.

> **Nota 2026-07-31:** R-TZ-04 já está implementada (`ExpensesService.create()` e
> `MaintenancesService.update()`, ambos com `@spec SPEC-20260715-002 R-TZ-04` anotado) — a exclusão
> anterior desta tabela estava desatualizada. Verificado que não há caso de teste dedicado a
> `future_date_warning`/422 na suíte atual — ver EC-12/EC-13 abaixo.

| ID        | O que valida                                                                                        | Regra                    | Prioridade | Localização                                  | Status                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------- | ------------------------ | ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| EC-01     | Transição de multa a partir de estado terminal (`paid`/`cancelled`) lança 409                       | grafo de status de fines | Alta       | `fines.service.spec.ts`                      | ✅                                                                                       |
| EC-05     | Cascade de soft-delete de veículo aplica o mesmo `deleted_at` em `expenses` e `maintenances`        | R-VEH-01                 | Alta       | `vehicles.service.spec.ts`                   | ✅                                                                                       |
| EC-06     | `update` de veículo com placa inválida lança 400                                                    | R-VEH-02                 | Alta       | `vehicles.service.spec.ts`                   | ✅                                                                                       |
| EC-07     | Transição de multa a partir de `appealing` (`→ paid`, `→ cancelled`) aplica corretamente            | grafo de status de fines | Média      | `fines.service.spec.ts`                      | ✅                                                                                       |
| EC-08     | `findRecent` de audit log remove campos de token de `changes`                                       | R-MON-02                 | Média      | `audit-logs.service.spec.ts`                 | ✅ (2026-07-21: `SENSITIVE_CHANGE_FIELDS` corrigido para incluir `access_token`/`token`) |
| EC-09/10  | Login inválido incrementa `failed_count`; login válido zera o contador                              | S4                       | Média      | `auth.service.spec.ts`                       | ✅                                                                                       |
| CT-004b   | `create` com `category=fuel` sem `odometer_km` lança 400 direto no service (não só no schema Zod)   | R4                       | Baixa      | `expenses.service.spec.ts`                   | ✅ (2026-07-21: guard imperativo adicionado em `ExpensesService.create`)                 |
| EC-11     | Hard-delete de usuário por admin não seta `deleted_at` (sem grace period)                           | C1                       | Baixa      | `admin.service.spec.ts`                      | ✅                                                                                       |
| RF-E2E-08 | Login com credenciais inválidas exibe alerta e mantém `/login`                                      | S1                       | Alta       | `apps/web/e2e/tests/auth.spec.ts`            |
| RF-E2E-09 | Cookie de sessão inválido em rota privada redireciona para `/login`                                 | S1, CT-006               | Média      | `apps/web/e2e/tests/auth.spec.ts`            |
| RF-E2E-10 | Usuário sem veículos: dialog de contexto exibe estado vazio                                         | R-CTX-07                 | Média      | `apps/web/e2e/tests/vehicle-context.spec.ts` |
| RF-E2E-11 | Busca sem resultado no dialog de contexto não trava a UI                                            | R-CTX-07                 | Baixa      | `apps/web/e2e/tests/vehicle-context.spec.ts` |
| EC-12     | Despesa criada com `occurred_at` futuro retorna `future_date_warning: true` sem bloquear a operação | R-TZ-04 (RF-BK-09)       | Média      | `expenses.service.spec.ts`                   | Pendente                                                                                 |
| EC-13     | `completion_date` de manutenção excedendo "agora" em mais de 24h lança 422                          | R-TZ-04 (RF-BK-10)       | Média      | `maintenances.service.spec.ts`               | Pendente                                                                                 |

---

## Nomenclatura de Describes

```ts
// Edge case de spec — prefixo EC-XX
describe("EC-01: odômetro retroativo gera warning, não bloqueia"); // valida R1

// Regressão — prefixo REG-XX (bug corrigido que não pode voltar)
describe("REG-01: SelectValue exibe label, não value bruto");

// Happy path — descreve o comportamento esperado
describe("cria despesa com todos os campos válidos");
```

Descrever em **pt-BR** o comportamento esperado. O ID da regra pode aparecer no describe ou no comentário acima.

---

## O que NÃO Testar

- Bibliotecas terceiras: Supabase JS Client, Zod internals, Next.js router
- UI cosmética: cores, espaçamentos, animações
- Tipos TypeScript: o compilador já garante isso
- Comportamento interno do Supabase Auth (login, refresh, sessão)
- Código trivial sem lógica: getters simples, construtores sem regras

---

## Dados de Teste

| Tipo         | Localização                             | Uso                                      |
| ------------ | --------------------------------------- | ---------------------------------------- |
| Factories    | `apps/api/test/factories/`              | Criar entidades com defaults válidos     |
| Fixtures Zod | `packages/validators/src/__fixtures__/` | Payloads de entrada válidos e inválidos  |
| Seeds de BD  | `supabase/seed.sql`                     | Estado inicial para testes de integração |

**Regra:** dados de teste nunca devem depender de estado externo — cada suite cria e limpa seus próprios dados.

---

## Rodando os Testes

```bash
# Todos os testes (unit + integração)
pnpm test

# Apenas a API
pnpm --filter @navestory/api test

# Apenas o Web
pnpm --filter @navestory/web test

# Com coverage
pnpm test:coverage

# Watch mode (desenvolvimento)
pnpm test:watch
```
