import { TrendingDown, TrendingUp, Minus, type LucideIcon } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { Card } from "./card";
import { Icon, type IconColor } from "./icon";
import { Skeleton } from "./skeleton";
import { Typography } from "./typography";

/**
 * @spec SPEC-20260525-001 §5.1 (complemento ao KpiCard)
 * StatsCard e KpiCard são complementares — não substitutos:
 * - StatsCard: glass effect, glow colorido, trend badge visual — dashboards analíticos.
 * - KpiCard: compacto, denso, sparkline — grids de KPI com múltiplas métricas.
 *
 * Portado de Nave-SaaS-main/packages/ui/src/components/stats-card.tsx,
 * adaptado para tokens OKLCH do navestory (sem text-on-surface-muted ad hoc,
 * usa Typography variant="kicker"; glass-card via classe CSS de globals.css).
 */

export type StatsCardVariant = "success" | "danger" | "warning" | "info";

export interface StatsCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  unit?: string;
  /** Ícone Lucide exibido no canto superior esquerdo do card. */
  icon: LucideIcon;
  trend?: {
    /** Percentual de variação numérico (ex.: 12 = +12%, -5 = -5%). */
    value: number;
    /** true se a métrica subiu no período — usado para calcular a variante automática. */
    isUp: boolean;
  };
  /**
   * Variante semântica explícita — substitui o cálculo automático via `trend`.
   * Omitir para calcular automaticamente.
   */
  variant?: StatsCardVariant;
  /**
   * Inverte a lógica de cor para métricas onde aumento é ruim (ex.: custo, inadimplência).
   * Com `reverseTrend=true`: isUp=true → danger, isUp=false → success.
   */
  reverseTrend?: boolean;
  loading?: boolean;
}

function resolveStatus(
  trend: StatsCardProps["trend"],
  variant: StatsCardVariant | undefined,
  reverseTrend: boolean,
): StatsCardVariant {
  if (variant) return variant;
  if (!trend || trend.value === 0) return "info";
  const isGood = reverseTrend ? !trend.isUp : trend.isUp;
  return isGood ? "success" : "danger";
}

const glowColorClass: Record<StatsCardVariant, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

const trendBadgeClass: Record<StatsCardVariant, string> = {
  success: "bg-success-pastel/40 text-success border-success/10",
  danger: "bg-danger-pastel/40 text-danger border-danger/10",
  warning: "bg-warning-pastel/40 text-warning border-warning/10",
  info: "bg-info-pastel/40 text-info border-info/10",
};

function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn("relative w-full min-w-[150px] max-w-[190px] overflow-hidden", className)}
      padding="md"
    >
      <div className="mb-2 flex items-start gap-2">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </div>
      <Skeleton className="mt-auto h-6 w-16" />
    </Card>
  );
}

export function StatsCard({
  title,
  value,
  unit,
  icon,
  trend,
  variant,
  reverseTrend = false,
  loading = false,
  className,
  ...props
}: StatsCardProps) {
  if (loading) return <StatsCardSkeleton className={className} />;

  const status = resolveStatus(trend, variant, reverseTrend);
  const iconColor = status as IconColor;
  const isStable = !trend || trend.value === 0;

  return (
    <div
      className={cn(
        "group relative w-full min-w-[150px] max-w-[190px] overflow-hidden rounded-lg border p-4",
        "border-border transition-all duration-500 hover:border-border/50",
        // glass-card definida em apps/web/globals.css @layer components
        "glass-card",
        className,
      )}
      {...props}
    >
      {/* Glow de fundo — opacidade aumenta no hover */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-8 -right-8 size-32 blur-3xl",
          "opacity-5 transition-all duration-700 group-hover:opacity-15",
          glowColorClass[status],
        )}
      />

      {/* Cabeçalho: ícone + título */}
      <div className="mb-2 flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 shadow-sm",
              "bg-surface/50 transition-all duration-500 group-hover:scale-110",
            )}
          >
            <Icon icon={icon} size="md" color={iconColor} />
          </div>
          <Typography variant="kicker" as="p">
            {title}
          </Typography>
        </div>
      </div>

      {/* Rodapé: valor + badge de tendência */}
      <div className="mt-auto flex items-end justify-between gap-0.5">
        <div className="flex items-baseline gap-0.5">
          <Typography variant="kpi" as="span" className="text-lg">
            {value}
          </Typography>
          {unit && (
            <Typography variant="caption" as="span" className="text-[9px] font-bold opacity-70">
              {unit}
            </Typography>
          )}
        </div>

        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 backdrop-blur-sm",
              "transition-all duration-500 group-hover:scale-105",
              trendBadgeClass[status],
            )}
          >
            {isStable ? (
              <Icon icon={Minus} size="xs" color={iconColor} className="max-[350px]:hidden" />
            ) : trend.isUp ? (
              <Icon icon={TrendingUp} size="xs" color={iconColor} className="max-[350px]:hidden" />
            ) : (
              <Icon
                icon={TrendingDown}
                size="xs"
                color={iconColor}
                className="max-[350px]:hidden"
              />
            )}
            <span className="text-[9px] font-black normal-case tracking-tighter">
              {trend.value > 0 ? `+${trend.value}` : trend.value}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
