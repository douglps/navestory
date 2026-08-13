"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  NavBadge,
  Tooltip,
} from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import {
  alertChipStyles,
  alertLabel,
  type FleetAlertItem,
} from "@/components/dashboard/FleetAlertBar";

/**
 * @spec SPEC-20260813-001 RF-05, RF-06
 * Sino de alertas no header — cobertura global (todas as rotas autenticadas), diferente do
 * resumo de 1 linha exibido no corpo do dashboard (`FleetAlertBar`), que é contextual à tela.
 * Hover mostra prévia da contagem por severidade; clique abre o detalhe completo em Dialog.
 */
export function AlertsBell(): ReactNode {
  const [open, setOpen] = useState(false);
  const { data: alerts } = useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: () => apiClient<FleetAlertItem[]>("/dashboard/alerts"),
    retry: false,
  });

  const overdueCount = alerts?.filter((alert) => alert.days_until_due < 0).length ?? 0;
  const upcomingCount = (alerts?.length ?? 0) - overdueCount;

  const previewText =
    alerts && alerts.length > 0
      ? `${overdueCount} vencido${overdueCount === 1 ? "" : "s"}, ${upcomingCount} próximo${upcomingCount === 1 ? "" : "s"}`
      : "Sem alertas";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip content={previewText}>
        <button
          type="button"
          aria-label="Alertas da frota"
          onClick={() => setOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
        >
          <Bell size={18} strokeWidth={1.75} aria-hidden />
          {overdueCount > 0 && (
            <span className="absolute right-0.5 top-0.5">
              <NavBadge count={overdueCount} />
            </span>
          )}
        </button>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alertas da frota</DialogTitle>
          <DialogDescription>
            Manutenções e documentos vencidos ou próximos do vencimento.
          </DialogDescription>
        </DialogHeader>

        {alerts && alerts.length > 0 ? (
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-2 rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <span>
                  <strong>{alert.vehicle_plate}</strong> — {alert.description}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${alertChipStyles(alert)}`}
                >
                  {alertLabel(alert)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
        )}

        <Link
          href="/maintenance?filter=urgent"
          className="mt-4 inline-block text-sm underline"
          onClick={() => setOpen(false)}
        >
          Ver na tela de manutenções
        </Link>
      </DialogContent>
    </Dialog>
  );
}
