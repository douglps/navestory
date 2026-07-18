"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/http/api-client";

interface AuditLogRow {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  changes: Record<string, unknown>;
  created_at: string;
}

const DOMAIN_LABELS: Record<string, { label: string; icon: string }> = {
  vehicles: { label: "Veículo", icon: "🚗" },
  expenses: { label: "Despesa", icon: "🧾" },
  maintenances: { label: "Manutenção", icon: "🔧" },
  fines: { label: "Multa", icon: "🚓" },
  recurring_costs: { label: "Custo Recorrente", icon: "🔁" },
  vehicle_odometer_cycles: { label: "Ciclo de Odômetro", icon: "📍" },
  auth: { label: "Conta", icon: "👤" },
  users: { label: "Conta", icon: "👤" },
};

function domainInfo(tableName: string): { label: string; icon: string } {
  // eslint-disable-next-line security/detect-object-injection -- tableName vem do backend (audit_logs.table_name), não de input do usuário
  return DOMAIN_LABELS[tableName] ?? { label: tableName, icon: "📄" };
}

/**
 * @spec SPEC-20260602-005 RF-12
 * Rótulo humanizado a partir do padrão `<DOMINIO>_<CREATED|UPDATED|DELETED>` usado por
 * `AuditService` (ex: `VEHICLE_CREATED`), com exceções para `auth` (`REGISTER`/`LOGIN`).
 */
function actionLabel(action: string, tableName: string): string {
  const domain = domainInfo(tableName).label;
  if (action === "REGISTER") return "Cadastro de Conta";
  if (action === "LOGIN") return "Login";
  if (action.endsWith("_CREATED")) return `Criação de ${domain}`;
  if (action.endsWith("_UPDATED")) return `Atualização de ${domain}`;
  if (action.endsWith("_DELETED")) return `Exclusão de ${domain}`;
  return action;
}

/**
 * @spec SPEC-20260602-005 RF-14
 */
function actionBadgeClassName(action: string): string {
  if (action.endsWith("_DELETED")) return "border-red-600 bg-red-50 text-red-700";
  if (action.endsWith("_UPDATED")) return "border-amber-500 bg-amber-50 text-amber-700";
  return "border-emerald-600 bg-emerald-50 text-emerald-700";
}

/**
 * @spec SPEC-20260602-005 RF-13
 */
function relativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * @spec SPEC-20260602-005 RF-12
 * Primeiros 4 campos de `changes` — o backend já remove os campos sensíveis
 * (`user_id`, `deleted_at`, `photo_url`, `photo_thumbnail_url`; ver RF-06).
 */
function detailEntries(changes: Record<string, unknown>): [string, unknown][] {
  return Object.entries(changes)
    .filter(([key]) => key !== "requestId")
    .slice(0, 4);
}

function KpiTile({ label, value }: { label: string; value: number }): ReactNode {
  return (
    <div className="rounded border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

/**
 * @spec SPEC-20260602-005 RF-15
 */
function EmptyState(): ReactNode {
  return (
    <div className="flex flex-col items-center gap-2 rounded border p-8 text-center">
      <span aria-hidden className="text-2xl">
        🛡️
      </span>
      <p className="text-sm text-muted-foreground">Nenhuma operação registrada ainda.</p>
    </div>
  );
}

/**
 * @spec SPEC-20260602-005
 * Página client component consumindo `apiClient` (TanStack Query) — a spec original previa
 * Server Component com `force-dynamic`, mas o padrão real do projeto usa exclusivamente client
 * components + `apiClient`/middleware para autenticação (ver `apps/web/middleware.ts`), o mesmo
 * padrão de `/analytics` e `/dashboard`. Redirect para `/login` já é feito pelo middleware.
 */
export default function AtividadesPage(): ReactNode {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiClient<AuditLogRow[]>("/audit-logs"),
    retry: false,
  });

  const total = logs?.length ?? 0;
  const veiculos = logs?.filter((log) => domainInfo(log.table_name).label === "Veículo").length ?? 0;
  const despesas = logs?.filter((log) => log.table_name === "expenses").length ?? 0;
  const manutencoes = logs?.filter((log) => log.table_name === "maintenances").length ?? 0;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-8 pb-24">
      <h1 className="text-xl font-semibold">Histórico de Atividades</h1>
      <p className="text-sm text-muted-foreground">
        Últimas {total} operações registradas na sua conta, para acompanhamento pessoal.
      </p>

      {logs && logs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Total" value={total} />
          <KpiTile label="Veículos" value={veiculos} />
          <KpiTile label="Despesas" value={despesas} />
          <KpiTile label="Manutenções" value={manutencoes} />
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && (!logs || logs.length === 0) && <EmptyState />}

      {logs && logs.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-2">Quando</th>
                <th className="p-2">Ação</th>
                <th className="p-2">Domínio</th>
                <th className="hidden p-2 sm:table-cell">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const domain = domainInfo(log.table_name);
                return (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="p-2 text-muted-foreground" title={new Date(log.created_at).toLocaleString("pt-BR")}>
                      {relativeTime(log.created_at)}
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${actionBadgeClassName(log.action)}`}
                      >
                        {actionLabel(log.action, log.table_name)}
                      </span>
                    </td>
                    <td className="p-2">
                      <span aria-hidden className="mr-1">
                        {domain.icon}
                      </span>
                      {domain.label}
                    </td>
                    <td className="hidden p-2 text-xs text-muted-foreground sm:table-cell">
                      {detailEntries(log.changes)
                        .map(([key, value]) => `${key}: ${String(value)}`)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
