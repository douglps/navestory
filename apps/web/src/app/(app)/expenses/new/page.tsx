"use client";

import {
  createExpenseInputSchema,
  type CreateExpenseInput,
  type VehicleResponse as Vehicle,
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
  Combobox,
  Container,
  CurrencyInput,
  EmptyState,
  Input,
  OdometerInput,
} from "@navestory/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { FuelRealtimeIndicators } from "@/components/expenses/fuel-realtime-indicators";
import { ReceiptField } from "@/components/expenses/receipt-field";
import { SupplierCombobox } from "@/components/expenses/supplier-combobox";
import { ApiError, apiClient } from "@/lib/http/api-client";
import { uploadExpenseReceipt } from "@/lib/http/upload-receipt";
import { changeDateYear } from "@/lib/date-year";
import { datetimeLocalToIso, nowInUserTz } from "@/lib/datetime-tz";
import { FUEL_TYPE_OPTIONS } from "@/lib/fuel-types";
import { useFuelCrossCalc } from "@/lib/hooks/use-fuel-cross-calc";
import { useFuelHistoricalStats } from "@/lib/hooks/use-fuel-historical-stats";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useVehicleContextField } from "@/lib/hooks/use-vehicle-context-field";
import { useUIStore } from "@/lib/stores/ui-store";

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
 * @spec SPEC-20260714-001 RF-12
 * @spec SPEC-20260606-001 RF-01, RF-02, R-FUEL-05
 * @spec SPEC-20260606-002 RF-01, RF-02
 * @spec SPEC-20260612-001 RF-03, RF-04, RF-05, RF-06
 * @spec SPEC-20260612-002 RF-01, RF-02, RF-03, RF-04, RF-05
 * @spec SPEC-20260807-004 RF-02, RF-03, RF-04, RF-06, RF-07, RF-08, RF-09
 * @spec SPEC-20260814-002 RF-01, RF-02, RF-05, RF-06, RF-07, RF-08, RF-09, RF-11
 * @spec SPEC-20260814-003 RF-01, RF-05, RF-07
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
  const pushToast = useUIStore((state) => state.pushToast);
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
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  /** @spec SPEC-20260814-004 RF-01, RF-10, RF-12 */
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploadFailedExpenseId, setReceiptUploadFailedExpenseId] =
    useState<string | null>(null);
  /**
   * @spec SPEC-20260807-004 RF-08, R-FUEL-09
   * Rastreia se o usuário editou manualmente o campo Tipo de Combustível. O pré-preenchimento
   * por `favorite_fuel_type` (RF-06) só aplica se `false` — edição manual tem prioridade.
   * Resetado para `false` quando o formulário é limpo ("Descartar alterações").
   */
  const fuelTypeUserEdited = useRef<boolean>(false);
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
   * @spec SPEC-20260814-003 RNF-02
   * `retry:false` + tratamento de 404 como "sem workspace" (mesmo padrão de `/workspace/page.tsx`)
   * — usuário sem workspace segue vendo só sugestões pessoais (SupplierCombobox trata
   * `workspaceId=undefined` como "sem seção de workspace").
   */
  const { data: myWorkspace } = useQuery({
    queryKey: ["workspaces", "me"],
    queryFn: () => apiClient<{ id: string }>("/workspaces/me"),
    enabled: isFuel,
    retry: false,
  });

  /**
   * @spec SPEC-20260814-002 RF-04, RF-11
   * @spec SPEC-20260807-004 RF-04, RF-09, RNF-05
   * `isLoading` usado para exibir estado de carregamento do hint de odômetro (RNF-05).
   * A query é fire-and-forget (RF-09): erro não bloqueia o formulário.
   */
  const { data: fuelStats, isLoading: fuelStatsLoading } =
    useFuelHistoricalStats(vehicleId, isFuel);

  /**
   * @spec SPEC-20260807-004 RF-06, RF-07, RF-08, R-FUEL-07, R-FUEL-09
   * Pré-preenchimento de tipo de combustível: aplica `favorite_fuel_type` do veículo ao
   * selecionar / trocar veículo, mas SOMENTE se o usuário ainda não editou o campo manualmente
   * (`fuelTypeUserEdited.current === false`). R-FUEL-07: priority máxima ao `favorite_fuel_type`
   * do veículo; se null, campo permanece vazio. R-FUEL-09: edição manual não é sobrescrita.
   */
  useEffect(() => {
    if (!isFuel) return;
    if (fuelTypeUserEdited.current) return;
    // fuelStats ainda carregando → aguardar (não limpar o campo)
    if (fuelStatsLoading) return;
    setFuelType(fuelStats?.favorite_fuel_type ?? "");
  }, [fuelStats, fuelStatsLoading, isFuel]);

  /**
   * @spec SPEC-20260720-002 RF-02 RF-05
   */
  /**
   * @spec SPEC-20260814-004 RF-01, RF-03
   * Decisão de arquitetura do gate técnico da spec: `POST /expenses/:id/receipt` exige uma
   * despesa já existente — o upload roda DEPOIS que a despesa é criada, não antes. Falha no
   * upload nunca desfaz a criação da despesa nem bloqueia a navegação (não-bloqueante,
   * mesmo espírito de RF-10 "opcional"): apenas um aviso é mostrado.
   */
  const mutation = useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      apiClient<ExpenseResponse>("/expenses?strict=true", {
        method: "POST",
        body: input,
      }),
    onSuccess: async (data) => {
      setReceiptUploadFailedExpenseId(null);
      if (receiptFile) {
        try {
          await uploadExpenseReceipt(data.id, receiptFile);
        } catch {
          // não desfaz a criação da despesa nem navega — usuário decide tentar de novo
          // (link para a despesa já criada) ou seguir sem o comprovante
          setReceiptUploadFailedExpenseId(data.id);
          return;
        }
      }
      if (data.duplicate_warning && data.duplicate_id) {
        setDuplicateId(data.duplicate_id);
        return;
      }
      if (data.future_date_warning) {
        pushToast({
          variant: "warning",
          title: "Despesa registrada com data futura.",
          duration: 4000,
        });
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
    fuelCalc.pricePerLiter != null ||
    receiptFile != null;

  /**
   * @spec SPEC-20260807-005 RF-01
   */
  function handleCancel(): void {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push("/expenses");
  }

  /**
   * @spec SPEC-20260619-001 R-FORM-07
   */
  if (!vehiclesLoading && vehicles?.length === 0) {
    return (
      <Container size="3xl">
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

  return (
    <Container size="3xl">
      <h1 className="text-xl font-semibold">Nova despesa</h1>

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

        <label htmlFor="expenseVehicle" className="text-sm font-medium">Veículo *</label>
        <Combobox
          id="expenseVehicle"
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
            Preenchido automaticamente pelo veículo em destaque na barra do app
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

        <label htmlFor="expenseCategory" className="text-sm font-medium">Categoria *</label>
        <Combobox
          id="expenseCategory"
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
            {/* @spec SPEC-20260807-004 RF-02, RF-04, RNF-04, RNF-05 */}
            {vehicleId !== "" &&
              (fuelStatsLoading ? (
                <p className="h-4 w-40 animate-pulse rounded bg-muted text-xs" />
              ) : fuelStats?.last_odometer_km != null ? (
                <p className="text-xs text-muted-foreground">
                  Último registrado:{" "}
                  {new Intl.NumberFormat("pt-BR").format(
                    fuelStats.last_odometer_km,
                  )}{" "}
                  km
                </p>
              ) : null)}
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Tipo de combustível</span>
                {/* @spec SPEC-20260807-004 RF-06, RF-07, RF-08, R-FUEL-09 */}
                <Combobox
                  aria-label="Tipo de combustível"
                  options={FUEL_TYPE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={fuelType}
                  onValueChange={(value) => {
                    // RF-08: marcar que o usuário editou manualmente —
                    // impede sobrescrita pelo useEffect de pre-fill (R-FUEL-09).
                    fuelTypeUserEdited.current = true;
                    setFuelType(value);
                  }}
                  placeholder="Selecione (opcional)"
                  searchPlaceholder="Buscar tipo..."
                  emptyMessage="Nenhum tipo encontrado"
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
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="price_per_liter">Valor por litro</label>
                <CurrencyInput
                  id="price_per_liter"
                  value={fuelCalc.pricePerLiter}
                  onChange={fuelCalc.setPricePerLiter}
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
            <SupplierCombobox
              id="supplier"
              value={supplier}
              onChange={setSupplier}
              workspaceId={myWorkspace?.id}
            />

            {/* @spec SPEC-20260814-004 RF-01, RF-04, RF-10, RF-11, RF-12 */}
            <ReceiptField
              file={receiptFile}
              onChange={setReceiptFile}
              disabled={mutation.isPending}
            />
          </section>
        )}

        {receiptUploadFailedExpenseId && (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-md border border-warning bg-warning-pastel p-3 text-sm"
          >
            <p>
              Despesa registrada, mas não foi possível enviar o comprovante.
            </p>
            <Link
              href={`/expenses/${receiptUploadFailedExpenseId}`}
              className="underline"
            >
              Ver despesa e tentar novamente
            </Link>
          </div>
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
            <AlertDialogAction
              onClick={() => {
                // @spec SPEC-20260807-004 RF-08 — resetar flag ao descartar:
                // novo formulário começa sem histórico de edição manual.
                fuelTypeUserEdited.current = false;
                router.push("/expenses");
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
