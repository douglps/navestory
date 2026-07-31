"use client";

import type { ReactNode } from "react";
import { FinancialSubheader } from "@/components/layout/financial-subheader";
import { FleetAside } from "@/components/layout/fleet-aside";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { TimezoneDetector } from "@/components/layout/timezone-detector";
import { VehicleActivator } from "@/components/layout/vehicle-activator";
import { InstallPromptBanner } from "@/components/pwa/install-prompt-banner";
import { IosInstallBanner } from "@/components/pwa/ios-install-banner";
import { useUIStore } from "@/lib/stores/ui-store";

// @spec SPEC-20260603-001 RF-01 — Header fixo acima do conteúdo, com chip de contexto sempre visível.
// @spec SPEC-20260722-003 RF-12 — mobile-first: sem padding-left abaixo de `md`, já que a
// sidebar vira drawer overlay; padding fixo pré-existente preservado a partir de `md`.
// @spec SPEC-20260722-004 RF-03 — FinancialSubheader como elemento irmão do Header, não wrapper.
// Header ocupa a largura inteira do viewport (w-full) e fica acima da sidebar; a sidebar
// (fixed, top-14) inicia logo abaixo dele em vez de correr da borda superior da tela.
export default function AppLayout({ children }: { children: ReactNode }): ReactNode {
  const isCollapsed = useUIStore((state) => state.isSidebarCollapsed);

  return (
    <div className="min-h-screen">
      <VehicleActivator />
      <TimezoneDetector />
      <FleetAside />
      <Header />
      <div className="flex">
        <Sidebar />
        <div className={`flex-1 ${isCollapsed ? "md:pl-16" : "md:pl-64"}`}>
          <FinancialSubheader />
          {children}
        </div>
      </div>
      <InstallPromptBanner />
      <IosInstallBanner />
    </div>
  );
}
