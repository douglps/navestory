"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  colorChannels,
  cssVariableName,
  darkColorChannels,
  type ColorToken,
} from "@navestory/ui/tokens";
import { PROPOSED_TOKENS } from "../../_lib/tokens";
import { interFont } from "../../_lib/fonts";

export type ScopeMode = "light" | "dark";

/** Baseline: todos os tokens reais de produção, no valor de produção. */
function realTokenVars(mode: ScopeMode): Record<string, string> {
  const entries = Object.keys(colorChannels) as ColorToken[];
  const vars: Record<string, string> = {};
  for (const token of entries) {
    vars[cssVariableName(token)] =
      mode === "dark"
        ? (darkColorChannels[token] ?? colorChannels[token])
        : colorChannels[token];
  }
  return vars;
}

/** Sobrescreve só os papéis que a proposta Azul-Índigo muda de fato. */
function proposedOverrides(mode: ScopeMode): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [role, value] of Object.entries(PROPOSED_TOKENS)) {
    vars[cssVariableName(role as ColorToken)] =
      mode === "dark" ? value.dark : value.light;
  }
  return vars;
}

interface DesignSystemScopeProps {
  mode: ScopeMode;
  children: ReactNode;
  className?: string;
}

/**
 * Re-temiza os componentes REAIS de `@navestory/ui` dentro desta rota, sobrescrevendo as CSS
 * custom properties que eles já consomem via `oklch(var(--x))` — nenhum componente é
 * modificado, nenhum arquivo de produção é tocado. `UNCHANGED_ROLES` (gold/danger/success/
 * warning/info/accent/muted-foreground) chega aqui com o MESMO valor de produção, por
 * `realTokenVars`; só os papéis em `PROPOSED_TOKENS` são de fato sobrescritos.
 */
export function DesignSystemScope({
  mode,
  children,
  className,
}: DesignSystemScopeProps) {
  const vars = {
    ...realTokenVars(mode),
    ...proposedOverrides(mode),
    // `next-themes` seta `color-scheme`/`color` no <html> real do app; sem sobrescrever aqui,
    // controles nativos e o `color` inicial de elementos sem classe de texto explícita vazam
    // o tema ambiente para dentro do specimen (mesmo bug já corrigido no brand-showcase antigo).
    colorScheme: mode,
    color: "oklch(var(--foreground))",
    fontFamily: "var(--font-ds-inter), sans-serif",
  } as CSSProperties;

  return (
    <div
      style={vars}
      data-design-system-mode={mode}
      className={[
        mode === "dark" ? "dark" : "",
        interFont.variable,
        "bg-background text-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
