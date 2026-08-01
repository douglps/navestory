"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Car,
  FolderTree,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  User,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip } from "@navestory/ui";
import { logout } from "@/lib/auth/logout";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  useDashboardStore,
  type SelectionMode,
} from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";

// @spec SPEC-20260730-002 RF-01, RF-02, RF-03
const HOLD_TO_LOGOUT_DURATION_MS = 1000;

interface HoldToConfirmHandlers {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

/**
 * Segurar por `HOLD_TO_LOGOUT_DURATION_MS` antes de disparar `onConfirm` — protege o botão
 * "Sair" da sidebar contra toque acidental em mobile (min-h-[44px] fácil de atingir sem
 * intenção). `onConfirm` só é chamado pelo timer interno, nunca pelos handlers de
 * início/cancelamento diretamente (RF-03).
 * @spec SPEC-20260730-002 RF-01, RF-02, RF-03
 */
function useHoldToConfirm(onConfirm: () => void): {
  isHolding: boolean;
  handlers: HoldToConfirmHandlers;
} {
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    setIsHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsHolding(false);
      onConfirm();
    }, HOLD_TO_LOGOUT_DURATION_MS);
  }, [onConfirm]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
  }, []);

  // Limpa o timer se o componente desmontar durante o hold (evita logout() após unmount).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    isHolding,
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
    },
  };
}

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/vehicles", label: "Veículos", Icon: Car },
  { href: "/vehicle-groups", label: "Grupos", Icon: FolderTree },
  { href: "/expenses", label: "Despesas", Icon: Receipt },
  { href: "/maintenance", label: "Manutenções", Icon: Wrench },
  { href: "/settings/preferences", label: "Preferências", Icon: Settings },
  { href: "/settings/account", label: "Minha conta", Icon: User },
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
function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const focusable =
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
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
  const toggleSidebarCollapsed = useUIStore(
    (state) => state.toggleSidebarCollapsed,
  );
  const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
  const toggleMobileNav = useUIStore((state) => state.toggleMobileNav);
  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const prevPathnameRef = useRef(pathname);
  const isMobileViewport = useMediaQuery(MOBILE_MEDIA_QUERY);
  const effectiveCollapsed = isCollapsed && !isMobileViewport;
  // eslint-disable-next-line security/detect-object-injection -- selectionMode é SelectionMode, união fixa de 5 literais
  const dotColorClass = DOT_COLOR_BY_MODE[selectionMode];
  const [expandedWidth, setExpandedWidth] = useState<number | null>(null);

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

  // @spec SPEC-20260730-002 RNF-05 — `skipHydration: true` no useUIStore exige rehidratação
  // manual no client (mesmo padrão de useDashboardStore em use-vehicle-context.ts).
  useEffect(() => {
    void useUIStore.persist?.rehydrate();
  }, []);

  const { isHolding: isHoldingLogout, handlers: holdLogoutHandlers } =
    useHoldToConfirm(() => void logout());

  // @spec SPEC-20260730-002 RF-14 — largura da sidebar expandida = largura intrínseca do
  // conteúdo de navegação (md:w-fit no <ul>, ver className abaixo) + 20%, medida via
  // ResizeObserver em vez de valor Tailwind fixo. `md:w-64` no <nav> é usado só como fallback
  // até a primeira medição (evita layout de largura 0 / flash).
  useEffect(() => {
    const el = navListRef.current;
    if (!el) return;
    const measure = (): void => setExpandedWidth(el.scrollWidth * 1.2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isCollapsed]);

  const navStyle =
    !isMobileViewport && !isCollapsed && expandedWidth
      ? { width: expandedWidth }
      : undefined;

  return (
    <>
      {/* RF-07: backdrop do drawer mobile — z-[240], abaixo do drawer (z-[250], ver docs/ui-design/ux-rules.md). */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-[240] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={toggleMobileNav}
          aria-hidden="true"
        />
      )}
      {/* @spec SPEC-20260730-002 RF-09 — mobile: drawer overlay (fixed, abaixo do Header via
          top-14); desktop (md): in-flow (md:static), irmã do conteúdo dentro de `flex flex-1`
          em layout.tsx — o Header full-width deixa de depender de padding compensado. */}
      <nav
        id={MOBILE_NAV_DRAWER_ID}
        ref={navRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        style={navStyle}
        className={`fixed left-0 top-14 bottom-0 z-[250] flex w-64 flex-col gap-3 border-r border-border bg-card p-4 text-card-foreground transition-transform duration-200 ease-in-out md:static md:inset-auto md:z-30 md:translate-x-0 ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-16 md:items-center" : "md:w-64"}`}
      >
        {/* @spec SPEC-20260730-002 RF-13 — texto de marca "navestory" removido (identidade já
            representada no header via AvatarDropdown); resta apenas o toggle de colapso. */}
        <div className="flex w-full items-center justify-end">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden rounded-md px-2 py-1 text-muted-foreground hover:bg-muted md:block"
          >
            {isCollapsed ? (
              <PanelLeftOpen size={20} strokeWidth={1.75} aria-hidden />
            ) : (
              <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden />
            )}
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

        {/* @spec SPEC-20260730-002 RF-14 — md:w-fit (só quando expandida) permite medir a
            largura intrínseca do conteúdo via navListRef; em mobile/colapsado permanece w-full. */}
        <ul
          ref={navListRef}
          className={`flex w-full flex-col gap-1 ${!isCollapsed ? "md:w-fit" : ""}`}
        >
          {NAV_ITEMS.map((item) => {
            const { Icon } = item;
            // @spec SPEC-20260730-002 RF-12 — rota ativa: igualdade exata ou prefixo de sub-rota.
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const link = (
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm md:min-h-0 md:py-1.5 ${
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-muted"
                } ${isCollapsed ? "md:justify-center md:text-center" : ""}`}
              >
                {/* @spec SPEC-20260730-002 RF-11 — ícone exibido junto ao label também no
                    estado expandido, não apenas quando colapsado. */}
                <Icon
                  size={24}
                  strokeWidth={1.75}
                  className="shrink-0"
                  aria-hidden
                />
                {!effectiveCollapsed && item.label}
              </Link>
            );
            return (
              <li key={item.href}>
                {effectiveCollapsed ? (
                  <Tooltip content={item.label} side="right">
                    {link}
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>

        {/* @spec SPEC-20260602-001 RF-19, SPEC-20260603-001 RF-17 — logout já limpa o
            contexto global (clearAllSelection() + sessionStorage) via logout()
            @spec SPEC-20260730-002 RF-01, RF-02, RF-03, RNF-03 — hold-to-confirm de 1.000 ms
            protege contra clique/toque acidental; barra de progresso interna anima via CSS
            (transition-[width]) e volta a 0 sem chamar logout() se o hold for cancelado. */}
        {(() => {
          const logoutButton = (
            <button
              type="button"
              aria-label="Segure para sair"
              aria-busy={isHoldingLogout}
              {...holdLogoutHandlers}
              className={`relative mt-auto flex min-h-[44px] w-full items-center overflow-hidden rounded-md px-2 text-left text-sm text-foreground hover:bg-muted md:min-h-0 md:py-1.5 ${
                isCollapsed ? "md:justify-center md:text-center" : ""
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 bg-danger/20 ease-linear ${
                  isHoldingLogout
                    ? "w-full transition-[width] duration-[1000ms]"
                    : "w-0 transition-none"
                }`}
              />
              <span className="relative flex items-center justify-center">
                {effectiveCollapsed ? (
                  <LogOut size={20} strokeWidth={1.75} aria-hidden />
                ) : (
                  "Sair"
                )}
              </span>
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
