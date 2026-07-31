import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renderiza e aceita digitação", async () => {
    const onChange = vi.fn();
    render(<Textarea aria-label="Descrição" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Descrição"), "abc");

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("aplica className extra sem perder a classe-base", () => {
    render(<Textarea aria-label="Descrição" className="min-h-[120px]" />);
    const textarea = screen.getByLabelText("Descrição");
    expect(textarea.className).toContain("min-h-[120px]");
    expect(textarea.className).toContain("rounded-md");
  });

  it("marca aria-invalid quando error", () => {
    render(<Textarea aria-label="Descrição" error />);
    expect(screen.getByLabelText("Descrição")).toHaveAttribute("aria-invalid", "true");
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<Textarea aria-label="Descrição" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
