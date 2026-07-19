"use client";

import type { ReactNode } from "react";
import { ContextStaleToast } from "@/components/layout/context-stale-toast";
import { FleetAside } from "@/components/layout/fleet-aside";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { VehicleActivator } from "@/components/layout/vehicle-activator";
import { OfflineWriteBlockedToast } from "@/components/pwa/offline-write-blocked-toast";
import { InstallPromptBanner } from "@/components/pwa/install-prompt-banner";
import { IosInstallBanner } from "@/components/pwa/ios-install-banner";
import { useUIStore } from "@/lib/stores/ui-store";

// @spec SPEC-20260603-001 RF-01 — Header fixo acima do conteúdo, com chip de contexto sempre visível.
export default function AppLayout({ children }: { children: ReactNode }): ReactNode {
  const isCollapsed = useUIStore((state) => state.isSidebarCollapsed);

  return (
    <div className="flex min-h-screen">
      <VehicleActivator />
      <FleetAside />
      <Sidebar />
      <div className={`flex-1 ${isCollapsed ? "pl-16" : "pl-64"}`}>
        <Header />
        {children}
      </div>
      <ContextStaleToast />
      <OfflineWriteBlockedToast />
      <InstallPromptBanner />
      <IosInstallBanner />
    </div>
  );
}
