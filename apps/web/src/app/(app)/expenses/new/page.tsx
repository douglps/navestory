"use client";

import {
  createExpenseInputSchema,
  createExpenseTemplateInputSchema,
  type CreateExpenseInput,
  type CreateExpenseTemplateInput,
  type ExpenseTemplate,
} from "@navestory/validators";
import {
  Alert,
  Button,
  Combobox,
  Container,
  CurrencyInput,
  EmptyState,
  Input,
  OdometerInput,
} from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { changeDateYear } from "@/lib/date-year";
import { datetimeLocalToIso, nowInUserTz } from "@/lib/datetime-tz";
import { FUEL_TYPE_OPTIONS } from "@/lib/fuel-types";
import { useFuelCrossCalc } from "@/lib/hooks/use-fuel-cross-calc";
import { usePreferences } from "@/lib/hooks/use-preferences";
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
// @spec SPEC-20260715-002 RF-BK-09
interface ExpenseResponse {
  id: string;
  duplicate_warning?: boolean;
  duplicate_id?: string;
  future_date_warning?: boolean;
}

function vehicleLabel(vehicle: Vehicle): string {
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
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
    queryFn: () =>
      apiClient<{ data: ExpenseTemplate[] }>("/expense-templates").then(
        (r) => r.data,
      ),
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
      apiClient<{ data: ExpenseTemplate }>("/expense-templates", {
        method: "POST",
        body: input,
      }),
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
    const vehicleExists = (vehicles ?? []).some(
      (v) => v.id === template.vehicle_id,
    );
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
      setCreateError(
        "Você atingiu o limite de 20 modelos. Exclua um para criar outro.",
      );
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
      setCreateError(
        result.error.issues[0]?.message ??
          "Dados inválidos para criar o modelo",
      );
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
          <div
            key={template.id}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Aplicar modelo ${template.name}`}
              onClick={() => handleApply(template)}
            >
              {template.name}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Excluir modelo ${template.name}`}
              onClick={() => handleDelete(template.id)}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Criar novo modelo"
          disabled={atLimit}
          onClick={() => setCreating((prev) => !prev)}
        >
          +
        </Button>
      </div>

      {creating && (
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2">
          <label htmlFor="template_name">Nome do modelo</label>
          <Input
            id="template_name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            required
          />
          <p>
            Usa os campos veículo, categoria, valor e descrição preenchidos no
            formulário.
          </p>
          {createError && <Alert variant="error" description={createError} />}
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando..." : "Salvar modelo"}
          </Button>
        </form>
      )}
    </section>
  );
}

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

  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone ?? "UTC";

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
  const [occurredAt, setOccurredAt] = useState("");
  const [description, setDescription] = useState("");
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [fuelType, setFuelType] = useState("");
  const [fullTank, setFullTank] = useState<boolean | null>(null);
  const [supplier, setSupplier] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const fuelCalc = useFuelCrossCalc();

  /** @spec SPEC-20260715-002 RF-FE-03 — preenchimento automático da hora corrente no fuso do usuário */
  useEffect(() => {
    if (preferences && occurredAt === "") {
      setOccurredAt(nowInUserTz(tz));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  const isFuel = category === "fuel";
  const year = occurredAt ? Number(occurredAt.slice(0, 4)) : undefined;

  /**
   * @spec SPEC-20260606-002 RF-02
   */
  const { data: suppliers } = useQuery({
    queryKey: ["expense-suppliers"],
    queryFn: () =>
      apiClient<{ data: string[] }>("/expenses/suppliers").then((r) => r.data),
    enabled: isFuel,
    retry: false,
  });

  /**
   * @spec SPEC-20260720-002 RF-02 RF-05
   */
  const mutation = useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      apiClient<ExpenseResponse>("/expenses?strict=true", {
        method: "POST",
        body: input,
      }),
    onSuccess: (data) => {
      if (data.duplicate_warning && data.duplicate_id) {
        setDuplicateId(data.duplicate_id);
        return;
      }
      if (data.future_date_warning) {
        window.alert("Despesa registrada com data futura.");
      }
      router.push("/expenses");
    },
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  const allCategories = [
    ...(categories?.default ?? []),
    ...(categories?.custom ?? []),
  ];

  /**
   * @spec SPEC-20260601-003 RF-03, RF-04, EC-01
   * @spec SPEC-20260606-001 R-FUEL-05
   */
  function handleApplyTemplate(
    template: ExpenseTemplate,
    vehicleExists: boolean,
  ): void {
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
    setOccurredAt((current) => {
      const [datePart, timePart] = current.split("T");
      return `${changeDateYear(datePart ?? "", value)}T${timePart ?? "00:00"}`;
    });
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = createExpenseInputSchema.safeParse({
      vehicle_id: vehicleId,
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

    mutation.mutate(result.data);
  }

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  const isDirty =
    (vehicleId !== "" && !isVehicleInherited) ||
    category !== "" ||
    fuelCalc.amount != null ||
    (preferences != null && occurredAt !== nowInUserTz(tz)) ||
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
      <Container size="sm">
        <h1 className="text-xl font-semibold">Nova despesa</h1>
        <EmptyState
          title="Nenhum veículo cadastrado"
          description="Cadastre um veículo para registrar despesas."
          action={{
            label: "Cadastrar veículo",
            onClick: () => router.push("/vehicles/new"),
          }}
        />
      </Container>
    );
  }

  const summaryConsistent =
    isFuel &&
    fuelCalc.amount != null &&
    fuelCalc.liters != null &&
    fuelCalc.pricePerLiter != null &&
    Math.abs(fuelCalc.liters * fuelCalc.pricePerLiter - fuelCalc.amount) <=
      0.01;

  return (
    <Container size="sm">
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
      {templateNotice && (
        <Alert variant="warning" description={templateNotice} />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {contextChangeNotice && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 text-sm"
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

        <span className="text-sm font-medium">Veículo *</span>
        <Combobox
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
            ↩ Herdado do contexto em foco
          </span>
        )}
        {!isVehicleInherited && vehicleId && (
          <span className="text-xs text-muted-foreground">
            ✓ Selecionado manualmente
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

        <span className="text-sm font-medium">Categoria *</span>
        <Combobox
          aria-label="Categoria *"
          options={allCategories.map((cat) => ({
            value: cat.value,
            label: cat.label,
          }))}
          value={category}
          onValueChange={setCategory}
          placeholder="Selecione uma categoria"
          searchPlaceholder="Buscar categoria..."
          emptyMessage="Nenhuma categoria encontrada"
        />

        <label htmlFor="amount">Valor (R$) *</label>
        <CurrencyInput
          id="amount"
          value={fuelCalc.amount}
          onChange={fuelCalc.setAmount}
          required
        />

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="occurred_at">Data e hora *</label>
            <Input
              id="occurred_at"
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="year">Ano</label>
            <Input
              id="year"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={year ?? ""}
              onChange={(event) => {
                const digits = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 4);
                handleYearChange(digits ? Number(digits) : undefined);
              }}
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
              required
            />
          </>
        )}

        <label htmlFor="description">Descrição</label>
        <Input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        {isFuel && (
          <section
            aria-label="Dados do abastecimento"
            className="flex flex-col gap-3 rounded border p-3"
          >
            <span className="text-sm font-medium">Tipo de combustível</span>
            <Combobox
              aria-label="Tipo de combustível"
              options={FUEL_TYPE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={fuelType}
              onValueChange={setFuelType}
              placeholder="Selecione (opcional)"
              searchPlaceholder="Buscar tipo..."
              emptyMessage="Nenhum tipo encontrado"
            />

            <span id="full_tank_label">Tanque cheio?</span>
            <div
              role="group"
              aria-labelledby="full_tank_label"
              className="flex gap-2"
            >
              <Button
                type="button"
                variant={fullTank === true ? "default" : "outline"}
                size="sm"
                aria-pressed={fullTank === true}
                onClick={() =>
                  setFullTank((current) => (current === true ? null : true))
                }
              >
                Sim
              </Button>
              <Button
                type="button"
                variant={fullTank === false ? "default" : "outline"}
                size="sm"
                aria-pressed={fullTank === false}
                onClick={() =>
                  setFullTank((current) => (current === false ? null : false))
                }
              >
                Não
              </Button>
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
                {fuelCalc.liters} L × R$ {fuelCalc.pricePerLiter}/L = R${" "}
                {fuelCalc.amount}
              </p>
            )}

            <label htmlFor="supplier">Posto / Fornecedor</label>
            <Input
              id="supplier"
              list="supplier-suggestions"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
            />
            <datalist id="supplier-suggestions">
              {suppliers?.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </section>
        )}

        {duplicateId ? (
          /**
           * @spec SPEC-20260720-002 RF-03 RF-04 RF-06
           */
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-md border border-warning bg-warning-pastel p-3 text-sm"
          >
            <p>
              Uma despesa com os mesmos dados já existe. Verifique se este não é
              um lançamento duplicado.
            </p>
            <div className="flex gap-3">
              <Link href={`/expenses/${duplicateId}`} className="underline">
                Ver despesa duplicada
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push("/expenses")}
              >
                Entendido
              </Button>
            </div>
          </div>
        ) : (
          <>
            {fieldError && <Alert variant="error" description={fieldError} />}
            {mutation.isError && !fieldError && (
              <Alert
                variant="error"
                description="Não foi possível registrar a despesa."
              />
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={mutation.isPending || duplicateId !== null}
          >
            {mutation.isPending ? "Salvando..." : "Registrar"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Container>
  );
}

export default function NewExpensePage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <NewExpensePageContent />
    </Suspense>
  );
}
