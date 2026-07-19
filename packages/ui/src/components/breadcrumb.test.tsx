import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

const ITEMS: BreadcrumbItem[] = [
  { label: "Frota", href: "/fleet" },
  { label: "Veículos", href: "/fleet/vehicles" },
  { label: "ABC-1234", href: "/fleet/vehicles/abc-1234" },
  { label: "Despesas" },
];

describe("Breadcrumb", () => {
  it("renderiza todos os itens quando não excede maxItems", () => {
    render(<Breadcrumb items={ITEMS} />);

    for (const item of ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("marca o último item como página atual, sem link", () => {
    render(<Breadcrumb items={ITEMS} />);

    const current = screen.getByText("Despesas");
    expect(current.closest("a")).toBeNull();
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renderiza itens intermediários como links", () => {
    render(<Breadcrumb items={ITEMS} />);

    expect(screen.getByRole("link", { name: "Frota" })).toHaveAttribute("href", "/fleet");
  });

  it("colapsa itens do meio com '...' quando excede maxItems", () => {
    render(<Breadcrumb items={ITEMS} maxItems={3} />);

    expect(screen.getByText("Frota")).toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.getByText("Despesas")).toBeInTheDocument();
    expect(screen.queryByText("Veículos")).not.toBeInTheDocument();
    expect(screen.queryByText("ABC-1234")).not.toBeInTheDocument();
  });

  it("não colapsa quando o total de itens está dentro do maxItems", () => {
    render(<Breadcrumb items={ITEMS.slice(0, 2)} maxItems={3} />);

    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("não possui violações de acessibilidade", async () => {
    const { container } = render(<Breadcrumb items={ITEMS} maxItems={3} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
