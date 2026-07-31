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
  DialogTrigger,
  Input,
} from "@nave/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

const CONFIRMATION_WORD = "EXCLUIR";

/**
 * @spec SPEC-20260719-001 RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, US-02, US-03, US-05
 */
export function DeleteAccountDialog(): ReactNode {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiClient<void>("/users/me", { method: "DELETE", body: { confirm: true } }),
    onSuccess: () => {
      setOpen(false);
      router.push("/login?message=conta_excluida");
    },
    onError: () => {
      setConfirmationText("");
    },
  });

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmationText("");
      mutation.reset();
    }
  }

  const isConfirmed = confirmationText.trim() === CONFIRMATION_WORD;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Excluir minha conta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir minha conta</DialogTitle>
          <DialogDescription>
            Sua conta será marcada para exclusão. A exclusão definitiva ocorre após 30 dias.
            Você pode cancelar a qualquer momento dentro desse prazo fazendo login novamente —
            todos os seus dados (veículos, despesas, histórico e preferências) permanecem
            intactos até lá. Após o prazo, a exclusão é irreversível.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor="delete-account-confirmation" className="text-sm font-medium">
            Para confirmar, digite <strong>{CONFIRMATION_WORD}</strong> no campo abaixo:
          </label>
          <Input
            id="delete-account-confirmation"
            type="text"
            placeholder={CONFIRMATION_WORD}
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            disabled={mutation.isPending}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>

        {mutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível processar sua solicitação. Tente novamente ou entre em contato com o suporte."
          />
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Excluindo..." : "Confirmar exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
