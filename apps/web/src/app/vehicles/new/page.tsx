"use client";

import { createVehicleInputSchema, type CreateVehicleInput } from "@nave/validators";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

const VEHICLE_TYPES = [
  { value: "carro", label: "Carro" },
  { value: "moto", label: "Moto" },
  { value: "caminhao", label: "Caminhão" },
  { value: "onibus", label: "Ônibus" },
  { value: "utilitario", label: "Utilitário" },
  { value: "outro", label: "Outro" },
] as const;

interface VehicleResponse {
  id: string;
}

/**
 * @spec SPEC-20260602-002 RF-01
 */
export default function NewVehiclePage(): ReactNode {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] = useState<CreateVehicleInput["vehicle_type"]>("carro");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CreateVehicleInput) =>
      apiClient<VehicleResponse>("/vehicles", { method: "POST", body: input }),
    onSuccess: () => router.push("/vehicles"),
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = createVehicleInputSchema.safeParse({
      plate,
      make,
      model,
      year: Number(year),
      vehicle_type: vehicleType,
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate(result.data);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Cadastrar veículo</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="plate">Placa</label>
        <input
          id="plate"
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
          required
        />

        <label htmlFor="make">Marca</label>
        <input id="make" value={make} onChange={(event) => setMake(event.target.value)} required />

        <label htmlFor="model">Modelo</label>
        <input
          id="model"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          required
        />

        <label htmlFor="year">Ano</label>
        <input
          id="year"
          type="number"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          required
        />

        <label htmlFor="vehicle_type">Tipo</label>
        <select
          id="vehicle_type"
          value={vehicleType}
          onChange={(event) =>
            setVehicleType(event.target.value as CreateVehicleInput["vehicle_type"])
          }
        >
          {VEHICLE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {fieldError && <p role="alert">{fieldError}</p>}
        {mutation.isError && <p role="alert">Não foi possível cadastrar o veículo.</p>}

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Cadastrar"}
        </button>
      </form>
    </main>
  );
}
