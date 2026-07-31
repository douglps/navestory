import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("alterna estado ao clicar", async () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="Aceito os termos" onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Aceito os termos"));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("respeita checked/disabled", () => {
    render(<Checkbox aria-label="Aceito os termos" checked readOnly disabled />);
    const checkbox = screen.getByLabelText("Aceito os termos");
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<Checkbox aria-label="Aceito os termos" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
