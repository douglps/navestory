import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renderiza oculto de leitores de tela", () => {
    const { container } = render(<Skeleton className="h-4 w-16" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("aplica className de dimensão sem perder a classe-base", () => {
    const { container } = render(<Skeleton className="h-4 w-16" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-4 w-16".split(" ")[0]);
    expect(el.className).toContain("animate-pulse");
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<Skeleton className="h-4 w-16" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
