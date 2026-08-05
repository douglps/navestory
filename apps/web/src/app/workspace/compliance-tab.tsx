"use client";

import {
  Alert,
  Badge,
  Combobox,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@navestory/ui";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

type CnhStatus = "ok" | "warning" | "urgency_hot" | "expired" | "not_set";
type RegistrationStatus = "complete" | "incomplete";

interface ComplianceEntry {
  memberId: string;
  name: string | null;
  email: string | null;
  registrationStatus: RegistrationStatus;
  missingFields: string[];
  cnhStatus: CnhStatus;
  cnhExpiresAt: string | null;
  cnhDaysRemaining: number | null;
}

interface ComplianceTabProps {
  workspaceId: string;
}

/** @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-08, RF-09, RF-10, R-DS-08 */
const CNH_STATUS_STYLE: Record<CnhStatus, { className: string; label: string }> = {
  expired: { className: "border-danger bg-danger-pastel text-foreground", label: "Vencida" },
  urgency_hot: { className: "border-urgency-hot bg-urgency-hot-pastel text-foreground", label: "Vencendo" },
  warning: { className: "border-warning bg-warning-pastel text-foreground", label: "Vencendo" },
  ok: { className: "border-success bg-success-pastel text-foreground", label: "Em dia" },
  not_set: { className: "border-muted text-muted-foreground", label: "Não preenchida" },
};

const ALL_FILTER_VALUE = "all";

const REGISTRATION_FILTER_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Todos" },
  { value: "complete", label: "Completo" },
  { value: "incomplete", label: "Incompleto" },
];

const CNH_FILTER_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Todos" },
  { value: "ok", label: "Em dia" },
  { value: "warning", label: "Vencendo em 30d" },
  { value: "urgency_hot", label: "Vencendo em 7d" },
  { value: "expired", label: "Vencida" },
];

/** @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-11, RF-12, US-04 */
export function ComplianceTab({ workspaceId }: ComplianceTabProps): ReactNode {
  const [registrationFilter, setRegistrationFilter] = useState(ALL_FILTER_VALUE);
  const [cnhFilter, setCnhFilter] = useState(ALL_FILTER_VALUE);

  const params = new URLSearchParams();
  if (registrationFilter !== ALL_FILTER_VALUE) params.set("registrationStatus", registrationFilter);
  if (cnhFilter !== ALL_FILTER_VALUE) params.set("cnhStatus", cnhFilter);
  const queryString = params.toString();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspaces", workspaceId, "compliance", registrationFilter, cnhFilter],
    queryFn: () =>
      apiClient<ComplianceEntry[]>(
        `/workspaces/${workspaceId}/compliance${queryString ? `?${queryString}` : ""}`,
      ),
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (isError || !data) {
    return <Alert variant="error" description="Não foi possível carregar o painel de conformidade." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Combobox
          value={registrationFilter}
          onValueChange={setRegistrationFilter}
          options={REGISTRATION_FILTER_OPTIONS}
          aria-label="Filtrar por status de cadastro"
        />
        <Combobox
          value={cnhFilter}
          onValueChange={setCnhFilter}
          options={CNH_FILTER_OPTIONS}
          aria-label="Filtrar por status da CNH"
        />
      </div>

      {data.length === 0 ? (
        <EmptyState title="Nenhum motorista encontrado" description="Ajuste os filtros ou convide motoristas na aba Motoristas." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motorista</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>CNH</TableHead>
              <TableHead>Validade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => {
              const cnh = CNH_STATUS_STYLE[entry.cnhStatus];
              return (
                <TableRow key={entry.memberId} className={cnh.className}>
                  <TableCell>{entry.name ?? entry.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={entry.registrationStatus === "complete" ? "success" : "warning"}>
                      {entry.registrationStatus === "complete" ? "Completo" : "Incompleto"}
                    </Badge>
                    {entry.missingFields.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Faltam: {entry.missingFields.join(", ")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{cnh.label}</TableCell>
                  <TableCell>
                    {entry.cnhExpiresAt
                      ? new Date(`${entry.cnhExpiresAt}T00:00:00`).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
