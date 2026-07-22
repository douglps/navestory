"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KPI_CATALOG_IDS,
  MAX_ACTIVE_DASHBOARD_KPIS,
  dashboardKpiIdsSchema,
  type KpiCatalogId,
  type UpdatePreferencesInput,
} from "@nave/validators";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@nave/ui";
import { apiClient } from "@/lib/http/api-client";
import { KPI_CATALOG_META } from "./kpi-catalog";

interface PreferencesResponse {
  dashboard_kpi_ids: KpiCatalogId[];
}

/**
 * @spec SPEC-20260721-002 RF-01, R-KPI-01
 * Catálogo curado + preset editável, nunca um construtor livre de métricas — decisão de UX
 * documentada no levantamento que precedeu esta feature (Miller's Law/Hick's Law). Teto de
 * `MAX_ACTIVE_DASHBOARD_KPIS` ativos simultâneos, aplicado tanto aqui quanto no backend (Zod).
 */
export function KpiPicker({ activeIds }: { activeIds: KpiCatalogId[] }): ReactNode {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<KpiCatalogId[]>(activeIds);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (dashboard_kpi_ids: KpiCatalogId[]) =>
      apiClient<PreferencesResponse>("/preferences", {
        method: "PATCH",
        body: { dashboard_kpi_ids } satisfies UpdatePreferencesInput,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], (current: Record<string, unknown> | undefined) => ({
        ...current,
        ...data,
      }));
      setOpen(false);
    },
  });

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (next) {
      setSelected(activeIds);
      setError(null);
    }
  }

  function toggle(id: KpiCatalogId, checked: boolean): void {
    setError(null);
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  function handleSave(): void {
    const result = dashboardKpiIdsSchema.safeParse(selected);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Seleção inválida");
      return;
    }
    mutation.mutate(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="self-start text-sm underline">
          Personalizar KPIs
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Personalizar KPIs</DialogTitle>
          <DialogDescription>
            Escolha até {MAX_ACTIVE_DASHBOARD_KPIS} indicadores para exibir no topo do dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          {KPI_CATALOG_IDS.map((id) => {
            const isChecked = selected.includes(id);
            return (
              <label key={id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => toggle(id, event.target.checked)}
                  disabled={!isChecked && selected.length >= MAX_ACTIVE_DASHBOARD_KPIS}
                />
                {/* eslint-disable-next-line security/detect-object-injection -- id é KpiCatalogId, união fixa de 8 literais */}
                <span aria-hidden>{KPI_CATALOG_META[id].icon}</span>
                {/* eslint-disable-next-line security/detect-object-injection -- id é KpiCatalogId, união fixa de 8 literais */}
                {KPI_CATALOG_META[id].title}
              </label>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            Não foi possível salvar. Tente novamente.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <button type="button">Cancelar</button>
          </DialogClose>
          <button type="button" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
