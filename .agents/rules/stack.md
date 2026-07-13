---
trigger: always_on
---

# 🛠 Stack & Architecture Rules - Nave SaaS

Core: Next.js 15 + Supabase

## 🏗️ Arquitetura

- **Padrão:** Clean Architecture adaptada para Serverless.
- **Frontend:** Next.js 15 (App Router), PWA Offline-first.
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Estado:** TanStack Query (Server State, Cache, Offline Sync). Evitar Zustand/Redux para dados do servidor.

## 💻 TypeScript

- **Strict Mode:** Ativado globalmente.
- **Proibido:** Uso de `any`.
- **Alternativa:** Use `unknown` + Type Guards ou tipos genéricos bem definidos.

## 📦 Gerenciamento de Dependências

- **Regra de Ouro:** Nenhuma lib externa sem validação prévia no **Context7**.
- **Objetivo:** Validar compatibilidade (Next.js 15), tamanho do bundle e manutenção ativa.
- **Comando Mental:** "Antes de importar, consulte o Context7."

## 🧪 Estratégia de Testes

- **Unit/Integration:** Vitest (foco em Utils, Hooks e Policies RLS).
- **E2E:** Playwright (Fluxos críticos de negócio).
- **Cobertura:** Meta de 80% em componentes e hooks.

---

_Referência Cruzada: Ver `rules.md` para configuração do MCP Context7._
