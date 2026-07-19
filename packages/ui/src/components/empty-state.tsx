import { type ReactNode, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { Button, type ButtonProps } from "./button";

/**
 * @spec SPEC-20260525-001 §8.3
 * Consolida as 6 duplicatas de estado vazio hoje espalhadas por `expenses`, `maintenance`,
 * `analytics`, `dashboard`, `atividades` e `VehicleSpotlight` (ver IMPACTO-038) — layout
 * ilustração (`icon`, decorativo, §4.3) + título + descrição + CTA opcional.
 */
const emptyStateVariants = cva("flex flex-col items-center justify-center gap-2 text-center", {
  variants: {
    size: {
      sm: "gap-1 py-4",
      md: "gap-2 py-8",
      lg: "gap-3 py-16",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type EmptyStateSize = "sm" | "md" | "lg";

function iconSizeClass(size: EmptyStateSize): string {
  switch (size) {
    case "sm":
      return "text-2xl";
    case "lg":
      return "text-5xl";
    case "md":
    default:
      return "text-4xl";
  }
}

function titleSizeClass(size: EmptyStateSize): string {
  switch (size) {
    case "sm":
      return "text-sm font-medium";
    case "lg":
      return "text-lg font-semibold";
    case "md":
    default:
      return "text-base font-semibold";
  }
}

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
}

export interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: Pick<EmptyStateAction, "label" | "onClick">;
  className?: string;
}

/** @spec SPEC-20260525-001 §8.3 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, secondaryAction, size = "md", className }, ref) => {
    const resolvedSize = size ?? "md";
    return (
      <div ref={ref} className={cn(emptyStateVariants({ size }), className)}>
        {icon && (
          <span className={iconSizeClass(resolvedSize)} aria-hidden="true">
            {icon}
          </span>
        )}
        <p className={titleSizeClass(resolvedSize)}>{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
        {(action || secondaryAction) && (
          <div className="mt-2 flex items-center gap-2">
            {action && (
              <Button variant={action.variant ?? "default"} size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";
