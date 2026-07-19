import { type ReactNode, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { Button } from "./button";

/**
 * @spec SPEC-20260525-001 §8.1, §4.3
 * Ícones semânticos fixos por variante (SVG embutido, não substituível pela prop `icon`
 * de override) — significado carregado pelo texto (`title`/`description`), não pelo
 * ícone isoladamente (WCAG SC 1.1.1, técnica H86). `AlertIcon` não é exportado.
 */
function AlertIcon({ variant }: { variant: AlertProps["variant"] }): ReactNode {
  const commonProps = {
    "aria-hidden": true as const,
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (variant) {
    case "success":
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="8" />
          <path d="M6.5 10.5l2.2 2.2 4.8-5.4" />
        </svg>
      );
    case "warning":
      return (
        <svg {...commonProps}>
          <path d="M10 2.5l8 14H2l8-14z" />
          <path d="M10 8v3.5" />
          <circle cx="10" cy="14" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
    case "error":
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="8" />
          <path d="M7 7l6 6M13 7l-6 6" />
        </svg>
      );
    case "info":
    default:
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v5" />
          <circle cx="10" cy="6.25" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

const alertVariants = cva("flex items-start gap-3 rounded-md border-l-4 p-4", {
  variants: {
    variant: {
      info: "border-l-info bg-info-pastel text-foreground",
      success: "border-l-success bg-success-pastel text-foreground",
      warning: "border-l-warning bg-warning-pastel text-foreground",
      error: "border-l-danger bg-danger-pastel text-foreground",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

export interface AlertProps extends VariantProps<typeof alertVariants> {
  variant: "info" | "success" | "warning" | "error";
  title?: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  icon?: ReactNode;
  className?: string;
}

/** @spec SPEC-20260525-001 §8.1 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, title, description, action, onDismiss, icon, className }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)}>
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon ?? <AlertIcon variant={variant} />}
      </span>
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        <p className="text-sm">{description}</p>
        {action && (
          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar"
          className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      )}
    </div>
  ),
);

Alert.displayName = "Alert";
