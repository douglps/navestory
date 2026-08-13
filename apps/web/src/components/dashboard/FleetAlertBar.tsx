import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@navestory/ui";

export interface FleetAlertItem {
  id: string;
  type: "maintenance_overdue" | "maintenance_upcoming" | "document_overdue" | "document_upcoming";
  vehicle_plate: string;
  description: string;
  days_until_due: number;
}

export function alertLabel(alert: FleetAlertItem): string {
  if (alert.days_until_due < 0) {
    const days = Math.abs(alert.days_until_due);
    return `Vencido há ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (alert.days_until_due === 0) return "Vence hoje";
  return `Vence em ${alert.days_until_due} ${alert.days_until_due === 1 ? "dia" : "dias"}`;
}

/**
 * @spec SPEC-20260729-002 — direção Prata: cor de alerta é acento pontual (regra 60-30-10 e
 * "vermelho sempre sobre superfície neutra clara" de `directions.ts`), nunca fundo dominante.
 */
export function alertChipStyles(alert: FleetAlertItem): string {
  return alert.days_until_due < 0 ? "bg-danger-pastel text-foreground" : "bg-warning-pastel text-foreground";
}

/**
 * @spec SPEC-20260813-001 RF-05
 * Substitui a lista vertical de até 3 linhas por uma faixa de 1 linha com contadores agregados
 * por severidade — o detalhe completo agora vive no sino de alertas do header (`AlertsBell`),
 * com cobertura em todas as telas; esta faixa é o resumo contextual do dashboard.
 */
export function FleetAlertBar({ alerts }: { alerts: FleetAlertItem[] }): ReactNode {
  if (alerts.length === 0) return null;

  const overdueCount = alerts.filter((alert) => alert.days_until_due < 0).length;
  const upcomingCount = alerts.length - overdueCount;

  return (
    <div
      role="region"
      aria-label="Resumo de alertas críticos da frota"
      className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2"
    >
      <div className="flex items-center gap-2">
        {overdueCount > 0 && (
          <Badge variant="danger">
            {overdueCount} vencido{overdueCount === 1 ? "" : "s"}
          </Badge>
        )}
        {upcomingCount > 0 && (
          <Badge variant="warning">
            {upcomingCount} próximo{upcomingCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>
      <Link
        href="/maintenance?filter=urgent"
        className="shrink-0 text-sm text-muted-foreground underline transition-colors hover:text-foreground"
      >
        Ver alertas
      </Link>
    </div>
  );
}
