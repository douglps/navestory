# ADR-004: Revalidação Centralizada via Helpers

## Status

Accepted

## Context

O Next.js 15 App Router com Server Actions requer chamadas explícitas a `revalidatePath()` ou `revalidateTag()` após mutações. A dispersão dessas chamadas em múltiplos arquivos de Server Actions gerava inconsistências: algumas ações revalidavam caminhos errados, outras esqueciam de revalidar o dashboard, e mudanças na estrutura de rotas exigiam atualização em vários lugares.

## Decision

Centralizar todas as chamadas de revalidação em `apps/web/lib/revalidate-helpers.ts` (ou equivalente). Cada helper encapsula:
- Quais `revalidatePath()` / `revalidateTag()` são necessários para um domínio
- A lógica de granularidade (revalidar listagem vs. detalhe vs. dashboard)

Server Actions chamam os helpers, não `revalidatePath` diretamente.

## Consequences

- Mudança na estrutura de rotas exige atualização em um único arquivo
- Facilita auditoria de "o que é revalidado quando X muda"
- Risco de over-invalidation se um helper for demasiado amplo — mitigado por revisão de code review

## References

- `apps/web/app/actions/` — Server Actions que chamam os helpers
- IMPACTO-007
