"use client";

import type { ReactNode } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260525-001 §6.1
 * `@radix-ui/react-tabs` como primitivo headless — mesma árvore de dependências Radix
 * já usada em `combobox.tsx` (IMPACTO-038). Só a faixa de abas é renderizada (sem
 * `Tabs.Content`): o consumidor decide como/onde exibir o painel associado a `value`,
 * preservando o padrão já usado em `VehicleSpotlight.tsx`/`expenses/page.tsx`.
 */
export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: "default" | "pills" | "underline";
  "aria-label"?: string;
  className?: string;
}

const listVariants = cva("flex", {
  variants: {
    variant: {
      default: "gap-4 border-b border-border",
      underline: "gap-1 border-b border-border",
      pills: "gap-1 rounded-md bg-muted p-1",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const triggerVariants = cva(
  "group flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-foreground",
        underline:
          "border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-foreground",
        pills:
          "rounded-sm data-[state=active]:bg-card data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** @spec SPEC-20260525-001 §6.1 */
export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  variant = "default",
  "aria-label": ariaLabel,
  className,
}: TabsProps): ReactNode {
  return (
    <RadixTabs.Root
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
      className={className}
    >
      <RadixTabs.List aria-label={ariaLabel} className={cn(listVariants({ variant }))}>
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            aria-controls={undefined}
            className={cn(triggerVariants({ variant }))}
          >
            {item.icon && (
              <span aria-hidden="true" className="shrink-0">
                {item.icon}
              </span>
            )}
            {item.label}
            {item.badge !== undefined && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-xs group-data-[state=active]:bg-primary/10">
                {item.badge}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}
