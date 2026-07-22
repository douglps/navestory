"use client";

import {
  createExpenseTemplateInputSchema,
  updateExpenseInputSchema,
  type CreateExpenseTemplateInput,
  type ExpenseTemplate,
  type UpdateExpenseInput,
} from "@nave/validators";
import { CurrencyInput, OdometerInput } from "@nave/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { changeDateYear } from "@/lib/date-year";
import { datetimeLocalToIso, isoToDatetimeLocal } from "@/lib/datetime-tz";
import { FUEL_TYPE_OPTIONS } from "@/lib/fuel-types";
import { useFuelCrossCalc } from "@/lib/hooks/use-fuel-cross-calc";
import { usePreferences } from "@/lib/hooks/use-preferences";

interface Expense {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  occurred_at: string;
  description: string | null;
  odometer_km: number | null;
  liters: number | null;
  fuel_type: string | null;
  full_tank: boolean | null;
  supplier: string | null;
  is_readonly: boolean;
}

/**
 * @spec SPEC-20260714-001 RF-13
 * @spec SPEC-20260606-001 RF-01, RF-02, R-FUEL-05
 * @spec SPEC-20260606-002 RF-01, RF-02
 * @spec SPEC-20260612-001 RF-03, RF-04, RF-05, RF-06
 * @spec SPEC-20260612-002 RF-01, RF-02, RF-03, RF-04, RF-05
 * Arquitetura: adaptado à stack real do projeto (ver changelog de SPEC-20260612-001).
 * @spec SPEC-20260619-001 R-FORM-05
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

  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone ?? "UTC";

  const [category, setCategory] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [description, setDescription] = useState("");
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [fuelType, setFuelType] = useState("");
  const [fullTank, setFullTank] = useState<boolean | null>(null);
  const [supplier, setSupplier] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [savedTemplateName, setSavedTemplateName] = useState<string | null>(null);
  const fuelCalc = useFuelCrossCalc();

  const isFuel = category === "fuel";
  const year = occurredAt ? Number(occurredAt.slice(0, 4)) : undefined;

  /**
   * @spec SPEC-20260606-002 RF-02
   */
  const { data: suppliers } = useQuery({
    queryKey: ["expense-suppliers"],
    queryFn: () => apiClient<{ data: string[] }>("/expenses/suppliers").then((r) => r.data),
    enabled: isFuel,
    retry: false,
  });

  useEffect(() => {
    if (expense) {
      setCategory(expense.category);
      setOccurredAt(isoToDatetimeLocal(expense.occurred_at, tz));
      setDescription(expense.description ?? "");
      setOdometerKm(expense.odometer_km ?? undefined);
      fuelCalc.reset({ amount: expense.amount, liters: expense.liters ?? undefined });
      setFuelType(expense.fuel_type ?? "");
      setFullTank(expense.full_tank);
      setSupplier(expense.supplier ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense, tz]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateExpenseInput) =>
      apiClient<Expense>(`/expenses/${id}?strict=true`, { method: "PATCH", body: input }),
    onSuccess: () => {
      setFieldError(null);
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient<void>(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      router.push("/expenses");
    },
  });

  function handleYearChange(value: number | undefined): void {
    if (value == null || String(value).length !== 4) return;
    setOccurredAt((current) => {
      const [datePart, timePart] = current.split("T");
      return `${changeDateYear(datePart ?? "", value)}T${timePart ?? "00:00"}`;
    });
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = updateExpenseInputSchema.safeParse({
      category,
      amount: fuelCalc.amount,
      occurred_at: occurredAt ? datetimeLocalToIso(occurredAt, tz) : "",
      description: description || null,
      odometer_km: isFuel ? (odometerKm ?? null) : null,
      fuel_type: isFuel && fuelType ? fuelType : null,
      full_tank: isFuel ? fullTank : null,
      liters: isFuel ? (fuelCalc.liters ?? null) : null,
      supplier: isFuel && supplier ? supplier : null,
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

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  const isDirty =
    !!expense &&
    (category !== expense.category ||
      fuelCalc.amount !== expense.amount ||
      occurredAt !== isoToDatetimeLocal(expense.occurred_at, tz) ||
      description !== (expense.description ?? "") ||
      (odometerKm ?? null) !== expense.odometer_km ||
      fuelType !== (expense.fuel_type ?? "") ||
      fullTank !== expense.full_tank ||
      supplier !== (expense.supplier ?? "") ||
      (fuelCalc.liters ?? null) !== expense.liters);

  function handleCancel(): void {
    if (isDirty && !window.confirm("Descartar alterações?")) return;
    router.push("/expenses");
  }

  const saveTemplateMutation = useMutation({
    mutationFn: (input: CreateExpenseTemplateInput) =>
      apiClient<{ data: ExpenseTemplate }>("/expense-templates", { method: "POST", body: input }),
    onSuccess: (response) => {
      setSavingTemplate(false);
      setTemplateName("");
      setSavedTemplateName(response.data.name);
    },
    onError: () => setTemplateError("Não foi possível criar o modelo."),
  });

  /**
   * @spec SPEC-20260601-003 RF-06, CA-10
   */
  function handleSaveAsTemplate(event: FormEvent): void {
    event.preventDefault();
    setTemplateError(null);
    if (!expense) return;

    const result = createExpenseTemplateInputSchema.safeParse({
      name: templateName,
      vehicle_id: expense.vehicle_id,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      fuel_type: expense.fuel_type,
      supplier: expense.supplier,
    });
    if (!result.success) {
      setTemplateError(result.error.issues[0]?.message ?? "Dados inválidos para criar o modelo");
      return;
    }

    saveTemplateMutation.mutate(result.data);
  }

  if (id === null || isLoading) return <main className="p-8">Carregando...</main>;
  if (isError || !expense)
    return (
      <main className="p-8" role="alert">
        Despesa não encontrada.
      </main>
    );

  const summaryConsistent =
    isFuel &&
    fuelCalc.amount != null &&
    fuelCalc.liters != null &&
    fuelCalc.pricePerLiter != null &&
    Math.abs(fuelCalc.liters * fuelCalc.pricePerLiter - fuelCalc.amount) <= 0.01;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">
        {expense.category} — {expense.occurred_at.slice(0, 10)}
      </h1>

      {expense.is_readonly && (
        <p role="alert">
          Esta despesa está vinculada a um registro de outro módulo e não pode ser editada nem
          removida por aqui.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="category">Categoria *</label>
        <input
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={expense.is_readonly}
          required
        />

        <label htmlFor="amount">Valor (R$) *</label>
        <CurrencyInput
          id="amount"
          value={fuelCalc.amount}
          onChange={fuelCalc.setAmount}
          disabled={expense.is_readonly}
          required
        />

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="occurred_at">Data e hora *</label>
            <input
              id="occurred_at"
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              disabled={expense.is_readonly}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="year">Ano</label>
            <input
              id="year"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={year ?? ""}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                handleYearChange(digits ? Number(digits) : undefined);
              }}
              disabled={expense.is_readonly}
              className="w-20"
            />
          </div>
        </div>

        {isFuel && (
          <>
            <label htmlFor="odometer_km">Odômetro (km) *</label>
            <OdometerInput
              id="odometer_km"
              value={odometerKm}
              onChange={setOdometerKm}
              disabled={expense.is_readonly}
              required
            />
          </>
        )}

        <label htmlFor="description">Descrição</label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={expense.is_readonly}
        />

        {isFuel && (
          <section aria-label="Dados do abastecimento" className="flex flex-col gap-3 rounded border p-3">
            <label htmlFor="fuel_type">Tipo de combustível</label>
            <select
              id="fuel_type"
              value={fuelType}
              onChange={(event) => setFuelType(event.target.value)}
              disabled={expense.is_readonly}
            >
              <option value="">Selecione (opcional)</option>
              {FUEL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <span id="full_tank_label">Tanque cheio?</span>
            <div role="group" aria-labelledby="full_tank_label" className="flex gap-2">
              <button
                type="button"
                aria-pressed={fullTank === true}
                disabled={expense.is_readonly}
                onClick={() => setFullTank((current) => (current === true ? null : true))}
              >
                Sim
              </button>
              <button
                type="button"
                aria-pressed={fullTank === false}
                disabled={expense.is_readonly}
                onClick={() => setFullTank((current) => (current === false ? null : false))}
              >
                Não
              </button>
            </div>

            <label htmlFor="liters">Litros</label>
            <CurrencyInput
              id="liters"
              prefix={null}
              value={fuelCalc.liters}
              onChange={fuelCalc.setLiters}
              disabled={expense.is_readonly}
            />

            <label htmlFor="price_per_liter">Valor por litro</label>
            <CurrencyInput
              id="price_per_liter"
              value={fuelCalc.pricePerLiter}
              onChange={fuelCalc.setPricePerLiter}
              disabled={expense.is_readonly}
            />

            {summaryConsistent && (
              <p className="text-sm text-muted-foreground">
                {fuelCalc.liters} L × R$ {fuelCalc.pricePerLiter}/L = R$ {fuelCalc.amount}
              </p>
            )}

            <label htmlFor="supplier">Posto / Fornecedor</label>
            <input
              id="supplier"
              list="supplier-suggestions"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              disabled={expense.is_readonly}
            />
            <datalist id="supplier-suggestions">
              {suppliers?.map((name) => <option key={name} value={name} />)}
            </datalist>
          </section>
        )}

        {fieldError && <p role="alert">{fieldError}</p>}
        {updateMutation.isError && !fieldError && (
          <p role="alert">Não foi possível atualizar a despesa.</p>
        )}
        {updateMutation.isSuccess && <p>Despesa atualizada.</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={updateMutation.isPending || expense.is_readonly}>
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteMutation.isPending || expense.is_readonly}
      >
        {deleteMutation.isPending ? "Removendo..." : "Remover despesa"}
      </button>
      {deleteMutation.isError && <p role="alert">Não foi possível remover a despesa.</p>}

      <button type="button" onClick={() => setSavingTemplate((prev) => !prev)}>
        Salvar como modelo
      </button>
      {savingTemplate && (
        <form onSubmit={handleSaveAsTemplate} className="flex flex-col gap-2">
          <label htmlFor="template_name">Nome do modelo</label>
          <input
            id="template_name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            required
          />
          {templateError && <p role="alert">{templateError}</p>}
          <button type="submit" disabled={saveTemplateMutation.isPending}>
            {saveTemplateMutation.isPending ? "Salvando..." : "Salvar modelo"}
          </button>
        </form>
      )}
      {savedTemplateName && <p>Modelo &apos;{savedTemplateName}&apos; criado com sucesso.</p>}
    </main>
  );
}
