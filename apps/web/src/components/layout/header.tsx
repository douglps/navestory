"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { AvatarDropdown, ThemeToggle } from "@navestory/ui";
import { AlertsBell } from "./alerts-bell";
import { CommandPaletteTrigger } from "./command-palette-trigger";
import { MOBILE_NAV_DRAWER_ID } from "./sidebar";
import { ConnectivityIndicator } from "@/components/pwa/connectivity-indicator";
import { logout } from "@/lib/auth/logout";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useUIStore } from "@/lib/stores/ui-store";

/**
 * Header superior fixo do app shell — logo + atalho de Command Palette, sempre visível em
 * todos os breakpoints (substitui o `FocusSlot` do sidebar). O chip de contexto de veículo
 * vive no `FinancialSubheader` (ver SPEC-20260813-001 RF-02).
 *
 * @spec SPEC-20260603-001 RF-01
 * @spec SPEC-20260721-001 RF-03, RF-06 — cores em tokens (bg-card/border-border) em vez de
 * literais (bg-white/border-neutral-200) para o shell reagir ao dark mode; toggle de tema e
 * atalho de Command Palette adicionados ao header.
 * @spec SPEC-20260722-003 RF-10, RF-11 — hamburger mobile-first, elementos de desktop ocultos
 * abaixo de `md`, foco retorna ao hamburger ao fechar o drawer (RNF-04).
 */
export function Header(): ReactNode {
  const { resolvedTheme, setTheme } = useTheme();
  // `next-themes` só sabe o tema real depois de ler `localStorage`/`matchMedia` no cliente —
  // no SSR `resolvedTheme` é sempre `undefined`. Renderizar o ThemeToggle condicionado a esse
  // valor antes do mount causaria hydration mismatch (ícone/aria-label mudando pós-hidratação).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
  const toggleMobileNav = useUIStore((state) => state.toggleMobileNav);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(isMobileNavOpen);
  // @spec SPEC-20260730-002 RF-04, RF-05 — sem chamada de API exclusiva: reaproveita o cache
  // de ["users", "me"] já usado por settings/account/page.tsx.
  const { data: profile } = useCurrentUser();

  // RNF-04: ao fechar o drawer (por qualquer via — backdrop, Esc, navegação), o foco retorna
  // ao botão que o abriu.
  useEffect(() => {
    if (wasOpenRef.current && !isMobileNavOpen) {
      hamburgerRef.current?.focus();
    }
    wasOpenRef.current = isMobileNavOpen;
  }, [isMobileNavOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center gap-3 border-b border-border bg-card px-4 text-card-foreground">
      <button
        ref={hamburgerRef}
        type="button"
        onClick={toggleMobileNav}
        aria-label={isMobileNavOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isMobileNavOpen}
        aria-controls={MOBILE_NAV_DRAWER_ID}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
      >
        {isMobileNavOpen ? (
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        )}
      </button>
      <span className="text-base font-semibold">navestory</span>
      {/* @spec SPEC-20260813-001 RF-02 — chip de contexto de veículo movido para o
          FinancialSubheader (lado direito, junto da data). */}
      <div className="hidden items-center gap-3 md:flex">
        <CommandPaletteTrigger />
      </div>
      <div className="ml-auto flex items-center gap-1">
        {/* @spec SPEC-20260813-001 RF-05 — sino de alertas, visível em todos os breakpoints. */}
        <AlertsBell />
        <div className="hidden items-center gap-1 md:flex">
          {/* @spec SPEC-20260712-001 RF-13 */}
          <ConnectivityIndicator />
          {mounted ? (
            <ThemeToggle
              theme={resolvedTheme === "dark" ? "dark" : "light"}
              onToggle={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            />
          ) : (
            <span aria-hidden="true" className="h-9 w-9 rounded-md" />
          )}
        </div>
        {/* @spec SPEC-20260730-002 RF-04 — visível em todos os breakpoints: era o único ponto
            de identidade/logout ausente do header (sidebar fica atrás do drawer em mobile). */}
        {profile?.name ? (
          <AvatarDropdown
            name={profile.name}
            email={profile.email}
            onLogout={() => void logout()}
          />
        ) : (
          <span aria-hidden="true" className="h-9 w-9 rounded-full" />
        )}
      </div>
    </header>
  );
}
