"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/lib/auth/logout";
import { useUIStore } from "@/lib/stores/ui-store";
import { FocusSlot } from "./focus-slot";

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

// @spec SPEC-20260602-001 RF-01, RF-04
export function Sidebar(): ReactNode {
  const isCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);

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

      <FocusSlot collapsed={isCollapsed} />

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
