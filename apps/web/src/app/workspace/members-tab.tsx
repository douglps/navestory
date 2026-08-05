"use client";

import { Alert, Button, EmptyState, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@navestory/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { InviteDriverDialog } from "./invite-driver-dialog";
import { RemoveMemberDialog } from "./remove-member-dialog";

interface WorkspaceMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  joinedAt: string;
}

interface MembersTabProps {
  workspaceId: string;
}

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-06, US-02, US-05
 */
export function MembersTab({ workspaceId }: MembersTabProps): ReactNode {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => apiClient<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <Alert variant="error" description="Não foi possível carregar os motoristas." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setInviteOpen(true)}>
          Convidar motorista
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState title="Nenhum motorista na equipe ainda" description="Convide o primeiro motorista para começar." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Entrou em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((member, index) => (
              <TableRow key={member.id} striped={index % 2 === 1}>
                <TableCell>{member.name ?? "—"}</TableCell>
                <TableCell>{member.email ?? "—"}</TableCell>
                <TableCell>{new Date(member.joinedAt).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Button type="button" variant="destructive" onClick={() => setMemberToRemove(member)}>
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InviteDriverDialog workspaceId={workspaceId} open={inviteOpen} onOpenChange={setInviteOpen} />

      {memberToRemove && (
        <RemoveMemberDialog
          workspaceId={workspaceId}
          memberId={memberToRemove.id}
          memberLabel={memberToRemove.name ?? memberToRemove.email ?? memberToRemove.id}
          open={memberToRemove !== null}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          onRemoved={() => {
            setMemberToRemove(null);
            void queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "members"] });
          }}
        />
      )}
    </div>
  );
}
