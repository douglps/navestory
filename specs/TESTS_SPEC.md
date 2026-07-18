# Estratégia de Testes — Nave SaaS

---

## Níveis e Ferramentas

| Nível | Ferramenta | Localização | Quando rodar |
|-------|-----------|-------------|-------------|
| Unitário | Jest + ts-jest (API) / Vitest (Web) | `*.spec.ts`, `*.test.tsx` | A cada commit |
| Integração | Jest + Supabase real (sem mocks de BD) | `*.repository.spec.ts` | A cada commit |
| Contrato | Verificação de response shape vs. spec | a implementar (Fase 4) | CI |
| E2E | Playwright | `apps/web/e2e/` | CI, antes de deploy |

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

| ID | O que valida | Regra | Localização |
|----|-------------|-------|------------|
| CT-001 | Despesa com odômetro menor que o último registrado gera `odometer_warning: true` | R1 | `expenses.service.spec.ts` |
| CT-002 | Despesa com campos idênticos sem `confirmed: true` gera `duplicate_warning: true` | R2 | `expenses.service.spec.ts` |
| CT-003 | Criação do 21º template falha com 422 | R3 | `expense-templates.service.spec.ts` |
| CT-004 | Despesa de categoria `fuel` sem `odometer_km` falha com 400 | R4 | `expenses.service.spec.ts` |
| CT-005 | Transição de manutenção inválida (ex: `completed → in_progress`) falha com 409 | R7 | `maintenance.service.spec.ts` |
| CT-006 | Rota privada sem JWT retorna 401 | S1 | `auth.guard.spec.ts` |
| CT-007 | Acesso a recurso de outro usuário retorna 403 (RLS) | S2 | testes de repositório |

---

## Nomenclatura de Describes

```ts
// Edge case de spec — prefixo EC-XX
describe('EC-01: odômetro retroativo gera warning, não bloqueia') // valida R1

// Regressão — prefixo REG-XX (bug corrigido que não pode voltar)
describe('REG-01: SelectValue exibe label, não value bruto')

// Happy path — descreve o comportamento esperado
describe('cria despesa com todos os campos válidos')
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

| Tipo | Localização | Uso |
|------|-------------|-----|
| Factories | `apps/api/test/factories/` | Criar entidades com defaults válidos |
| Fixtures Zod | `packages/validators/src/__fixtures__/` | Payloads de entrada válidos e inválidos |
| Seeds de BD | `supabase/seed.sql` | Estado inicial para testes de integração |

**Regra:** dados de teste nunca devem depender de estado externo — cada suite cria e limpa seus próprios dados.

---

## Rodando os Testes

```bash
# Todos os testes (unit + integração)
pnpm test

# Apenas a API
pnpm --filter @nave/api test

# Apenas o Web
pnpm --filter @nave/web test

# Com coverage
pnpm test:coverage

# Watch mode (desenvolvimento)
pnpm test:watch
```
