import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Switch } from "./switch";

describe("Switch", () => {
  it("chama onCheckedChange invertendo o estado ao clicar", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Notificações" checked={false} onCheckedChange={onCheckedChange} />);

    await userEvent.click(screen.getByRole("switch", { name: "Notificações" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("reflete aria-checked conforme a prop checked", () => {
    render(<Switch aria-label="Notificações" checked onCheckedChange={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Notificações" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("fica desabilitado e não dispara onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch aria-label="Notificações" checked={false} onCheckedChange={onCheckedChange} disabled />,
    );

    const toggle = screen.getByRole("switch", { name: "Notificações" });
    expect(toggle).toBeDisabled();
    await userEvent.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(
      <Switch aria-label="Notificações" checked onCheckedChange={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
