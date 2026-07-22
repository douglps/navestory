import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface VehicleHealthScoreProps {
  /** Score de 0 a 100. `undefined` renderiza estado neutro ("Calculando…"). */
  score: number | undefined;
  /** Diâmetro do anel em px. Default pensado para caber em grids densos (RF-06). */
  size?: number;
  strokeWidth?: number;
  className?: string;
}

type ScoreTier = "danger" | "warning" | "success" | "neutral";

/**
 * @spec SPEC-20260531-001 RF-SH-02, SPEC-20260721-002 RF-02
 * Limiares idênticos aos de RF-SH-02 (70-100 verde, 40-69 amarelo, 0-39 vermelho) — RF-02 troca
 * a representação visual (dot → anel), não a regra de negócio de mapeamento de score.
 */
function scoreTier(score: number | undefined): ScoreTier {
  if (score === undefined) return "neutral";
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function tierStrokeVar(tier: ScoreTier): string {
  switch (tier) {
    case "success":
      return "oklch(var(--success))";
    case "warning":
      return "oklch(var(--warning))";
    case "danger":
      return "oklch(var(--danger))";
    case "neutral":
    default:
      return "oklch(var(--muted-foreground))";
  }
}

function tierLabel(tier: ScoreTier): string {
  switch (tier) {
    case "success":
      return "Em dia";
    case "warning":
      return "Atenção";
    case "danger":
      return "Crítico";
    case "neutral":
    default:
      return "Calculando";
  }
}

/**
 * @spec SPEC-20260721-002 RF-02
 * Anel de progresso SVG (stroke-dasharray/dashoffset) substituindo o "dot" de saúde do
 * veículo. Sem dependência de biblioteca SVG externa (RNF-02) — props tipadas, sem `any`.
 */
export function VehicleHealthScore({
  score,
  size = 36,
  strokeWidth = 3,
  className,
}: VehicleHealthScoreProps): ReactNode {
  const tier = scoreTier(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score === undefined ? 0 : Math.min(100, Math.max(0, score)) / 100;
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <span
      role="img"
      aria-label={score === undefined ? "Calculando saúde do veículo" : `Saúde: ${score} de 100 — ${tierLabel(tier)}`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="oklch(var(--border))"
          strokeWidth={strokeWidth}
        />
        {score !== undefined && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={tierStrokeVar(tier)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      {score !== undefined && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground"
        >
          {score}
        </span>
      )}
    </span>
  );
}
