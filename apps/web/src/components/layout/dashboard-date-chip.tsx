import type { ReactNode } from "react";

function capitalizeFirst(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/**
 * @spec SPEC-20260813-001 RF-02
 * Data abreviada "Qua, 22 Jul. 26", movida do corpo do dashboard (antigo
 * `DashboardDateHeader`) para o `FinancialSubheader`, ao lado do chip de veículo.
 */
export function DashboardDateChip(): ReactNode {
  const now = new Date();
  const weekday = capitalizeFirst(
    new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(now)
      .replace(/\.$/, ""),
  );
  const day = String(now.getDate()).padStart(2, "0");
  const month = capitalizeFirst(
    new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(now),
  );
  const year = String(now.getFullYear()).slice(-2);

  return (
    <span className="whitespace-nowrap text-xs text-muted-foreground">
      {weekday}, {day} {month} {year}
    </span>
  );
}
