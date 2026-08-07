"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { UpcomingCostItem } from "@navestory/validators";
import { Badge, EmptyState, type BadgeProps } from "@navestory/ui";
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

function urgencyLabel(days: number): string {
  if (days < 0) return "Vencido";
  if (days === 0) return "Vence hoje";
  return `Em ${days}d`;
}

/**
 * @spec SPEC-20260721-002 US-09 — faixas de urgência: ≤2d danger, 3-5d warning, 6-7d neutro
 * @spec SPEC-20260804-006 RF-09, R-DS-10, R-DS-08 — a cor de urgência fica isolada no chip
 * (`Badge`), nunca mais tingindo o fundo do item inteiro.
 */
function urgencyVariant(days: number): NonNullable<BadgeProps["variant"]> {
  if (days <= 2) return "danger";
  if (days <= 5) return "warning";
  return "neutral";
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
      apiClient<UpcomingCostItem[]>(
        `/expenses/upcoming?horizon_days=${HORIZON_DAYS}&limit=${MAX_ITEMS}`,
      ),
    retry: false,
  });

  if (!items) return null;

  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const hasOverflow = items.length >= MAX_ITEMS;

  return (
    // @spec SPEC-20260804-006 RF-20 — padronizado para `bg-card` sólido: todos os demais cards
    // de primeiro nível do dashboard (KpiCard, VehicleHealthCard, FleetAlertBar, ChartWrapper) já
    // usam esse padrão; `glass-card` era a única exceção e criava destaque involuntário.
    <section
      aria-label="Próximos 7 dias"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="kicker">Próximos 7 dias</h2>
        {items.length > 0 && (
          <span className="text-sm font-semibold tabular-nums">
            {currency(total)}
          </span>
        )}
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
                className="flex items-center justify-between gap-3 rounded border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {SOURCE_TYPE_LABEL[item.source_type]} — {item.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant={urgencyVariant(days)}>
                      {urgencyLabel(days)}
                    </Badge>
                    {item.vehicle_plate && <span>{item.vehicle_plate}</span>}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">
                  {item.amount == null
                    ? "estimado"
                    : item.is_estimated
                      ? `${currency(item.amount)} (aprox.)`
                      : currency(item.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hasOverflow && (
        <Link
          href="/expenses?tab=proximas"
          className="self-start text-sm underline"
        >
          Ver todos
        </Link>
      )}
    </section>
  );
}
