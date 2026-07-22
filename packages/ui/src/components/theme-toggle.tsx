"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface ThemeToggleProps {
  /** Tema efetivo atualmente aplicado — resolvido pelo chamador (ex: `next-themes` `resolvedTheme`). */
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
}

/**
 * @spec SPEC-20260721-001 RF-03
 * Toggle sol/lua para sobrepor manualmente `prefers-color-scheme` (decisão F-2). Puramente
 * apresentacional — resolução de tema efetivo e persistência ficam a cargo do `next-themes`
 * no app consumidor; este componente não importa a lib para manter `packages/ui` agnóstico
 * de framework de tema.
 */
export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps): ReactNode {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
    </button>
  );
}
