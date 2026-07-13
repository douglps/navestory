# ADR-003: Categorias Personalizadas por Usuário

## Status

Accepted

## Context

O módulo `expenses` usava um enum fixo de categorias definido em `@nave/validators` (`DEFAULT_EXPENSE_CATEGORIES`). Gestores de frota têm necessidades específicas que não cabem nas categorias padrão (ex: "Multa de funcionário", "Frete", "Aluguel de equipamento"). A ausência de categorias personalizadas forçava o uso de "Outros", perdendo granularidade nos relatórios e KPIs do dashboard.

## Decision

Criar a tabela `user_categories` com:
- Campos: `id (uuid)`, `user_id (uuid, FK → profiles.id)`, `name (text)`, `created_at`, `updated_at`, `deleted_at`
- RLS `owner-only`: `auth.uid() = user_id` em SELECT, INSERT, UPDATE, DELETE
- API REST em `/categories` (CRUD completo)
- Frontend exibe categorias padrão + categorias do usuário no mesmo select

A validação de categoria no schema Zod de `expenses` aceita qualquer string não vazia — a lista de categorias válidas é contextual (padrão + personalizadas do usuário), não estática.

## Consequences

- Usuário pode criar até N categorias sem limite imposto pelo sistema (limite de negócio a definir futuramente)
- O campo `category` em `expenses` não é mais restrito a enum — queries de agregação por categoria ficam sensíveis a typos. Mitigação: o select no frontend usa apenas opções válidas
- A migration `003_user_categories.sql` adiciona a tabela e as policies RLS
- `@nave/validators` mantém `DEFAULT_EXPENSE_CATEGORIES` como sugestão inicial, não como constraint

## References

- `apps/api/src/modules/categories/` — módulo NestJS
- `packages/database/src/supabase/migrations/003_user_categories.sql`
- `matrices/permissoes.md` — seção `/categories`
- IMPACTO-010
