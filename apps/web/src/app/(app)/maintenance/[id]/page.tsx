"use client";

import {
  MAINTENANCE_STATUS_TRANSITIONS,
  updateMaintenanceInputSchema,
  type Maintenance,
  type MaintenanceStatus,
  type UpdateMaintenanceInput,
} from "@navestory/validators";
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Combobox,
  Container,
  CurrencyInput,
  Input,
  OdometerInput,
} from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { datetimeLocalToIso, isoToDatetimeLocal } from "@/lib/datetime-tz";
import { usePreferences } from "@/lib/hooks/use-preferences";

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

  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone ?? "UTC";

  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [cost, setCost] = useState<number | undefined>(undefined);
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [nextStatus, setNextStatus] = useState<MaintenanceStatus | "">("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  useEffect(() => {
    if (!maintenance) return;
    setDescription(maintenance.description);
    setScheduledDate(isoToDatetimeLocal(maintenance.scheduled_date, tz));
    setCompletionDate(
      maintenance.completion_date
        ? isoToDatetimeLocal(maintenance.completion_date, tz)
        : "",
    );
    setCost(maintenance.cost ?? undefined);
    setOdometerKm(maintenance.odometer_km ?? undefined);
  }, [maintenance, tz]);

  const mutation = useMutation({
    mutationFn: (input: UpdateMaintenanceInput) =>
      apiClient<Maintenance>(`/maintenances/${id}`, {
        method: "PATCH",
        body: input,
      }),
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
      scheduled_date: scheduledDate
        ? datetimeLocalToIso(scheduledDate, tz)
        : "",
      completion_date: completionDate
        ? datetimeLocalToIso(completionDate, tz)
        : null,
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

  /**
   * @spec SPEC-20260807-005 RF-06
   * Corrige bug pré-existente: `handleCancel` exibia a confirmação sempre, mesmo com o
   * formulário no estado original (sem checar `isDirty`).
   */
  const isDirty =
    !!maintenance &&
    (description !== maintenance.description ||
      scheduledDate !== isoToDatetimeLocal(maintenance.scheduled_date, tz) ||
      completionDate !==
        (maintenance.completion_date
          ? isoToDatetimeLocal(maintenance.completion_date, tz)
          : "") ||
      cost !== (maintenance.cost ?? undefined) ||
      odometerKm !== (maintenance.odometer_km ?? undefined) ||
      nextStatus !== "");

  function handleCancel(): void {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push("/maintenance");
  }

  if (isLoading) return <p className="p-8">Carregando…</p>;
  if (isError || !maintenance)
    return (
      <div className="p-8">
        <Alert variant="error" description="Manutenção não encontrada." />
      </div>
    );

  const allowedNext = MAINTENANCE_STATUS_TRANSITIONS[maintenance.status];
  const isTerminal = allowedNext.length === 0;

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">Manutenção</h1>
      <p className="text-sm text-muted-foreground">
        Status atual: <strong>{STATUS_LABEL[maintenance.status]}</strong>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

        <label htmlFor="completion_date">Data e hora de conclusão</label>
        <Input
          id="completion_date"
          type="datetime-local"
          value={completionDate}
          onChange={(event) => setCompletionDate(event.target.value)}
        />

        <label htmlFor="cost">Custo (R$)</label>
        <CurrencyInput id="cost" value={cost} onChange={setCost} />

        <label htmlFor="odometer_km">Odômetro (km)</label>
        <OdometerInput
          id="odometer_km"
          value={odometerKm}
          onChange={setOdometerKm}
        />

        {!isTerminal && (
          <>
            <span className="text-sm font-medium">Mudar status</span>
            <Combobox
              aria-label="Mudar status"
              options={[
                { value: "", label: "Manter status atual" },
                ...allowedNext.map((status) => ({
                  value: status,
                  // eslint-disable-next-line security/detect-object-injection -- status vem de allowedNext, subconjunto fixo de MaintenanceStatus
                  label: STATUS_LABEL[status],
                })),
              ]}
              value={nextStatus}
              onValueChange={(value) =>
                setNextStatus(value as MaintenanceStatus | "")
              }
              placeholder="Manter status atual"
              searchPlaceholder="Buscar status..."
              emptyMessage="Nenhum status encontrado"
            />
          </>
        )}

        {fieldError && <Alert variant="error" description={fieldError} />}
        {mutation.isError && !fieldError && (
          <Alert
            variant="error"
            description="Não foi possível atualizar a manutenção."
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </form>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              As alterações não salvas serão perdidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/maintenance")}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
