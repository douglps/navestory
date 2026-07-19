/**
 * @spec SPEC-20260525-001 §4.1
 * Formaliza os raios já usados em produção (`rounded`, `rounded-md`, `rounded-lg`,
 * `rounded-full` — ver auditoria em `matrices/impacto.md`, IMPACTO-038) como tokens nomeados,
 * sem alterar os valores numéricos já em uso (não havia raio customizado fora do padrão
 * Tailwind a formalizar).
 */
export const radiusTokens = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  full: "9999px",
} as const;
