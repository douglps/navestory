"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Tooltip } from "@nave/ui";
import { logout } from "@/lib/auth/logout";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
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
  { href: "/settings/account", label: "Minha conta" },
];

// @spec SPEC-20260603-001 RF-16 — cor do dot passivo por modo de contexto ativo.
// @spec SPEC-20260729-002 RF-02 — mesmo mapeamento categórico de `vehicle-context-chip.tsx`.
const DOT_COLOR_BY_MODE: Record<SelectionMode, string> = {
  none: "bg-muted-foreground/30",
  single: "bg-categorical-4",
  group: "bg-categorical-1",
  multi: "bg-categorical-4",
  attribute: "bg-categorical-5",
};

// @spec SPEC-20260722-003 RF-14 — id referenciado pelo aria-controls do hamburger no header.
export const MOBILE_NAV_DRAWER_ID = "mobile-nav-drawer";

// @spec SPEC-20260722-003 RF-06 — breakpoint mobile abaixo do qual a sidebar vira drawer.
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Prende o foco de teclado dentro do drawer enquanto ele está aberto em mobile
 * (RNF-04) — implementação nativa via querySelectorAll, sem dependência extra
 * (@radix-ui/react-focus-scope só está presente como transitiva do Dialog).
 * @spec SPEC-20260722-003 RF-08
 */
function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Tab" && focusable.length > 0) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef é estável (useRef)
  }, [active]);
}

// @spec SPEC-20260602-001 RF-01, RF-04
// @spec SPEC-20260603-001 RF-15, RF-16 — FocusSlot removido; dot passivo adicionado no colapsado.
// @spec SPEC-20260721-001 RF-03 — cores em tokens (bg-card/text-foreground) para reagir ao dark mode.
// @spec SPEC-20260722-003 RF-06, RF-07, RF-08, RF-09, RF-13, RF-14 — drawer overlay em mobile.
export function Sidebar(): ReactNode {
  const isCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);
  const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
  const toggleMobileNav = useUIStore((state) => state.toggleMobileNav);
  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const prevPathnameRef = useRef(pathname);
  const isMobileViewport = useMediaQuery(MOBILE_MEDIA_QUERY);
  const effectiveCollapsed = isCollapsed && !isMobileViewport;
  // eslint-disable-next-line security/detect-object-injection -- selectionMode é SelectionMode, união fixa de 5 literais
  const dotColorClass = DOT_COLOR_BY_MODE[selectionMode];

  // RF-09: fecha o drawer automaticamente ao navegar para outra rota.
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (useUIStore.getState().isMobileNavOpen) {
        useUIStore.getState().toggleMobileNav();
      }
    }
  }, [pathname]);

  // RF-08: fecha o drawer ao pressionar Esc.
  useEffect(() => {
    if (!isMobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") toggleMobileNav();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileNavOpen, toggleMobileNav]);

  useFocusTrap(isMobileNavOpen, navRef);

  return (
    <>
      {/* RF-07: backdrop do drawer mobile — z-[240], abaixo do drawer (z-[250], ver docs/ui-design/ux-rules.md). */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-[240] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={toggleMobileNav}
          aria-hidden="true"
        />
      )}
      <nav
        id={MOBILE_NAV_DRAWER_ID}
        ref={navRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className={`fixed inset-y-0 left-0 z-[250] flex w-64 flex-col gap-3 border-r border-border bg-card p-4 text-card-foreground transition-transform duration-200 ease-in-out md:z-30 md:translate-x-0 ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-16 md:items-center" : "md:w-64"}`}
      >
        <div className="flex w-full items-center justify-between">
          <span className={`px-2 text-lg font-semibold ${isCollapsed ? "md:hidden" : ""}`}>Nave</span>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden rounded-md px-2 py-1 text-muted-foreground hover:bg-muted md:block"
          >
            {isCollapsed ? "»" : "«"}
          </button>
        </div>

        {/* RF-16: indicador passivo, sem interação — R-CTX-07 proíbe este componente
            de abrir o switcher (o único ponto de entrada é o VehicleContextChip no header).
            Visível apenas no desktop colapsado; no drawer mobile a sidebar nunca colapsa. */}
        <span
          aria-hidden="true"
          className={`hidden h-2 w-2 shrink-0 rounded-full ${dotColorClass} ${
            isCollapsed ? "md:block" : ""
          }`}
        />

        <ul className="flex w-full flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const link = (
              <Link
                href={item.href}
                className={`flex min-h-[44px] items-center rounded-md px-2 text-sm text-foreground hover:bg-muted md:min-h-0 md:py-1.5 ${
                  isCollapsed ? "md:justify-center md:text-center" : ""
                }`}
              >
                {effectiveCollapsed ? item.label.slice(0, 1) : item.label}
              </Link>
            );
            return (
              <li key={item.href}>
                {effectiveCollapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link}
              </li>
            );
          })}
        </ul>

        {/* @spec SPEC-20260602-001 RF-19, SPEC-20260603-001 RF-17 — logout já limpa o
            contexto global (clearAllSelection() + sessionStorage) via logout() */}
        {(() => {
          const logoutButton = (
            <button
              type="button"
              onClick={() => void logout()}
              className={`mt-auto flex min-h-[44px] w-full items-center rounded-md px-2 text-left text-sm text-foreground hover:bg-muted md:min-h-0 md:py-1.5 ${
                isCollapsed ? "md:justify-center md:text-center" : ""
              }`}
            >
              {effectiveCollapsed ? "⏻" : "Sair"}
            </button>
          );
          return effectiveCollapsed ? (
            <Tooltip content="Sair" side="right">
              {logoutButton}
            </Tooltip>
          ) : (
            logoutButton
          );
        })()}
      </nav>
    </>
  );
}
