"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from "react";
import { cn } from "../lib/cn";

export type LabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root>;

/**
 * Label acessível construído sobre @radix-ui/react-label.
 * Vincula automaticamente ao campo via `htmlFor`, com suporte nativo a
 * `peer-disabled` (opacidade reduzida quando o campo associado está desabilitado).
 *
 * Substitui o `<label>` HTML puro — mantém a mesma API de atributos HTML.
 */
export const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "text-sm font-medium text-foreground",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);

Label.displayName = "Label";
