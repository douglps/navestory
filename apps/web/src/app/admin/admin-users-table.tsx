"use client";

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from "@nave/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useUIStore } from "@/lib/stores/ui-store";
import { DeleteUserDialog } from "./delete-user-dialog";

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface AdminUsersResponse {
  data: AdminUser[];
  meta: { total: number; page: number; limit: number };
}

const PAGE_LIMIT = 20;

/**
 * @spec SPEC-20260731-008 US-01, US-02, US-03, US-05, RF-08, RF-10, RF-11, RF-13, RF-14, RF-15, RF-16
 */
export function AdminUsersTable(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const pushToast = useUIStore((state) => state.pushToast);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const page = Number(searchParams.get("page") ?? "1");

  const { data: me } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiClient<{ id: string }>("/users/me"),
    retry: false,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: () => apiClient<AdminUsersResponse>(`/admin/users?page=${page}&limit=${PAGE_LIMIT}`),
    retry: false,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | null }) =>
      apiClient(`/admin/users/${userId}/role`, { method: "PATCH", body: { role } }),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      pushToast({
        variant: "success",
        title: variables.role === "admin" ? "Usuário promovido a admin" : "Role de admin revogado",
        duration: 5000,
      });
    },
    onError: () => {
      pushToast({ variant: "error", title: "Não foi possível alterar o role", duration: 5000 });
    },
  });

  function goToPage(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/admin?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <Alert variant="error" description="Não foi possível carregar os usuários." />;
  }

  if (data.data.length === 0) {
    return <EmptyState title="Nenhum usuário encontrado" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((user, index) => {
            const isSelf = user.id === me?.id;
            const isAdmin = user.role === "admin";
            const revokeDisabled = isSelf || roleMutation.isPending;

            const revokeButton = (
              <Button
                type="button"
                variant="outline"
                disabled={revokeDisabled}
                onClick={() => roleMutation.mutate({ userId: user.id, role: null })}
              >
                Revogar admin
              </Button>
            );

            return (
              <TableRow key={user.id} striped={index % 2 === 1}>
                <TableCell>{user.email ?? "—"}</TableCell>
                <TableCell>{user.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={isAdmin ? "info" : "neutral"}>{isAdmin ? "Admin" : "Usuário"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.deleted_at ? "warning" : "success"}>
                    {user.deleted_at ? "Pendente de exclusão" : "Ativo"}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin ? (
                      isSelf ? (
                        <Tooltip content="Não é possível revogar o próprio role de admin">
                          <span>{revokeButton}</span>
                        </Tooltip>
                      ) : (
                        revokeButton
                      )
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ userId: user.id, role: "admin" })}
                      >
                        Promover a admin
                      </Button>
                    )}
                    <Button type="button" variant="destructive" onClick={() => setUserToDelete(user)}>
                      Excluir conta
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Página {data.meta.page} — {data.meta.total} usuário{data.meta.total === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
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

      {userToDelete && (
        <DeleteUserDialog
          userId={userToDelete.id}
          email={userToDelete.email}
          open={userToDelete !== null}
          onOpenChange={(open) => !open && setUserToDelete(null)}
          onDeleted={() => {
            setUserToDelete(null);
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
          }}
        />
      )}
    </div>
  );
}
