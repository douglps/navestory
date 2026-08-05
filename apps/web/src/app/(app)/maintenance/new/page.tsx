"use client";

import {
  createMaintenanceInputSchema,
  type CreateMaintenanceInput,
  type VehicleResponse as Vehicle,
} from "@navestory/validators";
import {
  Alert,
  Button,
  Combobox,
  Container,
  CurrencyInput,
  EmptyState,
  Input,
  OdometerInput,
} from "@navestory/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { nowInUserTz, datetimeLocalToIso } from "@/lib/datetime-tz";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useVehicleContextField } from "@/lib/hooks/use-vehicle-context-field";

interface MaintenanceResponse {
  id: string;
}

function vehicleLabel(vehicle: Vehicle): string {
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
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
      apiClient<MaintenanceResponse>("/maintenances", {
        method: "POST",
        body: input,
      }),
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
      scheduled_date: scheduledDate
        ? datetimeLocalToIso(scheduledDate, tz)
        : "",
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
      <Container size="sm">
        <h1 className="text-xl font-semibold">Nova manutenção</h1>
        <EmptyState
          title="Nenhum veículo cadastrado"
          description="Cadastre um veículo para agendar manutenções."
          action={{
            label: "Cadastrar veículo",
            onClick: () => router.push("/vehicles/new"),
          }}
        />
      </Container>
    );
  }

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">Nova manutenção</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {contextChangeNotice && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
          >
            <span>{contextChangeNotice}</span>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={applyContextChange}
              >
                Atualizar campo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={dismissContextChangeNotice}
                aria-label="Fechar aviso"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        <span className="text-sm font-medium">Veículo *</span>
        <Combobox
          aria-label="Veículo *"
          options={filteredVehicles.map((vehicle) => ({
            value: vehicle.id,
            label: vehicleLabel(vehicle),
          }))}
          value={vehicleId}
          onValueChange={setVehicleId}
          placeholder="Selecione um veículo"
          searchPlaceholder="Buscar veículo..."
          emptyMessage="Nenhum veículo encontrado"
          loading={vehiclesLoading}
          className={
            isVehicleInherited
              ? "border-warning bg-warning-pastel"
              : vehicleId
                ? "border-border"
                : undefined
          }
        />
        {isVehicleInherited && (
          <span className="text-xs text-foreground">
            ↩ Herdado do contexto em foco
          </span>
        )}
        {!isVehicleInherited && vehicleId && (
          <span className="text-xs text-muted-foreground">
            ✓ Selecionado manualmente
          </span>
        )}
        {vehicleContextHint && (
          <p className="text-xs text-muted-foreground">{vehicleContextHint}</p>
        )}
        {vehicleQuickPicks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vehicleQuickPicks.map((vehicle) => (
              <Button
                key={vehicle.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVehicleId(vehicle.id)}
              >
                {vehicleLabel(vehicle)}
              </Button>
            ))}
          </div>
        )}

        <label htmlFor="description">Descrição *</label>
        <Input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />

        <label htmlFor="scheduled_date">Data e hora agendada *</label>
        <Input
          id="scheduled_date"
          type="datetime-local"
          value={scheduledDate}
          onChange={(event) => setScheduledDate(event.target.value)}
          required
        />

        <label htmlFor="cost">Custo estimado (R$)</label>
        <CurrencyInput id="cost" value={cost} onChange={setCost} />

        <label htmlFor="odometer_km">Odômetro (km)</label>
        <OdometerInput
          id="odometer_km"
          value={odometerKm}
          onChange={setOdometerKm}
        />

        {fieldError && <Alert variant="error" description={fieldError} />}
        {mutation.isError && !fieldError && (
          <Alert
            variant="error"
            description="Não foi possível agendar a manutenção."
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Agendar"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Container>
  );
}
