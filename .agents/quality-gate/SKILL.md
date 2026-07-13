---
name: quality-gate
version: 1.0-mvp
description: Auditoria de Código e Performance para o início do projeto Nave. Foco em PWA, Zod e Mobile-First.
---

# 🛡️ Quality Gate (Fase Inicial) - NAVE

Você é o guardião da consistência técnica. Como o projeto está começando, sua missão é garantir que o código seja limpo, seguro e mobile-first desde o primeiro commit.

## 1. 🏗️ Estrutura de Dados e Segurança

- **Zod First:** Todo componente que recebe dados (Props) ou envia (Form) deve ter um Schema Zod definido no próprio arquivo ou em `@/types`.
- **Schema V3 (Nativo):** Use os campos padronizados: `amount` (Decimal/Float), `occurred_at` (ISO Date), `vehicle_id` (UUID).
- **Supabase RLS:** Toda chamada de dados deve garantir o isolamento: `.eq('user_id', auth.uid())`.

## 2. 📱 UX Mobile-First (Diretrizes de Toque)

- **Interactive Elements:** Mínimo de `44px` de altura para botões e inputs. Use classes Tailwind como `min-h-[44px]` ou `p-4`.
- **Skeleton Loaders:** Para qualquer fetch de dados, gere um estado de carregamento visual (Skeleton). Não aceite telas vazias.
- **Evitar Zoom:** Inputs de texto devem ter `text-base` (16px) para não disparar o zoom automático no iOS.

## 3. ⚡ Performance PWA

- **Lazy Imports:** Use `dynamic()` ou `React.lazy` para modais e componentes pesados que não aparecem no primeiro carregamento.
- **Tree Shaking:** Importe ícones e funções utilitárias de forma nomeada (ex: `import { Car } from 'lucide-react'`) para manter o bundle leve (< 150KB).
- **Clean Logs:** `console.log` é proibido na saída final, a menos que esteja dentro de `if (process.env.NODE_ENV === 'development')`.

## 4. ♿ Acessibilidade e Tipagem

- **Zero 'any':** O uso de `any` é proibido. Use tipos genéricos ou `unknown` com Type Guards.
- **Aria-Labels:** Todo botão que contenha apenas ícone DEVE ter um `aria-label` descritivo.

## 5. ✍️ Auto-Documentação

Como o projeto é novo e os documentos `@docs/` estão sendo criados:

- Se você criar um padrão novo (ex: esquema de cores ou layout de página), **sugira** ao usuário a criação de um arquivo correspondente em `@docs/` para manter o histórico.

---

## 🚦 Protocolo de Saída (Checklist de Qualidade)

Antes de responder, verifique:

1. [ ] O layout quebra em telas menores que 360px? (Não pode quebrar)
2. [ ] Existe tratamento de `error` no fetch de dados com feedback ao usuário?
3. [ ] O código segue o padrão `try/catch` + `Toast`?
4. [ ] Os nomes de variáveis seguem o padrão camelCase e são em inglês?
5. [ ] Respeita o limite de 150KB de Bundle?

"Se encontrar desvios, corrija silenciosamente antes de entregar o código final."
