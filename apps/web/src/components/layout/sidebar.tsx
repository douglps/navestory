"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/lib/auth/logout";
import { useDashboardStore, type SelectionMode } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vehicles", label: "Veículos" },
  { href: "/vehicle-groups", label: "Grupos" },
  { href: "/expenses", label: "Despesas" },
  { href: "/maintenance", label: "Manutenções" },
  { href: "/settings/preferences", label: "Preferências" },
];

// @spec SPEC-20260603-001 RF-16 — cor do dot passivo por modo de contexto ativo.
const DOT_COLOR_BY_MODE: Record<SelectionMode, string> = {
  none: "bg-muted-foreground/30",
  single: "bg-amber-400",
  group: "bg-blue-400",
  multi: "bg-amber-500",
  attribute: "bg-violet-400",
};

// @spec SPEC-20260602-001 RF-01, RF-04
// @spec SPEC-20260603-001 RF-15, RF-16 — FocusSlot removido; dot passivo adicionado no colapsado.
export function Sidebar(): ReactNode {
  const isCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);
  const selectionMode = useDashboardStore((state) => state.selectionMode);

  return (
    <nav
      className={`fixed inset-y-0 left-0 z-30 flex flex-col gap-3 border-r border-neutral-200 bg-white p-4 ${
        isCollapsed ? "w-16 items-center" : "w-64"
      }`}
    >
      <div className="flex w-full items-center justify-between">
        {!isCollapsed && <span className="px-2 text-lg font-semibold">Nave</span>}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100"
        >
          {isCollapsed ? "»" : "«"}
        </button>
      </div>

      {isCollapsed && (
        // RF-16: indicador passivo, sem interação — R-CTX-07 proíbe este componente
        // de abrir o switcher (o único ponto de entrada é o VehicleContextChip no header).
        // eslint-disable-next-line security/detect-object-injection -- selectionMode é SelectionMode, union fixa de 5 literais
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR_BY_MODE[selectionMode]}`} />
      )}

      <ul className="flex w-full flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`block rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 ${
                isCollapsed ? "text-center" : ""
              }`}
            >
              {isCollapsed ? item.label.slice(0, 1) : item.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* @spec SPEC-20260602-001 RF-19, SPEC-20260603-001 RF-17 — logout já limpa o
          contexto global (clearAllSelection() + sessionStorage) via logout() */}
      <button
        type="button"
        onClick={() => void logout()}
        title={isCollapsed ? "Sair" : undefined}
        className={`mt-auto w-full rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 ${
          isCollapsed ? "text-center" : ""
        }`}
      >
        {isCollapsed ? "⏻" : "Sair"}
      </button>
    </nav>
  );
}
