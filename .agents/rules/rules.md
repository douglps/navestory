---
trigger: always_on
---

# 🏛️ Manifesto de Engenharia - Nave SaaS

Projeto: Nave-SaaS (MVP Frota) | Ambiente: Google Antigravity

## 🎯 Missão

Desenvolver um SaaS de Gestão de Veículos escalável, seguro e acessível, priorizando **Serverless**, **Type Safety** e **Developer Experience**.

## 🧭 Princípios Fundamentais (Não Negociáveis)

1.  **Segurança pela Base (RLS):** A segurança reside no banco de dados (Supabase RLS). O backend/frontend é apenas uma camada de conveniência. _Nunca confie no cliente._
2.  **Acessibilidade como Requisito:** WCAG 2.2 AA não é "bom ter", é critério de aceite. Sem A11y, não há merge.
3.  **Tipagem Estrita:** `any` é proibido. Use `unknown` + guards. TypeScript estrito em todo o monorepo.
4.  **Documentação Viva:** Regras de UI, Testes e Segurança residem em arquivos especializados. Este manifesto apenas orquestra.
5.  **Mobile-First & Offline:** A aplicação deve funcionar em redes instáveis (PWA strategy via TanStack Query).

## 🗺️ Mapa de Regras Especializadas

_Consulte estes arquivos para implementação técnica detalhada:_

| Domínio                    | Arquivo Fonte                                      | Responsável    |
| :------------------------- | :------------------------------------------------- | :------------- |
| 🎨 **Design System**       | [`design-system.md`](./design-system.md)           | @design-team   |
| ♿ **Acessibilidade**      | [`accessibility.md`](./accessibility.md)           | @a11y-team     |
| 🧪 **Testes & QA**         | [`testing.md`](./testing.md)                       | @qa-team       |
| 🔒 **Segurança & Dados**   | [`security.md`](./security.md) _(A Criar/Extrair)_ | @security-team |
| 🛠 **Stack & Ferramentas** | [`stack.md`](./stack.md) _(A Criar/Extrair)_       | @arch-team     |
| 🚗 **Domínio Frota**       | [`fleet-components.md`](./fleet-components.md)     | @fleet-team    |
| 📚 **Uso de IA/Context7**  | [`rules.md`](./rules.md)                           | @dev-team      |

## 🤖 Protocolo de Agente (IA)

- **Idioma:** Português (pt-BR) técnico.
- **Postura:** Direto, sem saudações ("Entendi", "Claro"). Vá à solução.
- **Validação:** Sempre valide libs externas via **Context7** antes de sugerir código.
- **Conflitos:** Se uma solicitação violar estas regras, ative o protocolo **QUEBRA DE PROTOCOLO** (Objete, Aponte, Explique).
- **Refatoração:** Para mudanças drásticas, apresente um plano de 3 pontos antes de codificar.

## 🚀 Status do Projeto

- **Fase:** MVP Inicial.
- **Infra:** Supabase (Postgres, Auth, Edge Functions) + Next.js 15.
- **Restrição:** Sem containers/orquestração complexa no MVP.

---

_Última atualização: 13/03/2026_
_Owner: @tech-lead_
