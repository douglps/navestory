"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@navestory/ui";
import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useUIStore } from "@/lib/stores/ui-store";

interface RemoveMemberDialogProps {
  workspaceId: string;
  memberId: string;
  memberLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md US-05, RF-07, R-WS-05
 */
export function RemoveMemberDialog({
  workspaceId,
  memberId,
  memberLabel,
  open,
  onOpenChange,
  onRemoved,
}: RemoveMemberDialogProps): ReactNode {
  const pushToast = useUIStore((state) => state.pushToast);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<void>(`/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      onOpenChange(false);
      pushToast({ variant: "success", title: "Motorista removido do workspace", duration: 5000 });
      onRemoved();
    },
    onError: () => {
      pushToast({ variant: "error", title: "Não foi possível remover o motorista", duration: 5000 });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover {memberLabel} do workspace</DialogTitle>
          <DialogDescription>
            O acesso do motorista será revogado imediatamente. O histórico de dados é preservado
            para auditoria.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            aria-busy={mutation.isPending}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Removendo..." : "Confirmar remoção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
