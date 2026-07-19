import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "./card";

/**
 * @spec SPEC-20260525-001 §5.2
 * Consolida a estrutura de header/loading/empty state hoje duplicada em
 * `TcoBreakdownChart`/`FuelTrendChart` (`apps/web/src/components/charts/`, IMPACTO-038).
 */
export interface ChartWrapperProps {
  title: string;
  description?: string;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** @spec SPEC-20260525-001 §5.2 */
export function ChartWrapper({
  title,
  description,
  loading = false,
  isEmpty = false,
  emptyMessage = "Sem dados para exibir",
  actions,
  className,
  children,
}: ChartWrapperProps): ReactNode {
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando gráfico" className="flex h-64 items-center justify-center">
          <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
        </div>
      ) : isEmpty ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
