"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import type {
  ExpenseKpis,
  UpcomingCostItem,
  VehicleResponse as Vehicle,
} from "@navestory/validators";
import {
  Alert,
  Button,
  Combobox,
  Container,
  EmptyState,
  Input,
  KpiCard,
  Tabs,
} from "@navestory/ui";
import { ReceiptIndicator } from "@/components/expenses/receipt-viewer";
import { apiClient } from "@/lib/http/api-client";
import { useVehicleContext } from "@/lib/context/use-vehicle-context";
import { formatDateInTz } from "@/lib/datetime-tz";
import { usePreferences } from "@/lib/hooks/use-preferences";

interface Expense {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  occurred_at: string;
  description: string | null;
  /** @spec SPEC-20260814-004 RF-01, US-02 */
  receipt_storage_key: string | null;
}


function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * @spec SPEC-20260531-001 seção 12.3 (migração incremental)
 * @spec SPEC-20260721-002 RF-05
 * @spec SPEC-20260804-006 RF-13 — movido de `dashboard/page.tsx`: exportação é ação de gestão de
 * dados transacionais, contexto certo é a tela onde os dados de despesa residem. Complementa o
 * link "Exportar CSV Completo" (sem filtro de período) já existente no header desta tela.
 *
 * Gap registrado em IMPACTO-040: o estado "desabilitado para plano Grátis" (R-BIZ-12) depende
 * do plano do usuário, ainda não disponível client-side. Não implementado nesta rodada.
 */
function ExportControls({
  vehicles,
}: {
  vehicles: Vehicle[] | undefined;
}): ReactNode {
  const [period, setPeriod] = useState(currentPeriod());
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleExport(): Promise<void> {
    setStatus("loading");
    const exportUrl = `/api/backend/dashboard/export?period=${encodeURIComponent(period)}${
      vehicleId ? `&vehicle_id=${encodeURIComponent(vehicleId)}` : ""
    }`;

    try {
      const response = await fetch(exportUrl);
      if (!response.ok)
        throw new Error(`Falha na exportação: ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `navestory-despesas-${period}.csv`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <h2 className="kicker">Exportar por período</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label htmlFor="export-period" className="flex flex-col gap-1">
          <span>Mês</span>
          <Input
            id="export-period"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span>Veículo</span>
          <Combobox
            aria-label="Veículo"
            options={[
              { value: "", label: "Todos os veículos" },
              ...(vehicles ?? []).map((vehicle) => ({
                value: vehicle.id,
                label: vehicleLabel(vehicle),
              })),
            ]}
            value={vehicleId}
            onValueChange={setVehicleId}
            placeholder="Todos os veículos"
            searchPlaceholder="Buscar veículo..."
            emptyMessage="Nenhum veículo encontrado"
            className="w-full sm:w-56"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      {status === "error" && (
        <Alert
          variant="error"
          description="Não foi possível exportar. Tente novamente."
        />
      )}
    </div>
  );
}

/**
 * @spec SPEC-20260608-001 RF-04
 * Faixas de urgência calculadas em dias corridos até `due_date` (hoje = 0).
 */
function daysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/**
 * @spec SPEC-20260729-002 RF-03, R-DS-08 — 4 níveis codificados por cor + label numérico
 * (nunca só cor): vencido=danger, ≤7d=urgency-hot (terracota mais vívido, "aja agora"),
 * ≤30d=warning, ≤60d=info. Os dois níveis "âmbar" anteriores (≤14d/≤30d) foram fundidos —
 * ISO 11064-4 recomenda no máximo 4 níveis de urgência codificados por cor.
 */
function urgencyBadge(dueDate: string): { className: string; label: string } {
  const days = daysUntil(dueDate);
  if (days < 0)
    return {
      className: "border-danger bg-danger-pastel text-foreground",
      label: "Vencido",
    };
  if (days <= 7)
    return {
      className: "border-urgency-hot bg-urgency-hot-pastel text-foreground",
      label: `${days}d`,
    };
  if (days <= 30)
    return {
      className: "border-warning bg-warning-pastel text-foreground",
      label: `${days}d`,
    };
  if (days <= 60)
    return {
      className: "border-info bg-info-pastel text-foreground",
      label: `${days}d`,
    };
  return { className: "border-muted text-muted-foreground", label: `${days}d` };
}

const SOURCE_TYPE_LABEL: Record<UpcomingCostItem["source_type"], string> = {
  maintenance: "Manutenção",
  fine: "Multa",
  recurring_cost: "Custo recorrente",
  expense: "Despesa",
};

/**
 * @spec SPEC-20260608-002 RF-04
 * @spec SPEC-20260525-001 §5.1 — migrado do padrão ad hoc (`rounded border p-3`) para o
 * `KpiCard` de `packages/ui`, ver matrices/rastreabilidade.md.
 */
function KpiCards({ kpis }: { kpis: ExpenseKpis | undefined }): ReactNode {
  if (!kpis) return null;
  return (
    <div className="flex flex-wrap gap-3">
      <KpiCard
        title="Total este mês"
        value={currency(kpis.total_this_month)}
        trend={
          kpis.delta_percent === null
            ? undefined
            : { value: kpis.delta_percent }
        }
        reverseTrend
      />
      <div className="flex flex-col gap-1">
        <KpiCard
          title="Próximos 30 dias"
          value={currency(kpis.upcoming_30_days_total)}
        />
        <p className="text-xs text-muted-foreground">
          {kpis.upcoming_30_days_count === 0
            ? "nenhum gasto previsto"
            : `${kpis.upcoming_30_days_count} ${kpis.upcoming_30_days_count === 1 ? "item" : "itens"} nos próximos 30 dias`}
        </p>
      </div>
      <KpiCard title="Total histórico" value={currency(kpis.total_all_time)} />
    </div>
  );
}

/**
 * @spec SPEC-20260608-001 RF-04, RF-06
 * @spec SPEC-20260608-003 RF-01, RF-03
 * @spec SPEC-20260722-005 RF-09
 * Botão "Ver" habilitado para `expense` e, desde SPEC-20260722-005, `fine` (tela `/fines/[id]`
 * já existe). `/maintenance` e `/settings` (Documentos) ainda não têm tela própria — mesma
 * técnica que a spec original previa para `recurring_cost` ("Em breve").
 */
function UpcomingCostsTab({
  items,
}: {
  items: UpcomingCostItem[] | undefined;
}): ReactNode {
  if (!items || items.length === 0) {
    return (
      <EmptyState
        size="sm"
        title="Nenhuma despesa prevista no horizonte selecionado."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const badge = urgencyBadge(item.due_date);
        return (
          <li
            key={`${item.source_type}-${item.source_id}`}
            className={`flex items-center justify-between gap-4 rounded border p-3 ${badge.className}`}
          >
            <div>
              <p className="font-medium">
                {SOURCE_TYPE_LABEL[item.source_type]} — {item.title}
              </p>
              <p className="text-xs">
                {item.due_date} · {badge.label}
                {item.vehicle_plate ? ` · ${item.vehicle_plate}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span>
                {item.amount == null
                  ? "estimado"
                  : `${item.is_estimated ? "~" : ""}${currency(item.amount)}`}
              </span>
              {item.source_type === "expense" ? (
                <Link href={`/expenses/${item.source_id}`} className="text-sm">
                  Ver
                </Link>
              ) : item.source_type === "fine" ? (
                <Link href={`/fines/${item.source_id}`} className="text-sm">
                  Ver
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Em breve"
                >
                  Ver
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface VehicleGroup {
  vehicle: Vehicle | undefined;
  items: Expense[];
  subtotal: number;
}

/**
 * @spec SPEC-20260609-002 RF-02, RF-03
 */
function groupByVehicle(
  expenses: Expense[],
  vehicleById: Map<string, Vehicle>,
): VehicleGroup[] {
  const groups = new Map<string, VehicleGroup>();
  for (const expense of expenses) {
    if (!groups.has(expense.vehicle_id)) {
      groups.set(expense.vehicle_id, {
        vehicle: vehicleById.get(expense.vehicle_id),
        items: [],
        subtotal: 0,
      });
    }
    const group = groups.get(expense.vehicle_id)!;
    group.items.push(expense);
    group.subtotal += expense.amount;
  }
  return Array.from(groups.values()).sort((a, b) => b.subtotal - a.subtotal);
}

/**
 * @spec SPEC-20260609-002 RF-01, RF-02, RF-03, RF-05
 * Accordion via `<details>/<summary>` nativo, conforme a própria spec permite — sem componente
 * de accordion no design system do projeto ainda.
 */
function ByVehicleTab({
  expenses,
  vehicleById,
  tz,
}: {
  expenses: Expense[] | undefined;
  vehicleById: Map<string, Vehicle>;
  tz: string | null | undefined;
}): ReactNode {
  if (!expenses || expenses.length === 0) {
    return <EmptyState size="sm" title="Nenhuma despesa no período." />;
  }
  const groups = groupByVehicle(expenses, vehicleById);
  const total = groups.reduce((sum, group) => sum + group.subtotal, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded border p-3">
        <p className="text-sm text-muted-foreground">Total geral</p>
        <p className="text-lg font-semibold">{currency(total)}</p>
        <p className="text-xs text-muted-foreground">
          {groups.length} {groups.length === 1 ? "veículo" : "veículos"} ·{" "}
          {expenses.length} registros
        </p>
      </div>

      {groups.map((group) => (
        <details
          key={group.vehicle?.id ?? "sem-veiculo"}
          className="rounded border p-3"
        >
          <summary className="flex cursor-pointer items-center justify-between font-medium">
            <span>{vehicleLabel(group.vehicle)}</span>
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-1.5 text-xs">
                {group.items.length}
              </span>
              <span>{currency(group.subtotal)}</span>
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {group.items.map((expense) => (
              <li key={expense.id}>
                <Link
                  href={`/expenses/${expense.id}`}
                  className="flex justify-between gap-4"
                >
                  <span className="flex items-center gap-2">
                    {formatDateInTz(expense.occurred_at, tz)} —{" "}
                    {expense.category}
                    {expense.receipt_storage_key && <ReceiptIndicator />}
                  </span>
                  <span>{currency(expense.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

/**
 * @spec SPEC-20260714-001 RF-11
 * @spec SPEC-20260608-001 RF-04
 * @spec SPEC-20260608-002 RF-04
 * @spec SPEC-20260609-002 RF-01
 * @spec SPEC-20260609-003 RF-03
 * `useSearchParams()` exige um `Suspense` boundary para não forçar bailout de
 * CSR no build de produção (https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout).
 */
export default function ExpensesPage(): ReactNode {
  return (
    <Suspense fallback={<Container size="4xl">Carregando…</Container>}>
      <ExpensesPageContent />
    </Suspense>
  );
}

function ExpensesPageContent(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "lista" | "proximas" | "por-veiculo"
  >(
    searchParams.get("tab") === "proximas" ||
      searchParams.get("tab") === "por-veiculo"
      ? (searchParams.get("tab") as "proximas" | "por-veiculo")
      : "lista",
  );

  function setTab(tab: "lista" | "proximas" | "por-veiculo") {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "lista") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

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

  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone;

  const { data: kpis } = useQuery({
    queryKey: ["expenses", "kpis"],
    queryFn: () => apiClient<ExpenseKpis>("/expenses/kpis"),
    retry: false,
  });

  const { data: upcoming } = useQuery({
    queryKey: ["expenses", "upcoming"],
    queryFn: () => apiClient<UpcomingCostItem[]>("/expenses/upcoming"),
    retry: false,
  });

  const { data: allExpenses } = useQuery({
    queryKey: ["expenses", "by-vehicle"],
    queryFn: () => apiClient<Expense[]>("/expenses?limit=100"),
    retry: false,
    enabled: activeTab === "por-veiculo",
  });

  const vehicleById = new Map(
    (vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]),
  );

  // @spec SPEC-20260721-001 RF-05 — quando o contexto global tem um único veículo em foco,
  // as listagens filtram automaticamente por ele. Nos demais modos (grupo/multi/atributo/nenhum)
  // a listagem não é restringida aqui — esses modos já têm resolução própria fora do escopo desta spec.
  const { selectionMode, activeVehicleId } = useVehicleContext();
  const filterByActiveVehicle =
    selectionMode === "single" && activeVehicleId != null;
  const visibleExpenses = filterByActiveVehicle
    ? expenses?.filter((expense) => expense.vehicle_id === activeVehicleId)
    : expenses;
  const visibleUpcoming = filterByActiveVehicle
    ? upcoming?.filter((item) => item.vehicle_id === activeVehicleId)
    : upcoming;
  const visibleAllExpenses = filterByActiveVehicle
    ? allExpenses?.filter((expense) => expense.vehicle_id === activeVehicleId)
    : allExpenses;

  return (
    <Container size="4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Despesas</h1>
        <div className="flex items-center gap-3">
          <a
            className="hidden sm:inline-flex"
            href="/api/backend/expenses/export"
            download="navestory-despesas-completo.csv"
          >
            Exportar CSV Completo
          </a>
          <Link href="/expenses/new">Nova despesa</Link>
        </div>
      </div>

      <KpiCards kpis={kpis} />

      <Tabs
        items={[
          { value: "lista", label: "Lista" },
          {
            value: "proximas",
            label: "Próximas",
            badge:
              kpis && kpis.upcoming_30_days_count > 0
                ? kpis.upcoming_30_days_count
                : undefined,
          },
          { value: "por-veiculo", label: "Por veículo" },
        ]}
        value={activeTab}
        onValueChange={(value) =>
          setTab(value as "lista" | "proximas" | "por-veiculo")
        }
        variant="underline"
        aria-label="Seções de despesas"
      />

      {activeTab === "lista" && (
        <>
          {isLoading && <p>Carregando…</p>}
          {isError && (
            <Alert
              variant="error"
              description="Não foi possível carregar as despesas."
            />
          )}
          {!isLoading && !isError && visibleExpenses?.length === 0 && (
            <EmptyState size="sm" title="Nenhuma despesa registrada ainda." />
          )}

          <ul className="flex flex-col gap-2">
            {visibleExpenses?.map((expense) => (
              <li key={expense.id}>
                <Link
                  href={`/expenses/${expense.id}`}
                  className="flex justify-between gap-4"
                >
                  <span className="flex items-center gap-2">
                    {formatDateInTz(expense.occurred_at, tz)} —{" "}
                    {expense.category} —{" "}
                    {vehicleLabel(vehicleById.get(expense.vehicle_id))}
                    {expense.receipt_storage_key && <ReceiptIndicator />}
                  </span>
                  <span>{currency(expense.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {activeTab === "proximas" && <UpcomingCostsTab items={visibleUpcoming} />}

      {activeTab === "por-veiculo" && (
        <ByVehicleTab
          expenses={visibleAllExpenses}
          vehicleById={vehicleById}
          tz={tz}
        />
      )}

      <ExportControls vehicles={vehicles} />
    </Container>
  );
}
