import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { DateRangePicker, type DateRangePreset } from "./date-range-picker";

const PRESETS: DateRangePreset[] = [
  { label: "Últimos 7 dias", range: { from: new Date(2026, 0, 25), to: new Date(2026, 1, 1) } },
];

describe("DateRangePicker", () => {
  it("chama onValueChange com o range do preset ao clicar", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DateRangePicker onValueChange={onValueChange} presets={PRESETS} />);

    await user.click(screen.getByRole("button", { name: "Últimos 7 dias" }));

    expect(onValueChange).toHaveBeenCalledWith(PRESETS[0]?.range);
  });

  it("atualiza a data inicial mantendo a final ao editar o input", () => {
    const onValueChange = vi.fn();
    render(
      <DateRangePicker
        value={{ from: new Date(2026, 0, 1), to: new Date(2026, 0, 10) }}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-01-05" } });

    expect(onValueChange).toHaveBeenLastCalledWith({
      from: new Date(2026, 0, 5),
      to: new Date(2026, 0, 10),
    });
  });

  it("limpa o range quando a data inicial é apagada", () => {
    const onValueChange = vi.fn();
    render(<DateRangePicker value={{ from: new Date(2026, 0, 1) }} onValueChange={onValueChange} />);

    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "" } });

    expect(onValueChange).toHaveBeenLastCalledWith(undefined);
  });

  it("exibe a mensagem de erro associada aos inputs", () => {
    render(<DateRangePicker onValueChange={vi.fn()} error="Período inválido" />);

    expect(screen.getByText("Período inválido")).toBeInTheDocument();
    expect(screen.getByLabelText("Data inicial")).toHaveAttribute("aria-invalid", "true");
  });

  it("não possui violações de acessibilidade", async () => {
    const { container } = render(
      <DateRangePicker
        value={{ from: new Date(2026, 0, 1), to: new Date(2026, 0, 10) }}
        onValueChange={vi.fn()}
        presets={PRESETS}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
