import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renderiza o children", () => {
    render(<Badge>Pendente</Badge>);
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("aplica className extra sem perder a classe-base", () => {
    render(<Badge className="ml-2">Pendente</Badge>);
    const badge = screen.getByText("Pendente");
    expect(badge.className).toContain("ml-2");
    expect(badge.className).toContain("rounded-md");
  });

  it.each(["success", "warning", "danger", "info", "neutral"] as const)(
    "não tem violações de acessibilidade na variante %s",
    async (variant) => {
      const { container } = render(<Badge variant={variant}>Status</Badge>);
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
