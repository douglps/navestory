/**
 * @spec SPEC-20260525-001 §4.1
 * Formaliza as duas regras de espaçamento já em vigor no projeto (`.agents/nave-ui-pwa/SKILL.md`
 * e uso real em `action-dock.tsx`), sem inventar escala nova: grid de 8px e alvo de toque
 * mínimo de 44px. Não substitui a escala padrão do Tailwind (`theme.spacing`), só nomeia os
 * dois valores que já apareciam soltos (`min-h-[44px]`) para virarem token.
 */
export const spacingTokens = {
  /** Alvo de toque mínimo (botões, itens de lista tocáveis) — mobile-first, WCAG 2.5.5 AA. */
  touchTarget: "2.75rem", // 44px
  /** Unidade base do grid de espaçamento do projeto. */
  gridUnit: "0.5rem", // 8px
} as const;
