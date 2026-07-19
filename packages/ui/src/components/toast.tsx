import { type ReactNode, useEffect } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260525-001 §8.2
 * Ícones semânticos por variante — mesmo set de `Alert` (§4.3), duplicado aqui porque
 * `AlertIcon` não é exportado. `default` não tem ícone: preserva o visual dos 3 toasts
 * ad hoc migrados (texto simples, sem ícone).
 */
function ToastIcon({ variant }: { variant: ToastVariant }): ReactNode {
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
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v5" />
          <circle cx="10" cy="6.25" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
    case "default":
    default:
      return null;
  }
}

const toastVariants = cva(
  "pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-l-4 border-l-info bg-info-pastel text-foreground",
        success: "border-l-4 border-l-success bg-success-pastel text-foreground",
        warning: "border-l-4 border-l-warning bg-warning-pastel text-foreground",
        error: "border-l-4 border-l-danger bg-danger-pastel text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** ms; padrão 4000 aplicado pelo chamador (§8.2). 0 = persistente (sem auto-dismiss). */
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps): ReactNode {
  const { id, variant = "default", title, description, duration = 4000, action } = toast;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  // Persistente + ação: preserva o visual do antigo ServiceWorkerUpdateToast, dispensável
  // só pela ação (ex: "Recarregar"), não por um X — evita fechar sem aplicar a atualização.
  const showDismiss = !(duration === 0 && action);

  return (
    <div role="status" className={cn(toastVariants({ variant }))}>
      {variant !== "default" && (
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          <ToastIcon variant={variant} />
        </span>
      )}
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && <p className="mt-0.5 text-muted-foreground">{description}</p>}
        {action && (
          <div className="mt-2">
            <button
              type="button"
              onClick={action.onClick}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
      {showDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Fechar aviso"
          className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * @spec SPEC-20260525-001 §8.2
 * Fila única de notificações — substitui `ContextStaleToast`/`ServiceWorkerUpdateToast`/
 * `OfflineWriteBlockedToast`. Posição preservada da v1.0: topo centralizado no mobile,
 * canto inferior direito a partir de `md:`.
 */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps): ReactNode {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[150] flex flex-col gap-2",
        "left-1/2 top-4 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2",
        "md:left-auto md:right-4 md:top-auto md:bottom-4 md:w-auto md:translate-x-0",
      )}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
