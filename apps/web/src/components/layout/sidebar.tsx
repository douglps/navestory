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
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  FolderTree,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Ticket,
  User,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon, NavBadge, Tooltip } from "@navestory/ui";
import type { FinesStatusResponse } from "@navestory/validators";
import { apiClient } from "@/lib/http/api-client";
import { logout } from "@/lib/auth/logout";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  useDashboardStore,
  type SelectionMode,
} from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";

const QUERY_STALE_TIME_MS = 5 * 60 * 1000;

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
  icon: LucideIcon;
  badge?: ReactNode;
}

// @spec SPEC-20260730-002 RF-17 — grupo "Navegação" da sidebar em 3 seções (US-06).
// @spec SPEC-20260813-001 RF-01 — "Multas" migrou do FinancialSubheader (removido por
// duplicidade com a navegação principal) para cá, mantendo o único ponto de acesso à rota
// e o badge de contagem (antes exclusivo do subheader).
function buildNavItems(finesBadge: ReactNode): NavItem[] {
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vehicles", label: "Veículos", icon: Car },
    { href: "/vehicle-groups", label: "Grupos", icon: FolderTree },
    { href: "/expenses", label: "Despesas", icon: Receipt },
    { href: "/maintenance", label: "Manutenções", icon: Wrench },
    { href: "/fines", label: "Multas", icon: Ticket, badge: finesBadge },
    // @spec SPEC-20260804-006 RF-14 — movido do header do dashboard: navegação global, faz mais
    // sentido sempre acessível na sidebar do que ancorada numa tela específica.
    { href: "/atividades", label: "Histórico de Atividades", icon: Shield },
  ];
}

// @spec SPEC-20260730-002 RF-17 — grupo "Configurações" da sidebar em 3 seções (US-06).
const SETTINGS_ITEMS: NavItem[] = [
  { href: "/settings/preferences", label: "Preferências", icon: Settings },
  { href: "/settings/account", label: "Minha conta", icon: User },
];

interface SidebarNavItemProps {
  item: NavItem;
  pathname: string | null;
  effectiveCollapsed: boolean;
}

// @spec SPEC-20260730-002 RF-11, RF-12 — ícone + label, destaque de rota ativa; extraído para
// ser reutilizado pelas seções "Navegação" e "Configurações" (RF-17, US-06).
function SidebarNavItem({
  item,
  pathname,
  effectiveCollapsed,
}: SidebarNavItemProps): ReactNode {
  const { icon } = item;
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
      } ${effectiveCollapsed ? "md:justify-center md:text-center" : ""}`}
    >
      {/* @spec SPEC-20260813-001 RF-17 — migrado para o wrapper <Icon> do design system */}
      <Icon icon={icon} size="lg" className="shrink-0" />
      {!effectiveCollapsed && (
        <span className="flex flex-1 items-center justify-between gap-2">
          {item.label}
          {item.badge}
        </span>
      )}
    </Link>
  );
  return (
    <li>
      {effectiveCollapsed ? (
        <Tooltip content={item.label} side="right">
          {link}
        </Tooltip>
      ) : (
        link
      )}
    </li>
  );
}

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
  const navListRef = useRef<HTMLDivElement>(null);
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

  const { data: finesStatus } = useQuery({
    queryKey: ["fines-status"],
    queryFn: () => apiClient<FinesStatusResponse>("/dashboard/fines-status"),
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
  const navItems = buildNavItems(<NavBadge count={finesStatus?.count ?? 0} />);

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
          top-14); desktop (md): in-flow e ancorada (md:sticky, RF-15), irmã do conteúdo dentro
          de `flex flex-1` em layout.tsx — o Header full-width deixa de depender de padding
          compensado. */}
      {/* @spec SPEC-20260730-002 RF-15 — md:sticky (em vez de md:static) ancora a sidebar à
          viewport durante a rolagem da página; md:h-[calc(100vh-3.5rem)] limita sua altura ao
          espaço abaixo do header (h-14 = 3.5rem), habilitando rolagem interna própria (RF-16). */}
      <nav
        id={MOBILE_NAV_DRAWER_ID}
        ref={navRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        style={navStyle}
        className={`fixed left-0 top-14 bottom-0 z-[250] flex w-64 flex-col gap-3 border-r border-border bg-card p-4 text-card-foreground transition-transform duration-200 ease-in-out md:sticky md:top-14 md:inset-auto md:z-30 md:h-[calc(100vh-3.5rem)] md:translate-x-0 ${
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
              <Icon icon={PanelLeftOpen} size="md" />
            ) : (
              <Icon icon={PanelLeftClose} size="md" />
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
            largura intrínseca do conteúdo via navListRef; em mobile/colapsado permanece w-full.
            @spec SPEC-20260730-002 RF-16 — overflow-y-auto: se o conteúdo exceder a altura
            disponível, a rolagem acontece aqui dentro, sem mover header/toggle/botão Sair. */}
        <div
          ref={navListRef}
          className={`flex w-full flex-1 flex-col gap-3 overflow-y-auto ${!isCollapsed ? "md:w-fit" : ""}`}
        >
          {/* @spec SPEC-20260730-002 RF-17 — seção 1 de 3: Navegação (US-06). */}
          <ul className="flex w-full flex-col gap-1">
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                effectiveCollapsed={effectiveCollapsed}
              />
            ))}
          </ul>
        </div>

        {/* @spec SPEC-20260813-001 RF-21 — bloco de rodapé (Configurações + Upgrade + Sair)
            movido para fora do container flex-1/overflow-y-auto acima, para ficar ancorado ao
            fundo da sidebar (mesmo mecanismo de flexbox que já ancorava o botão Sair: o
            navListRef flex-1 absorve o espaço disponível, empurrando este bloco para o final). */}
        <div className="flex w-full shrink-0 flex-col gap-1 border-t border-border pt-3">
          <ul className="flex w-full flex-col gap-1">
            {SETTINGS_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                effectiveCollapsed={effectiveCollapsed}
              />
            ))}
          </ul>
        </div>

        {/* @spec SPEC-20260813-001 RF-21 — CTA "Upgrade" isolado em seção própria (linhas
            divisórias acima/abaixo + cor de destaque primária), para se diferenciar visualmente
            da navegação utilitária de Configurações/Sair. Linka para /upgrade (página
            placeholder — monetização real é Fase 9, ver R-NAV-13). */}
        <div className="w-full shrink-0 border-y border-border py-3">
          {(() => {
            const upgradeLink = (
              <Link
                href="/upgrade"
                className={`flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm font-medium text-primary hover:bg-primary/10 md:min-h-0 md:py-1.5 ${
                  effectiveCollapsed ? "md:justify-center md:text-center" : ""
                }`}
              >
                <Icon icon={Sparkles} size="lg" className="shrink-0" />
                {!effectiveCollapsed && "Upgrade"}
              </Link>
            );
            return effectiveCollapsed ? (
              <Tooltip content="Upgrade" side="right">
                {upgradeLink}
              </Tooltip>
            ) : (
              upgradeLink
            );
          })()}
        </div>

        {/* @spec SPEC-20260602-001 RF-19, SPEC-20260603-001 RF-17 — logout já limpa o
            contexto global (clearAllSelection() + sessionStorage) via logout()
            @spec SPEC-20260730-002 RF-01, RF-02, RF-03, RNF-03 — hold-to-confirm de 1.000 ms
            protege contra clique/toque acidental; barra de progresso interna anima via CSS
            (transition-[width]) e volta a 0 sem chamar logout() se o hold for cancelado. */}
        {(() => {
          const logoutButton = (
            // @spec SPEC-20260730-002 RF-17 — divisória entre seção 2 (Configurações) e
            // seção 3 (Sair); mt-auto empurra o bloco para o rodapé fixo da sidebar.
            <button
              type="button"
              aria-label="Segure para sair"
              aria-busy={isHoldingLogout}
              {...holdLogoutHandlers}
              className={`relative mt-auto flex min-h-[44px] w-full shrink-0 items-center overflow-hidden px-2 pt-3 text-left text-sm text-foreground hover:bg-muted md:min-h-0 md:py-1.5 ${
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
              <span className="relative flex items-center justify-center gap-2">
                <Icon icon={LogOut} size="md" className="shrink-0" />
                {!effectiveCollapsed && "Sair"}
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
