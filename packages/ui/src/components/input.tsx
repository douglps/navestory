"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

/** @spec SPEC-20260525-001 §4.1 — classe-base compartilhada por Input/Textarea/masked-input. */
export const inputBaseClass =
  "flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground " +
  "outline-none transition-colors placeholder:text-muted-foreground " +
  "focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/** @spec SPEC-20260729-003 RF-01 — input de texto genérico, alinhado à direção Prata. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(inputBaseClass, "h-10", error && "border-danger", className)}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
