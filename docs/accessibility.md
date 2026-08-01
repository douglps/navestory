# Acessibilidade — navestory SaaS

**Padrão:** WCAG 2.2 AA | **Compliance:** European Accessibility Act 2025

Acessibilidade é critério de aceite no navestory, não "bom ter" — sem A11y, não há merge (princípio 2 em `.agents/rules/rules.md`).

## Regras de implementação

As regras técnicas completas (ARIA, contraste, teclado, mobile, testes axe-core, tokens de contraste OKLCH, suporte P3) estão em [`.agents/rules/accessibility.md`](../.agents/rules/accessibility.md), consultado automaticamente pelos agentes de codificação.

## Por que isso importa para o produto

Gestores de frota frequentemente acessam o sistema em campo, sob luz solar intensa, com uma mão ocupada. Contraste 4.5:1, touch targets de 44px e navegação por teclado não são abstrações de compliance — são requisitos de usabilidade real no contexto de uso do navestory.
