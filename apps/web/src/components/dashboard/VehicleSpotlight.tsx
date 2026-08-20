"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import type {
  FuelTrendPoint,
  RecurringCost,
  VehicleHistoryItem,
  VehicleTco,
} from "@navestory/validators";
import { Alert, ChartWrapper, EmptyState, Tabs } from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { formatDateInTz } from "@/lib/datetime-tz";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { TcoBreakdownChart } from "@/components/charts/tco-breakdown-chart";
import { FuelTrendChart } from "@/components/charts/fuel-trend-chart";
import type {
  DocumentStatus,
  HealthFlag,
} from "@/components/dashboard/VehicleHealthCard";

const DESKTOP_QUERY = "(min-width: 768px)";
const CURRENT_YEAR = new Date().getFullYear();

type SpotlightTab = "expenses" | "fuel" | "docs" | "history";

const TABS: { id: SpotlightTab; label: string }[] = [
  { id: "expenses", label: "Despesas" },
  { id: "fuel", label: "Consumo" },
  { id: "docs", label: "Documentos" },
  { id: "history", label: "Histórico" },
];

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface SpotlightVehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
  documents: {
    ipva: DocumentStatus;
    insurance: DocumentStatus;
    crlv: DocumentStatus;
  };
}

function spotlightLabel(vehicle: SpotlightVehicle): string {
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
}

/**
 * @spec SPEC-20260804-006 RF-15, R-HS-10
 * Manutenção vencida ou qualquer documento a vencer (`*_expiring`) abre direto na aba "Docs" —
 * caso contrário mantém o padrão "Despesas". Não é persistido em sessionStorage: recalculado a
 * cada seleção de veículo a partir do estado atual das flags (nunca do histórico da sessão).
 */
function initialTabForFlags(flags: HealthFlag[] | undefined): SpotlightTab {
  const hasUrgentDocFlag = (flags ?? []).some(
    (flag) =>
      (flag.type === "maintenance_overdue" && Number(flag.count) > 0) ||
      flag.type.endsWith("_expiring"),
  );
  return hasUrgentDocFlag ? "docs" : "expenses";
}

/**
 * @spec SPEC-20260531-001 RF-DB-01
 * Chip complementar ao slot "Em Foco" do Sidebar (SPEC-20260602-001 RF-01) — mesmo dado, posição
 * diferente. "×" chama a mesma ação de limpar contexto (clearAllSelection), nunca uma ação própria.
 */
function StickyFocusChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}): ReactNode {
  return (
    <div
      role="status"
      className="surface-selected sticky top-0 z-10 flex items-center justify-between gap-2 rounded px-3 py-2 text-sm font-medium"
    >
      <span>Em Foco: {label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Limpar veículo em foco"
        className="rounded px-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        ×
      </button>
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DB-08
 */
function NoActiveVehicleEmptyState(): ReactNode {
  return (
    <EmptyState
      icon="↑"
      title="Escolha um veículo para ver despesas, consumo e documentos"
    />
  );
}

/**
 * @spec SPEC-20260531-001 RF-DB-04
 * Reaproveita GET /analytics/tco/:vehicleId (T6.1) — breakdown por ciclo de odômetro ativo, não
 * por período de calendário (decisão de escopo v1.3 desta spec, ver changelog).
 */
/** @spec SPEC-20260525-001 §5.2 — migrado para `ChartWrapper` de `packages/ui`. */
function ExpensesSection({ vehicleId }: { vehicleId: string }): ReactNode {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", "tco", vehicleId],
    queryFn: () => apiClient<VehicleTco>(`/analytics/tco/${vehicleId}`),
    retry: false,
  });

  if (isError) {
    return (
      <Alert
        variant="error"
        description="Não foi possível carregar as despesas deste veículo. Tente novamente."
      />
    );
  }

  return (
    <ChartWrapper
      title="Despesas por Categoria"
      loading={isLoading}
      isEmpty={!data || data.total === 0}
      emptyMessage="Registre despesas deste veículo para ver o gráfico por categoria."
    >
      {data && <TcoBreakdownChart breakdown={data.breakdown} />}
    </ChartWrapper>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DB-05
 * Reaproveita GET /analytics/fuel-trend/:vehicleId (T6.1).
 * @spec SPEC-20260525-001 §5.2 — migrado para `ChartWrapper` de `packages/ui`.
 */
function FuelSection({ vehicleId }: { vehicleId: string }): ReactNode {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", "fuel-trend", vehicleId],
    queryFn: () =>
      apiClient<FuelTrendPoint[]>(
        `/analytics/fuel-trend/${vehicleId}?limit=20`,
      ),
    retry: false,
  });

  if (isError) {
    return (
      <Alert
        variant="error"
        description="Não foi possível carregar o consumo deste veículo. Tente novamente."
      />
    );
  }

  return (
    <ChartWrapper
      title="Tendência de Consumo (km/L)"
      loading={isLoading}
      isEmpty={!data || data.length === 0}
      emptyMessage="Registre abastecimentos com tanque cheio para ver a tendência de consumo."
    >
      {data && <FuelTrendChart points={data} />}
    </ChartWrapper>
  );
}

const DOC_LABEL: Record<"ipva" | "insurance" | "crlv", string> = {
  ipva: "IPVA",
  insurance: "Seguro",
  crlv: "CRLV",
};

const STATUS_BADGE: Record<
  "ok" | "attention" | "overdue" | "unknown" | "paid",
  { label: string; className: string } | null
> = {
  ok: null,
  unknown: null,
  attention: {
    label: "Atenção",
    className: "border-warning bg-warning-pastel text-foreground",
  },
  overdue: {
    label: "Vencido",
    className: "border-danger bg-danger-pastel text-foreground",
  },
  paid: {
    label: "Pago",
    className: "border-success bg-success-pastel text-foreground",
  },
};

/**
 * @spec SPEC-20260531-001 RF-DB-06
 * Reconciliação: vehicle_recurring_costs.paid_at do ano corrente sobrepõe o status "Vencido"
 * derivado de vehicles.*_due_date (que já vem calculado em VehicleCard.documents).
 */
function DocsSection({
  vehicleId,
  documents,
}: {
  vehicleId: string;
  documents: {
    ipva: DocumentStatus;
    insurance: DocumentStatus;
    crlv: DocumentStatus;
  };
}): ReactNode {
  const { data: recurringCosts, isError } = useQuery({
    queryKey: ["recurring-costs", vehicleId, CURRENT_YEAR],
    queryFn: () =>
      apiClient<RecurringCost[]>(
        `/recurring-costs?vehicle_id=${vehicleId}&year=${CURRENT_YEAR}`,
      ),
    retry: false,
  });

  const paidCostTypes = new Set(
    (recurringCosts ?? [])
      .filter((cost) => cost.paid_at != null)
      .map((cost) => cost.cost_type),
  );

  type DocRow = {
    key: "ipva" | "insurance" | "crlv";
    status: DocumentStatus | "paid";
  };
  const rows: DocRow[] = (["ipva", "insurance", "crlv"] as const).map(
    (key) => ({
      key,
      // eslint-disable-next-line security/detect-object-injection -- key é keyof fixo, união de 3 literais
      status: paidCostTypes.has(key) ? "paid" : documents[key],
    }),
  );

  return (
    <div className="flex flex-col gap-2">
      {isError && (
        <Alert
          variant="warning"
          description="Não foi possível confirmar pagamentos recentes — status abaixo pode estar desatualizado."
        />
      )}
      {rows.map(({ key, status }) => {
        // eslint-disable-next-line security/detect-object-injection -- status é DocumentStatus | "paid", união fixa
        const badge = STATUS_BADGE[status];
        return (
          <div
            key={key}
            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
          >
            {/* eslint-disable-next-line security/detect-object-injection -- key é keyof fixo, união de 3 literais */}
            <span>{DOC_LABEL[key]}</span>
            {badge ? (
              <span
                className={`rounded border px-1.5 py-0.5 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Em dia</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DB-07
 */
function HistorySection({ vehicleId }: { vehicleId: string }): ReactNode {
  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "vehicle-history", vehicleId],
    queryFn: () =>
      apiClient<VehicleHistoryItem[]>(
        `/dashboard/vehicle-history?vehicle_id=${vehicleId}`,
      ),
    retry: false,
  });

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground">Carregando histórico…</p>
    );
  if (isError) {
    return (
      <Alert
        variant="error"
        description="Não foi possível carregar o histórico deste veículo. Tente novamente."
      />
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState size="sm" title="Nenhum registro ainda para este veículo." />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {data.map((item) => (
          <li
            key={`${item.type}-${item.id}`}
            className="flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm"
          >
            <span className="flex flex-col">
              <span>{item.description}</span>
              <span className="text-xs text-muted-foreground">
                {formatDateInTz(item.date, tz)}
              </span>
            </span>
            <span className="shrink-0 font-medium">
              {item.amount != null ? currency(item.amount) : "—"}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-3 text-sm">
        <Link href={`/expenses?vehicleId=${vehicleId}`} className="underline">
          Ver todas as despesas
        </Link>
        <Link
          href={`/maintenance?vehicleId=${vehicleId}`}
          className="underline"
        >
          Ver todas as manutenções
        </Link>
      </div>
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DB-01 a RF-DB-08
 * Container da Zona B (Vehicle Spotlight). Em mobile (< 768px) as 4 seções viram tabs (RF-DB-02);
 * em desktop (>= 768px) são exibidas lado a lado em grid, sem tabs (RF-DB-03).
 */
export function VehicleSpotlight({
  vehicle,
  flags,
  onClear,
}: {
  vehicle: SpotlightVehicle | undefined;
  /** @spec SPEC-20260804-006 RF-15 */
  flags?: HealthFlag[];
  onClear: () => void;
}): ReactNode {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [activeTab, setActiveTab] = useState<SpotlightTab>("expenses");

  // @spec SPEC-20260804-006 RF-15 — computa a aba inicial (mount) e recalcula a cada troca de
  // veículo (nunca persistida), com base no estado atual das flags do veículo recém-selecionado.
  useEffect(() => {
    setActiveTab(initialTabForFlags(flags));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à troca de veículo, não a toda mudança de referência de `flags`
  }, [vehicle?.id]);

  if (!vehicle) return <NoActiveVehicleEmptyState />;

  const sections: Record<SpotlightTab, ReactNode> = {
    expenses: <ExpensesSection vehicleId={vehicle.id} />,
    fuel: <FuelSection vehicleId={vehicle.id} />,
    docs: <DocsSection vehicleId={vehicle.id} documents={vehicle.documents} />,
    history: <HistorySection vehicleId={vehicle.id} />,
  };

  return (
    <section
      aria-label="Análise do veículo em foco"
      className="flex flex-col gap-3"
    >
      <StickyFocusChip label={spotlightLabel(vehicle)} onClear={onClear} />

      {isDesktop ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className="flex flex-col gap-2 rounded border p-3"
            >
              <h3 className="font-semibold">{tab.label}</h3>
              {sections[tab.id]}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Tabs
            items={TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as SpotlightTab)}
            variant="underline"
            aria-label="Seções do veículo em foco"
          />
          {/* eslint-disable-next-line security/detect-object-injection -- activeTab é union fixa de 4 literais */}
          <div role="tabpanel">{sections[activeTab]}</div>
        </div>
      )}
    </section>
  );
}
