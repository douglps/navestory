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
  // @spec SPEC-20260722-002 RF-01 — canvas quente sutil (light mode): chroma no eixo b+ (H=80,
  // mesma família de matiz do --warning H=85) mantido abaixo de 0.01 conforme nota técnica de
  // SPEC-20260722-001, para não competir perceptualmente com o âmbar de alerta. L inalterada.
  background: "98.5% 0.004 80",
  foreground: "15% 0 0",

  card: "97% 0.004 80",
  cardForeground: "15% 0 0",

  border: "90% 0.004 80",

  muted: "97% 0.004 80",
  // @spec SPEC-20260721-001 RF-02 — L=42% (era 45%) garante contraste AA (4.5:1) sobre
  // --background sem exceção por hierarquia visual (C-DS-01, decisão de produto F-3).
  mutedForeground: "42% 0 0",

  primary: "55.6% 0.15 260",
  primaryForeground: "98.5% 0 0",

  secondary: "55.6% 0.15 200",
  secondaryForeground: "98.5% 0 0",

  accent: "55.6% 0.15 140",
  accentForeground: "15% 0 0",

  // @spec SPEC-20260721-001 RF-01 — dourado de marca dedicado, distinto de `warning` (âmbar de
  // alerta). Uso permitido: acento de destaque, badge de status premium, detalhe decorativo.
  // Uso proibido: texto pequeno sobre fundo claro (contraste ~2.1:1, falha AA) e fundo de CTA
  // principal. Ver decisão F-1 e PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md seção B.3/C.2.
  gold: "68% 0.18 82",
  goldForeground: "15% 0 0",

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

/**
 * @spec SPEC-20260721-001 RF-01, RF-03
 * Overrides de dark mode (seletor `.dark`, aplicado pelo `next-themes`) — apenas os tokens
 * necessários para o mecanismo de tema funcionar de forma legível (neutros, primary e gold).
 * Recalibração perceptual completa da paleta de marca (secondary/accent/success/warning/
 * danger/info em dark) fica fora do escopo desta spec — ver "Fora de Escopo" na spec e seção
 * B.3 da pesquisa para os valores de referência já documentados a implementar depois.
 */
export const darkColorChannels: Partial<Record<ColorToken, string>> = {
  background: "14% 0.02 258",
  foreground: "93% 0.005 260",

  card: "19% 0.02 258",
  cardForeground: "93% 0.005 260",

  border: "28% 0.02 258",

  muted: "24% 0.015 258",
  mutedForeground: "62% 0.01 260",

  primary: "62% 0.22 258",

  gold: "74% 0.15 82",
  goldForeground: "12% 0 0",
};

export type ColorToken = keyof typeof colorChannels;

/** Nomes das variáveis CSS geradas em `:root` a partir de {@link colorChannels}. */
export function cssVariableName(token: ColorToken): string {
  return `--${token.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}
