"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  CommandPalette,
  type CommandPaletteItem,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
  ToastViewport,
  type ToastItem,
} from "@nave/ui";
import { Section, StateRow, Subsection } from "../section-shell";

const ALERT_VARIANTS = ["info", "success", "warning", "error"] as const;

let toastSeq = 0;

export function FeedbackSection() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  function pushToast(variant: ToastItem["variant"], title: string, description?: string) {
    toastSeq += 1;
    const id = `toast-${toastSeq}`;
    setToasts((current) => [...current, { id, variant, title, description }]);
  }

  const paletteItems: CommandPaletteItem[] = [
    { id: "1", label: "Registrar despesa", category: "Ações", onSelect: () => {} },
    { id: "2", label: "Agendar manutenção", category: "Ações", onSelect: () => {} },
    { id: "3", label: "Gol 2020 — ABC-1234", category: "Veículos", onSelect: () => {} },
  ];

  return (
    <Section
      title="Feedback & Overlays"
      description="Alert, Toast, Dialog, Tooltip, Skeleton e CommandPalette — textos usando a voz aprovada (proposta §11). Abra o Dialog e dispare um Toast para ver os componentes reais reagindo."
    >
      <Subsection title="Alert — variant × ícone semântico fixo">
        {ALERT_VARIANTS.map((variant) => (
          <StateRow key={variant} label={variant}>
            <Alert
              variant={variant}
              description={
                variant === "error"
                  ? "Algo não saiu como devia aqui do nosso lado. Tente novamente em instantes — o que você já salvou continua guardado."
                  : variant === "warning"
                    ? "A revisão dos 10.000 km está em atraso. Vamos agendar?"
                    : variant === "success"
                      ? "Despesa registrada. Seu histórico já está atualizado."
                      : "Nenhuma despesa por aqui ainda. Registre a primeira."
              }
              className="max-w-md"
            />
          </StateRow>
        ))}
      </Subsection>

      <Subsection title="Toast — dispare para ver a fila real (auto-dismiss em 4s)">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => pushToast("success", "Despesa registrada", "Seu histórico já está atualizado.")}>
            Sucesso
          </Button>
          <Button size="sm" variant="outline" onClick={() => pushToast("error", "Algo não saiu como devia", "Tente novamente em instantes.")}>
            Erro
          </Button>
          <Button size="sm" variant="outline" onClick={() => pushToast("warning", "Manutenção em atraso", "A revisão dos 10.000 km venceu.")}>
            Aviso
          </Button>
          <Button size="sm" variant="ghost" onClick={() => pushToast("default", "Convite enviado", "Assim que confirmar, verá os veículos compartilhados.")}>
            Default
          </Button>
        </div>
        <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((t) => t.id !== id))} />
      </Subsection>

      <Subsection title="Dialog (motion real — ver aba Motion)">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir despesa</DialogTitle>
              <DialogDescription>Despesa removida. Para desfazer, você tem alguns segundos.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive">Excluir</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Subsection>

      <Subsection title="Skeleton">
        <div className="flex flex-col gap-2 max-w-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Subsection>

      <Subsection title="CommandPalette">
        <Button variant="outline" onClick={() => setPaletteOpen(true)}>
          Abrir busca (⌘K)
        </Button>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          items={paletteItems}
          query={query}
          onQueryChange={setQuery}
        />
      </Subsection>
    </Section>
  );
}
