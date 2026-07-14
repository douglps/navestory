"use client";

import { updateExpenseInputSchema, type UpdateExpenseInput } from "@nave/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface Expense {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  odometer_km: number | null;
  is_readonly: boolean;
}

/**
 * @spec SPEC-20260714-001 RF-13
 */
export default function ExpenseDetailPage({
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
    data: expense,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expenses", id],
    queryFn: () => apiClient<Expense>(`/expenses/${id}`),
    enabled: id !== null,
    retry: false,
  });

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setDate(expense.date);
      setDescription(expense.description ?? "");
      setOdometerKm(expense.odometer_km !== null ? String(expense.odometer_km) : "");
    }
  }, [expense]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateExpenseInput) =>
      apiClient<Expense>(`/expenses/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient<void>(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      router.push("/expenses");
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = updateExpenseInputSchema.safeParse({
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

    updateMutation.mutate(result.data);
  }

  function handleDelete(): void {
    if (window.confirm("Remover esta despesa?")) {
      deleteMutation.mutate();
    }
  }

  if (id === null || isLoading) return <main className="p-8">Carregando...</main>;
  if (isError || !expense)
    return (
      <main className="p-8" role="alert">
        Despesa não encontrada.
      </main>
    );

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">
        {expense.category} — {expense.date}
      </h1>

      {expense.is_readonly && (
        <p role="alert">
          Esta despesa está vinculada a um registro de outro módulo e não pode ser editada nem
          removida por aqui.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="category">Categoria</label>
        <input
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={expense.is_readonly}
          required
        />

        <label htmlFor="amount">Valor (R$)</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={expense.is_readonly}
          required
        />

        <label htmlFor="date">Data</label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={expense.is_readonly}
          required
        />

        <label htmlFor="odometer_km">Odômetro (km)</label>
        <input
          id="odometer_km"
          type="number"
          value={odometerKm}
          onChange={(event) => setOdometerKm(event.target.value)}
          disabled={expense.is_readonly}
        />

        <label htmlFor="description">Descrição</label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={expense.is_readonly}
        />

        {fieldError && <p role="alert">{fieldError}</p>}
        {updateMutation.isError && <p role="alert">Não foi possível atualizar a despesa.</p>}
        {updateMutation.isSuccess && <p>Despesa atualizada.</p>}

        <button type="submit" disabled={updateMutation.isPending || expense.is_readonly}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteMutation.isPending || expense.is_readonly}
      >
        {deleteMutation.isPending ? "Removendo..." : "Remover despesa"}
      </button>
      {deleteMutation.isError && <p role="alert">Não foi possível remover a despesa.</p>}
    </main>
  );
}
