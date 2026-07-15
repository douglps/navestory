"use client";

import {
  MAINTENANCE_STATUS_TRANSITIONS,
  updateMaintenanceInputSchema,
  type MaintenanceStatus,
  type UpdateMaintenanceInput,
} from "@nave/validators";
import { CurrencyInput, OdometerInput } from "@nave/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";

interface Maintenance {
  id: string;
  vehicle_id: string;
  description: string;
  status: MaintenanceStatus;
  scheduled_date: string;
  completion_date: string | null;
  cost: number | null;
  odometer_km: number | null;
}

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

/**
 * @spec SPEC-20260715-001 RF-17
 * @spec SPEC-20260603-002 R7
 * UX progressiva: o seletor só exibe as transições válidas a partir do status atual — o
 * enforcement real acontece sempre no backend (`MaintenancesService.update()`).
 */
export default function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): ReactNode {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    void params.then((resolved) => setId(resolved.id));
  }, [params]);

  const {
    data: maintenance,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["maintenances", id],
    queryFn: () => apiClient<Maintenance>(`/maintenances/${id}`),
    enabled: id !== null,
    retry: false,
  });

  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState<number | undefined>(undefined);
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [nextStatus, setNextStatus] = useState<MaintenanceStatus | "">("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!maintenance) return;
    setDescription(maintenance.description);
    setScheduledDate(maintenance.scheduled_date);
    setCost(maintenance.cost ?? undefined);
    setOdometerKm(maintenance.odometer_km ?? undefined);
  }, [maintenance]);

  const mutation = useMutation({
    mutationFn: (input: UpdateMaintenanceInput) =>
      apiClient<Maintenance>(`/maintenances/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      router.push("/maintenance");
    },
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = updateMaintenanceInputSchema.safeParse({
      description,
      scheduled_date: scheduledDate,
      cost: cost ?? null,
      odometer_km: odometerKm ?? null,
      ...(nextStatus ? { status: nextStatus } : {}),
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate(result.data);
  }

  function handleCancel(): void {
    if (!window.confirm("Descartar alterações?")) return;
    router.push("/maintenance");
  }

  if (isLoading) return <p className="p-8">Carregando...</p>;
  if (isError || !maintenance) return <p role="alert" className="p-8">Manutenção não encontrada.</p>;

  const allowedNext = MAINTENANCE_STATUS_TRANSITIONS[maintenance.status];
  const isTerminal = allowedNext.length === 0;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Manutenção</h1>
      <p className="text-sm text-muted-foreground">
        Status atual: <strong>{STATUS_LABEL[maintenance.status]}</strong>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="description">Descrição *</label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />

        <label htmlFor="scheduled_date">Data agendada *</label>
        <input
          id="scheduled_date"
          type="date"
          value={scheduledDate}
          onChange={(event) => setScheduledDate(event.target.value)}
          required
        />

        <label htmlFor="cost">Custo (R$)</label>
        <CurrencyInput id="cost" value={cost} onChange={setCost} />

        <label htmlFor="odometer_km">Odômetro (km)</label>
        <OdometerInput id="odometer_km" value={odometerKm} onChange={setOdometerKm} />

        {!isTerminal && (
          <>
            <label htmlFor="next_status">Mudar status</label>
            <select
              id="next_status"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as MaintenanceStatus | "")}
            >
              <option value="">Manter status atual</option>
              {/* eslint-disable security/detect-object-injection -- status vem de allowedNext, subconjunto fixo de MaintenanceStatus */}
              {allowedNext.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
              {/* eslint-enable security/detect-object-injection */}
            </select>
          </>
        )}

        {fieldError && <p role="alert">{fieldError}</p>}
        {mutation.isError && !fieldError && (
          <p role="alert">Não foi possível atualizar a manutenção.</p>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}
