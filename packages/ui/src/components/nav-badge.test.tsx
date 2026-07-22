import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavBadge } from "./nav-badge";

describe("NavBadge", () => {
  it("não renderiza nada quando count é 0", () => {
    render(<NavBadge count={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("não renderiza nada quando count é negativo", () => {
    render(<NavBadge count={-3} />);
    expect(screen.queryByText("-3")).not.toBeInTheDocument();
  });

  it("exibe o número real quando count está entre 1 e 9", () => {
    render(<NavBadge count={8} />);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("exibe o número real quando count é exatamente 9", () => {
    render(<NavBadge count={9} />);
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it('trunca para "9+" quando count é 10', () => {
    render(<NavBadge count={10} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it('trunca para "9+" quando count é muito maior que 9 (nunca "99+")', () => {
    render(<NavBadge count={127} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
    expect(screen.queryByText("99+")).not.toBeInTheDocument();
    expect(screen.queryByText("127")).not.toBeInTheDocument();
  });
});
