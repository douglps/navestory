import Link from "next/link";
import type { ReactNode } from "react";

const MAX_VISIBLE_ALERTS = 3;

export interface FleetAlertItem {
  id: string;
  type: "maintenance_overdue" | "maintenance_upcoming" | "document_overdue" | "document_upcoming";
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

/**
 * @spec SPEC-20260721-002 RF-03 — tokens semânticos em vez de classes Tailwind literais
 * @spec SPEC-20260729-002 — direção Prata: cor de alerta é acento pontual (regra 60-30-10 e
 * "vermelho sempre sobre superfície neutra clara" de `directions.ts`), nunca fundo dominante.
 * A linha usa `bg-card` neutro (mesmo tom de `surface-alt` da paleta Prata); a cor semântica
 * fica confinada ao chip de prazo, no padrão `bg-{variant}-pastel text-foreground` já
 * comprovado acessível por `Alert`/`KpiCard` (border-{variant} sozinho falha contraste 3:1
 * não-textual para `warning` sobre `card`, por isso não é usado como borda colorida aqui).
 */
function alertChipStyles(alert: FleetAlertItem): string {
  return alert.days_until_due < 0 ? "bg-danger-pastel text-foreground" : "bg-warning-pastel text-foreground";
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
          className="flex items-center justify-between gap-2 rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <span>
            <strong>{alert.vehicle_plate}</strong> — {alert.description}
          </span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${alertChipStyles(alert)}`}
          >
            {alertLabel(alert)}
          </span>
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
