"use client";

import type { ReactNode } from "react";
import { ContextStaleToast } from "@/components/layout/context-stale-toast";
import { FleetAside } from "@/components/layout/fleet-aside";
import { Sidebar } from "@/components/layout/sidebar";
import { VehicleActivator } from "@/components/layout/vehicle-activator";
import { useUIStore } from "@/lib/stores/ui-store";

export default function AppLayout({ children }: { children: ReactNode }): ReactNode {
  const isCollapsed = useUIStore((state) => state.isSidebarCollapsed);

  return (
    <div className="flex min-h-screen">
      <VehicleActivator />
      <FleetAside />
      <Sidebar />
      <div className={`flex-1 ${isCollapsed ? "pl-16" : "pl-64"}`}>{children}</div>
      <ContextStaleToast />
    </div>
  );
}
