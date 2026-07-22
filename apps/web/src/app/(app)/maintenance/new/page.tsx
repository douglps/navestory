"use client";

import { createMaintenanceInputSchema, type CreateMaintenanceInput } from "@nave/validators";
import { CurrencyInput, OdometerInput } from "@nave/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { nowInUserTz, datetimeLocalToIso } from "@/lib/datetime-tz";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useVehicleContextField } from "@/lib/hooks/use-vehicle-context-field";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

interface MaintenanceResponse {
  id: string;
}

function vehicleLabel(vehicle: Vehicle): string {
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

/**
 * @spec SPEC-20260715-001 RF-16
 * Arquitetura: client component + useState + TanStack Query (mesmo padrão de ExpenseForm,
 * ver changelog de SPEC-20260612-001) — sem react-hook-form/Server Actions.
 */
export default function NewMaintenancePage(): ReactNode {
  const router = useRouter();

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone ?? "UTC";

  const {
    vehicleId,
    setVehicleId,
    isInherited: isVehicleInherited,
    contextHint: vehicleContextHint,
    quickPicks: vehicleQuickPicks,
    filteredVehicles,
    contextChangeNotice,
    applyContextChange,
    dismissContextChangeNotice,
  } = useVehicleContextField(vehicles);
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState<number | undefined>(undefined);
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [fieldError, setFieldError] = useState<string | null>(null);

  /** @spec SPEC-20260715-002 RF-FE-03 (mesmo padrão do formulário de despesa) */
  useEffect(() => {
    if (preferences && scheduledDate === "") {
      setScheduledDate(nowInUserTz(tz));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: (input: CreateMaintenanceInput) =>
      apiClient<MaintenanceResponse>("/maintenances", { method: "POST", body: input }),
    onSuccess: () => router.push("/maintenance"),
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = createMaintenanceInputSchema.safeParse({
      vehicle_id: vehicleId,
      description,
      scheduled_date: scheduledDate ? datetimeLocalToIso(scheduledDate, tz) : "",
      cost: cost ?? null,
      odometer_km: odometerKm ?? null,
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate(result.data);
  }

  const isDirty =
    (vehicleId !== "" && !isVehicleInherited) ||
    description !== "" ||
    (preferences != null && scheduledDate !== nowInUserTz(tz)) ||
    cost != null ||
    odometerKm != null;

  function handleCancel(): void {
    if (isDirty && !window.confirm("Descartar alterações?")) return;
    router.push("/maintenance");
  }

  if (!vehiclesLoading && vehicles?.length === 0) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Nova manutenção</h1>
        <div className="flex flex-col items-center gap-2 rounded border p-6 text-center">
          <p className="font-medium">Nenhum veículo cadastrado</p>
          <p className="text-sm text-muted-foreground">
            Cadastre um veículo para agendar manutenções.
          </p>
          <Link href="/vehicles/new" className="underline">
            Cadastrar veículo →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Nova manutenção</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {contextChangeNotice && (
          <div role="status" className="flex items-center justify-between gap-2 rounded border border-neutral-200 p-2 text-sm">
            <span>{contextChangeNotice}</span>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={applyContextChange} className="underline">
                Atualizar campo
              </button>
              <button type="button" onClick={dismissContextChangeNotice} aria-label="Fechar aviso">
                ×
              </button>
            </div>
          </div>
        )}

        <label htmlFor="vehicle_id">Veículo *</label>
        <select
          id="vehicle_id"
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          required
          className={
            isVehicleInherited
              ? "border border-amber-300 bg-amber-50"
              : vehicleId
                ? "border border-neutral-300"
                : ""
          }
        >
          <option value="" disabled>
            Selecione um veículo
          </option>
          {filteredVehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicleLabel(vehicle)}
            </option>
          ))}
        </select>
        {isVehicleInherited && (
          <span className="text-xs text-amber-700">↩ Herdado do contexto em foco</span>
        )}
        {!isVehicleInherited && vehicleId && (
          <span className="text-xs text-neutral-500">✓ Selecionado manualmente</span>
        )}
        {vehicleContextHint && <p className="text-xs text-muted-foreground">{vehicleContextHint}</p>}
        {vehicleQuickPicks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vehicleQuickPicks.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setVehicleId(vehicle.id)}
                className="rounded border px-2 py-0.5 text-xs hover:bg-neutral-100"
              >
                {vehicleLabel(vehicle)}
              </button>
            ))}
          </div>
        )}

        <label htmlFor="description">Descrição *</label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />

        <label htmlFor="scheduled_date">Data e hora agendada *</label>
        <input
          id="scheduled_date"
          type="datetime-local"
          value={scheduledDate}
          onChange={(event) => setScheduledDate(event.target.value)}
          required
        />

        <label htmlFor="cost">Custo estimado (R$)</label>
        <CurrencyInput id="cost" value={cost} onChange={setCost} />

        <label htmlFor="odometer_km">Odômetro (km)</label>
        <OdometerInput id="odometer_km" value={odometerKm} onChange={setOdometerKm} />

        {fieldError && <p role="alert">{fieldError}</p>}
        {mutation.isError && !fieldError && (
          <p role="alert">Não foi possível agendar a manutenção.</p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Agendar"}
          </button>
          <button type="button" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}
