import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "./card";

/**
 * @spec SPEC-20260525-001 §5.1
 * Evolui o padrão duplicado de `KpiTile` (`FleetKpis.tsx`) e os KPIs inline de
 * `expenses/page.tsx` (ver IMPACTO-038) num único componente reutilizável, construído
 * sobre `<Card>` (§4.2).
 */

export type KpiCardVariant = "success" | "danger" | "warning" | "info" | "neutral";

function variantTextClass(variant: KpiCardVariant): string {
  switch (variant) {
    case "success":
      return "text-success";
    case "danger":
      return "text-danger";
    case "warning":
      return "text-warning";
    case "info":
      return "text-info";
    case "neutral":
    default:
      return "text-muted-foreground";
  }
}

function variantStrokeVar(variant: KpiCardVariant): string {
  switch (variant) {
    case "success":
      return "oklch(var(--success))";
    case "danger":
      return "oklch(var(--danger))";
    case "warning":
      return "oklch(var(--warning))";
    case "info":
      return "oklch(var(--info))";
    case "neutral":
    default:
      return "oklch(var(--muted-foreground))";
  }
}

/** Resolve a variante final: `variant` explícito tem prioridade sobre o cálculo por `trend`. */
function resolveTrendVariant(trendValue: number, reverseTrend: boolean): KpiCardVariant {
  if (trendValue === 0) return "neutral";
  const isPositive = trendValue > 0;
  const isGood = reverseTrend ? !isPositive : isPositive;
  return isGood ? "success" : "danger";
}

interface SparklineProps {
  values: number[];
  variant: KpiCardVariant;
  ariaLabel: string;
}

function Sparkline({ values, variant, ariaLabel }: SparklineProps): ReactNode {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const step = values.length > 1 ? w / (values.length - 1) : 0;

  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible" role="img" aria-label={ariaLabel}>
      <polyline
        points={points}
        fill="none"
        stroke={variantStrokeVar(variant)}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiCardSkeleton(): ReactNode {
  return (
    <Card padding="sm" className="min-w-[150px] max-w-[220px] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-4 w-4 rounded bg-muted" />
      </div>
      <div className="mt-3 h-6 w-20 rounded bg-muted" />
      <div className="mt-3 h-6 w-full rounded bg-muted" />
    </Card>
  );
}

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  sparkline?: number[];
  variant?: KpiCardVariant;
  reverseTrend?: boolean;
  loading?: boolean;
  className?: string;
}

/** @spec SPEC-20260525-001 §5.1 */
export function KpiCard({
  title,
  value,
  unit,
  icon,
  trend,
  sparkline,
  variant,
  reverseTrend = false,
  loading = false,
  className,
}: KpiCardProps): ReactNode {
  if (loading) {
    return <KpiCardSkeleton />;
  }

  const trendVariant = trend ? resolveTrendVariant(trend.value, reverseTrend) : "neutral";
  const resolvedVariant = variant ?? trendVariant;

  return (
    <Card padding="sm" className={cn("min-w-[150px] max-w-[220px]", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon && (
          <span aria-hidden="true" className="text-base">
            {icon}
          </span>
        )}
      </div>

      <p className="mt-1 text-lg font-semibold">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>

      {trend && (
        <p className={cn("mt-1 text-sm", variantTextClass(trendVariant))}>
          {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "→"} {Math.abs(trend.value)}%
          {trend.label && <span className="text-muted-foreground"> {trend.label}</span>}
        </p>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-2">
          <Sparkline
            values={sparkline}
            variant={resolvedVariant}
            ariaLabel={`Tendência: ${sparkline[sparkline.length - 1]} valor mais recente`}
          />
        </div>
      )}
    </Card>
  );
}
