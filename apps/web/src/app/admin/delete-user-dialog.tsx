"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@nave/ui";
import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useUIStore } from "@/lib/stores/ui-store";

interface DeleteUserDialogProps {
  userId: string;
  email: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/**
 * @spec SPEC-20260731-008 RF-13, US-05
 */
export function DeleteUserDialog({
  userId,
  email,
  open,
  onOpenChange,
  onDeleted,
}: DeleteUserDialogProps): ReactNode {
  const pushToast = useUIStore((state) => state.pushToast);

  const mutation = useMutation({
    mutationFn: () => apiClient<void>(`/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      onOpenChange(false);
      pushToast({ variant: "success", title: "Conta excluída com sucesso", duration: 5000 });
      onDeleted();
    },
    onError: () => {
      pushToast({ variant: "error", title: "Não foi possível excluir a conta", duration: 5000 });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir conta de {email ?? userId}</DialogTitle>
          <DialogDescription>
            Esta ação é irreversível e exclui permanentemente todos os dados do usuário.
            Confirmar?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            aria-busy={mutation.isPending}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Excluindo..." : "Confirmar exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
