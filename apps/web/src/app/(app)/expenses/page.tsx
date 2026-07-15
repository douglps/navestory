"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
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

interface UpcomingCostItem {
  source_type: "maintenance" | "fine" | "recurring_cost" | "expense";
  source_id: string;
  title: string;
  amount: number | null;
  due_date: string;
  vehicle_id: string;
  vehicle_plate: string | null;
  is_estimated: boolean;
}

interface ExpenseKpis {
  total_this_month: number;
  total_prev_month: number;
  delta_percent: number | null;
  total_all_time: number;
  upcoming_30_days_total: number;
  upcoming_30_days_count: number;
}

function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function urgencyBadge(dueDate: string): { className: string; label: string } {
  const days = daysUntil(dueDate);
  if (days < 0) return { className: "border-red-600 bg-red-50 text-red-700", label: "Vencido" };
  if (days <= 7) return { className: "border-red-400 bg-red-50/60 text-red-700", label: `${days}d` };
  if (days <= 14) return { className: "border-amber-500 bg-amber-50 text-amber-700", label: `${days}d` };
  if (days <= 30) return { className: "border-amber-400 bg-amber-50/60 text-amber-700", label: `${days}d` };
  if (days <= 60) return { className: "border-sky-400 bg-sky-50/60 text-sky-700", label: `${days}d` };
  return { className: "border-muted text-muted-foreground", label: `${days}d` };
}

const SOURCE_TYPE_LABEL: Record<UpcomingCostItem["source_type"], string> = {
  maintenance: "Manutenção",
  fine: "Multa",
  recurring_cost: "Custo recorrente",
  expense: "Despesa",
};

function DeltaBadge({ deltaPercent }: { deltaPercent: number | null }): ReactNode {
  if (deltaPercent === null) return null;
  const isIncrease = deltaPercent > 0;
  const className = isIncrease
    ? "bg-red-100 text-red-700"
    : "bg-green-100 text-green-700";
  const arrow = isIncrease ? "↑" : "↓";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${className}`}>
      {arrow} {Math.abs(deltaPercent).toFixed(1)}%
    </span>
  );
}

/**
 * @spec SPEC-20260608-002 RF-04
 */
function KpiCards({ kpis }: { kpis: ExpenseKpis | undefined }): ReactNode {
  if (!kpis) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded border p-3">
        <p className="text-sm text-muted-foreground">Total este mês</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">{currency(kpis.total_this_month)}</p>
          <DeltaBadge deltaPercent={kpis.delta_percent} />
        </div>
      </div>
      <div className="rounded border p-3">
        <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
        <p className="text-lg font-semibold">{currency(kpis.upcoming_30_days_total)}</p>
        <p className="text-xs text-muted-foreground">
          {kpis.upcoming_30_days_count === 0
            ? "nenhum gasto previsto"
            : `${kpis.upcoming_30_days_count} ${kpis.upcoming_30_days_count === 1 ? "item" : "itens"} nos próximos 30 dias`}
        </p>
      </div>
      <div className="rounded border p-3">
        <p className="text-sm text-muted-foreground">Total histórico</p>
        <p className="text-lg font-semibold">{currency(kpis.total_all_time)}</p>
      </div>
    </div>
  );
}

/**
 * @spec SPEC-20260608-001 RF-04, RF-06
 * @spec SPEC-20260608-003 RF-01, RF-03
 * Botão "Ver" fica sempre desabilitado: `/maintenance` e `/fines` ainda não têm tela própria no
 * frontend (Fase 4 e T3.6, respectivamente) e `/settings` (Documentos) é Sprint 4 — mesma técnica
 * que a spec já previa para `recurring_cost` ("Em breve"), estendida aqui às três origens.
 */
function UpcomingCostsTab({ items }: { items: UpcomingCostItem[] | undefined }): ReactNode {
  if (!items || items.length === 0) {
    return <p>Nenhuma despesa prevista no horizonte selecionado.</p>;
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
              ) : (
                <button type="button" disabled title="Em breve" className="text-sm text-muted-foreground">
                  Ver
                </button>
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
function groupByVehicle(expenses: Expense[], vehicleById: Map<string, Vehicle>): VehicleGroup[] {
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
}: {
  expenses: Expense[] | undefined;
  vehicleById: Map<string, Vehicle>;
}): ReactNode {
  if (!expenses || expenses.length === 0) {
    return <p>Nenhuma despesa no período.</p>;
  }
  const groups = groupByVehicle(expenses, vehicleById);
  const total = groups.reduce((sum, group) => sum + group.subtotal, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded border p-3">
        <p className="text-sm text-muted-foreground">Total geral</p>
        <p className="text-lg font-semibold">{currency(total)}</p>
        <p className="text-xs text-muted-foreground">
          {groups.length} {groups.length === 1 ? "veículo" : "veículos"} · {expenses.length} registros
        </p>
      </div>

      {groups.map((group) => (
        <details key={group.vehicle?.id ?? "sem-veiculo"} className="rounded border p-3">
          <summary className="flex cursor-pointer items-center justify-between font-medium">
            <span>{vehicleLabel(group.vehicle)}</span>
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-1.5 text-xs">{group.items.length}</span>
              <span>{currency(group.subtotal)}</span>
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {group.items.map((expense) => (
              <li key={expense.id}>
                <Link href={`/expenses/${expense.id}`} className="flex justify-between gap-4">
                  <span>
                    {expense.date} — {expense.category}
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
    <Suspense fallback={<main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">Carregando...</main>}>
      <ExpensesPageContent />
    </Suspense>
  );
}

function ExpensesPageContent(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"lista" | "proximas" | "por-veiculo">(
    searchParams.get("tab") === "proximas" || searchParams.get("tab") === "por-veiculo"
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

  const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));
  const overdueOrUrgentCount = (upcoming ?? []).filter((item) => daysUntil(item.due_date) < 0).length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Despesas</h1>
        <div className="flex items-center gap-3">
          <a href="/api/backend/expenses/export" download="nave-despesas-completo.csv">
            Exportar CSV Completo
          </a>
          <Link href="/expenses/new">Nova despesa</Link>
        </div>
      </div>

      <KpiCards kpis={kpis} />

      <div className="flex gap-4 border-b">
        <button
          type="button"
          onClick={() => setTab("lista")}
          className={`pb-2 ${activeTab === "lista" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => setTab("proximas")}
          className={`pb-2 ${activeTab === "proximas" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
        >
          Próximas
          {kpis && kpis.upcoming_30_days_count > 0 && (
            <span
              className={`ml-1 rounded-full px-1.5 text-xs ${overdueOrUrgentCount > 0 ? "bg-red-600 text-white" : "bg-muted"}`}
            >
              {kpis.upcoming_30_days_count}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("por-veiculo")}
          className={`pb-2 ${activeTab === "por-veiculo" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
        >
          Por veículo
        </button>
      </div>

      {activeTab === "lista" && (
        <>
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
                  <span>{currency(expense.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {activeTab === "proximas" && <UpcomingCostsTab items={upcoming} />}

      {activeTab === "por-veiculo" && (
        <ByVehicleTab expenses={allExpenses} vehicleById={vehicleById} />
      )}
    </main>
  );
}
