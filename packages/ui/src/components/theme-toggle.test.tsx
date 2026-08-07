import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./theme-toggle";

/**
 * @spec SPEC-20260721-001 RF-03
 */
describe("ThemeToggle", () => {
  it("tema claro: mostra ícone/label para ativar o modo escuro", () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />);

    const button = screen.getByRole("button", { name: "Ativar modo escuro" });
    expect(button).toHaveAttribute("title", "Modo escuro");
    expect(button).toHaveTextContent("☾");
  });

  it("tema escuro: mostra ícone/label para ativar o modo claro", () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />);

    const button = screen.getByRole("button", { name: "Ativar modo claro" });
    expect(button).toHaveAttribute("title", "Modo claro");
    expect(button).toHaveTextContent("☀");
  });

  it("clicar chama onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);

    await user.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("aceita className customizada", () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} className="custom" />);

    expect(screen.getByRole("button")).toHaveClass("custom");
  });
});
