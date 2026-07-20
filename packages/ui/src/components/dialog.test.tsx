import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function ExampleDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger>Abrir</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir conta</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita imediatamente.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancelar</DialogClose>
          <button type="button">Confirmar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("não renderiza o conteúdo antes de abrir", () => {
    render(<ExampleDialog />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre ao clicar no trigger e associa título/descrição via aria-labelledby/describedby", async () => {
    const user = userEvent.setup();
    render(<ExampleDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Excluir conta");
    expect(dialog).toHaveAccessibleDescription("Esta ação não pode ser desfeita imediatamente.");
  });

  it("fecha ao clicar no botão de fechar padrão", async () => {
    const user = userEvent.setup();
    render(<ExampleDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha ao clicar em DialogClose customizado", async () => {
    const user = userEvent.setup();
    render(<ExampleDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha com Esc", async () => {
    const user = userEvent.setup();
    render(<ExampleDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("chama onOpenChange ao abrir e ao fechar", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ExampleDialog onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("oculta o botão de fechar padrão quando hideCloseButton está ativo", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent hideCloseButton>
          <DialogTitle>Confirmação</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();
  });

  it("não tem violações de acessibilidade (jest-axe)", async () => {
    const user = userEvent.setup();
    const { container } = render(<ExampleDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");

    const results = await axe(container.ownerDocument.body);
    expect(results).toHaveNoViolations();
  });
});
