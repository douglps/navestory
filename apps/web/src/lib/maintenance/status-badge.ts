import type { Maintenance } from "@navestory/validators";
import type { BadgeProps } from "@navestory/ui";

/** @spec SPEC-20260715-001 RF-15, RF-17 — extraído de maintenance/page.tsx e maintenance/[id]/page.tsx (estava duplicado verbatim), mesmo padrão de lib/fines/status-badge.ts. */
export const MAINTENANCE_STATUS_LABEL: Record<Maintenance["status"], string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const MAINTENANCE_STATUS_BADGE_VARIANT: Record<
  Maintenance["status"],
  NonNullable<BadgeProps["variant"]>
> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
};
