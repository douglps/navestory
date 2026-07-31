import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Container } from "./container";

describe("Container", () => {
  it("renderiza como <main> com o children", () => {
    render(<Container>conteúdo</Container>);
    expect(screen.getByRole("main")).toHaveTextContent("conteúdo");
  });

  it.each(["sm", "md", "2xl", "3xl", "4xl", "5xl"] as const)(
    "aplica max-w correto para size=%s",
    (size) => {
      render(<Container size={size}>conteúdo</Container>);
      expect(screen.getByRole("main").className).toContain(`max-w-${size}`);
    },
  );

  it("aplica gap-8 quando gap={8}", () => {
    render(<Container gap={8}>conteúdo</Container>);
    expect(screen.getByRole("main").className).toContain("gap-8");
  });

  it("aplica className extra (ex: pb-24)", () => {
    render(<Container className="pb-24">conteúdo</Container>);
    expect(screen.getByRole("main").className).toContain("pb-24");
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<Container>conteúdo</Container>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
