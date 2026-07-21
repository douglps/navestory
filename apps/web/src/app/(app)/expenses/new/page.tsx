"use client";

import {
  createExpenseInputSchema,
  createExpenseTemplateInputSchema,
  type CreateExpenseInput,
  type CreateExpenseTemplateInput,
  type ExpenseTemplate,
} from "@nave/validators";
import { CurrencyInput, OdometerInput } from "@nave/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { changeDateYear } from "@/lib/date-year";
import { FUEL_TYPE_OPTIONS } from "@/lib/fuel-types";
import { useFuelCrossCalc } from "@/lib/hooks/use-fuel-cross-calc";
import { useVehicleContextField } from "@/lib/hooks/use-vehicle-context-field";

const TEMPLATE_LIMIT = 20;

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

// @spec SPEC-20260720-002 RF-01
interface ExpenseResponse {
  id: string;
  duplicate_warning?: boolean;
  duplicate_id?: string;
}

function vehicleLabel(vehicle: Vehicle): string {
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

/**
 * @spec SPEC-20260601-003 RF-01, RF-02, RF-03, RF-04, RF-05, RF-07, RF-08, RF-10, RF-11, RF-13
 */
function ExpenseTemplatesTray({
  vehicles,
  onApply,
  currentFields,
}: {
  vehicles: Vehicle[] | undefined;
  onApply: (template: ExpenseTemplate, vehicleExists: boolean) => void;
  currentFields: {
    vehicleId: string;
    category: string;
    amount: number | undefined;
    description: string;
    fuelType: string;
    supplier: string;
  };
}): ReactNode {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["expense-templates"],
    queryFn: () => apiClient<{ data: ExpenseTemplate[] }>("/expense-templates").then((r) => r.data),
    retry: false,
  });

  const touchMutation = useMutation({
    mutationFn: (templateId: string) =>
      apiClient(`/expense-templates/${templateId}/touch`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateExpenseTemplateInput) =>
      apiClient<{ data: ExpenseTemplate }>("/expense-templates", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
      setCreating(false);
      setTemplateName("");
    },
    onError: () => setCreateError("Não foi possível criar o modelo."),
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) =>
      apiClient(`/expense-templates/${templateId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
    },
  });

  const atLimit = (templates?.length ?? 0) >= TEMPLATE_LIMIT;

  function handleApply(template: ExpenseTemplate): void {
    const vehicleExists = (vehicles ?? []).some((v) => v.id === template.vehicle_id);
    onApply(template, vehicleExists);
    touchMutation.mutate(template.id);
  }

  function handleDelete(templateId: string): void {
    if (window.confirm("Excluir este modelo?")) {
      deleteMutation.mutate(templateId);
    }
  }

  function handleCreateSubmit(event: FormEvent): void {
    event.preventDefault();
    setCreateError(null);

    if (atLimit) {
      setCreateError("Você atingiu o limite de 20 modelos. Exclua um para criar outro.");
      return;
    }

    const result = createExpenseTemplateInputSchema.safeParse({
      name: templateName,
      vehicle_id: currentFields.vehicleId,
      category: currentFields.category,
      amount: currentFields.amount,
      description: currentFields.description || null,
      fuel_type: currentFields.fuelType || null,
      supplier: currentFields.supplier || null,
    });
    if (!result.success) {
      setCreateError(result.error.issues[0]?.message ?? "Dados inválidos para criar o modelo");
      return;
    }

    createMutation.mutate(result.data);
  }

  return (
    <section aria-label="Modelos de despesa" className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto">
        {templates?.length === 0 && !creating && (
          <p>Nenhum modelo ainda. Toque em + para criar.</p>
        )}
        {templates?.map((template) => (
          <div key={template.id} className="flex items-center gap-1 whitespace-nowrap">
            <button
              type="button"
              aria-label={`Aplicar modelo ${template.name}`}
              onClick={() => handleApply(template)}
            >
              {template.name}
            </button>
            <button
              type="button"
              aria-label={`Excluir modelo ${template.name}`}
              onClick={() => handleDelete(template.id)}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          aria-label="Criar novo modelo"
          disabled={atLimit}
          onClick={() => setCreating((prev) => !prev)}
        >
          +
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2">
          <label htmlFor="template_name">Nome do modelo</label>
          <input
            id="template_name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            required
          />
          <p>Usa os campos veículo, categoria, valor e descrição preenchidos no formulário.</p>
          {createError && <p role="alert">{createError}</p>}
          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando..." : "Salvar modelo"}
          </button>
        </form>
      )}
    </section>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * @spec SPEC-20260714-001 RF-12
 * @spec SPEC-20260606-001 RF-01, RF-02, R-FUEL-05
 * @spec SPEC-20260606-002 RF-01, RF-02
 * @spec SPEC-20260612-001 RF-03, RF-04, RF-05, RF-06
 * @spec SPEC-20260612-002 RF-01, RF-02, RF-03, RF-04, RF-05
 * Arquitetura: adaptado à stack real do projeto (client component + useState + TanStack
 * Query chamando `apps/api` via `apiClient`) — SPEC-20260619-001 descreve react-hook-form +
 * Server Actions, ainda não construídos neste projeto (ver changelog da spec).
 * @spec SPEC-20260619-001 R-FORM-05, R-FORM-07
 * @spec SPEC-20260531-001 RF-DC-02
 * `?category=` (usado pela ação "Abastecer" do dock) exige `useSearchParams`, que só funciona
 * dentro de um limite `<Suspense>` no App Router (mesmo ajuste já aplicado em `/expenses`, ver
 * IMPACTO-032) — por isso o export default abaixo é só o wrapper de Suspense.
 */
function NewExpensePageContent(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient<CategoriesResponse>("/categories"),
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
  const [category, setCategory] = useState(initialCategory);
  const [date, setDate] = useState(TODAY);
  const [description, setDescription] = useState("");
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [fuelType, setFuelType] = useState("");
  const [fullTank, setFullTank] = useState<boolean | null>(null);
  const [supplier, setSupplier] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const fuelCalc = useFuelCrossCalc();

  const isFuel = category === "fuel";
  const year = date ? Number(date.slice(0, 4)) : undefined;

  /**
   * @spec SPEC-20260606-002 RF-02
   */
  const { data: suppliers } = useQuery({
    queryKey: ["expense-suppliers"],
    queryFn: () => apiClient<{ data: string[] }>("/expenses/suppliers").then((r) => r.data),
    enabled: isFuel,
    retry: false,
  });

  /**
   * @spec SPEC-20260720-002 RF-02 RF-05
   */
  const mutation = useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      apiClient<ExpenseResponse>("/expenses?strict=true", { method: "POST", body: input }),
    onSuccess: (data) => {
      if (data.duplicate_warning && data.duplicate_id) {
        setDuplicateId(data.duplicate_id);
        return;
      }
      router.push("/expenses");
    },
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  const allCategories = [...(categories?.default ?? []), ...(categories?.custom ?? [])];

  /**
   * @spec SPEC-20260601-003 RF-03, RF-04, EC-01
   * @spec SPEC-20260606-001 R-FUEL-05
   */
  function handleApplyTemplate(template: ExpenseTemplate, vehicleExists: boolean): void {
    setVehicleId(vehicleExists ? template.vehicle_id : "");
    setCategory(template.category);
    fuelCalc.reset({ amount: template.amount });
    setDescription(template.description ?? "");
    setFuelType(template.fuel_type ?? "");
    setSupplier(template.supplier ?? "");
    setTemplateNotice(
      vehicleExists ? null : "Veículo deste modelo não está mais disponível.",
    );
  }

  function handleYearChange(value: number | undefined): void {
    if (value == null || String(value).length !== 4) return;
    setDate((current) => changeDateYear(current, value));
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = createExpenseInputSchema.safeParse({
      vehicle_id: vehicleId,
      category,
      amount: fuelCalc.amount,
      date,
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

    mutation.mutate(result.data);
  }

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  const isDirty =
    (vehicleId !== "" && !isVehicleInherited) ||
    category !== "" ||
    fuelCalc.amount != null ||
    date !== TODAY ||
    description !== "" ||
    odometerKm != null ||
    fuelType !== "" ||
    fullTank !== null ||
    supplier !== "" ||
    fuelCalc.liters != null ||
    fuelCalc.pricePerLiter != null;

  function handleCancel(): void {
    if (isDirty && !window.confirm("Descartar alterações?")) return;
    router.push("/expenses");
  }

  /**
   * @spec SPEC-20260619-001 R-FORM-07
   */
  if (!vehiclesLoading && vehicles?.length === 0) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Nova despesa</h1>
        <div className="flex flex-col items-center gap-2 rounded border p-6 text-center">
          <p className="font-medium">Nenhum veículo cadastrado</p>
          <p className="text-sm text-muted-foreground">
            Cadastre um veículo para registrar despesas.
          </p>
          <Link href="/vehicles/new" className="underline">
            Cadastrar veículo →
          </Link>
        </div>
      </main>
    );
  }

  const summaryConsistent =
    isFuel &&
    fuelCalc.amount != null &&
    fuelCalc.liters != null &&
    fuelCalc.pricePerLiter != null &&
    Math.abs(fuelCalc.liters * fuelCalc.pricePerLiter - fuelCalc.amount) <= 0.01;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Nova despesa</h1>

      <ExpenseTemplatesTray
        vehicles={vehicles}
        onApply={handleApplyTemplate}
        currentFields={{
          vehicleId,
          category,
          amount: fuelCalc.amount,
          description,
          fuelType,
          supplier,
        }}
      />
      {templateNotice && <p role="alert">{templateNotice}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {contextChangeNotice && (
          <div role="status" className="flex items-center justify-between gap-2 rounded border border-neutral-200 p-2 text-sm">
            <span>{contextChangeNotice}</span>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={applyContextChange} className="underline">
                Atualizar campo
              </button>
              <button type="button" onClick={dismissContextChangeNotice} aria-label="Fechar aviso">
                ×
              </button>
            </div>
          </div>
        )}

        <label htmlFor="vehicle_id">Veículo *</label>
        <select
          id="vehicle_id"
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
          required
          className={
            isVehicleInherited
              ? "border border-amber-300 bg-amber-50"
              : vehicleId
                ? "border border-neutral-300"
                : ""
          }
        >
          <option value="" disabled>
            Selecione um veículo
          </option>
          {filteredVehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicleLabel(vehicle)}
            </option>
          ))}
        </select>
        {isVehicleInherited && (
          <span className="text-xs text-amber-700">↩ Herdado do contexto em foco</span>
        )}
        {!isVehicleInherited && vehicleId && (
          <span className="text-xs text-neutral-500">✓ Selecionado manualmente</span>
        )}
        {vehicleContextHint && <p className="text-xs text-muted-foreground">{vehicleContextHint}</p>}
        {vehicleQuickPicks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vehicleQuickPicks.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setVehicleId(vehicle.id)}
                className="rounded border px-2 py-0.5 text-xs hover:bg-neutral-100"
              >
                {vehicleLabel(vehicle)}
              </button>
            ))}
          </div>
        )}

        <label htmlFor="category">Categoria *</label>
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

        <label htmlFor="amount">Valor (R$) *</label>
        <CurrencyInput id="amount" value={fuelCalc.amount} onChange={fuelCalc.setAmount} required />

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="date">Data *</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
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
              className="w-20"
            />
          </div>
        </div>

        {isFuel && (
          <>
            <label htmlFor="odometer_km">Odômetro (km) *</label>
            <OdometerInput id="odometer_km" value={odometerKm} onChange={setOdometerKm} required />
          </>
        )}

        <label htmlFor="description">Descrição</label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        {isFuel && (
          <section aria-label="Dados do abastecimento" className="flex flex-col gap-3 rounded border p-3">
            <label htmlFor="fuel_type">Tipo de combustível</label>
            <select
              id="fuel_type"
              value={fuelType}
              onChange={(event) => setFuelType(event.target.value)}
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
                onClick={() => setFullTank((current) => (current === true ? null : true))}
              >
                Sim
              </button>
              <button
                type="button"
                aria-pressed={fullTank === false}
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
            />

            <label htmlFor="price_per_liter">Valor por litro</label>
            <CurrencyInput
              id="price_per_liter"
              value={fuelCalc.pricePerLiter}
              onChange={fuelCalc.setPricePerLiter}
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
            />
            <datalist id="supplier-suggestions">
              {suppliers?.map((name) => <option key={name} value={name} />)}
            </datalist>
          </section>
        )}

        {duplicateId ? (
          /**
           * @spec SPEC-20260720-002 RF-03 RF-04 RF-06
           */
          <div role="alert" className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            <p>Uma despesa com os mesmos dados já existe. Verifique se este não é um lançamento duplicado.</p>
            <div className="flex gap-3">
              <Link href={`/expenses/${duplicateId}`} className="underline">
                Ver despesa duplicada
              </Link>
              <button type="button" onClick={() => router.push("/expenses")} className="underline">
                Entendido
              </button>
            </div>
          </div>
        ) : (
          <>
            {fieldError && <p role="alert">{fieldError}</p>}
            {mutation.isError && !fieldError && (
              <p role="alert">Não foi possível registrar a despesa.</p>
            )}
          </>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={mutation.isPending || duplicateId !== null}>
            {mutation.isPending ? "Salvando..." : "Registrar"}
          </button>
          <button type="button" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}

export default function NewExpensePage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <NewExpensePageContent />
    </Suspense>
  );
}
