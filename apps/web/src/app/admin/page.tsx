"use client";

import { Container, Tabs } from "@navestory/ui";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AdminAuditLogsTable } from "./admin-audit-logs-table";
import { AdminUsersTable } from "./admin-users-table";

const TABS = [
  { value: "users", label: "Usuários" },
  { value: "audit-logs", label: "Audit logs" },
];

/**
 * @spec SPEC-20260731-008 RF-08, US-03, US-04
 */
export default function AdminPage(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "users";

  function handleTabChange(nextTab: string): void {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <Container size="5xl" gap={8}>
      <h2 className="text-lg font-semibold">Gestão de usuários e auditoria</h2>
      <Tabs
        items={TABS}
        value={tab}
        onValueChange={handleTabChange}
        aria-label="Seções do painel admin"
      />
      {tab === "audit-logs" ? <AdminAuditLogsTable /> : <AdminUsersTable />}
    </Container>
  );
}
