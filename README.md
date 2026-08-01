# navestory - Gestão Inteligente de Veículos

[![CI](https://github.com/douglps/navestory/actions/workflows/ci.yml/badge.svg)](https://github.com/douglps/navestory/actions/workflows/ci.yml)

> SaaS proprietário para gestão de veículos, despesas e manutenções. Mobile-first PWA com isolamento por RLS no banco de dados.

## Descrição

navestory permite que proprietários de veículos registrem manutenções e despesas em um único lugar, com alertas automáticos e dashboard de KPIs. Desenvolvido como PWA mobile-first com suporte a instalação e acesso offline básico.

**Personas principais:**

- Motoristas autônomos (controle de custos operacionais)
- Gestores de frota pequena (decisões baseadas em dados)

## Pré-requisitos

- Node.js >= 20.0.0
- pnpm >= 8.15.0
- Docker (para Supabase local)
- Conta Supabase (para deploy)

```bash
npm install -g pnpm
```

## Instalação

```bash
# 1. Clone o repositório
git clone git@github.com:douglps/navestory.git
cd navestory

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# edite .env.local com suas credenciais Supabase

# 4. Suba o banco local (opcional)
docker-compose up -d

# 5. Execute as migrations
pnpm db:migrate

# 6. Gere os tipos do banco
pnpm db:generate
```

## Uso

```bash
# Desenvolvimento (todos os apps em paralelo)
pnpm dev

# Build de produção
pnpm build

# Testes
pnpm test

# Lint
pnpm lint
```

| Serviço            | URL padrão             |
| ------------------ | ---------------------- |
| Frontend (Next.js) | http://localhost:3000  |
| Backend (NestJS)   | http://localhost:3001  |
| Supabase Studio    | http://localhost:54323 |
| Storybook          | http://localhost:6006  |

## Estrutura do Projeto

```
navestory-saas/
├── apps/
│   ├── api/          # Backend NestJS 11 (auth, vehicles, expenses, maintenance, fines, recurring-costs, categories, dashboard, analytics, users, admin)
│   └── web/          # Frontend Next.js 16 PWA (React 19, TailwindCSS, TanStack Query, Zustand)
├── packages/
│   ├── database/     # Tipos auto-gerados do Supabase
│   ├── ui/           # Design System (Shadcn + Storybook)
│   ├── validators/   # Schemas Zod compartilhados (api + web)
│   └── types/        # TypeScript types compartilhados
├── supabase/
│   └── migrations/   # Migrations SQL + RLS policies
├── docs/
│   ├── PRD/          # Product Requirements Document
│   ├── adr/          # Architecture Decision Records
│   ├── architecture/ # Visão geral, diagramas, segurança
│   └── guides/       # Guias de developer, onboarding, usuário
├── specs/            # Especificações de features (SPEC-YYYYMMDD-NNN.md)
├── matrices/         # Impacto, rastreabilidade e permissões
└── .github/
    └── workflows/    # CI/CD (lint, test, build, deploy, security-scan)
```

## Stack

| Camada   | Tecnologia                                                                      |
| -------- | ------------------------------------------------------------------------------- |
| Frontend | Next.js 16, React 19, TailwindCSS 3.3, TanStack Query + Zustand 5 (ver ADR-008) |
| Forms    | React Hook Form 7 + Zod 3.22                                                    |
| PWA      | Serwist 9.5 (service worker + manifest)                                         |
| Backend  | NestJS 11, TypeScript 5, Passport JWT                                           |
| Database | PostgreSQL 15.1 via Supabase (RLS multi-tenancy)                                |
| Monorepo | Turborepo 2 + pnpm 8.15                                                         |
| Testes   | Jest (api), Vitest + Storybook (web/ui)                                         |
| Deploy   | Vercel (web) + Supabase Edge (api)                                              |

## Documentação

- [PRD v1.0](docs/PRD/PRD-v1.0.md) — Requisitos e escopo do MVP
- [Arquitetura](docs/architecture/overview.md) — Visão geral do sistema
- [ADRs](docs/adr/) — Decisões arquiteturais
- [Guia do Developer](docs/guides/developer/) — Como adicionar módulos, fazer deploy

## Contribuição

1. Crie uma branch a partir de `main`: `feature/nome-da-feature` ou `fix/nome-do-bug`
2. Escreva a spec antes de implementar: use `/nova-spec` no Claude Code
3. Avalie o impacto em módulos existentes: use `/impacto`
4. Implemente seguindo os padrões em `.agents/rules/`
5. Cubra a feature com testes (Jest para API, Vitest para web)
6. Abra um PR — CI roda lint + test + build automaticamente

## Licenca

Proprietária — veja LICENSE
