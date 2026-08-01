# Arquitetura — navestory SaaS

> Documento completo: [`docs/architecture/overview.md`](../docs/architecture/overview.md)
> ADRs vigentes: [`docs/architecture/decisions/`](../docs/architecture/decisions/)

---

## Topologia

```
┌─────────────────────────────────────────────────┐
│  Monorepo (Turborepo + pnpm workspaces)          │
│                                                  │
│  apps/api  (NestJS 11, :3001)                   │
│  apps/web  (Next.js 16 App Router, :3000)        │
│                                                  │
│  packages/validators  → @navestory/validators (Zod)   │
│  packages/database    → @navestory/database (tipos)   │
│  packages/ui          → @navestory/ui (Shadcn/ui)     │
│  packages/types       → @navestory/types              │
└─────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
   Supabase Auth         PostgreSQL (RLS)
   (JWT access 15min     (multi-tenant via
    + refresh 7d)         auth.uid() = user_id)
```

---

## Camadas (Backend)

```
HTTP Request
    ↓
[Controller]        — DTO, roteamento, resposta HTTP
    ↓
[Service]           — regras de domínio, warnings, validação de posse
    ↓
[RepositoryPort]    — interface abstrata (contrato)
    ↓
[SupabaseRepository] — implementação com Supabase JS Client
    ↓
[PostgreSQL + RLS]  — banco com isolamento por tenant
```

---

## Componentes

| Componente              | Papel                          | Owner     | Dependências                                                 |
| ----------------------- | ------------------------------ | --------- | ------------------------------------------------------------ |
| `apps/api`              | REST API, regras de negócio    | backend   | `@navestory/validators`, `@navestory/database`               |
| `apps/web`              | Frontend PWA, Server Actions   | frontend  | `@navestory/validators`, `@navestory/ui`, `@navestory/types` |
| `@navestory/validators` | Schemas Zod compartilhados     | fullstack | Zod 4.x                                                      |
| `@navestory/database`   | Tipos auto-gerados do Supabase | fullstack | Supabase CLI                                                 |
| `@navestory/ui`         | Design System (Shadcn/ui)      | frontend  | Tailwind, Radix                                              |
| `@navestory/types`      | Tipos de resposta da API       | fullstack | —                                                            |

---

## Padrões Ativos

| Padrão                          | Onde se aplica                                  |
| ------------------------------- | ----------------------------------------------- |
| Repository Port & Adapter       | Todos os domínios de dados                      |
| Domain Modules (NestJS)         | `apps/api/src/modules/`                         |
| Shared Validators (Zod)         | `@navestory/validators` importado por API e Web |
| Guards + Custom Decorators      | `SupabaseAuthGuard`, `@UserId()`                |
| ZodValidationPipe               | Endpoints com `@UsePipes`                       |
| Soft Delete                     | Campo `deleted_at` em todas as entidades (R5)   |
| Soft Warning (gate + confirmed) | `expenses` create/update (R1, R2)               |
| RLS Multi-tenancy               | `auth.uid() = user_id` em todas as tabelas (S2) |

---

## ADRs Vigentes (resumo)

| ADR                       | Decisão                                                                 | Status   |
| ------------------------- | ----------------------------------------------------------------------- | -------- |
| 001-monorepo-structure    | Turborepo + pnpm workspaces                                             | Accepted |
| 002-supabase-rls-strategy | RLS nativo do Postgres para multi-tenant                                | Accepted |
| 003-auth-jwt-strategy     | JWT stateless, access 15min + refresh 7d                                | Accepted |
| ADR-001                   | Warnings não-bloqueantes em despesas (R1, R2)                           | Accepted |
| ADR-002                   | `findOne()` encapsulado nos Domain Services                             | Accepted |
| ADR-003                   | Categorias dinâmicas por usuário (tabela, não enum)                     | Accepted |
| ADR-004                   | Revalidação centralizada via helpers no Next.js                         | Accepted |
| ADR-005                   | Audit log unificado para REST + Server Actions (C2)                     | Accepted |
| ADR-006                   | Ledger financeiro unificado em `expenses` via `source_type`/`source_id` | Accepted |

---

## Módulos de Domínio (NestJS)

> Módulos registrados em `apps/api/src/app.module.ts`

| Módulo                 | Controlador        | Tabela principal          | ADR/Spec                                     |
| ---------------------- | ------------------ | ------------------------- | -------------------------------------------- |
| `VehiclesModule`       | `/vehicles`        | `vehicles`                | SPEC-20260602-002                            |
| `ExpensesModule`       | `/expenses`        | `expenses`                | SPEC-20260521-003, EPIC-FIN-001              |
| `MaintenanceModule`    | `/maintenance`     | `maintenances`            | SPEC-20260521-002                            |
| `FinesModule`          | `/fines`           | `fines`                   | SPEC-20260607-001                            |
| `RecurringCostsModule` | `/recurring-costs` | `vehicle_recurring_costs` | SPEC-20260609-001                            |
| `CategoriesModule`     | `/categories`      | `user_categories`         | SPEC-20260602-004                            |
| `DashboardModule`      | `/dashboard`       | — (agregação)             | SPEC-20260521-003, SPEC-20260602-005         |
| `AuthModule`           | `/auth`            | `profiles`, Supabase Auth | SPEC-20260524-001                            |
| `UsersModule`          | `/users`           | `profiles`                | SPEC-20260521-004                            |
| `AdminModule`          | `/admin`           | — (service role)          | SPEC-20260521-004                            |
| `AnalyticsModule`      | `/analytics`       | — (RPCs agregadoras)      | SPEC-20260622-001 (Fase 1: TCO + Fuel Trend) |

> **Planejado:** `SubscriptionsModule` e `WorkspacesModule` (SPEC-20260620-001 Fases 2/4).

---

## Modelo de Dados

> Documento completo: [`docs/architecture/entities.md`](../docs/architecture/entities.md)

| Entidade          | Tabela                                     | Relações-chave                                                                            |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Profiles          | `profiles`                                 | raiz do tenant; 1:N para tudo                                                             |
| Vehicles          | `vehicles`                                 | pivot central; N:1 Profile, 1:N Events                                                    |
| Expenses          | `expenses`                                 | N:1 Vehicle + Profile; ledger polimórfico via `source_type` + `source_id` (EPIC-FIN-001)  |
| Maintenances      | `maintenances`                             | N:1 Vehicle + Profile                                                                     |
| Fines             | `fines`                                    | N:1 Vehicle + Profile; cria expense vinculada (`source_type = 'fine'`)                    |
| Recurring Costs   | `vehicle_recurring_costs`                  | N:1 Vehicle + Profile; cria expense vinculada ao pagar (`source_type = 'recurring_cost'`) |
| Vehicle Groups    | `vehicle_groups` + `vehicle_group_members` | N:M com Vehicles                                                                          |
| User Categories   | `user_categories`                          | N:1 Profile; complementa categorias globais                                               |
| User Preferences  | `user_preferences`                         | 1:1 Profile; chip fields, theme, notificações                                             |
| Expense Templates | `expense_templates`                        | N:1 Vehicle + Profile; max 20/usuário                                                     |
| Audit Logs        | `audit_logs`                               | N:1 Profile (nullable); log imutável                                                      |

---

## Trade-offs Assumidos

| Trade-off                                               | Implicação                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Sem ORM (Supabase JS direto)                            | Queries mais verbosas; sem migration automática via entidades       |
| Multi-tenancy via RLS (não app-level)                   | Confiança no banco; contornar via service role é possível (S3)      |
| `admin role` via `user_metadata` (não claim JWT padrão) | Guard de admin precisa consultar `user_metadata`, não `claims`      |
| Server Actions sem endpoint REST próprio                | Mutações do frontend não têm contrato de API formal; testar via E2E |
| Validação Zod compartilhada                             | Mudança no schema pode afetar frontend e backend simultaneamente    |
