import Link from "next/link";
import type { ReactNode } from "react";

const MAX_VISIBLE_ALERTS = 3;

export interface FleetAlertItem {
  id: string;
  type: "maintenance_overdue" | "maintenance_upcoming" | "document_overdue";
  vehicle_plate: string;
  description: string;
  days_until_due: number;
}

function alertLabel(alert: FleetAlertItem): string {
  if (alert.days_until_due < 0) {
    const days = Math.abs(alert.days_until_due);
    return `Vencido há ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (alert.days_until_due === 0) return "Vence hoje";
  return `Vence em ${alert.days_until_due} ${alert.days_until_due === 1 ? "dia" : "dias"}`;
}

function alertStyles(alert: FleetAlertItem): string {
  return alert.days_until_due < 0
    ? "border-red-400 bg-red-50 text-red-800"
    : "border-amber-400 bg-amber-50 text-amber-800";
}

/**
 * @spec SPEC-20260531-001 RF-DA-01, RF-DA-02, CA-S3-02
 * Alertas de manutenção e de documentos (IPVA/Seguro/CRLV vencidos) vêm combinados e já ordenados
 * por urgência de `GET /dashboard/alerts` — este componente não distingue tipo, só urgência.
 */
export function FleetAlertBar({ alerts }: { alerts: FleetAlertItem[] }): ReactNode {
  if (alerts.length === 0) return null;

  const visible = alerts.slice(0, MAX_VISIBLE_ALERTS);
  const overflowCount = alerts.length - visible.length;

  return (
    <div role="region" aria-label="Alertas críticos da frota" className="flex flex-col gap-2">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm ${alertStyles(alert)}`}
        >
          <span>
            <strong>{alert.vehicle_plate}</strong> — {alert.description}
          </span>
          <span className="shrink-0 text-xs font-medium">{alertLabel(alert)}</span>
        </div>
      ))}
      {overflowCount > 0 && (
        <Link href="/maintenance?filter=urgent" className="text-sm underline">
          ver todos (+{overflowCount})
        </Link>
      )}
    </div>
  );
}
