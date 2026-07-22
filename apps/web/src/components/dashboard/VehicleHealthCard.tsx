import type { ReactNode } from "react";
import { VehicleHealthScore } from "@nave/ui";

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
  last_fuel_odometer_missing: boolean;
  documents: { ipva: DocumentStatus; insurance: DocumentStatus; crlv: DocumentStatus };
}

export interface HealthFlag {
  type: string;
  [key: string]: unknown;
}

const FLAG_LABEL: Record<string, (flag: HealthFlag) => string> = {
  maintenance_overdue: (flag) => `${String(flag.count)} manutenção(ões) vencida(s)`,
  ipva_expiring: (flag) => `IPVA vence em ${String(flag.days)} dias`,
  insurance_expiring: (flag) => `Seguro vence em ${String(flag.days)} dias`,
  crlv_expiring: (flag) => `CRLV vence em ${String(flag.days)} dias`,
  km_alert: (flag) => `Próxima manutenção em ${String(flag.km_until)} km`,
  fines_pending: (flag) => `${String(flag.count)} multa(s) pendente(s)`,
};

/**
 * @spec SPEC-20260531-001 RF-SH-03
 * Detalhamento dos `flags` já retornados por calculate_vehicle_health/calculate_fleet_health —
 * nenhum recálculo de peso aqui, só formatação para leitura humana.
 */
function flagsTooltip(score: number | undefined, flags: HealthFlag[] | undefined): string {
  if (score === undefined) return "Calculando saúde…";
  if (!flags || flags.length === 0) return `Saúde: ${score}/100 — nenhum problema identificado`;

  const lines = flags.map((flag) => FLAG_LABEL[flag.type]?.(flag) ?? flag.type);
  return [`Saúde: ${score}/100`, ...lines].join("\n");
}

function vehicleLabel(vehicle: VehicleCardData): string {
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DOCUMENT_BADGE: Record<DocumentStatus, { label: string; className: string } | null> = {
  ok: null,
  unknown: null,
  // @spec SPEC-20260721-002 RF-03 — tokens semânticos em vez de classes Tailwind literais
  attention: { label: "Atenção", className: "border-warning bg-warning-pastel text-warning-foreground" },
  overdue: { label: "Vencido", className: "border-danger bg-danger-pastel text-danger-foreground" },
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
 * @spec SPEC-20260531-001 RF-DA-04, RF-DA-05, RF-SH-01, RF-SH-02, RF-SH-03, CA-S3-03
 * @spec SPEC-20260721-002 RF-02, RF-03
 * O indicador de saúde (`VehicleHealthScore`) consome `calculate_fleet_health` (RF-SH-01) —
 * nunca recalculado aqui. O tooltip (RF-SH-03) só formata os `flags` já retornados pela RPC,
 * sem recalcular pesos. Clicar chama `setActiveVehicle` no store global (RF-DA-05).
 */
export function VehicleHealthCard({
  vehicle,
  score,
  flags,
  isActive,
  onSelect,
}: {
  vehicle: VehicleCardData;
  score: number | undefined;
  flags: HealthFlag[] | undefined;
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
        isActive ? "border-primary/40 bg-primary/8" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{vehicleLabel(vehicle)}</span>
        <span title={flagsTooltip(score, flags)}>
          <VehicleHealthScore score={score} size={28} />
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{vehicle.plate}</span>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>{vehicle.odometer != null ? `${vehicle.odometer.toLocaleString("pt-BR")} km` : "Odômetro —"}</span>
        <span>
          {vehicle.last_fuel_date
            ? `Abastecido em ${new Date(`${vehicle.last_fuel_date}T00:00:00`).toLocaleDateString("pt-BR")}${
                vehicle.last_fuel_amount != null ? ` · ${currency(vehicle.last_fuel_amount)}` : ""
              }`
            : "Sem abastecimentos"}
        </span>
      </div>

      {vehicle.last_fuel_odometer_missing && (
        <span
          role="alert"
          className="rounded border border-warning bg-warning-pastel px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground"
        >
          Último abastecimento sem odômetro registrado
        </span>
      )}

      <div className="flex flex-wrap gap-1">
        <DocumentBadge label="IPVA" status={vehicle.documents.ipva} />
        <DocumentBadge label="Seguro" status={vehicle.documents.insurance} />
        <DocumentBadge label="CRLV" status={vehicle.documents.crlv} />
      </div>
    </button>
  );
}
