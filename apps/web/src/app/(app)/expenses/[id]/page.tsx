"use client";

import {
  updateExpenseInputSchema,
  type SupplierSuggestion,
  type UpdateExpenseInput,
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
  Card,
  Combobox,
  Container,
  CurrencyInput,
  Input,
  OdometerInput,
} from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { FuelRealtimeIndicators } from "@/components/expenses/fuel-realtime-indicators";
import { ReceiptField } from "@/components/expenses/receipt-field";
import { ReceiptViewer } from "@/components/expenses/receipt-viewer";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { uploadExpenseReceipt } from "@/lib/http/upload-receipt";
import { changeDateYear } from "@/lib/date-year";
import { datetimeLocalToIso, formatDateInTz, isoToDatetimeLocal } from "@/lib/datetime-tz";
import { FUEL_TYPE_OPTIONS } from "@/lib/fuel-types";
import { useFuelCrossCalc } from "@/lib/hooks/use-fuel-cross-calc";
import { useFuelHistoricalStats } from "@/lib/hooks/use-fuel-historical-stats";
import { usePreferences } from "@/lib/hooks/use-preferences";

interface CategoriesResponse {
  default: { value: string; label: string }[];
  custom: { value: string; label: string }[];
}

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
  /** @spec SPEC-20260814-004 RF-01, RF-09 */
  receipt_storage_key: string | null;
}

/**
 * @spec SPEC-20260714-001 RF-13
 * @spec SPEC-20260606-001 RF-01, RF-02, R-FUEL-05
 * @spec SPEC-20260606-002 RF-01, RF-02
 * @spec SPEC-20260612-001 RF-03, RF-04, RF-05, RF-06
 * @spec SPEC-20260612-002 RF-01, RF-02, RF-03, RF-04, RF-05
 * Arquitetura: adaptado à stack real do projeto (ver changelog de SPEC-20260612-001).
 * @spec SPEC-20260619-001 R-FORM-05
 * @spec SPEC-20260814-002 RF-02, RF-04, RF-05, RF-06, RF-07, RF-08, RF-11 — paridade com
 * `/expenses/new`, adicionada em 2026-08-15 por decisão de produto (ver changelog da spec).
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

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient<CategoriesResponse>("/categories"),
    retry: false,
  });
  const categoryLabel =
    [...(categories?.default ?? []), ...(categories?.custom ?? [])].find(
      (cat) => cat.value === expense?.category,
    )?.label ?? expense?.category;

  const [category, setCategory] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [description, setDescription] = useState("");
  const [odometerKm, setOdometerKm] = useState<number | undefined>(undefined);
  const [fuelType, setFuelType] = useState("");
  const [fullTank, setFullTank] = useState<boolean | null>(null);
  const [supplier, setSupplier] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  /** @spec SPEC-20260814-004 RF-01, RF-10, RF-12 — anexo tardio (retry após falha no upload) */
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(
    null,
  );
  const fuelCalc = useFuelCrossCalc();

  const isFuel = category === "fuel";
  const year = occurredAt ? Number(occurredAt.slice(0, 4)) : undefined;

  /**
   * @spec SPEC-20260606-002 RF-02
   * @spec SPEC-20260814-003 — endpoint agora retorna `SupplierSuggestion[]`; esta tela mantém o
   * `<Input list>` simples (fora do escopo de SPEC-20260814-003, que cobre `/expenses/new`),
   * extraindo apenas o nome do fornecedor de cada sugestão.
   */
  const { data: supplierSuggestions } = useQuery({
    queryKey: ["expense-suppliers"],
    queryFn: () => apiClient<SupplierSuggestion[]>("/expenses/suppliers"),
    enabled: isFuel,
    retry: false,
  });
  const suppliers = supplierSuggestions?.map((s) => s.supplier);

  /**
   * @spec SPEC-20260814-002 RF-04, RF-11 — paridade com `/expenses/new` (changelog 2026-08-15)
   * `expense?.vehicle_id ?? ""` como fallback: o hook só dispara quando `vehicleId !== ""`.
   */
  const { data: fuelStats } = useFuelHistoricalStats(
    expense?.vehicle_id ?? "",
    isFuel,
  );

  useEffect(() => {
    if (expense) {
      setCategory(expense.category);
      setOccurredAt(isoToDatetimeLocal(expense.occurred_at, tz));
      setDescription(expense.description ?? "");
      setOdometerKm(expense.odometer_km ?? undefined);
      fuelCalc.reset({
        amount: expense.amount,
        liters: expense.liters ?? undefined,
      });
      setFuelType(expense.fuel_type ?? "");
      setFullTank(expense.full_tank);
      setSupplier(expense.supplier ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense, tz]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateExpenseInput) =>
      apiClient<Expense>(`/expenses/${id}?strict=true`, {
        method: "PATCH",
        body: input,
      }),
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

  /** @spec SPEC-20260814-004 RF-01, RF-03, RF-10 */
  const receiptUploadMutation = useMutation({
    mutationFn: () => {
      if (!id || !receiptFile) throw new Error("Nenhum arquivo selecionado");
      return uploadExpenseReceipt(id, receiptFile);
    },
    onSuccess: () => {
      setReceiptUploadError(null);
      setReceiptFile(null);
      void queryClient.invalidateQueries({ queryKey: ["expenses", id] });
    },
    onError: () =>
      setReceiptUploadError("Não foi possível enviar o comprovante."),
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

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  function handleDelete(): void {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
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

  /**
   * @spec SPEC-20260807-005 RF-02
   */
  function handleCancel(): void {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push("/expenses");
  }

  if (id === null || isLoading)
    return <main className="p-8">Carregando…</main>;
  if (isError || !expense)
    return (
      <main className="p-8">
        <Alert variant="error" description="Despesa não encontrada." />
      </main>
    );

  return (
    <Container size="3xl">
      <h1 className="text-xl font-semibold">
        Despesa de {categoryLabel} · {formatDateInTz(expense.occurred_at, tz)}
      </h1>

      {expense.is_readonly && (
        <Alert
          variant="info"
          description="Esta despesa está vinculada a um registro de outro módulo e não pode ser editada nem removida por aqui."
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="category">Categoria *</label>
        <Input
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
            <Input
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
        <Input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={expense.is_readonly}
        />

        {isFuel && (
          <section
            aria-label="Dados do abastecimento"
            className="flex flex-col gap-3 rounded border p-3"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-4">
              <div className="flex flex-col gap-1">
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
                  disabled={expense.is_readonly}
                />
              </div>

              <div className="flex flex-col gap-1">
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
                    disabled={expense.is_readonly}
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
                    disabled={expense.is_readonly}
                    onClick={() =>
                      setFullTank((current) =>
                        current === false ? null : false,
                      )
                    }
                  >
                    Não
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="liters">Litros</label>
                <CurrencyInput
                  id="liters"
                  prefix={null}
                  value={fuelCalc.liters}
                  onChange={fuelCalc.setLiters}
                  disabled={expense.is_readonly}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="price_per_liter">Valor por litro</label>
                <CurrencyInput
                  id="price_per_liter"
                  value={fuelCalc.pricePerLiter}
                  onChange={fuelCalc.setPricePerLiter}
                  disabled={expense.is_readonly}
                />
              </div>
            </div>

            {/* @spec SPEC-20260814-002 RF-02, RF-05, RF-06, RF-07, RF-08, RF-11 */}
            <FuelRealtimeIndicators
              amount={fuelCalc.amount}
              liters={fuelCalc.liters}
              fullTank={fullTank}
              odometerKm={odometerKm}
              historicalStats={fuelStats}
            />

            <label htmlFor="supplier">Posto / Fornecedor</label>
            <Input
              id="supplier"
              list="supplier-suggestions"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              disabled={expense.is_readonly}
            />
            <datalist id="supplier-suggestions">
              {suppliers?.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </section>
        )}

        {/* @spec SPEC-20260814-004 US-01, US-02, RF-01, RF-10, RF-12 */}
        {isFuel && (
          <div className="flex flex-col gap-2">
            {expense.receipt_storage_key ? (
              <ReceiptViewer expenseId={id} hasReceipt />
            ) : (
              <>
                <ReceiptField
                  file={receiptFile}
                  onChange={setReceiptFile}
                  disabled={receiptUploadMutation.isPending}
                />
                {receiptFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={receiptUploadMutation.isPending}
                    onClick={() => receiptUploadMutation.mutate()}
                  >
                    {receiptUploadMutation.isPending
                      ? "Enviando..."
                      : "Enviar comprovante"}
                  </Button>
                )}
                {receiptUploadError && (
                  <Alert variant="error" description={receiptUploadError} />
                )}
              </>
            )}
          </div>
        )}

        {fieldError && <Alert variant="error" description={fieldError} />}
        {updateMutation.isError && !fieldError && (
          <Alert
            variant="error"
            description="Não foi possível atualizar a despesa."
          />
        )}
        {updateMutation.isSuccess && (
          <Alert variant="success" description="Alterações salvas com sucesso." />
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={updateMutation.isPending || expense.is_readonly}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
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
            <AlertDialogAction onClick={() => router.push("/expenses")}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="flex flex-col gap-3 border-danger/40 p-6">
        <h2 className="text-lg font-medium text-danger">Zona de perigo</h2>
        <p className="text-sm text-muted-foreground">
          Remover esta despesa é uma ação que não pode ser desfeita.
        </p>
        <div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteMutation.isPending || expense.is_readonly}
          >
            {deleteMutation.isPending ? "Removendo..." : "Remover despesa"}
          </Button>
        </div>
        {deleteMutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível remover a despesa."
          />
        )}
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta despesa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
