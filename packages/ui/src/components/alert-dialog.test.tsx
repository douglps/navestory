import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

/**
 * @spec SPEC-20260807-003 S17
 */
function ExampleAlertDialog({ onConfirm }: { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Excluir veículo</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir ABC1234?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Excluir definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("não renderiza o conteúdo antes de abrir", () => {
    render(<ExampleAlertDialog />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("abre ao clicar no trigger e associa título/descrição via aria-labelledby/describedby", async () => {
    const user = userEvent.setup();
    render(<ExampleAlertDialog />);

    await user.click(screen.getByRole("button", { name: "Excluir veículo" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Excluir ABC1234?");
    expect(dialog).toHaveAccessibleDescription("Esta ação não pode ser desfeita.");
  });

  it("chama o handler de confirmação ao clicar em AlertDialogAction", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ExampleAlertDialog onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Excluir veículo" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Excluir definitivamente" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("fecha ao clicar em AlertDialogCancel", async () => {
    const user = userEvent.setup();
    render(<ExampleAlertDialog />);

    await user.click(screen.getByRole("button", { name: "Excluir veículo" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("desabilita AlertDialogAction via prop disabled (padrão de confirmação por digitação)", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogAction disabled>Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const action = await screen.findByRole("button", { name: "Excluir definitivamente" });
    expect(action).toBeDisabled();
  });

  it("não tem violações de acessibilidade (jest-axe)", async () => {
    const user = userEvent.setup();
    const { container } = render(<ExampleAlertDialog />);

    await user.click(screen.getByRole("button", { name: "Excluir veículo" }));
    await screen.findByRole("alertdialog");

    const results = await axe(container.ownerDocument.body);
    expect(results).toHaveNoViolations();
  });
});
