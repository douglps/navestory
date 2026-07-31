import type { FineStatus } from "@nave/validators";
import type { BadgeProps } from "@nave/ui";

/**
 * @spec SPEC-20260722-005 RF-07 (R-DS-03)
 * @spec SPEC-20260729-002 — extraído de fines/page.tsx e fines/[id]/page.tsx (estava duplicado
 * verbatim nos dois arquivos); migrado de Tailwind ad hoc para os tokens semânticos.
 * @spec SPEC-20260730-001 — migrado de classe Tailwind para variant de `Badge` de `@nave/ui`.
 */
export const FINE_STATUS_BADGE_VARIANT: Record<FineStatus, NonNullable<BadgeProps["variant"]>> = {
  pending: "warning",
  appealing: "info",
  paid: "success",
  cancelled: "neutral",
};
