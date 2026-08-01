import {
  colorChannels,
  darkColorChannels,
  type ColorToken,
} from "@navestory/ui/tokens";

/**
 * Tokens propostos em `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md`
 * (aprovada por Douglas em 2026-07-30). Este arquivo NÃO altera nenhum token de produção —
 * é a camada de override local consumida por `DesignSystemScope` para re-temizar os
 * componentes reais de `@navestory/ui` dentro desta rota. A migração real (`packages/ui/src/
 * tokens/colors.ts`, `apps/web/src/app/globals.css`) é o Plano de Adoção do documento,
 * fora do escopo deste showcase.
 */

/** Valor bruto "L C H" (sem `oklch()`) do token real de produção — usado para os papéis
 * que a proposta mantém inalterados (gold, danger, success, warning, info, accent). */
export function tokenLight(name: ColorToken): string {
  return colorChannels[name];
}
export function tokenDark(name: ColorToken): string {
  return darkColorChannels[name] ?? colorChannels[name];
}

export interface ToneStop {
  tone: number;
  oklch: string;
  use: string;
}

/** Escala tonal Azul-Índigo (H≈250, primitivo) — proposta §3.5. */
export const INDIGO_SCALE: ToneStop[] = [
  {
    tone: 99,
    oklch: "99% 0.005 250",
    use: "Ponta clara de degradê decorativo",
  },
  {
    tone: 95,
    oklch: "95% 0.015 250",
    use: "Ponta clara alternativa, cards de destaque em light mode",
  },
  {
    tone: 90,
    oklch: "90% 0.03 250",
    use: "Hover de superfície neutra, fundo de badge suave",
  },
  {
    tone: 80,
    oklch: "80% 0.06 250",
    use: "Início de degradê decorativo (ponta clara)",
  },
  {
    tone: 70,
    oklch: "70% 0.10 250",
    use: "Ilustração/ícone decorativo de baixo destaque; primary em dark mode",
  },
  {
    tone: 60,
    oklch: "60% 0.15 250",
    use: "Elemento decorativo de médio destaque",
  },
  {
    tone: 50,
    oklch: "50% 0.18 250",
    use: "Fim de degradê decorativo (ponta escura), hover de primary",
  },
  { tone: 44, oklch: "44% 0.19 250", use: "Primary (light) — token semântico" },
  { tone: 40, oklch: "40% 0.18 250", use: "Active/pressed de primary" },
  {
    tone: 30,
    oklch: "30% 0.14 250",
    use: "Superfície escura decorativa em dark mode",
  },
  {
    tone: 20,
    oklch: "20% 0.09 250",
    use: "Card de destaque com degradê em dark mode",
  },
  {
    tone: 10,
    oklch: "10% 0.05 250",
    use: "Reservado a degradê muito escuro pontual — não é o fundo de página",
  },
];

/** Escala de grafite dedicada (neutro, independente do azul-índigo) — proposta §3.5/§3.6.
 * Valores oklch convertidos a partir dos hex exatos da proposta (`#F4F5F7`/`#13131A`/etc). */
export const GRAPHITE_SCALE: ToneStop[] = [
  {
    tone: 99,
    oklch: "97.0% 0.003 265",
    use: "Fundo de página, light mode (#F4F5F7)",
  },
  {
    tone: 95,
    oklch: "94.0% 0.004 271",
    use: "Card/painel, light mode (#EAEBEE)",
  },
  {
    tone: 20,
    oklch: "22.5% 0.014 285",
    use: "Card/painel, dark mode (#1B1B22)",
  },
  {
    tone: 15,
    oklch: "20.7% 0.012 285",
    use: "Superfície intermediária, dark mode (#17171D)",
  },
  {
    tone: 10,
    oklch: "19.0% 0.014 285",
    use: "Fundo de página, dark mode (#13131A) — nunca preto puro",
  },
];

interface RoleValue {
  light: string;
  dark: string;
  note: string;
}

/**
 * Camada semântica proposta. `primaryForeground`/`secondaryForeground` seguem a regra
 * "= background do mesmo modo" (validada por cálculo de contraste: branco/grafite-99 passa
 * AAA sobre os tons claros de primary/secondary; grafite-10 passa AA sobre os tons de dark
 * mode, que são mais claros). `border`/`muted` não são definidos literalmente pela proposta —
 * interpolados dentro da escala grafite para manter Input/Card/Table/Tabs coerentes; demais
 * papéis (`gold`, `danger*`, `success*`, `warning*`, `info*`, `accent*`) são herdados sem
 * alteração via `tokenLight`/`tokenDark`.
 */
export interface ProposedTokens {
  background: RoleValue;
  foreground: RoleValue;
  card: RoleValue;
  cardForeground: RoleValue;
  border: RoleValue;
  muted: RoleValue;
  primary: RoleValue;
  primaryForeground: RoleValue;
  secondary: RoleValue;
  secondaryForeground: RoleValue;
  successPastel: RoleValue;
  warningPastel: RoleValue;
  dangerPastel: RoleValue;
  infoPastel: RoleValue;
}

export const PROPOSED_TOKENS: ProposedTokens = {
  background: {
    light: "97.0% 0.003 265",
    dark: "19.0% 0.014 285",
    note: "Grafite dedicado — fundo de página.",
  },
  foreground: {
    light: "19.0% 0.014 285",
    dark: "97.0% 0.003 265",
    note: "Texto principal.",
  },
  card: {
    light: "94.0% 0.004 271",
    dark: "22.5% 0.014 285",
    note: "Card, painel, tabela.",
  },
  cardForeground: {
    light: "19.0% 0.014 285",
    dark: "97.0% 0.003 265",
    note: "= foreground.",
  },
  border: {
    light: "88% 0.005 270",
    dark: "30% 0.014 285",
    note: "Interpolado — sem definição literal na proposta.",
  },
  muted: {
    light: "90% 0.005 270",
    dark: "27% 0.014 285",
    note: "Levemente distinto de card — Skeleton (bg-muted) precisa se distinguir do card ao redor.",
  },
  primary: {
    light: "44% 0.19 250",
    dark: "66% 0.16 250",
    note: "Azul-índigo, H≈250 — CTA e elemento de marca.",
  },
  primaryForeground: {
    light: "97.0% 0.003 265",
    dark: "19.0% 0.014 285",
    note: "= background do modo (validado por contraste).",
  },
  secondary: {
    light: "48% 0.10 82",
    dark: "62% 0.09 82",
    note: "Ouro estrutural (bronze) — botão secundário, divisor.",
  },
  secondaryForeground: {
    light: "97.0% 0.003 265",
    dark: "19.0% 0.014 285",
    note: "= background do modo (validado por contraste).",
  },
  // @spec — bug encontrado no showcase: `successPastel`/`warningPastel`/`dangerPastel`/`infoPastel`
  // não têm override dark em produção (colors.ts), então em dark mode caem no valor claro do
  // light mode; combinado com `foreground` claro em dark, `text-foreground` sobre `bg-*-pastel`
  // (Alert/Badge/Toast) fica quase ilegível (texto claro sobre fundo já claro). Correção local:
  // pastel escurecido no dark, mantendo o hue da família — texto claro passa a ler ~13:1 (AAA).
  // Valor light idêntico ao de produção (inalterado); só o dark é novo. Fora do showcase, a
  // correção real é adicionar esses overrides em `darkColorChannels` no Plano de Adoção.
  successPastel: {
    light: tokenLight("successPastel"),
    dark: "28% 0.09 150",
    note: "Fundo de Alert/Badge/Toast success — dark corrigido no showcase.",
  },
  warningPastel: {
    light: tokenLight("warningPastel"),
    dark: "30% 0.10 85",
    note: "Fundo de Alert/Badge/Toast warning — dark corrigido no showcase.",
  },
  dangerPastel: {
    light: tokenLight("dangerPastel"),
    dark: "28% 0.05 32",
    note: "Fundo de Alert/Badge/Toast danger — dark corrigido no showcase.",
  },
  infoPastel: {
    light: tokenLight("infoPastel"),
    dark: "28% 0.06 240",
    note: "Fundo de Alert/Badge/Toast info — dark corrigido no showcase.",
  },
};

/** Papéis que a proposta mantém inalterados — herdados do token real de produção. */
export const UNCHANGED_ROLES: ColorToken[] = [
  "mutedForeground",
  "gold",
  "goldForeground",
  "danger",
  "dangerForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "info",
  "infoForeground",
  "accent",
  "accentForeground",
];
