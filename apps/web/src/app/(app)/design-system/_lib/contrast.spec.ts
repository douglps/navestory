// @spec PLANO-MIGRACAO-SHOWCASE-INFRA — portado de brand-showcase sem mudança de lógica.
// Verifica contraste dos tokens REAIS de produção (`packages/ui/src/tokens/colors.ts`),
// independente da direção Azul-Índigo proposta neste showcase.
import { describe, expect, it } from "vitest";
import { colorChannels, darkColorChannels, type ColorToken } from "@nave/ui/tokens";
import { contrastRatio } from "./contrast";

// C-DS-01: 4.5:1 para texto normal, 3:1 para texto grande e elementos não-textuais.
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

type Mode = "light" | "dark";

function resolve(token: ColorToken, mode: Mode): string {
  const channels = mode === "dark" ? (darkColorChannels[token] ?? colorChannels[token]) : colorChannels[token];
  return `oklch(${channels})`;
}

interface Pair {
  label: string;
  a: ColorToken;
  b: ColorToken;
  minRatio: number;
}

const SEMANTIC_TOKENS = ["success", "warning", "danger", "info"] as const;

const pairs: Pair[] = [
  { label: "foreground sobre background", a: "foreground", b: "background", minRatio: AA_TEXT },
  { label: "foreground sobre card", a: "foreground", b: "card", minRatio: AA_TEXT },
  { label: "danger sobre danger-foreground (uso sólido)", a: "danger", b: "dangerForeground", minRatio: AA_TEXT },
  ...SEMANTIC_TOKENS.map(
    (token): Pair => ({
      label: `${token} sobre card`,
      a: token,
      b: "card",
      minRatio: AA_NON_TEXT,
    }),
  ),
  ...SEMANTIC_TOKENS.map(
    (token): Pair => ({
      label: `${token} sobre ${token}-pastel`,
      a: token,
      b: `${token}Pastel` as ColorToken,
      minRatio: AA_NON_TEXT,
    }),
  ),
];

describe("contraste dos tokens reais (C-DS-01)", () => {
  for (const mode of ["light", "dark"] as const) {
    describe(mode, () => {
      for (const { label, a, b, minRatio } of pairs) {
        it(`${label} atinge ao menos ${minRatio}:1`, () => {
          const ratio = contrastRatio(resolve(a, mode), resolve(b, mode));
          expect(ratio).toBeGreaterThanOrEqual(minRatio);
        });
      }
    });
  }
});
