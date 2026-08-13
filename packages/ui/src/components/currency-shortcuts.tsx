"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface ShortcutItem {
  label: string;
  /** Valor absoluto a definir quando clicado. Mutuamente exclusivo com `increment`. */
  value?: number;
  /** Valor incremental somado ao `currentValue` quando clicado. Mutuamente exclusivo com `value`. */
  increment?: number;
}

export interface CurrencyShortcutsProps {
  shortcuts: ShortcutItem[];
  onSelect: (value: number) => void;
  /** Valor atual do campo de moeda (necessário para shortcuts de `increment`). Padrão: 0. */
  currentValue?: number;
  className?: string;
}

/**
 * Chips de atalho para entrada rápida de valores monetários em mobile.
 * Reduz fricção em campos de valor redondo frequente (ex.: abastecimentos, despesas fixas).
 *
 * Exemplo de uso:
 * ```tsx
 * <CurrencyShortcuts
 *   shortcuts={[
 *     { label: "R$ 50", value: 5000 },
 *     { label: "R$ 100", value: 10000 },
 *     { label: "+R$ 10", increment: 1000 },
 *   ]}
 *   onSelect={(cents) => setAmount(cents)}
 *   currentValue={amount}
 * />
 * ```
 *
 * Portado de Nave-SaaS-main/packages/ui/src/components/currency-shortcuts.tsx
 * com adaptação de import (cn de ../lib/utils → ../lib/cn).
 */
export function CurrencyShortcuts({
  shortcuts,
  onSelect,
  currentValue = 0,
  className,
}: CurrencyShortcutsProps): ReactNode {
  return (
    <div className={cn("mt-1.5 flex flex-wrap gap-1.5", className)}>
      {shortcuts.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            const resolved = item.value ?? currentValue + (item.increment ?? 0);
            onSelect(resolved);
          }}
          className={cn(
            "h-7 select-none rounded-md border border-border bg-background",
            "px-2.5 text-xs font-semibold tabular-nums",
            "transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary",
            "active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
