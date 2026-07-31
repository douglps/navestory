"use client";

import { FINE_STATUS_TRANSITIONS, type Fine, type FineStatus } from "@nave/validators";
import { Alert, Badge, Button, Container, EmptyState, KpiCard, Tabs } from "@nave/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useVehicleContext } from "@/lib/context/use-vehicle-context";
import { formatDateInTz, nowInUserTz } from "@/lib/datetime-tz";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { FINE_STATUS_BADGE_VARIANT } from "@/lib/fines/status-badge";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fineAmount(fine: Fine): number {
  return fine.amount_with_discount ?? fine.amount;
}

/** @spec SPEC-20260722-005 RF-01 */
function isOverdue(fine: Fine, today: string): boolean {
  return fine.status === "pending" && fine.due_date != null && fine.due_date < today;
}

const STATUS_LABEL: Record<FineStatus, string> = {
  pending: "Pendente",
  appealing: "Em recurso",
  paid: "Paga",
  cancelled: "Cancelada",
};

/** @spec SPEC-20260722-005 RF-07 (R-DS-03) */
const STATUS_VARIANT = FINE_STATUS_BADGE_VARIANT;

const ACTION_LABEL: Record<FineStatus, string> = {
  paid: "Pagar",
  appealing: "Recorrer",
  cancelled: "Cancelar",
  pending: "Pendente",
};

/**
 * @spec SPEC-20260722-005 RF-01
 * Calculado no cliente a partir do array de `GET /fines` — sem endpoint de KPIs dedicado
 * nesta fase (RNF-03).
 */
function computeKpis(fines: Fine[], tz: string | null | undefined) {
  const nowLocal = nowInUserTz(tz ?? "UTC");
  const today = nowLocal.slice(0, 10);
  const currentYear = Number(nowLocal.slice(0, 4));

  let totalPending = 0;
  let overdueCount = 0;
  let totalPaidThisYear = 0;

  for (const fine of fines) {
    if (fine.status === "pending" || fine.status === "appealing") {
      totalPending += fineAmount(fine);
    }
    if (isOverdue(fine, today)) {
      overdueCount += 1;
    }
    if (fine.status === "paid" && fine.paid_at && Number(fine.paid_at.slice(0, 4)) === currentYear) {
      totalPaidThisYear += fineAmount(fine);
    }
  }

  return { totalPending, overdueCount, totalPaidThisYear };
}

/** @spec SPEC-20260722-005 RF-04 */
function StatusActions({ fine }: { fine: Fine }): ReactNode {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: FineStatus) =>
      apiClient<Fine>(`/fines/${fine.id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fines"] });
    },
  });

  const availableActions = FINE_STATUS_TRANSITIONS[fine.status];
  if (availableActions.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {/* eslint-disable security/detect-object-injection -- nextStatus vem de FINE_STATUS_TRANSITIONS, subconjunto fixo de FineStatus */}
      {availableActions.map((nextStatus) => (
        <Button
          key={nextStatus}
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(nextStatus)}
        >
          {ACTION_LABEL[nextStatus]}
        </Button>
      ))}
      {/* eslint-enable security/detect-object-injection */}
    </div>
  );
}

/** @spec SPEC-20260722-005 RF-01, RF-02, RF-03, RF-04, RF-05, RF-08 */
export default function FinesPage(): ReactNode {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lista" | "em-aberto">("lista");

  const {
    data: fines,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fines"],
    queryFn: () => apiClient<Fine[]>("/fines"),
    retry: false,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone;

  const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));

  // @spec SPEC-20260722-005 RF-02 — mesma convenção de SPEC-20260721-001 RF-05
  const { selectionMode, activeVehicleId } = useVehicleContext();
  const visibleFines =
    selectionMode === "single" && activeVehicleId != null
      ? fines?.filter((fine) => fine.vehicle_id === activeVehicleId)
      : fines;

  const openFines = visibleFines?.filter(
    (fine) => fine.status === "pending" || fine.status === "appealing",
  );
  const rows = activeTab === "lista" ? visibleFines : openFines;

  const kpis = computeKpis(visibleFines ?? [], tz);

  return (
    <Container size="2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Multas</h1>
        <Link href="/fines/new">Nova multa</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <KpiCard title="Total pendente" value={currency(kpis.totalPending)} variant="warning" />
        <KpiCard
          title="Multas vencidas"
          value={kpis.overdueCount}
          variant={kpis.overdueCount > 0 ? "danger" : "neutral"}
        />
        <KpiCard title="Total pago no ano" value={currency(kpis.totalPaidThisYear)} variant="success" />
      </div>

      <Tabs
        items={[
          { value: "lista", label: "Lista" },
          {
            value: "em-aberto",
            label: "Em aberto",
            badge: openFines && openFines.length > 0 ? openFines.length : undefined,
          },
        ]}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "lista" | "em-aberto")}
        variant="underline"
        aria-label="Seções de multas"
      />

      {isLoading && <p>Carregando...</p>}
      {isError && <Alert variant="error" description="Não foi possível carregar as multas." />}

      {!isLoading && !isError && rows?.length === 0 && (
        <EmptyState
          title="Nenhuma multa registrada"
          description={
            activeTab === "em-aberto"
              ? "Não há multas pendentes ou em recurso."
              : "Registre uma multa para acompanhar o vencimento e o vínculo com o financeiro."
          }
          action={{ label: "Registrar multa", onClick: () => router.push("/fines/new") }}
        />
      )}

      <ul className="flex flex-col gap-2">
        {rows?.map((fine) => (
          <li key={fine.id} className="flex items-center justify-between gap-4 rounded border p-3">
            <Link href={`/fines/${fine.id}`} className="flex-1">
              <p className="font-medium">
                {formatDateInTz(fine.occurred_at, tz)} — {fine.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {vehicleLabel(vehicleById.get(fine.vehicle_id))}
                {fine.due_date ? ` · vence ${formatDateInTz(fine.due_date, tz)}` : ""}
              </p>
            </Link>
            <div className="flex items-center gap-2">
              <span>{currency(fineAmount(fine))}</span>
              <Badge variant={STATUS_VARIANT[fine.status]}>{STATUS_LABEL[fine.status]}</Badge>
              <StatusActions fine={fine} />
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}
