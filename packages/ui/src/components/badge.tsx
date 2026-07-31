import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260730-001 RF-01 — substitui o padrão ad hoc `border-{semantic}
 * bg-{semantic}-pastel text-foreground` já convergente em ~10 arquivos (fines, atividades,
 * manutenção, saúde de veículo, alertas de frota).
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "border-success bg-success-pastel text-foreground",
        warning: "border-warning bg-warning-pastel text-foreground",
        danger: "border-danger bg-danger-pastel text-foreground",
        info: "border-info bg-info-pastel text-foreground",
        neutral: "border-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): ReactNode {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
