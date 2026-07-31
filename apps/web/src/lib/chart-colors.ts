/**
 * @spec SPEC-20260729-002 RF-02
 * Paleta categórica compartilhada por todo gráfico multi-série do app — fonte única para não
 * duplicar arrays de cor ad hoc por componente. Nunca usar para status real (isso é
 * success/warning/danger/info); ver `--categorical-1..5` em `globals.css` para o racional.
 */
export const CHART_CATEGORY_COLORS: readonly string[] = [
  "oklch(var(--categorical-1))",
  "oklch(var(--categorical-2))",
  "oklch(var(--categorical-3))",
  "oklch(var(--categorical-4))",
  "oklch(var(--categorical-5))",
];
