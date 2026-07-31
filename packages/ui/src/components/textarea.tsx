"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { inputBaseClass } from "./input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/** @spec SPEC-20260729-003 RF-01 — textarea genérico, alinhado à direção Prata. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(inputBaseClass, "min-h-[80px]", error && "border-danger", className)}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
