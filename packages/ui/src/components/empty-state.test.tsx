import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renderiza título e descrição", () => {
    render(<EmptyState title="Nenhum veículo ainda" description="Adicione seu primeiro veículo." />);

    expect(screen.getByText("Nenhum veículo ainda")).toBeInTheDocument();
    expect(screen.getByText("Adicione seu primeiro veículo.")).toBeInTheDocument();
  });

  it("dispara onClick da action principal", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Nenhum veículo ainda"
        action={{ label: "Adicionar veículo", onClick }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Adicionar veículo" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("dispara onClick da secondaryAction", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Nenhum resultado"
        secondaryAction={{ label: "Limpar filtros", onClick }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ícone decorativo fica aria-hidden", () => {
    render(<EmptyState icon="🚗" title="Nenhum veículo ainda" />);
    expect(screen.getByText("🚗")).toHaveAttribute("aria-hidden", "true");
  });

  it.each(["sm", "md", "lg"] as const)(
    "não tem violações de acessibilidade no tamanho %s",
    async (size) => {
      const { container } = render(
        <EmptyState
          size={size}
          icon="🚗"
          title="Nenhum veículo ainda"
          description="Adicione seu primeiro veículo."
          action={{ label: "Adicionar veículo", onClick: () => {} }}
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
