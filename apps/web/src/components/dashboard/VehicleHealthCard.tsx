import type { ReactNode } from "react";

export type DocumentStatus = "ok" | "attention" | "overdue" | "unknown";

export interface VehicleCardData {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
  odometer: number | null;
  last_fuel_date: string | null;
  last_fuel_amount: number | null;
  documents: { ipva: DocumentStatus; insurance: DocumentStatus; crlv: DocumentStatus };
}

function vehicleLabel(vehicle: VehicleCardData): string {
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** @spec SPEC-20260531-001 RF-SH-02 */
function semaphoreColor(score: number | undefined): string {
  if (score === undefined) return "bg-neutral-300";
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

const DOCUMENT_BADGE: Record<DocumentStatus, { label: string; className: string } | null> = {
  ok: null,
  unknown: null,
  attention: { label: "Atenção", className: "border-amber-400 bg-amber-50 text-amber-700" },
  overdue: { label: "Vencido", className: "border-red-400 bg-red-50 text-red-700" },
};

function DocumentBadge({ label, status }: { label: string; status: DocumentStatus }): ReactNode {
  // eslint-disable-next-line security/detect-object-injection -- status é DocumentStatus, union fixa de 4 literais
  const badge = DOCUMENT_BADGE[status];
  if (!badge) return null;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
      {label} {badge.label}
    </span>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DA-04, RF-DA-05, RF-SH-01, RF-SH-02
 * O semáforo consome `calculate_fleet_health` (RF-SH-01) — nunca recalculado aqui.
 * Clicar chama `setActiveVehicle` no store global (RF-DA-05); o scroll suave até a Zona B fica
 * pendente até a Sprint 2 construir o container `VehicleSpotlight` (migração incremental, seção
 * 12.3 da spec) — não há elemento para rolar até lá ainda.
 */
export function VehicleHealthCard({
  vehicle,
  score,
  isActive,
  onSelect,
}: {
  vehicle: VehicleCardData;
  score: number | undefined;
  isActive: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={`Ver análise de ${vehicleLabel(vehicle)}`}
      className={`flex flex-col gap-1.5 rounded border p-3 text-left ${
        isActive ? "border-amber-400 bg-amber-50" : "border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{vehicleLabel(vehicle)}</span>
        <span
          aria-hidden
          title={score === undefined ? "Calculando saúde…" : `Saúde: ${score}/100`}
          className={`h-3 w-3 shrink-0 rounded-full ${semaphoreColor(score)}`}
        />
      </div>
      <span className="text-xs text-neutral-500">{vehicle.plate}</span>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-600">
        <span>{vehicle.odometer != null ? `${vehicle.odometer.toLocaleString("pt-BR")} km` : "Odômetro —"}</span>
        <span>
          {vehicle.last_fuel_date
            ? `Abastecido em ${new Date(`${vehicle.last_fuel_date}T00:00:00`).toLocaleDateString("pt-BR")}${
                vehicle.last_fuel_amount != null ? ` · ${currency(vehicle.last_fuel_amount)}` : ""
              }`
            : "Sem abastecimentos"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        <DocumentBadge label="IPVA" status={vehicle.documents.ipva} />
        <DocumentBadge label="Seguro" status={vehicle.documents.insurance} />
        <DocumentBadge label="CRLV" status={vehicle.documents.crlv} />
      </div>
    </button>
  );
}
