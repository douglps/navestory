import type { ReactNode } from "react";

export type KpiResult<T> = { ok: true; value: T } | { ok: false };

export interface FleetKpisData {
  total_this_month: KpiResult<number>;
  urgent_maintenance_count: KpiResult<number>;
  cost_per_km: KpiResult<number | null>;
  next_maintenance: KpiResult<{ date: string; vehicle_plate: string } | null>;
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");
}

/**
 * Card de KPI mínimo, sem depender de `KpiCard` (SPEC-20260525-001/T8.1, ainda não construído) —
 * decisão registrada em IMPACTO-033: adaptar à stack real agora, migrar quando a Fase 8 evoluir
 * os componentes compartilhados de `packages/ui`.
 */
function KpiTile({
  label,
  result,
  render,
}: {
  label: string;
  result: KpiResult<unknown>;
  render: () => ReactNode;
}): ReactNode {
  return (
    <div className="rounded border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      {result.ok ? (
        <div className="text-lg font-semibold">{render()}</div>
      ) : (
        <div
          className="flex items-center gap-1 text-lg font-semibold text-neutral-400"
          title="Não foi possível carregar. Tente novamente."
        >
          <span aria-hidden>⚠</span>
          <span>—</span>
        </div>
      )}
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DA-03, CA-S1-05, CA-S1-05.1
 */
export function FleetKpis({ kpis }: { kpis: FleetKpisData }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiTile
        label="Gastos do mês"
        result={kpis.total_this_month}
        render={() => currency((kpis.total_this_month as { ok: true; value: number }).value)}
      />
      <KpiTile
        label="Manutenções urgentes"
        result={kpis.urgent_maintenance_count}
        render={() => (kpis.urgent_maintenance_count as { ok: true; value: number }).value}
      />
      <KpiTile
        label="Custo/km"
        result={kpis.cost_per_km}
        render={() => {
          const value = (kpis.cost_per_km as { ok: true; value: number | null }).value;
          return value === null ? (
            <span
              className="text-sm font-normal text-neutral-500"
              title="Registre o odômetro no próximo abastecimento"
            >
              —
            </span>
          ) : (
            currency(value)
          );
        }}
      />
      <KpiTile
        label="Próxima manutenção"
        result={kpis.next_maintenance}
        render={() => {
          const value = (
            kpis.next_maintenance as { ok: true; value: { date: string; vehicle_plate: string } | null }
          ).value;
          return value === null ? (
            <span className="text-sm font-normal text-neutral-500">Nenhuma agendada</span>
          ) : (
            <span className="text-base">
              {formatDate(value.date)}{" "}
              <span className="text-sm font-normal text-neutral-500">{value.vehicle_plate}</span>
            </span>
          );
        }}
      />
    </div>
  );
}
