/**
 * @spec SPEC-20260525-001 §4.1
 * Fonte da verdade dos tokens de cor. Valores em canais OKLCH ("L C H", sem a função
 * `oklch()` em volta) para permitir modificador de opacidade do Tailwind
 * (`oklch(var(--x) / <alpha-value>)` em tailwind.config.ts, ex: `bg-primary/50`).
 *
 * Paleta herdada de `.agents/nave-ui-pwa/SKILL.md` (primary/secondary/accent/background/
 * foreground/card, únicos valores com intenção de marca já documentada no repo antes desta
 * spec). Os tons "solid" de success/warning/danger/info são novos desta spec — o SKILL.md só
 * documentava a variante pastel (fundo de alerta); o tom solid (ícone/borda/texto) foi
 * derivado mantendo o mesmo matiz (H) com luminosidade reduzida, para ter contraste
 * suficiente como cor de texto/ícone sobre o pastel correspondente.
 */
export const colorChannels = {
  background: "98.5% 0 0",
  foreground: "15% 0 0",

  card: "97% 0 0",
  cardForeground: "15% 0 0",

  border: "90% 0 0",

  muted: "97% 0 0",
  mutedForeground: "45% 0 0",

  primary: "55.6% 0.15 260",
  primaryForeground: "98.5% 0 0",

  secondary: "55.6% 0.15 200",
  secondaryForeground: "98.5% 0 0",

  accent: "55.6% 0.15 140",
  accentForeground: "15% 0 0",

  success: "60% 0.15 150",
  successForeground: "98.5% 0 0",
  successPastel: "92% 0.12 150",

  warning: "75% 0.16 85",
  warningForeground: "15% 0 0",
  warningPastel: "92% 0.15 85",

  danger: "57.7% 0.2 25",
  dangerForeground: "98.5% 0 0",
  dangerPastel: "92% 0.08 25",

  info: "55.6% 0.15 240",
  infoForeground: "98.5% 0 0",
  infoPastel: "92% 0.08 240",
} as const;

export type ColorToken = keyof typeof colorChannels;

/** Nomes das variáveis CSS geradas em `:root` a partir de {@link colorChannels}. */
export function cssVariableName(token: ColorToken): string {
  return `--${token.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}
