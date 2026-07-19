import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Button } from "./button";

describe("Button", () => {
  it("renderiza o children e responde a clique", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("fica desabilitado e não dispara onClick quando disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Salvar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading desabilita o botão e marca aria-busy", () => {
    render(<Button loading>Salvar</Button>);

    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it.each(["default", "outline", "ghost", "destructive"] as const)(
    "não tem violações de acessibilidade na variante %s",
    async (variant) => {
      const { container } = render(<Button variant={variant}>Ação</Button>);
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
