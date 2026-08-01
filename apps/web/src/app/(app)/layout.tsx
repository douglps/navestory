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

// @spec SPEC-20260603-001 RF-01 — Header fixo acima do conteúdo, com chip de contexto sempre visível.
// @spec SPEC-20260722-003 RF-12 — mobile-first: sem padding-left abaixo de `md`, já que a
// sidebar vira drawer overlay em mobile.
// @spec SPEC-20260722-004 RF-03 — FinancialSubheader como elemento irmão do Header, não wrapper.
// @spec SPEC-20260730-002 RF-08, RF-09 — shell `flex-col`: Header full-width como irmão da row
// `flex flex-1` (Sidebar + conteúdo). Sidebar deixa de depender de `md:pl-16`/`md:pl-64`
// compensado no conteúdo — em desktop ela é `md:static`, in-flow dentro da row; em mobile
// continua `fixed` (drawer overlay, ver sidebar.tsx RF-09).
export default function AppLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex min-h-screen flex-col">
      <VehicleActivator />
      <TimezoneDetector />
      <FleetAside />
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1">
          <FinancialSubheader />
          {children}
        </div>
      </div>
      <InstallPromptBanner />
      <IosInstallBanner />
    </div>
  );
}
