"use client";

import {
  Alert,
  Button,
  DateRangePicker,
  EmptyState,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type DateRange,
} from "@nave/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  user_id: string | null;
  created_at: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  meta: { total: number; page: number; limit: number };
}

const PAGE_LIMIT = 20;

/** Backend valida `from`/`to` com `z.string().datetime()` (RF-02 do endpoint) — ISO completo. */
function toIsoDateTime(date: Date | undefined): string {
  return date ? date.toISOString() : "";
}

/**
 * @spec SPEC-20260731-008 US-04, RF-08, RF-12, RF-15, RF-16
 */
export function AdminAuditLogsTable(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const userIdFilter = searchParams.get("user_id") ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [userIdInput, setUserIdInput] = useState(userIdFilter);
  const dateRange: DateRange | undefined = from
    ? { from: new Date(from), to: to ? new Date(to) : undefined }
    : undefined;

  function updateParams(next: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`/admin?${params.toString()}`);
  }

  function handleFilterSubmit(event: FormEvent): void {
    event.preventDefault();
    updateParams({ user_id: userIdInput || null, page: null });
  }

  function handleDateRangeChange(range: DateRange | undefined): void {
    updateParams({
      from: range ? toIsoDateTime(range.from) : null,
      to: range?.to ? toIsoDateTime(range.to) : null,
      page: null,
    });
  }

  const queryString = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_LIMIT),
    ...(userIdFilter ? { user_id: userIdFilter } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "audit-logs", page, userIdFilter, from, to],
    queryFn: () => apiClient<AuditLogsResponse>(`/admin/audit-logs?${queryString}`),
    retry: false,
  });

  function goToPage(nextPage: number): void {
    updateParams({ page: String(nextPage) });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="audit-user-id" className="mb-1 block text-xs text-muted-foreground">
            ID do usuário
          </label>
          <Input
            id="audit-user-id"
            type="text"
            placeholder="uuid do usuário"
            value={userIdInput}
            onChange={(event) => setUserIdInput(event.target.value)}
          />
        </div>
        <DateRangePicker value={dateRange} onValueChange={handleDateRangeChange} className="flex-1" />
        <Button type="submit">Filtrar</Button>
      </form>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <Alert variant="error" description="Não foi possível carregar os audit logs." />}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState title="Nenhum audit log encontrado" />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>ID do registro</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log, index) => (
                <TableRow key={log.id} striped={index % 2 === 1}>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.table_name}</TableCell>
                  <TableCell>{log.record_id}</TableCell>
                  <TableCell>{log.user_id ?? "—"}</TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {data.meta.page} — {data.meta.total} registro{data.meta.total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page * PAGE_LIMIT >= data.meta.total}
                onClick={() => goToPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
