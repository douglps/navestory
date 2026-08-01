"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavBadge, Skeleton } from "@navestory/ui";
import type {
  CategorySummaryItem,
  FinesStatusResponse,
} from "@navestory/validators";
import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

const QUERY_STALE_TIME_MS = 5 * 60 * 1000;
const CHIP_SKELETON_COUNT = 3;

interface VehicleGroupMembersRow {
  id: string;
  vehicle_group_members?: Array<{ vehicle_id: string }>;
}

/** RF-04 — "R$ X" abaixo de mil, "R$ X,Xk" a partir de mil. */
function formatChipAmount(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return `R$ ${Math.round(value)}`;
}

function buildSpendingHighlightsPath(
  selectionMode: string,
  activeVehicleId: string | null,
  groupVehicleIds: string[],
): string {
  const params = new URLSearchParams();
  if (selectionMode === "single" && activeVehicleId) {
    params.set("vehicleId", activeVehicleId);
  } else if (selectionMode === "group") {
    for (const vehicleId of groupVehicleIds) {
      params.append("groupIds", vehicleId);
    }
  }
  const query = params.toString();
  return query
    ? `/dashboard/spending-highlights?${query}`
    : "/dashboard/spending-highlights";
}

/** RF-01 — o link do chip propaga o mesmo contexto ativo usado na agregação (R-SUB-02). */
function buildChipHref(
  category: string,
  selectionMode: string,
  activeVehicleId: string | null,
  groupVehicleIds: string[],
): string {
  const params = new URLSearchParams({ category });
  if (selectionMode === "single" && activeVehicleId) {
    params.set("vehicleId", activeVehicleId);
  } else if (selectionMode === "group" && groupVehicleIds.length > 0) {
    params.set("group", groupVehicleIds.join(","));
  }
  return `/expenses?${params.toString()}`;
}

const FINES_STYLE: Record<FinesStatusResponse["status"], string> = {
  none: "text-muted-foreground",
  open: "text-warning",
  overdue: "text-danger",
};

/**
 * @spec SPEC-20260722-004 RF-03, RF-04, RF-05, RF-06, RF-07, RF-09
 * Barra fina de 44px, irmã do `<Header />` no shell autenticado (nunca wrapper) — chips de
 * categoria com maior gasto do mês, atalhos de Despesas/Manutenções e indicador de multas.
 *
 * Nota de adaptação: a spec referencia `activeGroupData` (com membros já resolvidos) do store
 * `useDashboardStore`, campo ainda não implementado (dependência SPEC-20260602-001/RF-19 segue
 * `⏳` em `matrices/rastreabilidade.md`). Enquanto isso, os membros do grupo ativo são resolvidos
 * aqui a partir de `GET /vehicle-groups` — mesma query key (`["vehicle-groups"]`) já usada por
 * `FleetAside`, então o cache do TanStack Query deduplica a requisição (RNF-05).
 */
export function FinancialSubheader(): ReactNode {
  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const activeGroupId = useDashboardStore((state) => state.activeGroupId);

  const { data: groups } = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroupMembersRow[]>("/vehicle-groups"),
    enabled: selectionMode === "group",
    retry: false,
  });

  const groupVehicleIds =
    selectionMode === "group"
      ? (
          groups?.find((group) => group.id === activeGroupId)
            ?.vehicle_group_members ?? []
        ).map((member) => member.vehicle_id)
      : [];

  const { data: highlights, isLoading: isLoadingHighlights } = useQuery({
    queryKey: [
      "spending-highlights",
      selectionMode,
      activeVehicleId,
      activeGroupId,
      groupVehicleIds.join(","),
    ],
    queryFn: () =>
      apiClient<CategorySummaryItem[]>(
        buildSpendingHighlightsPath(
          selectionMode,
          activeVehicleId,
          groupVehicleIds,
        ),
      ),
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });

  const { data: finesStatus } = useQuery({
    queryKey: ["fines-status"],
    queryFn: () => apiClient<FinesStatusResponse>("/dashboard/fines-status"),
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });

  const status = finesStatus?.status ?? "none";
  const finesCount = finesStatus?.count ?? 0;

  return (
    <div className="flex h-11 items-center gap-3 border-b border-border bg-card/90 px-4 text-card-foreground">
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        {isLoadingHighlights
          ? Array.from({ length: CHIP_SKELETON_COUNT }, (_, index) => (
              <Skeleton
                key={index}
                className="h-6 w-20 shrink-0 rounded-[6px]"
              />
            ))
          : highlights?.map((item) => (
              <Link
                key={item.category}
                href={buildChipHref(
                  item.category,
                  selectionMode,
                  activeVehicleId,
                  groupVehicleIds,
                )}
                className="flex shrink-0 items-center gap-1.5 rounded-[6px] border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/60"
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {formatChipAmount(item.total_amount)}
                </span>
                <NavBadge count={item.count} />
              </Link>
            ))}
      </div>

      <div className="flex shrink-0 items-center gap-3 text-sm">
        <Link
          href="/expenses"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Despesas
        </Link>
        <Link
          href="/maintenance"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Manutenções
        </Link>

        <div aria-hidden="true" className="h-[18px] w-px bg-border/20" />

        {/* eslint-disable-next-line security/detect-object-injection -- status é union fixa de 3 literais (FinesStatusResponse["status"]) */}
        <Link
          href="/fines"
          className={`flex items-center gap-1.5 transition-colors ${FINES_STYLE[status]}`}
        >
          Multas
          <NavBadge count={finesCount} />
        </Link>
      </div>
    </div>
  );
}
