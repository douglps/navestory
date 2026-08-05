"use client";

import { Container, Tabs } from "@navestory/ui";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ComplianceTab } from "./compliance-tab";
import { DriverSettingsTab } from "./driver-settings-tab";
import { MembersTab } from "./members-tab";
import { VehiclesTab } from "./vehicles-tab";

const TABS = [
  { value: "members", label: "Motoristas" },
  { value: "driver-settings", label: "Campos obrigatórios" },
  { value: "compliance", label: "Conformidade" },
  { value: "vehicles", label: "Veículos" },
];

interface WorkspaceOwnerDashboardProps {
  workspaceId: string;
  workspaceName: string;
}

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md
 */
export function WorkspaceOwnerDashboard({ workspaceId, workspaceName }: WorkspaceOwnerDashboardProps): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "members";

  function handleTabChange(nextTab: string): void {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    router.push(`/workspace?${params.toString()}`);
  }

  return (
    <Container size="5xl" gap={8}>
      <h2 className="text-lg font-semibold">Como sua frota opera — {workspaceName}</h2>
      <Tabs items={TABS} value={tab} onValueChange={handleTabChange} aria-label="Seções do workspace" />
      {tab === "driver-settings" && <DriverSettingsTab workspaceId={workspaceId} />}
      {tab === "compliance" && <ComplianceTab workspaceId={workspaceId} />}
      {tab === "vehicles" && <VehiclesTab workspaceId={workspaceId} />}
      {tab === "members" && <MembersTab workspaceId={workspaceId} />}
    </Container>
  );
}
