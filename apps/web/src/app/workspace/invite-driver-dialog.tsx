"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@navestory/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useUIStore } from "@/lib/stores/ui-store";

interface InviteDriverDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md US-02, RF-03, R-WS-02
 * Gera um link de convite — nunca envia e-mail (limitação de infra já documentada).
 */
export function InviteDriverDialog({ workspaceId, open, onOpenChange }: InviteDriverDialogProps): ReactNode {
  const queryClient = useQueryClient();
  const pushToast = useUIStore((state) => state.pushToast);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<{ inviteUrl: string }>(`/workspaces/${workspaceId}/invites`, {
        method: "POST",
        body: { email },
      }),
    onSuccess: (result) => {
      setInviteUrl(result.inviteUrl);
      void queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "members"] });
    },
  });

  function handleClose(nextOpen: boolean): void {
    if (!nextOpen) {
      setEmail("");
      setInviteUrl(null);
      mutation.reset();
    }
    onOpenChange(nextOpen);
  }

  async function copyLink(): Promise<void> {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    pushToast({ variant: "success", title: "Link copiado para a área de transferência", duration: 3000 });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar motorista</DialogTitle>
          <DialogDescription>
            Gere um link de convite e envie por fora do navestory (WhatsApp, e-mail pessoal etc).
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <div className="flex flex-col gap-3">
            <Alert
              variant="success"
              description="Link gerado. Compartilhe com o motorista pelo WhatsApp, e-mail ou como preferir."
            />
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly />
              <Button type="button" variant="outline" onClick={copyLink}>
                Copiar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label htmlFor="driverEmail">E-mail do motorista</label>
            <Input
              id="driverEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {mutation.isError && (
              <Alert variant="error" description="Não foi possível gerar o convite." />
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            {inviteUrl ? "Fechar" : "Cancelar"}
          </Button>
          {!inviteUrl && (
            <Button
              type="button"
              aria-busy={mutation.isPending}
              disabled={mutation.isPending || email.trim().length === 0}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Gerando..." : "Gerar link de convite"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
