import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Input } from "./input";

describe("Input", () => {
  it("renderiza e aceita digitação", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Nome" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Nome"), "abc");

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("aplica className extra sem perder a classe-base", () => {
    render(<Input aria-label="Nome" className="w-20" />);
    const input = screen.getByLabelText("Nome");
    expect(input.className).toContain("w-20");
    expect(input.className).toContain("rounded-md");
  });

  it("marca aria-invalid quando error", () => {
    render(<Input aria-label="Nome" error />);
    expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-invalid", "true");
  });

  it("fica desabilitado quando disabled", () => {
    render(<Input aria-label="Nome" disabled />);
    expect(screen.getByLabelText("Nome")).toBeDisabled();
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<Input aria-label="Nome" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
