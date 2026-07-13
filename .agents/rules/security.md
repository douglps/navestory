---
trigger: always_on
---

# 🔒 Security & Data Rules - Nave SaaS

> **Regras canônicas com IDs estáveis (S1–S9):** `specs/RULES.md` — seção "Regras de Segurança (S)". Este arquivo contém apenas orientações de implementação operacional para agentes. Em caso de conflito, `specs/RULES.md` prevalece.

Standard: OWASP Top 10 + LGPD

## 🛡️ Row Level Security (RLS) é a Lei

- **Verdade Única:** Políticas no Supabase definem quem vê o quê.
- **Código Cliente:** Filtros por `user_id` no client são apenas para UX/Performance, **não** garantem segurança.
- **Identidade:** O `user_id` **NUNCA** vem do input do usuário (body/params). Deve ser extraído via `supabase.auth.getUser()` (Server Components) ou `useUser` (Client).

## 🔑 Gestão de Chaves

- **Proibido:** Expor chaves `service_role` no cliente (browser/mobile).
- **Edge Functions:** Use variáveis de ambiente seguras para operações privilegiadas.

## 📝 Logs e Privacidade

- **PII Zero:** Nunca logar CPF, e-mail completo, senhas ou tokens.
- **Ambiente:** Logs detalhados (`debug`) ativos apenas se `NODE_ENV === 'development'`.

## ✅ Validação de Dados

- **Borda:** Use **Zod** para validar _todos_ os inputs externos (API Routes, Server Actions, Forms).
- **Schema Único:** Defina schemas Zod que sirvam tanto para validação quanto para inferência de tipos TypeScript.

## 🚨 Tratamento de Erros

- **Handler Central:** Use `lib/handlers/errorHandler.ts`.
- **Feedback:** Nunca exponha stack traces ou erros brutos do banco ao usuário final. Mensagens genéricas e amigáveis.

---

_Referência Cruzada: Ver `testing.md` para testes de políticas RLS._
