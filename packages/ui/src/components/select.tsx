"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface SelectNativeProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Exibe borda vermelha de erro e define aria-invalid. */
  error?: boolean;
  /** Opção inicial desabilitada exibida quando nenhum valor é selecionado. */
  placeholder?: string;
}

/**
 * Select nativo estilizado — para listas curtas e fechadas (sem busca).
 *
 * Quando usar SelectNative vs. Combobox:
 * - **SelectNative**: lista fixa com ≤10 opções, sem necessidade de busca
 *   (ex.: tipo de combustível, categoria de manutenção, estado de veículo).
 * - **Combobox**: lista longa, dinâmica ou com busca integrada.
 *
 * Vantagens do select nativo:
 * - Zero dependência adicional
 * - Comportamento otimizado em mobile (picker nativo iOS/Android)
 * - Acessibilidade garantida pelo browser
 *
 * API compatível com `<select>` HTML — todos os atributos nativos são aceitos.
 */
export const SelectNative = forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, error, placeholder, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          // Base visual alinhada com Input (inputBaseClass)
          "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2",
          "text-sm text-foreground outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Seta de dropdown via SVG inline (sem dependência de asset)
          "appearance-none bg-no-repeat",
          error && "border-danger",
          className,
        )}
        style={{
          // Seta chevron em muted-foreground aproximado — #6b7280 (slate-500)
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundPosition: "right 0.75rem center",
          backgroundSize: "1rem",
          paddingRight: "2.5rem",
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  },
);

SelectNative.displayName = "SelectNative";
