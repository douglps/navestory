"use client";

import {
  FINE_STATUS_TRANSITIONS,
  updateFineInputSchema,
  type Fine,
  type FineStatus,
  type UpdateFineInput,
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
  Badge,
  Button,
  Container,
  CurrencyInput,
  Input,
  OdometerInput,
} from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { FINE_STATUS_BADGE_VARIANT } from "@/lib/fines/status-badge";

const STATUS_LABEL: Record<FineStatus, string> = {
  pending: "Pendente",
  appealing: "Em recurso",
  paid: "Paga",
  cancelled: "Cancelada",
};

/** @spec SPEC-20260722-005 RF-07 (R-DS-03) */
const STATUS_VARIANT = FINE_STATUS_BADGE_VARIANT;

const ACTION_LABEL: Record<FineStatus, string> = {
  paid: "Marcar como paga",
  appealing: "Registrar recurso",
  cancelled: "Cancelar",
  pending: "Pendente",
};

/** Transições terminais (sem volta) exigem confirmação antes de disparar a mutação. */
const TERMINAL_ACTION_COPY: Partial<
  Record<FineStatus, { title: string; confirmLabel: string }>
> = {
  paid: {
    title: "Marcar esta multa como paga?",
    confirmLabel: "Confirmar",
  },
  cancelled: {
    title: "Cancelar esta multa?",
    confirmLabel: "Confirmar",
  },
};

/**
 * @spec SPEC-20260722-005 RF-07
 * Arquitetura: adaptado à stack real do projeto, mesmo padrão de `expenses/[id]/page.tsx`.
 */
export default function FineDetailPage({
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
    data: fine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fines", id],
    queryFn: () => apiClient<Fine>(`/fines/${id}`),
    enabled: id !== null,
    retry: false,
  });

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [occurredAt, setOccurredAt] = useState("");
  const [autoNumber, setAutoNumber] = useState("");
  const [infractionCode, setInfractionCode] = useState("");
  const [amountWithDiscount, setAmountWithDiscount] = useState<
    number | undefined
  >(undefined);
  const [dueDate, setDueDate] = useState("");
  const [appealDeadline, setAppealDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] =
    useState<FineStatus | null>(null);

  useEffect(() => {
    if (fine) {
      setDescription(fine.description);
      setAmount(fine.amount);
      setOccurredAt(fine.occurred_at);
      setAutoNumber(fine.auto_number ?? "");
      setInfractionCode(fine.infraction_code ?? "");
      setAmountWithDiscount(fine.amount_with_discount ?? undefined);
      setDueDate(fine.due_date ?? "");
      setAppealDeadline(fine.appeal_deadline ?? "");
      setLocation(fine.location ?? "");
      setOdometerKm(fine.odometer_km ?? undefined);
      setDriverName(fine.driver_name ?? "");
      setNotes(fine.notes ?? "");
      setShowDetails(
        Boolean(
          fine.auto_number ||
            fine.infraction_code ||
            fine.amount_with_discount != null ||
            fine.due_date ||
            fine.appeal_deadline ||
            fine.paid_at ||
            fine.location ||
            fine.odometer_km != null ||
            fine.driver_name ||
            fine.notes,
        ),
      );
    }
  }, [fine]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateFineInput) =>
      apiClient<Fine>(`/fines/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      setFieldError(null);
      void queryClient.invalidateQueries({ queryKey: ["fines"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: FineStatus) =>
      apiClient<Fine>(`/fines/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fines"] });
    },
  });

  /** @spec SPEC-20260722-005 RF-07, CA-09 */
  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    if (
      amountWithDiscount != null &&
      amount != null &&
      amountWithDiscount > amount
    ) {
      setFieldError(
        "Valor com desconto não pode ser maior que o valor original",
      );
      return;
    }

    const result = updateFineInputSchema.safeParse({
      description,
      amount,
      occurred_at: occurredAt,
      auto_number: autoNumber || null,
      infraction_code: infractionCode || null,
      amount_with_discount: amountWithDiscount ?? null,
      due_date: dueDate || null,
      appeal_deadline: appealDeadline || null,
      location: location || null,
      odometer_km: odometerKm ?? null,
      driver_name: driverName || null,
      notes: notes || null,
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    updateMutation.mutate(result.data);
  }

  /** @spec SPEC-20260619-001 R-FORM-05 */
  const isDirty =
    !!fine &&
    (description !== fine.description ||
      amount !== fine.amount ||
      occurredAt !== fine.occurred_at ||
      autoNumber !== (fine.auto_number ?? "") ||
      infractionCode !== (fine.infraction_code ?? "") ||
      (amountWithDiscount ?? null) !== fine.amount_with_discount ||
      dueDate !== (fine.due_date ?? "") ||
      appealDeadline !== (fine.appeal_deadline ?? "") ||
      location !== (fine.location ?? "") ||
      (odometerKm ?? null) !== fine.odometer_km ||
      driverName !== (fine.driver_name ?? "") ||
      notes !== (fine.notes ?? ""));

  /**
   * @spec SPEC-20260807-005 RF-04
   */
  function handleCancel(): void {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push("/fines");
  }

  if (id === null || isLoading)
    return <main className="p-8">Carregando…</main>;
  if (isError || !fine)
    return (
      <main className="p-8">
        <Alert variant="error" description="Multa não encontrada." />
      </main>
    );

  const availableActions = FINE_STATUS_TRANSITIONS[fine.status];
  const isTerminal = availableActions.length === 0;

  function handleStatusAction(nextStatus: FineStatus): void {
    // eslint-disable-next-line security/detect-object-injection -- nextStatus vem de FINE_STATUS_TRANSITIONS, subconjunto fixo de FineStatus
    if (TERMINAL_ACTION_COPY[nextStatus]) {
      setPendingStatusAction(nextStatus);
      return;
    }
    statusMutation.mutate(nextStatus);
  }

  let pendingActionCopy: { title: string; confirmLabel: string } | null = null;
  if (pendingStatusAction) {
    // eslint-disable-next-line security/detect-object-injection -- pendingStatusAction só é setado a partir de FineStatus vindo de FINE_STATUS_TRANSITIONS
    pendingActionCopy = TERMINAL_ACTION_COPY[pendingStatusAction] ?? null;
  }

  return (
    <Container size="sm">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {fine.description} — {fine.occurred_at.slice(0, 10)}
        </h1>
        <Badge variant={STATUS_VARIANT[fine.status]}>
          {STATUS_LABEL[fine.status]}
        </Badge>
      </div>

      {!isTerminal && (
        <div className="flex items-center gap-2">
          {/* eslint-disable security/detect-object-injection -- nextStatus vem de FINE_STATUS_TRANSITIONS, subconjunto fixo de FineStatus */}
          {availableActions.map((nextStatus) => (
            <Button
              key={nextStatus}
              type="button"
              variant="outline"
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => handleStatusAction(nextStatus)}
            >
              {ACTION_LABEL[nextStatus]}
            </Button>
          ))}
          {/* eslint-enable security/detect-object-injection */}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="description">Infração *</label>
        <Input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex: Excesso de velocidade, avanço de sinal, estacionamento irregular..."
          required
        />

        <label htmlFor="amount">Valor (R$) *</label>
        <CurrencyInput
          id="amount"
          value={amount}
          onChange={setAmount}
          required
        />

        <label htmlFor="occurred_at">Data da infração *</label>
        <Input
          id="occurred_at"
          type="date"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
          required
        />

        <Button
          type="button"
          variant="ghost"
          className="justify-start"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          {showDetails
            ? "Ocultar dados do auto de infração"
            : "Dados do auto de infração (opcional)"}
        </Button>

        {showDetails && (
          <section
            aria-label="Dados do auto de infração"
            className="flex flex-col gap-3 rounded-md border border-border p-3"
          >
            <label htmlFor="auto_number">Número do auto de infração</label>
            <Input
              id="auto_number"
              value={autoNumber}
              onChange={(event) => setAutoNumber(event.target.value)}
            />

            <label htmlFor="infraction_code">Código da infração</label>
            <Input
              id="infraction_code"
              value={infractionCode}
              onChange={(event) => setInfractionCode(event.target.value)}
            />

            <label htmlFor="amount_with_discount">Valor com desconto</label>
            <CurrencyInput
              id="amount_with_discount"
              value={amountWithDiscount}
              onChange={setAmountWithDiscount}
            />
            {amount != null &&
              amountWithDiscount != null &&
              amountWithDiscount <= amount && (
                <p className="text-xs text-muted-foreground">
                  Economia de{" "}
                  {(amount - amountWithDiscount).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              )}

            <label htmlFor="due_date">Vencimento</label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />

            <label htmlFor="appeal_deadline">Prazo para recurso</label>
            <Input
              id="appeal_deadline"
              type="date"
              value={appealDeadline}
              onChange={(event) => setAppealDeadline(event.target.value)}
            />

            {fine.paid_at && (
              <p className="text-sm text-muted-foreground">
                Data de pagamento registrada:{" "}
                {new Date(`${fine.paid_at}T00:00:00`).toLocaleDateString(
                  "pt-BR",
                )}
              </p>
            )}

            <label htmlFor="location">Local</label>
            <Input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />

            <label htmlFor="odometer_km">Odômetro (km)</label>
            <OdometerInput
              id="odometer_km"
              value={odometerKm}
              onChange={setOdometerKm}
            />

            <label htmlFor="driver_name">Condutor</label>
            <Input
              id="driver_name"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
            />

            <label htmlFor="notes">Observações</label>
            <Input
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </section>
        )}

        {fieldError && <Alert variant="error" description={fieldError} />}
        {updateMutation.isError && !fieldError && (
          <Alert
            variant="error"
            description="Não foi possível atualizar a multa."
          />
        )}
        {updateMutation.isSuccess && (
          <Alert variant="success" description="Alterações salvas." />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
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
              Os dados preenchidos serão descartados se você sair agora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/fines")}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingStatusAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatusAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingActionCopy?.title ?? ""}</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatusAction) {
                  statusMutation.mutate(pendingStatusAction);
                  setPendingStatusAction(null);
                }
              }}
            >
              {pendingActionCopy?.confirmLabel ?? ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
