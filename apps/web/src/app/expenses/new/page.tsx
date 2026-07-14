"use client";

import { createExpenseInputSchema, type CreateExpenseInput } from "@nave/validators";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

interface CategoriesResponse {
  default: { value: string; label: string }[];
  custom: { value: string; label: string }[];
}

interface ExpenseResponse {
  id: string;
}

function vehicleLabel(vehicle: Vehicle): string {
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

/**
 * @spec SPEC-20260714-001 RF-12
 */
export default function NewExpensePage(): ReactNode {
  const router = useRouter();

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient<CategoriesResponse>("/categories"),
    retry: false,
  });

  const [vehicleId, setVehicleId] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      apiClient<ExpenseResponse>("/expenses", { method: "POST", body: input }),
    onSuccess: () => router.push("/expenses"),
  });

  const allCategories = [...(categories?.default ?? []), ...(categories?.custom ?? [])];

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = createExpenseInputSchema.safeParse({
      vehicle_id: vehicleId,
      category,
      amount: Number(amount),
      date,
      description: description || null,
      odometer_km: odometerKm ? Number(odometerKm) : null,
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate(result.data);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Nova despesa</h1>

      {!vehicles?.length && (
        <p role="alert">Cadastre um veículo antes de registrar despesas.</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="vehicle_id">Veículo</label>
        <select
          id="vehicle_id"
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          required
        >
          <option value="" disabled>
            Selecione um veículo
          </option>
          {vehicles?.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicleLabel(vehicle)}
            </option>
          ))}
        </select>

        <label htmlFor="category">Categoria</label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {allCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <label htmlFor="amount">Valor (R$)</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />

        <label htmlFor="date">Data</label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />

        <label htmlFor="odometer_km">Odômetro (km)</label>
        <input
          id="odometer_km"
          type="number"
          value={odometerKm}
          onChange={(event) => setOdometerKm(event.target.value)}
        />

        <label htmlFor="description">Descrição</label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        {fieldError && <p role="alert">{fieldError}</p>}
        {mutation.isError && <p role="alert">Não foi possível registrar a despesa.</p>}

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Registrar"}
        </button>
      </form>
    </main>
  );
}
