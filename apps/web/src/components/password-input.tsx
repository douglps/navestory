"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn, inputBaseClass } from "@nave/ui";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * @spec SPEC-20260524-001 RNF-04 (WCAG 2.1 AA)
 */
export function PasswordInput({ className, ...props }: PasswordInputProps): ReactNode {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(inputBaseClass, "h-10 pr-16", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
