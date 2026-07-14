"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface Expense {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

/**
 * @spec SPEC-20260714-001 RF-11
 */
export default function ExpensesPage(): ReactNode {
  const {
    data: expenses,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiClient<Expense[]>("/expenses"),
    retry: false,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Despesas</h1>
        <Link href="/expenses/new">Nova despesa</Link>
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && <p role="alert">Não foi possível carregar as despesas.</p>}
      {!isLoading && !isError && expenses?.length === 0 && (
        <p>Nenhuma despesa registrada ainda.</p>
      )}

      <ul className="flex flex-col gap-2">
        {expenses?.map((expense) => (
          <li key={expense.id}>
            <Link href={`/expenses/${expense.id}`} className="flex justify-between gap-4">
              <span>
                {expense.date} — {expense.category} — {vehicleLabel(vehicleById.get(expense.vehicle_id))}
              </span>
              <span>
                {expense.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
