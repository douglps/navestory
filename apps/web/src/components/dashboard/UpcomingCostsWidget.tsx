"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { UpcomingCostItem } from "@nave/validators";
import { EmptyState } from "@nave/ui";
import { apiClient } from "@/lib/http/api-client";

const HORIZON_DAYS = 7;
const MAX_ITEMS = 10;

const SOURCE_TYPE_LABEL: Record<UpcomingCostItem["source_type"], string> = {
  maintenance: "Manutenção",
  fine: "Multa",
  recurring_cost: "Custo recorrente",
  expense: "Despesa",
};

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * @spec SPEC-20260721-002 RF-09, US-09
 * Dias corridos até `due_date` (hoje = 0); eventos vencidos retornam negativo.
 */
function daysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** @spec SPEC-20260721-002 US-09 — faixas de urgência: ≤2d danger, 3-5d warning, 6-7d neutro */
function urgencyClassName(days: number): string {
  if (days <= 2) return "border-danger bg-danger-pastel text-danger-foreground";
  if (days <= 5) return "border-warning bg-warning-pastel text-warning-foreground";
  return "border-border bg-muted text-muted-foreground";
}

/**
 * @spec SPEC-20260721-002 RF-09, US-09
 * Widget "Próximos 7 dias" — lista até 10 eventos (P6) com urgência visual e total agregado.
 * O KPI `upcoming_costs_7d` do catálogo (RF-01) já exibe o valor agregado; este widget cobre o
 * item pendente da matriz de rastreabilidade: a lista individual de eventos.
 */
export function UpcomingCostsWidget(): ReactNode {
  const { data: items } = useQuery({
    queryKey: ["expenses", "upcoming", HORIZON_DAYS, MAX_ITEMS],
    queryFn: () =>
      apiClient<UpcomingCostItem[]>(`/expenses/upcoming?horizon_days=${HORIZON_DAYS}&limit=${MAX_ITEMS}`),
    retry: false,
  });

  if (!items) return null;

  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const hasOverflow = items.length >= MAX_ITEMS;

  return (
    <section aria-label="Próximos 7 dias" className="glass-card flex flex-col gap-3 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="kicker">Próximos 7 dias</h2>
        {items.length > 0 && <span className="text-sm font-semibold tabular-nums">{currency(total)}</span>}
      </div>

      {items.length === 0 ? (
        <EmptyState size="sm" title="Nenhum compromisso nos próximos 7 dias." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const days = daysUntil(item.due_date);
            return (
              <li
                key={`${item.source_type}-${item.source_id}`}
                className={`flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm ${urgencyClassName(days)}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {SOURCE_TYPE_LABEL[item.source_type]} — {item.title}
                  </p>
                  <p className="text-xs">
                    {days < 0 ? "Vencido" : days === 0 ? "Vence hoje" : `Em ${days}d`}
                    {item.vehicle_plate ? ` · ${item.vehicle_plate}` : ""}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">
                  {item.amount == null ? "estimado" : `${item.is_estimated ? "~" : ""}${currency(item.amount)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hasOverflow && (
        <Link href="/expenses?tab=proximas" className="self-start text-sm underline">
          Ver todos
        </Link>
      )}
    </section>
  );
}
