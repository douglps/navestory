# Visão Geral da Arquitetura — navestory SaaS

> Este documento é o "mapa do sistema" para desenvolvedores e agentes de IA. Referencia a stack, os padrões adotados, todos os ADRs vigentes e os pontos de entrada para specs e matrizes.

---

## Stack Técnica

| Camada         | Tecnologia                                                                                                                                                                                                                                                                                                                                                 | Versão |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Monorepo       | Turborepo + pnpm workspaces                                                                                                                                                                                                                                                                                                                                | —      |
| Backend        | NestJS                                                                                                                                                                                                                                                                                                                                                     | 11.x   |
| Frontend       | Next.js (App Router)                                                                                                                                                                                                                                                                                                                                       | 16.x   |
| Runtime JS     | React                                                                                                                                                                                                                                                                                                                                                      | 19.x   |
| Banco de dados | Supabase (PostgreSQL gerenciado) — **dois projetos ativos:** `navestory` (`sfkefpoanmoiagwxbwld`, schema de referência higienizado, criado 2026-07-12, sem dados de usuário) e `NaveSaaS` (`uetaprnvukgqtxlbfedk`, produção legada com achados de segurança do IMPACTO-026 ainda não corrigidos — pendente decisão de migração ou descomissionamento) | —      |
| Autenticação   | Supabase Auth + JWT (access 15min / refresh 7d)                                                                                                                                                                                                                                                                                                            | —      |
| Validação      | Zod (compartilhado entre frontend e backend)                                                                                                                                                                                                                                                                                                               | 4.x    |
| Testes (API)   | Jest + ts-jest                                                                                                                                                                                                                                                                                                                                             | —      |
| Testes (Web)   | Vitest + Testing Library                                                                                                                                                                                                                                                                                                                                   | —      |
| ORM / Queries  | Supabase JS Client (sem ORM)                                                                                                                                                                                                                                                                                                                               | 2.x    |
| Estilo (Web)   | Tailwind CSS + Shadcn/ui                                                                                                                                                                                                                                                                                                                                   | —      |
| PWA            | Serwist                                                                                                                                                                                                                                                                                                                                                    | —      |

---

## Estrutura do Monorepo

```
navestory-saas/
├── apps/
│   ├── api/          → NestJS REST API (porta 3001)
│   └── web/          → Next.js 16 App Router (porta 3000)
├── packages/
│   ├── validators/   → @navestory/validators — Zod schemas compartilhados
│   ├── database/     → @navestory/database — tipos auto-gerados do Supabase
│   ├── ui/           → @navestory/ui — Design System (Shadcn/ui)
│   └── types/        → @navestory/types — tipos de resposta da API
├── specs/            → Especificações de features (SPEC-YYYYMMDD-NNN.md)
├── matrices/         → Matrizes de rastreabilidade, impacto e permissões
└── docs/             → Documentação técnica, ADRs, guias
```

---

## Arquitetura por Camadas (Backend)

Cada domínio segue o padrão **Controller → Service → RepositoryPort → RepositoryImpl**:

```
HTTP Request
    │
    ▼
[Controller]          — recebe DTO, chama Service, retorna resposta HTTP
    │
    ▼
[Service]             — lógica de negócio, validação de posse (multi-tenant), warnings
    │
    ▼
[RepositoryPort]      — contrato abstrato (interface)
    │
    ▼
[SupabaseRepository]  — implementação concreta com Supabase JS Client
    │
    ▼
[Supabase/PostgreSQL] — banco com RLS ativo em todas as tabelas
```

**Domínios ativos:** `auth`, `vehicles`, `expenses`, `maintenance`, `dashboard`, `users`, `admin`, `categories`

---

## Padrões de Design Adotados

| Padrão                          | Onde se aplica                                  | Referência                  |
| ------------------------------- | ----------------------------------------------- | --------------------------- |
| Repository Port & Adapter       | Todos os domínios de dados                      | ADR-002 (Accepted)          |
| Domain Modules (NestJS)         | `apps/api/src/modules/`                         | —                           |
| Shared Validators (Zod)         | `@navestory/validators` importado por API e Web | —                           |
| Guards + Custom Decorators      | `SupabaseAuthGuard`, `@UserId()`                | —                           |
| ZodValidationPipe               | Endpoints com `@UsePipes`                       | —                           |
| Soft Delete                     | Campo `deleted_at` em todas as entidades        | —                           |
| Soft Warning (gate + confirmed) | `expenses` create/update                        | ADR-001 (domínio, Accepted) |
| RLS Multi-tenancy               | `auth.uid() = user_id` em todas as tabelas      | ADR-002 (infra, Accepted)   |
| Value Objects                   | `license-plate.vo.ts`, `money.vo.ts`            | —                           |

---

## ADRs Vigentes

| ID                | Título                                              | Status   | Localização                                                       |
| ----------------- | --------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| ADR-001 (infra)   | Monorepo com Turborepo                              | Accepted | `docs/architecture/decisions/001-monorepo-structure.md`           |
| ADR-002 (infra)   | RLS Supabase para multi-tenancy                     | Accepted | `docs/architecture/decisions/002-supabase-rls-strategy.md`        |
| ADR-003 (infra)   | JWT stateless (access 15min + refresh 7d)           | Accepted | `docs/architecture/decisions/003-auth-jwt-strategy.md`            |
| ADR-001 (domínio) | Regras de inserção de despesas                      | Accepted | `docs/architecture/decisions/ADR-001-expense-insertion-rules.md`  |
| ADR-002 (domínio) | Encapsulamento de `findOne()` nos Services          | Accepted | `docs/architecture/decisions/ADR-002-pattern-encapsulation.md`    |
| ADR-003 (domínio) | Categorias personalizadas por usuário               | Accepted | `docs/architecture/decisions/ADR-003-user-categories.md`          |
| ADR-004 (domínio) | Revalidação centralizada via helpers                | Accepted | `docs/architecture/decisions/ADR-004-revalidation-strategy.md`    |
| ADR-005 (domínio) | Audit log universalizado para Web Actions           | Accepted | `docs/architecture/decisions/ADR-005-audit-log-web-actions.md`    |
| ADR-006 (domínio) | Padrão polimórfico para ledger financeiro unificado | Accepted | `docs/architecture/decisions/ADR-006-unified-financial-ledger.md` |
| ADR-007 (domínio) | Ciclos de odômetro como série temporal segmentada   | Accepted | `docs/architecture/decisions/ADR-007-vehicle-odometer-cycles.md`  |

> **Nota:** `docs/adr/` contém versões legadas e resumidas dos ADRs de infraestrutura. A localização canônica é `docs/architecture/decisions/`.

---

## Pirâmide de Testes

```
         /E2E\          → Playwright (verificar em apps/web/e2e/)
        /------\
       /Contrato\       → Verificação de response shape vs. spec (a implementar — Fase 4)
      /----------\
     / Integração \     → Service + Repositório com banco real (sem mocks de BD)
    /--------------\
   /    Unitários   \   → Services, Repositórios, VOs, Guards (33+ suítes, threshold 88%)
  /------------------\
```

**Regras:**

- Testes de repositório nunca mocam o banco — política ativa desde 2026-06-01
- Edge cases das specs são cobertos com `describe('EC-XX: ...')` explícitos
- Bugs corrigidos ganham prefixo `REG-` no describe para rastreabilidade de regressão

---

## Rastreabilidade

- **Specs** → `specs/SPEC-YYYYMMDD-NNN.md` (12 specs ativas em 2026-06-02)
- **Matriz de rastreabilidade** → `matrices/rastreabilidade.md` (req → spec → código → teste)
- **Matriz de impacto** → `matrices/impacto.md` (pré-implementação)
- **Matriz de permissões** → `matrices/permissoes.md` (roles × recursos × RLS)
- **Código → Spec** → arquivos críticos anotados com `// @spec SPEC-ID RF-XX`

---

## Entidades e Modelo de Dados

- **Mapa de entidades e relações** → `docs/architecture/entities.md`
  - 14 entidades: Profiles, Vehicles, Expenses, Maintenances, Fines, Vehicle Groups, Expense Templates, Audit Logs, Vehicle Recurring Costs, Vehicle Odometer Cycles, Drivers, Vehicle Drivers, Documents, User Preferences (USER_CATEGORIES mudou de entidade virtual para tabela real, sem contar como nova)
  - Diagrama ERD, campos completos, enums, funções stored e padrões transversais

---

## Diagramas

- Contexto do sistema → `docs/architecture/diagrams/system-context.md`
- Diagrama de containers → `docs/architecture/diagrams/container-diagram.md`
- Fluxo de dados → `docs/architecture/diagrams/data-flow.md`
- Segurança / LGPD → `docs/architecture/security/`

---

## Links Rápidos

- PRD v1.0 → `docs/PRD/PRD-v1.0.md`
- Guia do desenvolvedor → `docs/guides/developer.md`
- Getting started → `docs/guides/getting-started.md`
- Runbooks de operação → `docs/operations/runbooks.md`
