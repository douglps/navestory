import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Card } from "./card";

describe("Card", () => {
  it("renderiza o children dentro de um container", () => {
    render(<Card>Conteúdo</Card>);
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("aplica className extra sem sobrescrever as classes base", () => {
    render(<Card className="mt-4">Conteúdo</Card>);
    const card = screen.getByText("Conteúdo");
    expect(card).toHaveClass("mt-4");
    expect(card).toHaveClass("rounded-lg");
  });

  it.each(["sm", "md", "lg"] as const)("não tem violações de acessibilidade (padding=%s)", async (padding) => {
    const { container } = render(<Card padding={padding}>Conteúdo</Card>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
