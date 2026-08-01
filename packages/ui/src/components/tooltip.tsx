"use client";

import { type ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260730-001 RF-04 — `@radix-ui/react-tooltip` como primitivo headless, mesma
 * família Radix já usada em `dialog.tsx`/`combobox.tsx`/`tabs.tsx`. Substitui o `title=` nativo
 * do navegador (lento, sem estilo, sem controle de posição).
 */
export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps): ReactNode {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={4}
            className={cn(
              "z-[210] rounded-md border border-border bg-card px-2 py-1 text-xs text-card-foreground shadow-md",
              "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=delayed-open]:fade-in",
              className,
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-card" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
