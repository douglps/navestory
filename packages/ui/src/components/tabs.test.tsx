import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Tabs, type TabItem } from "./tabs";

const ITEMS: TabItem[] = [
  { value: "overview", label: "Visão Geral" },
  { value: "expenses", label: "Despesas", badge: 3 },
  { value: "maintenance", label: "Manutenções", disabled: true },
];

describe("Tabs", () => {
  it("marca a primeira aba (ou defaultValue) como selecionada", () => {
    render(<Tabs items={ITEMS} defaultValue="expenses" aria-label="Seções" />);

    expect(screen.getByRole("tab", { name: /Despesas/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Visão Geral" })).toHaveAttribute("aria-selected", "false");
  });

  it("troca a aba ativa ao clicar (não controlado)", async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} defaultValue="overview" aria-label="Seções" />);

    await user.click(screen.getByRole("tab", { name: "Visão Geral" }));
    expect(screen.getByRole("tab", { name: "Visão Geral" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: /Despesas/ }));
    expect(screen.getByRole("tab", { name: /Despesas/ })).toHaveAttribute("aria-selected", "true");
  });

  it("modo controlado chama onValueChange e não muda sozinho sem o valor ser atualizado", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Tabs items={ITEMS} value="overview" onValueChange={onValueChange} aria-label="Seções" />);

    await user.click(screen.getByRole("tab", { name: /Despesas/ }));

    expect(onValueChange).toHaveBeenCalledWith("expenses");
    expect(screen.getByRole("tab", { name: "Visão Geral" })).toHaveAttribute("aria-selected", "true");
  });

  it("exibe o badge da aba", () => {
    render(<Tabs items={ITEMS} defaultValue="overview" aria-label="Seções" />);

    expect(screen.getByRole("tab", { name: /Despesas/ })).toHaveTextContent("3");
  });

  it("desabilita a aba marcada como disabled", () => {
    render(<Tabs items={ITEMS} defaultValue="overview" aria-label="Seções" />);

    expect(screen.getByRole("tab", { name: /Manutenções/ })).toBeDisabled();
  });

  it("navega entre abas pelo teclado (setas)", async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} defaultValue="overview" aria-label="Seções" />);

    screen.getByRole("tab", { name: "Visão Geral" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: /Despesas/ })).toHaveFocus();
  });

  it.each(["default", "underline", "pills"] as const)(
    "não possui violações de acessibilidade na variante %s",
    async (variant) => {
      const { container } = render(
        <Tabs items={ITEMS} defaultValue="overview" variant={variant} aria-label="Seções" />,
      );

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
