"use client";

import {
  createVehicleInputSchema,
  type CreateVehicleInput,
} from "@navestory/validators";
import { Alert, Button, Combobox, Container, Input, PlateInput } from "@navestory/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/vehicle-types";
import { zodIssuesToFieldErrors } from "@/lib/form-errors";

interface VehicleResponse {
  id: string;
}

/**
 * @spec SPEC-20260602-002 RF-01
 * @spec SPEC-20260807-003 RF-03, RF-04, RF-08
 */
export default function NewVehiclePage(): ReactNode {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] =
    useState<CreateVehicleInput["vehicle_type"]>("carro");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (input: CreateVehicleInput) =>
      apiClient<VehicleResponse>("/vehicles", { method: "POST", body: input }),
    onSuccess: () => router.push("/vehicles"),
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldErrors({});

    const result = createVehicleInputSchema.safeParse({
      plate,
      make,
      model,
      year: Number(year),
      vehicle_type: vehicleType,
    });
    if (!result.success) {
      setFieldErrors(zodIssuesToFieldErrors(result.error.issues));
      return;
    }

    mutation.mutate(result.data);
  }

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">Cadastrar veículo</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="plate">Placa</label>
        <PlateInput
          id="plate"
          value={plate}
          onChange={setPlate}
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
          value={make}
          onChange={(event) => setMake(event.target.value)}
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
          value={model}
          onChange={(event) => setModel(event.target.value)}
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
          value={year}
          onChange={(event) => setYear(event.target.value)}
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
          value={vehicleType}
          onValueChange={(value) =>
            setVehicleType(value as CreateVehicleInput["vehicle_type"])
          }
          placeholder="Selecione um tipo"
          searchPlaceholder="Buscar tipo..."
          emptyMessage="Nenhum tipo encontrado"
        />

        {fieldErrors._root && (
          <Alert variant="error" description={fieldErrors._root} />
        )}
        {mutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível cadastrar o veículo."
          />
        )}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Cadastrar"}
        </Button>
      </form>
    </Container>
  );
}
