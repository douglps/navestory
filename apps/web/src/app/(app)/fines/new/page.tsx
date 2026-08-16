"use client";

import {
  createFineInputSchema,
  type CreateFineInput,
  type VehicleResponse as Vehicle,
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
  EmptyState,
  Input,
  OdometerInput,
} from "@navestory/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { useVehicleContextField } from "@/lib/hooks/use-vehicle-context-field";

function vehicleLabel(vehicle: Vehicle): string {
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
}

interface FineResponse {
  id: string;
}

/**
 * @spec SPEC-20260722-005 RF-06
 * Arquitetura: adaptado à stack real do projeto (client component + useState + TanStack
 * Query chamando `apps/api` via `apiClient`), mesmo padrão de `expenses/new/page.tsx`.
 */
export default function NewFinePage(): ReactNode {
  const router = useRouter();

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

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
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [occurredAt, setOccurredAt] = useState("");
  const [showDetails, setShowDetails] = useState(false);
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

  const mutation = useMutation({
    mutationFn: (input: CreateFineInput) =>
      apiClient<FineResponse>("/fines", { method: "POST", body: input }),
    onSuccess: () => router.push("/fines"),
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  /** @spec SPEC-20260722-005 CA-09 */
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

    const result = createFineInputSchema.safeParse({
      vehicle_id: vehicleId,
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

    mutation.mutate(result.data);
  }

  /** @spec SPEC-20260722-005 RF-06 (R-FORM-05) */
  const isDirty =
    (vehicleId !== "" && !isVehicleInherited) ||
    description !== "" ||
    amount != null ||
    occurredAt !== "" ||
    showDetails;

  /**
   * @spec SPEC-20260807-005 RF-03
   */
  function handleCancel(): void {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push("/fines");
  }

  /** @spec SPEC-20260722-005 RF-06 (R-FORM-07) */
  if (!vehiclesLoading && vehicles?.length === 0) {
    return (
      <Container size="3xl">
        <h1 className="text-xl font-semibold">Nova multa</h1>
        <EmptyState
          title="Nenhum veículo cadastrado"
          description="Cadastre um veículo para registrar multas."
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
      <h1 className="text-xl font-semibold">Nova multa</h1>
      <p className="text-sm text-muted-foreground">
        Registre para controle e acompanhamento — o pagamento não é feito pelo navestory.
      </p>

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

        <label htmlFor="fineVehicle" className="text-sm font-medium">Veículo *</label>
        <Combobox
          id="fineVehicle"
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
            Preenchido automaticamente pelo veículo em destaque na barra do app
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
        {mutation.isError && !fieldError && (
          <Alert
            variant="error"
            description="Não foi possível registrar a multa."
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar multa"}
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
    </Container>
  );
}
