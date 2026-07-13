---
trigger: always_on
---

# 🛠 Stack & Architecture Rules - Nave SaaS

Core: Next.js 16 + Supabase

## 🏗️ Arquitetura

- **Padrão:** Clean Architecture adaptada para Serverless.
- **Frontend:** Next.js 16 (App Router), PWA Offline-first.
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Estado:** dividido por responsabilidade (ver ADR-008) — **TanStack Query** para todo estado de servidor (cache, sync, offline mutation pause); **Zustand** apenas para estado de UI puramente client-side (modais, wizards, tema). Nunca espelhar dado de servidor em um store Zustand.

## 💻 TypeScript

- **Strict Mode:** Ativado globalmente.
- **Proibido:** Uso de `any`.
- **Alternativa:** Use `unknown` + Type Guards ou tipos genéricos bem definidos.

## 📦 Gerenciamento de Dependências

- **Regra de Ouro:** Nenhuma lib externa sem validação prévia no **Context7**.
- **Objetivo:** Validar compatibilidade (Next.js 16), tamanho do bundle e manutenção ativa.
- **Comando Mental:** "Antes de importar, consulte o Context7."

## 🧪 Estratégia de Testes

- **Unit/Integration:** Vitest (foco em Utils, Hooks e Policies RLS).
- **E2E:** Playwright (Fluxos críticos de negócio).
- **Cobertura:** Meta de 88% (unitário), conforme `specs/TESTS_SPEC.md`.

---

_Referência Cruzada: Ver `rules.md` para configuração do MCP Context7._
