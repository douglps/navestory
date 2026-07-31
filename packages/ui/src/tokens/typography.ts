/**
 * @spec SPEC-20260731-001 RF-06
 * Sistema tipográfico formal — inexistente até esta spec (o produto rodava no default do
 * Tailwind/fonte do sistema operacional, por omissão, não decisão). Família recomendada: Inter
 * (única, variável — `apps/web/src/app/layout.tsx` aplica via `next/font/google`), escala
 * modular de razão 1.2. A escala de utilitários `text-*` do Tailwind foi remapeada para estes
 * valores em `apps/web/tailwind.config.ts` — ver SPEC-20260731-003.
 */
export interface TypeScaleStep {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  use: string;
}

export const typographyScale = {
  xs: { fontSize: "11px", lineHeight: "1.5", fontWeight: 400, use: "Labels de campo, metadados" },
  sm: { fontSize: "13px", lineHeight: "1.45", fontWeight: 400, use: "Corpo de tabela, badges" },
  base: { fontSize: "15px", lineHeight: "1.5", fontWeight: 400, use: "Corpo padrão, parágrafos" },
  md: { fontSize: "18px", lineHeight: "1.4", fontWeight: 500, use: "Subtítulos de seção" },
  lg: { fontSize: "22px", lineHeight: "1.3", fontWeight: 600, use: "Título de página" },
  xl: { fontSize: "26px", lineHeight: "1.25", fontWeight: 700, use: "KPI principal" },
  "2xl": { fontSize: "32px", lineHeight: "1.2", fontWeight: 700, use: "Display de destaque" },
} as const satisfies Record<string, TypeScaleStep>;

export type TypographyScaleToken = keyof typeof typographyScale;

/**
 * Pesos permitidos em texto funcional — 300 evitado, legibilidade cai em telas de baixa
 * resolução (proposta §5).
 */
export const typographyWeights = {
  body: 400,
  emphasis: 500,
  label: 600,
  heading: 700,
} as const;
