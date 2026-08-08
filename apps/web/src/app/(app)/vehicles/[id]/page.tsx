"use client";

import {
  normalizePlate,
  updateVehicleInputSchema,
  type UpdateVehicleInput,
  type VehicleResponse as Vehicle,
} from "@navestory/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Alert,
  Button,
  Combobox,
  Container,
  Input,
  OdometerInput,
  PlateInput,
  VehicleHealthScore,
} from "@navestory/ui";
import {
  FLAG_LABEL,
  type HealthFlag,
} from "@/components/dashboard/VehicleHealthCard";
import { apiClient } from "@/lib/http/api-client";
import { FUEL_TYPE_OPTIONS } from "@/lib/fuel-types";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/vehicle-types";
import { zodIssuesToFieldErrors } from "@/lib/form-errors";

interface VehicleHealth {
  score: number;
  flags: HealthFlag[];
}

/**
 * @spec SPEC-20260730-001 RF-20
 */
function flagActionLink(flag: HealthFlag, vehicleId: string): string | null {
  switch (flag.type) {
    case "maintenance_overdue":
      return `/maintenance?vehicleId=${vehicleId}&filter=overdue`;
    case "ipva_expiring":
    case "insurance_expiring":
    case "crlv_expiring":
      return `/vehicles/${vehicleId}`;
    case "fines_pending":
      return `/fines?vehicleId=${vehicleId}`;
    case "km_alert":
      return `/maintenance/new?vehicleId=${vehicleId}`;
    default:
      return null;
  }
}

interface FormState {
  plate: string;
  make: string;
  model: string;
  year: string;
  vehicle_type: string;
  fuel_type: string;
  nickname: string;
  color: string;
  odometer: number | undefined;
  ipva_due_date: string;
  renavam: string;
  chassi: string;
}

function vehicleToFormState(vehicle: Vehicle): FormState {
  return {
    plate: vehicle.plate,
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year != null ? String(vehicle.year) : "",
    vehicle_type: vehicle.vehicle_type,
    fuel_type: vehicle.fuel_type ?? "",
    nickname: vehicle.nickname ?? "",
    color: vehicle.color ?? "",
    odometer: vehicle.odometer ?? undefined,
    ipva_due_date: vehicle.ipva_due_date ?? "",
    renavam: vehicle.renavam ?? "",
    chassi: vehicle.chassi ?? "",
  };
}

/**
 * @spec SPEC-20260807-003 RF-02
 * Monta o payload de update a partir do formulário; campos de texto vazios viram `null`
 * (limpar o campo), exceto os obrigatórios (plate/make/model/year/vehicle_type).
 */
function formStateToPayload(form: FormState): Record<string, unknown> {
  return {
    plate: form.plate,
    make: form.make,
    model: form.model,
    year: Number(form.year),
    vehicle_type: form.vehicle_type,
    fuel_type: form.fuel_type || null,
    nickname: form.nickname || null,
    color: form.color || null,
    odometer: form.odometer ?? null,
    ipva_due_date: form.ipva_due_date || null,
    renavam: form.renavam || null,
    chassi: form.chassi || null,
  };
}

/**
 * @spec SPEC-20260602-002 RF-04, RF-05, RF-06
 * @spec SPEC-20260807-003 RF-01, RF-02, RF-03, RF-04, RF-06, RF-07, RF-08
 */
export default function VehicleDetailPage({
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
    data: vehicle,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => apiClient<Vehicle>(`/vehicles/${id}`),
    enabled: id !== null,
    retry: false,
  });

  // RF-19: recalcula a saúde do veículo ao carregar a página.
  const { data: health } = useQuery({
    queryKey: ["vehicles", id, "health"],
    queryFn: () => apiClient<VehicleHealth>(`/vehicles/${id}/health`),
    enabled: id !== null,
    retry: false,
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmationPlate, setConfirmationPlate] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setForm(vehicleToFormState(vehicle));
    }
  }, [vehicle]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateVehicleInput) =>
      apiClient<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient<void>(`/vehicles/${id}`, {
        method: "DELETE",
        body: { confirmationPlate },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      router.push("/vehicles");
    },
  });

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldErrors({});
    if (!form) return;

    const result = updateVehicleInputSchema.safeParse(formStateToPayload(form));
    if (!result.success) {
      setFieldErrors(zodIssuesToFieldErrors(result.error.issues));
      return;
    }

    updateMutation.mutate(result.data);
  }

  const deleteConfirmationValid =
    vehicle !== undefined &&
    confirmationPlate.length > 0 &&
    normalizePlate(confirmationPlate) === vehicle.plate;

  function handleConfirmDelete(): void {
    if (!deleteConfirmationValid) return;
    deleteMutation.mutate();
  }

  if (id === null || isLoading)
    return <main className="p-8">Carregando...</main>;
  if (isError || !vehicle)
    return (
      <main className="p-8">
        <Alert variant="error" description="Veículo não encontrado." />
      </main>
    );
  if (!form) return <main className="p-8">Carregando...</main>;

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">
        {vehicle.make} {vehicle.model} — {vehicle.plate}
      </h1>

      <section
        aria-label="Saúde do Veículo"
        className="flex flex-col gap-2 rounded-md border border-border p-3"
      >
        <div className="flex items-center gap-2">
          <VehicleHealthScore score={health?.score} size={40} />
          <h2 className="text-sm font-medium">Saúde do Veículo</h2>
        </div>

        {health && health.flags.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum problema identificado.
          </p>
        )}

        {health && health.flags.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {health.flags.map((flag, index) => {
              const label = FLAG_LABEL[flag.type]?.(flag) ?? flag.type;
              const href = flagActionLink(flag, vehicle.id);
              return (
                <li key={index}>
                  {href ? (
                    <Link href={href} className="underline">
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="plate">Placa</label>
        <PlateInput
          id="plate"
          value={form.plate}
          onChange={(value) => updateField("plate", value)}
          aria-invalid={Boolean(fieldErrors.plate)}
          aria-describedby={fieldErrors.plate ? "plate-error" : undefined}
        />
        {fieldErrors.plate && (
          <p id="plate-error" role="alert" className="text-sm text-danger">
            {fieldErrors.plate}
          </p>
        )}

        <label htmlFor="make">Marca</label>
        <Input
          id="make"
          value={form.make}
          onChange={(event) => updateField("make", event.target.value)}
          aria-invalid={Boolean(fieldErrors.make)}
        />
        {fieldErrors.make && (
          <p role="alert" className="text-sm text-danger">
            {fieldErrors.make}
          </p>
        )}

        <label htmlFor="model">Modelo</label>
        <Input
          id="model"
          value={form.model}
          onChange={(event) => updateField("model", event.target.value)}
          aria-invalid={Boolean(fieldErrors.model)}
        />
        {fieldErrors.model && (
          <p role="alert" className="text-sm text-danger">
            {fieldErrors.model}
          </p>
        )}

        <label htmlFor="year">Ano</label>
        <Input
          id="year"
          type="number"
          value={form.year}
          onChange={(event) => updateField("year", event.target.value)}
          aria-invalid={Boolean(fieldErrors.year)}
        />
        {fieldErrors.year && (
          <p role="alert" className="text-sm text-danger">
            {fieldErrors.year}
          </p>
        )}

        <span className="text-sm font-medium">Tipo</span>
        <Combobox
          aria-label="Tipo"
          options={VEHICLE_TYPE_OPTIONS}
          value={form.vehicle_type}
          onValueChange={(value) => updateField("vehicle_type", value)}
          placeholder="Selecione um tipo"
          searchPlaceholder="Buscar tipo..."
          emptyMessage="Nenhum tipo encontrado"
        />

        <span className="text-sm font-medium">Combustível</span>
        <Combobox
          aria-label="Combustível"
          options={FUEL_TYPE_OPTIONS}
          value={form.fuel_type}
          onValueChange={(value) => updateField("fuel_type", value)}
          placeholder="Selecione o combustível"
          searchPlaceholder="Buscar combustível..."
          emptyMessage="Nenhum combustível encontrado"
        />

        <label htmlFor="odometer">Odômetro (km)</label>
        <OdometerInput
          id="odometer"
          value={form.odometer}
          onChange={(value) => updateField("odometer", value)}
          aria-label="Odômetro (km)"
        />
        {fieldErrors.odometer && (
          <p role="alert" className="text-sm text-danger">
            {fieldErrors.odometer}
          </p>
        )}

        <label htmlFor="nickname">Apelido</label>
        <Input
          id="nickname"
          value={form.nickname}
          onChange={(event) => updateField("nickname", event.target.value)}
        />

        <label htmlFor="color">Cor</label>
        <Input
          id="color"
          value={form.color}
          onChange={(event) => updateField("color", event.target.value)}
        />

        <label htmlFor="ipva_due_date">Vencimento do IPVA</label>
        <Input
          id="ipva_due_date"
          type="date"
          value={form.ipva_due_date}
          onChange={(event) => updateField("ipva_due_date", event.target.value)}
        />

        <label htmlFor="renavam">RENAVAM</label>
        <Input
          id="renavam"
          value={form.renavam}
          onChange={(event) => updateField("renavam", event.target.value)}
        />

        <label htmlFor="chassi">Chassi</label>
        <Input
          id="chassi"
          value={form.chassi}
          onChange={(event) => updateField("chassi", event.target.value)}
        />

        {fieldErrors._root && (
          <Alert variant="error" description={fieldErrors._root} />
        )}
        {updateMutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível atualizar o veículo."
          />
        )}
        {updateMutation.isSuccess && <p>Veículo atualizado.</p>}

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmationPlate("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive">
            Remover veículo
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`} (
              {vehicle.plate})?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de despesas e manutenções também será ocultado. Esta ação não
              pode ser desfeita facilmente. Digite a placa {vehicle.plate} para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label htmlFor="confirmation-plate" className="sr-only">
            Digite {vehicle.plate} para confirmar
          </label>
          <PlateInput
            id="confirmation-plate"
            value={confirmationPlate}
            onChange={setConfirmationPlate}
            placeholder={`Digite ${vehicle.plate} para confirmar`}
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteConfirmationValid || deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteMutation.isPending ? "Removendo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {deleteMutation.isError && (
        <Alert
          variant="error"
          description="Não foi possível remover o veículo."
        />
      )}
    </Container>
  );
}
