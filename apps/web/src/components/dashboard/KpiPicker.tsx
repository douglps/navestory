"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KPI_CATALOG_IDS,
  MAX_ACTIVE_DASHBOARD_KPIS,
  dashboardKpiIdsSchema,
  type KpiCatalogId,
  type UpdatePreferencesInput,
} from "@navestory/validators";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@navestory/ui";
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
export function KpiPicker({
  activeIds,
}: {
  activeIds: KpiCatalogId[];
}): ReactNode {
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
      queryClient.setQueryData(
        ["preferences"],
        (current: Record<string, unknown> | undefined) => ({
          ...current,
          ...data,
        }),
      );
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
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
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
        <Button type="button" variant="ghost" size="sm" className="self-start">
          Personalizar KPIs
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Personalizar KPIs</DialogTitle>
          <DialogDescription>
            Escolha até {MAX_ACTIVE_DASHBOARD_KPIS} indicadores para exibir no
            topo do dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          {KPI_CATALOG_IDS.map((id) => {
            const isChecked = selected.includes(id);
            // eslint-disable-next-line security/detect-object-injection -- id é KpiCatalogId, união fixa de 8 literais
            const meta = KPI_CATALOG_META[id];
            return (
              <label key={id} className="flex items-center gap-2">
                <Checkbox
                  checked={isChecked}
                  onChange={(event) => toggle(id, event.target.checked)}
                  disabled={
                    !isChecked && selected.length >= MAX_ACTIVE_DASHBOARD_KPIS
                  }
                />
                {/* @spec SPEC-20260731-007 RF-05 */}
                <meta.icon size={16} aria-hidden />
                {meta.title}
              </label>
            );
          })}
        </div>

        {error && (
          <Alert variant="error" description={error} className="mt-2" />
        )}
        {mutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível salvar. Tente novamente."
            className="mt-2"
          />
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
