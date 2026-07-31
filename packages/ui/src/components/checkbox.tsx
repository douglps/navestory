"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * @spec SPEC-20260729-003 RF-01 — checkbox nativo com accent-color tokenizado (sem estado
 * indeterminado nos consumidores atuais, dispensa dependência Radix nova).
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-border accent-primary outline-none " +
            "focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";
