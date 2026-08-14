import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Skeleton } from "@navestory/ui";

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
 * @spec SPEC-20260813-001 RF-10
 * Estado de carregamento — distinto do estado vazio, para o usuário não confundir "ainda não
 * sei" com "está tudo em dia".
 */
function FleetAlertBarSkeleton(): ReactNode {
  return (
    <div
      role="region"
      aria-label="Carregando resumo de alertas críticos da frota"
      className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2"
    >
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

/**
 * @spec SPEC-20260813-001 RF-10
 * Estado vazio explícito — dados carregados, zero alertas. Confirma visualmente que a frota
 * está em dia em vez de simplesmente não exibir nada.
 */
function FleetAlertBarSuccess(): ReactNode {
  return (
    <div
      role="region"
      aria-label="Resumo de alertas críticos da frota"
      className="flex items-center gap-2 rounded border border-border bg-card px-3 py-2"
    >
      <Badge variant="success">Frota em dia</Badge>
    </div>
  );
}

/**
 * @spec SPEC-20260813-001 RF-05, RF-10
 * Substitui a lista vertical de até 3 linhas por uma faixa de 1 linha com contadores agregados
 * por severidade — o detalhe completo agora vive no sino de alertas do header (`AlertsBell`),
 * com cobertura em todas as telas; esta faixa é o resumo contextual do dashboard. `alerts`
 * indefinido (loading) e `alerts` vazio (frota em dia) têm estados visuais distintos — RF-10.
 */
export function FleetAlertBar({ alerts }: { alerts: FleetAlertItem[] | undefined }): ReactNode {
  if (alerts === undefined) return <FleetAlertBarSkeleton />;
  if (alerts.length === 0) return <FleetAlertBarSuccess />;

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
